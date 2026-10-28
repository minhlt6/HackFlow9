# Bản lỗi kết nối API FE–BE trước khi sửa

Ngày kiểm tra: **29/10/2026**.

> Cập nhật sau audit: tám lỗi xác nhận đã được sửa và kiểm thử. Xem `api-integration-fix-report-2026-10-29.md`. Nội dung dưới đây giữ lại bằng chứng và trạng thái trước sửa.

Trạng thái: **chỉ kiểm tra, chưa sửa ứng dụng**. Các thay đổi mã nguồn đang có trong workspace từ trước được giữ nguyên. Lần kiểm tra này chỉ tạo báo cáo và các tệp chẩn đoán trong `tmp/api-audit/`.

## 1. Kết luận

Đã rà soát **115 vị trí gọi HTTP trong mã frontend**, đối chiếu với **105 operation được đăng ký trong ứng dụng backend** hiện tại. Danh sách operation backend có cả health, ví dụ và endpoint phát triển; số vị trí gọi frontend có cả helper, không đồng nghĩa 115 chức năng UI độc lập.

**Chưa tìm thấy URL/phương thức đang được gọi ở frontend mà hoàn toàn thiếu route tương ứng trong backend.** Một lời gọi dùng biến `url` trong checkpointApi được kiểm tra thủ công: cả hai nhánh đều gọi GET `/submissions`, có route tương ứng.

Tuy nhiên, tìm thấy **8 lỗi tích hợp có bằng chứng**, gồm **2 lỗi đề xuất S1 và 6 lỗi đề xuất S2**. Các lỗi nằm ở định dạng response, ánh xạ trường dữ liệu, trường UI không được gửi/lưu, và quy tắc quyền/nghiệp vụ chỉ có trên UI hoặc không thống nhất với API.

Đã chạy **8 ca chẩn đoán trên CSDL kiểm thử riêng** để xác nhận hành vi hiện tại. Kết quả `8 passed` nghĩa là tám hành vi lỗi đã được tái hiện như mô tả, **không có nghĩa các lỗi đã được sửa**.

## 2. Danh sách lỗi

| Mã kiểm tra | Mức đề xuất | Khu vực | Lỗi xác nhận |
| --- | --- | --- | --- |
| API-AUD-01 | S2 | Thông báo trên dashboard/store | Backend trả `data.items`, store lại chờ `data` là mảng, nên bỏ qua danh sách thông báo tải từ server. |
| API-AUD-02 | S2 | Sửa thông báo quản trị | API trả `target_audience`, form đọc `targetRole`; sửa thông báo riêng cho giám khảo có thể gửi lại phạm vi `all`. |
| API-AUD-03 | S2 | Tạo đề tài nhánh | Trường “Cố vấn phụ trách” có trên form nhưng không đi qua lời gọi API chính; backend cũng chưa có trường/quan hệ tương ứng trong schema và model đề tài nhánh. |
| API-AUD-04 | S1 | Danh sách đội | GET `/teams` không yêu cầu đăng nhập nhưng trả mã mời và email thành viên. |
| API-AUD-05 | S2 | Theo dõi bài nộp của mentor | UI công bố hạn chế truy cập mã nguồn, nhưng GET `/submissions` cho mentor trả cả repo_url, commit_sha và submission_data. |
| API-AUD-06 | S2 | Xử lý ticket | FE coi ticket giao cho bất kỳ mentor nào cũng là ticket của mentor hiện tại; backend cho Mentor B giải quyết ticket đang giao cho Mentor A. |
| API-AUD-07 | S2 | Mở lại ticket | FE có giới hạn 48 giờ, backend không kiểm tra thời hạn; ticket đã giải quyết 72 giờ vẫn mở lại được qua API. |
| API-AUD-08 | S1 | Cấu hình rubric/điểm đã khóa | FE luôn bật allow_override; backend cho thay rubric sau khi khóa điểm, xóa điểm thuộc tiêu chí bị thay và tạo điểm 85% cho tiêu chí mới, giữ trạng thái submitted. |

Mức S1 đề xuất cho nguy cơ ảnh hưởng tính toàn vẹn điểm hoặc lộ dữ liệu/mã mời; S2 cho mất dữ liệu nhập, hiển thị sai, sai phạm vi và sai quy trình. Có thể điều chỉnh theo ma trận severity chính thức của dự án.

## 3. Bằng chứng, cách tái hiện và hướng sửa đề xuất

### API-AUD-01 — Sai định dạng danh sách thông báo

**Luồng:** GET `/api/v1/announcements` → useMockStore.syncFromBackend → dashboard/layout dùng store.

