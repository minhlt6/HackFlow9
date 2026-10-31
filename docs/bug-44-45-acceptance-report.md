# Báo cáo xác minh và nghiệm thu BUG-44–45

Ngày kiểm tra: **31/10/2026**. Phạm vi: mã nguồn hiện tại, API với CSDL kiểm thử tách biệt và trình duyệt có API mô phỏng. Không triển khai Railway hoặc sửa dữ liệu đang sử dụng.

## 1. Kết luận

| Bug | Xác minh | Phân loại |
| --- | --- | --- |
| BUG-44 | Backend từ chối đề tài/nhánh đóng, chưa mở hoặc hết chỗ là đúng. Nút của đề tài cha hết chỗ vốn đã bị khóa, nên chưa tái hiện chính xác toàn bộ thao tác Web3 trong phiếu trên bản hiện tại. Tuy nhiên, radio nhánh chỉ kiểm tra số chỗ, bỏ qua `is_active`; mặc định chọn nhánh đầu kể cả nhánh đã đóng. FE cũng chưa biết cửa sổ đăng ký từ BE, và thông báo lỗi chung có thể che mất lý do thực tế. | Lỗi trạng thái khả dụng và thông báo trên FE; phản hồi 409 là cơ chế bảo vệ đúng. |
| BUG-45 | Backend chặn thay đổi rubric khi có điểm submitted là đúng. API đọc chưa trả trạng thái khóa; FE vẫn bật cân bằng/chia đều/lưu/thêm/sửa/xóa và chỉ phát hiện khóa sau khi gửi request. | Lỗi đồng bộ trạng thái và trải nghiệm thao tác; không phải lỗi backend vì từ chối sửa rubric đã có điểm. |

Đường dẫn tiêu chí của ứng dụng hiện tại là `/admin/criteria`, không phải `/criteria`.

## 2. Quy tắc được giữ và làm rõ

- Đề tài chỉ có thể đăng ký trong cửa sổ cuộc thi đã công bố, lĩnh vực và nhánh đang hoạt động, còn chỗ. Kiểm tra quyền leader, đội đủ điều kiện, khóa đội và chống vượt quota ở BE được giữ nguyên.
- Rubric tự chuyển sang trạng thái không cho sửa khi có điểm chấm chính thức (`submitted`), theo quy tắc hiện có. Không bổ sung một nút “đóng tiêu chí” thủ công hoặc tự khóa chỉ vì trọng số đã đạt 100%.
- Tổng trọng số đạt 100% là điều kiện hợp lệ để lưu rubric và gửi điểm chính thức. Đạt 100% không mở lại rubric đã bị khóa; có thể tiếp tục chỉnh rubric đủ 100% khi chưa có điểm chính thức.
- Sau một thay đổi đồng thời, 409 vẫn có thể xảy ra và cần được giữ: dữ liệu trên màn hình có thể đã cũ so với DB. Không bỏ xác thực hay cho phép `allow_override` vượt khóa.

## 3. Sửa BUG-44

**Backend:** `GET /topics` bổ sung `can_select` và `unavailable_reason` ở cấp lĩnh vực/nhánh, tính từ cấu hình thời gian trên server, trạng thái công bố, hoạt động và số chỗ. Các trường được bổ sung tương thích vào response schema; không đổi request chọn đề tài hay cấu trúc CSDL.

**Frontend:** thêm utility `topicUnavailableReason` và dùng nhất quán ở danh sách, bộ lọc, modal và bước xác nhận:

1. Làm mờ đề tài/nhánh không khả dụng, hiển thị lý do; khóa nút/radio tương ứng.
2. Chọn mặc định nhánh đầu tiên còn khả dụng, không mặc định nhánh đã đóng chỉ vì đứng đầu danh sách.
3. Nếu toàn bộ nhánh đều không khả dụng, không cho mở modal chọn lĩnh vực đó.
4. Bộ lọc “Có thể đăng ký” chỉ tính những đề tài thực sự chọn được, không chỉ dựa vào số chỗ.
5. Chặn xác nhận thiếu nhánh hoặc nhánh không hợp lệ. Khi nhận 409 do trạng thái vừa thay đổi, đóng modal, đọc lại danh sách và thông báo lý do.
6. Với mã `TOPIC_SELECTION_CLOSED`, ưu tiên thông báo cụ thể từ BE thay cho luôn nói “thời gian đã đóng hoặc chưa bắt đầu”.

Backend vẫn kiểm tra lại khi ghi: vô hiệu hóa UI không thay thế kiểm tra quyền/thời gian/quota trong transaction.

## 4. Sửa BUG-45

**Backend:** `GET /rubrics` bổ sung `is_locked`, `can_edit`, `lock_reason`, đọc trực tiếp từ dữ liệu điểm trong DB. Thêm kiểm tra trọng số hợp lệ trước khi gửi điểm submitted: phải có tiêu chí hoạt động, trọng số dương/hữu hạn, tổng đạt 100%; nếu không thì trả 400 `CRITERIA_WEIGHT_INVALID`, không ghi điểm chính thức. Cách biểu diễn tổng 1.0 và dữ liệu phần trăm 100 hiện có đều được chấp nhận.

**Frontend:** trang tiêu chí đọc trạng thái khóa khi tải/làm mới, hiển thị thông báo chỉ xem và vô hiệu hóa:

- Cân bằng tỷ lệ và Chia đều ở cả thanh công cụ lẫn phần phụ.
- Lưu lên hệ thống, Thêm tiêu chí.
- Sửa, xóa và nút xác nhận ghi trong form.

Các hàm ghi cũng có chốt kiểm tra trạng thái, tránh chỉ khóa hình thức nút bấm. Khi đang tải hoặc không xác định được trạng thái từ API, không cho chỉnh sửa. Khi nhận 409 sau một thay đổi đồng thời, chuyển ngay sang chỉ xem và đóng các hộp thoại ghi. Danh sách tiêu chí rỗng từ API được hiển thị rỗng, không lấy tiêu chí cũ để thay thế kết quả đọc thành công.

Không tự sửa điểm, không xóa điểm và không mở khóa rubric để làm các nút hoạt động trở lại.

## 5. Kiểm tra thành phần và API

Không thêm hoặc xóa component React, không thêm thư viện, không cần migration. Các phần sửa chính:

- `backend/app/services/topic_service.py`, `backend/app/schemas/topic.py`.
- `backend/app/services/evaluation_service.py`.
- `frontend/src/pages/TopicsPage.tsx`, `frontend/src/pages/admin/AdminCriteriaPage.tsx`.
- `frontend/src/api/topicsApi.ts`, `frontend/src/types/topic.ts`.
- Utility mới: `frontend/src/utils/topicAvailability.ts`.

| API | Kết quả cần bảo đảm |
| --- | --- |
| `GET /topics` | Trạng thái chọn được và lý do khớp điều kiện BE |
| `POST /topics/select` | Vẫn từ chối 409 khi chưa mở/đã đóng/chưa công bố/nhánh tắt/hết chỗ, đội không bị gán đề tài sai |
| `GET /rubrics` | Trước có điểm: cho sửa; sau submitted: báo khóa và lý do, kể cả tải lại |
| `POST /rubrics` | Rubric đã khóa vẫn trả 409, kể cả gửi `allow_override=true`; tiêu chí gốc giữ nguyên |
| `POST /evaluations` | Trọng số 80% không được gửi chính thức; 100% hợp lệ được ghi và làm GET rubric báo khóa |

## 6. Kết quả kiểm thử

| Nhóm | Kết quả |
| --- | --- |
| Toàn bộ backend | **177 passed**, gồm 6 ca mới |
| Frontend unit/adapter | **13 ca đạt**: 3 mới và 10 đã có |
| Trình duyệt mới | **4 nhóm đạt** |
| Trình duyệt hồi quy | **8 nhóm đạt**: audit API trước đó và BUG-41–43 |
| TypeScript và ESLint các file FE thay đổi | Thành công |
| Production build | Thành công; cảnh báo bundle khoảng 1,2 MB |

Sáu ca backend mới: năm điều kiện không khả dụng (chưa bắt đầu, kết thúc, chưa công bố, nhánh tắt, hết chỗ) và vòng đời rubric/trọng số/khóa. Kiểm tra từ chối ghi xong đọc lại DB xác nhận không có thay đổi sai.

Bốn nhóm trình duyệt mới:

1. Cha hết chỗ bị khóa; nhánh tắt bị khóa; mặc định chọn nhánh còn mở; tải lại vẫn khóa đúng.
2. Cửa sổ đăng ký chưa mở: đề tài dù còn chỗ vẫn không cho chọn.
3. Rubric đã khóa từ API: bốn nút chính đều disabled ngay khi tải và sau reload; không phát sinh POST lỗi chỉ để biết trạng thái.
4. Rubric chưa khóa vẫn chia đều/lưu được; khi giám khảo gửi điểm ở phiên khác và request sau gặp 409, FE chuyển sang chỉ xem.

Trình duyệt dùng dữ liệu API mô phỏng để kiểm tra hành vi component; backend chạy API thật trên SQLite tách biệt. Chưa kiểm thử end-to-end trên Railway/PostgreSQL hoặc phiên đăng nhập cụ thể của người báo lỗi.

## 7. Cách nghiệm thu trên môi trường triển khai

1. Dùng leader của đội đủ điều kiện chưa chọn đề tài. Kiểm tra lĩnh vực hết chỗ, nhánh tắt và đề tài chưa đến giờ: đều mờ/không chọn được, có lý do rõ ràng.
2. Trong lĩnh vực có một nhánh tắt và một nhánh mở, mở modal: radio nhánh tắt disabled, nhánh mở được chọn mặc định. Chỉ nhánh mở có thể xác nhận.
3. Admin mở tiêu chí khi đã có submitted: thấy thông báo chỉ xem; thử cân bằng/chia đều/lưu/thêm/sửa/xóa đều bị vô hiệu hóa, không gửi request ghi.
4. Ở bộ dữ liệu chưa chấm, cân bằng và lưu đủ 100% vẫn hoạt động. Gửi điểm chính thức rồi tải lại trang tiêu chí: đã khóa.
5. Giữ trang admin đang mở, cho judge gửi điểm ở phiên khác; thao tác lưu của admin nhận 409 và sau đó toàn bộ thao tác ghi bị khóa. Đây là xử lý xung đột đúng, không phải lỗi lặp lại.

Triển khai FE và BE cùng phiên bản để có metadata trạng thái mới. Không cần thay dữ liệu demo hay reset CSDL để nhận các thay đổi này.