- Backend: `backend/app/api/v1/endpoints/announcements.py:44` trả `ApiResponse[AnnouncementPaginationResponse]`, dạng `data = {items, total, page, page_size}`.
- Frontend: `frontend/src/store/useMockStore.ts:1541–1543` unwrap `data` rồi kiểm tra `Array.isArray(annArr)`. Đối tượng phân trang không vượt qua điều kiện này nên store không cập nhật.
- `frontend/src/pages/candidate/CandidateDashboardPage.tsx:280–284` hiển thị số lượng và danh sách từ `announcements` trong store.

**Tái hiện:** tạo một thông báo, gọi GET; API có một phần tử trong `data.items`, nhưng giá trị mà bộ đọc store kiểm tra vẫn là object. Khi tải lại phiên, các khu vực dùng store có thể trống hoặc giữ dữ liệu cũ dù trang quản trị thông báo tải đúng.

**Hướng sửa:** thống nhất adapter đọc `items`, xử lý phân trang, ánh xạ đầy đủ priority/audience. Không kết luận mọi kênh thông báo đều lỗi: trang AdminAnnouncements và API notifications có bộ đọc riêng.

### API-AUD-02 — Sửa nội dung làm đổi đối tượng nhận

- `frontend/src/pages/admin/AdminAnnouncementsPage.tsx:120`: mở form sửa bằng `setTargetRole(item.targetRole || 'all')`.
- `frontend/src/api/notificationsApi.ts:76–79` và hàm list trả dữ liệu thô; không chuyển `target_audience` thành `targetRole`.
- `backend/app/schemas/announcement.py:92` trở đi chỉ trả `target_audience`.
- `AdminAnnouncementsPage.tsx:138` gửi lại `target_audience` từ giá trị form.

**Tái hiện:** tạo thông báo `target_audience=judge`, mở sửa sau khi tải danh sách từ API, chỉ đổi tiêu đề rồi lưu. Theo phép ánh xạ hiện tại, form chọn `all`; PUT lưu `target_audience=all`. Kiểm thử xác nhận response mới đã đổi phạm vi.

**Ảnh hưởng:** nội dung dành cho một nhóm có thể xuất hiện với các nhóm khác dù BTC chỉ định sửa nội dung.

**Hướng sửa:** dùng một tên trường thống nhất hoặc chuyển singular/plural tại adapter. Giữ phạm vi cũ khi người dùng không sửa trường này; bổ sung kiểm thử round-trip.

### API-AUD-03 — “Cố vấn phụ trách” chưa nối với CSDL

- UI: `frontend/src/pages/admin/AdminTopicsPage.tsx:588–593` cho nhập `mentorName`.
- Lời gọi thành công chính tại `AdminTopicsPage.tsx:197–201` chỉ gửi title, description, max_teams.
- `mentorName` chỉ được chuyển vào nhánh fallback cục bộ tại dòng 214.
- `backend/app/schemas/topic.py:39–45` và `backend/app/models/topic.py:32` không có trường/quan hệ cố vấn phụ trách tương ứng.

**Tái hiện:** nhập tên cố vấn rồi tạo đề tài. Payload chính không chứa tên cố vấn. Gửi thử thêm `mentorName` trực tiếp vào API vẫn được tiếp nhận nhưng trường bị bỏ qua; response và model không lưu thông tin đó.

**Hướng sửa:** chốt phân công theo tài khoản `mentor_id` hoặc quan hệ nhiều cố vấn, bổ sung model/schema/API và dùng lựa chọn tài khoản trên FE. Nếu đây chỉ là thông tin mô tả, cần đặt tên và lưu theo hợp đồng rõ ràng.

### API-AUD-04 — Chưa đăng nhập vẫn lấy được mã mời/email đội

- `backend/app/api/v1/endpoints/teams.py:25–27` không có dependency xác thực ở GET danh sách.
- `backend/app/services/team_service.py:85,130` đưa email thành viên và invite_code vào TeamResponse.
- Giao diện các trang nghiệp vụ đang nằm sau ProtectedRoute, nhưng API không áp dụng cùng ranh giới.

**Tái hiện:** gọi GET `/api/v1/teams` không có Authorization. Kiểm thử nhận **200**, kèm mã `AUD123` và email thành viên của đội được tạo trong DB kiểm thử.

**Ảnh hưởng:** dữ liệu liên hệ và mã dùng để tham gia đội có thể bị liệt kê ngoài luồng đăng nhập. GET chi tiết đội cũng cần rà soát cùng chính sách vì route hiện không đặt dependency xác thực.

**Hướng sửa:** yêu cầu xác thực và giới hạn theo vai trò/phạm vi; nếu cần danh sách công khai, tạo DTO công khai loại bỏ mã mời và thông tin liên hệ. Không chỉ ẩn trường ở FE.

### API-AUD-05 — Hạn chế mã nguồn chỉ có ở lời mô tả UI

- `frontend/src/pages/mentor/MentorCheckpointsPage.tsx:37` ghi rõ mentor bị hạn chế truy cập mã nguồn.
- `frontend/src/store/useMockStore.ts:1451` vẫn gọi GET `/submissions` cho mentor.
- `backend/app/services/submission_service.py:568` chỉ giới hạn theo đội khi user là candidate; mentor đọc danh sách chung.
- Response tại `submission_service.py:150–153` vẫn chứa repo_url, commit_sha, submission_data.

**Tái hiện:** đăng nhập vai trò mentor và GET `/api/v1/submissions`; nhận **200** với URL repository, commit SHA và dữ liệu bài nộp.

**Phân loại:** xác nhận không thống nhất giữa chính sách đang công bố trên UI và dữ liệu API. Nếu sản phẩm chủ đích cho mentor xem repository thì cần sửa mô tả; nếu chủ đích cấm thì cần DTO tiến độ riêng và kiểm soát BE. Chưa khẳng định các URL repository đó là repository riêng tư.

### API-AUD-06 — Mentor có thể xử lý ticket của người khác

- `frontend/src/pages/SupportTickets.tsx:242–249` có điều kiện `(isMentor && Boolean(t.assignedMentorId))`, khiến mọi ticket đã được giao đều được coi là giao cho mentor hiện tại.
- Backend tại `backend/app/services/support_service.py:175–186` kiểm tra mentor khác chỉ khi action=accept. Nhánh resolve/update_response không có kiểm tra người phụ trách tương đương.

**Tái hiện:** tạo ticket trạng thái in_progress, assigned_to=Mentor A; dùng tài khoản Mentor B gọi PATCH với `{action: 'resolve', response: '...'}`. Nhận **200**, trạng thái trong CSDL thành resolved.

**Ảnh hưởng:** nhóm “của tôi” và quyền thao tác FE không chính xác; mentor không được giao vẫn có thể phản hồi hoặc hoàn tất ticket.

**Hướng sửa:** bỏ nhánh nhận mọi assignedMentorId ở FE; backend áp dụng một chính sách ownership cho toàn bộ hành động cập nhật. Giữ quyền điều phối riêng cho admin.

### API-AUD-07 — Quy tắc mở lại 48 giờ chưa có trên API

- `frontend/src/pages/SupportTickets.tsx:557–569` chặn khi quá 48 giờ.
- `backend/app/services/support_service.py:193–194` chỉ chuyển trạng thái sang in_progress, không kiểm tra tuổi quyết định giải quyết.
- Model/response ticket cũng chưa có mốc resolved_at riêng để làm căn cứ ổn định.

**Tái hiện:** tạo ticket resolved với created_at và updated_at cách hiện tại 72 giờ; candidate sở hữu ticket gọi PATCH `{action: 'reopen'}`. Nhận **200**, trạng thái thành in_progress.

**Hướng sửa:** lưu resolved_at, kiểm tra hạn phía BE, trả mã REOPEN_WINDOW_EXPIRED thống nhất. Đồng bộ FE theo cùng mốc, tránh dùng updated_at có thể thay đổi bởi thao tác khác.

### API-AUD-08 — Ghi đè rubric tạo điểm tự động cho phiếu đã khóa

- `frontend/src/pages/admin/AdminCriteriaPage.tsx:211` luôn gửi `allow_override: true`, kể cả thao tác cấu hình thông thường.
- `backend/app/services/evaluation_service.py:119` bỏ kiểm tra khóa rubric khi cờ này bật.
- `backend/app/repositories/evaluation_repo.py:59` xóa Evaluation của tiêu chí không còn trong danh sách mới.
- `evaluation_repo.py:100–123` tạo lại Evaluation cho tiêu chí mới với `score = round(max_score * 0.85, 1)` và sao chép status của điểm cũ, bao gồm submitted.

**Tái hiện đã xác nhận:**

1. Tạo tiêu chí A, có phiếu submitted với điểm **8/10**.
2. Gửi rubric mới không bật override: API trả **409**, đúng cơ chế khóa.
3. Gửi cùng yêu cầu với override=true như FE hiện tại: API trả **201**.
4. Kiểm tra DB: bản ghi điểm gốc bị thay; tiêu chí mới có điểm **8,5/10**, trạng thái **submitted**, không có thao tác chấm điểm của giám khảo cho tiêu chí đó.

**Ảnh hưởng:** dữ liệu điểm chính thức có thể thay đổi bởi thao tác chỉnh rubric và nhận điểm tự sinh. Không chỉ là một endpoint chưa nối; đây là chuỗi tích hợp FE–BE–CSDL cần ưu tiên trước.

**Hướng sửa:** bỏ bật override mặc định; thiết kế luồng sửa rubric sau chấm có xác nhận/quyền/audit phù hợp. Không tự tạo điểm 85% hoặc tự đánh dấu submitted cho tiêu chí mới. Bảo toàn lịch sử và yêu cầu giám khảo chấm lại khi cần.

## 4. Khoảng trống chức năng cần chốt, chưa tính vào 8 lỗi

### Phân công giám khảo có API nhưng chưa có thao tác tương ứng trên FE

- Backend đã có POST `/api/v1/admin/evaluations/assignments` tại `backend/app/api/v1/endpoints/evaluations.py:216` và PATCH `/admin/personnel/{id}` có assigned_team_ids.
- Rà soát toàn bộ FE không thấy lời gọi hai thao tác này. Trang nhân sự hiện chỉ hiển thị số đội được phân công và tạo/xóa tài khoản.
- Backend có chế độ cho mọi giám khảo chấm khi bảng phân công rỗng; đây là hành vi được ghi rõ trong model/repository. Vì vậy không gắn nhãn “thiếu route” cho chế độ này.
- Nếu sản phẩm yêu cầu BTC phân công từng giám khảo qua giao diện, hiện thiếu luồng UI để thực hiện dù API đã có. Khi đã có phân công, tài khoản mới có thể không thấy bài nếu chưa được phân công.

### Trang “Đội thi thuộc lĩnh vực phụ trách” chưa áp dụng phạm vi mentor

`frontend/src/pages/mentor/MentorTeamsPage.tsx:32` hiển thị toàn bộ teams trong store; không lọc theo người phụ trách. Việc triển khai cần đi cùng quyết định phân công mentor ở API-AUD-03, thay vì tự suy diễn từ tên chuyên môn.

## 5. Những trường hợp không kết luận nhầm là lỗi

- `/evaluations` nhận submission_id nhưng một số màn hình gửi ID đội: backend có hàm resolve bài nộp theo submission hoặc team, nên khác tên ID chưa đủ chứng minh sai kết nối.
- updateRubrics dùng POST `/rubrics`: đây là route cấu hình thực tế hiện tại; phần comment cũ ghi PUT không khiến lời gọi đang dùng bị thiếu route.
- Nhiều hàm cập nhật local trong useMockStore không có caller đang hoạt động. Không tính riêng tất cả các hàm đó là lỗi người dùng chỉ vì nhìn thấy setState hoặc catch rỗng.
- Việc API tồn tại không đồng nghĩa mọi luồng UI và điều kiện nghiệp vụ đã được kiểm thử đầy đủ.

## 6. Phạm vi xác minh và bàn giao

- Đối chiếu route bằng OpenAPI sinh từ ứng dụng hiện tại; đọc payload, schema, adapter, service và repository.
- Xác minh tám tình huống bằng HTTP client gọi trực tiếp ứng dụng FastAPI và CSDL SQLite trong bộ nhớ, dùng session đọc lại riêng khi cần.
- Chẩn đoán FE trong báo cáo dựa trên đường đi mã nguồn và response API thật của môi trường kiểm thử; chưa thao tác lại toàn bộ các màn hình bằng trình duyệt trong lần audit này.
- Không gọi API ghi lên QA/production; không sử dụng dữ liệu người dùng thật cho các tình huống thay đổi rubric/ticket.
- Chưa kiểm tra cấu hình triển khai, đường truyền GitHub OAuth/GitHub API, CORS thực tế của domain production hoặc hành vi PostgreSQL nhiều tiến trình.

Tệp chẩn đoán cục bộ trong `tmp/api-audit/`:

- `openapi.json`: hợp đồng route/schema backend tại thời điểm kiểm tra.
- `frontend-calls.json`: vị trí gọi API trích xuất từ mã frontend.
- `test_contracts.py`: tám tình huống chẩn đoán tái hiện hành vi lỗi, không phải bản vá hay bộ nghiệm thu sau sửa.

**Chưa thực hiện bản vá.** Thứ tự đề xuất khi được duyệt sửa: API-AUD-08 và API-AUD-04 trước; tiếp theo API-AUD-02, 06, 07; rồi thống nhất chính sách API-AUD-05 và hoàn thiện API-AUD-01, 03.
