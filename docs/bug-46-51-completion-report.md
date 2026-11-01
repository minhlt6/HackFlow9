# Báo cáo hoàn thành BUG-46–51

Ngày: **01/11/2026**. Căn cứ: `bug-46-51-assessment-plan.md`. Bản vá sửa logic, metadata API và trạng thái giao diện; không reset CSDL, không đổi mã mời đã phát, không xóa hoặc tự sửa điểm/bài nộp.

## 1. Thay đổi chính

| Bug | Bản vá |
| --- | --- |
| 46 | Candidate Dashboard và trang checkpoint dùng chung đồng hồ neo theo `server_time`, cập nhật mỗi giây; đọc lại API khi chọn chặng, trở lại tab và định kỳ 30 giây. Badge/form đồng bộ ở trước mở, đang mở, grace và đóng. Xác nhận nộp cũng bị khóa khi hết giờ. Không xác minh được trạng thái thì khóa form và báo lỗi. |
| 47 | Thêm API `GET /topics/cancellation-policy`. Chỉ leader candidate được duyệt mới có thể hủy khi còn ở giai đoạn chọn đội/đề tài, đội chưa khóa, chưa nộp bài và cửa sổ chưa đóng. POST kiểm tra lại trong transaction trước khi gỡ liên kết/giảm quota. Nút hủy ở banner và card khóa cùng lý do. |
| 48 | Dùng một hàm kiểm tra đủ điều kiện cho API đọc và ghi: final thật, trạng thái submitted/evaluated/late, repo và SHA hợp lệ, thời điểm nhận trong cửa sổ nộp kể cả grace. Draft lẫn submitted đều bị chặn nếu không đạt. Xóa hẳn helper tự sinh final khi judge chấm, không còn ngoại lệ demo. |
| 49 | Mã mới 6–16 ký tự chữ/số/gạch ngang; tự sinh vẫn 6. FE/BE chuẩn hóa khoảng trắng/hoa thường, input không cắt mã 9–16 ký tự. Mã cũ 4–5 ký tự chỉ được tra cứu hoặc giữ nguyên khi sửa; không tạo mới mã ngắn. |
| 50 | Mở rộng API chấm hiện có, bổ sung `checkpoint_submissions` theo đúng đội thuộc phạm vi phân công. Đội được phân công chưa có final vẫn được xem tiến độ nhưng `can_evaluate=false`. Store dùng cùng review ID cho đội và bài tiến độ; tab hiển thị tên/trạng thái thật, không giả định mọi bài đều đã nộp. |
| 51 | Directory trả `is_active`; endpoint thí sinh lẻ loại inactive. Cùng điều kiện active + approved + chưa có đội được dùng cho số đếm, nút ghép và điền nhanh. Danh sách không tải được bị xóa khỏi tập ghép; không có ứng viên thì nút khóa. Khi ứng viên đổi trạng thái trong lúc xác nhận, đọc lại và báo thông tin thay vì nhầm là lỗi hệ thống. 401 vẫn xử lý đăng nhập, không bỏ xác thực. |

### Những điều kiện được giữ

- Hết hạn checkpoint **không có nghĩa cấm chấm**: bài đã nộp hợp lệ trước hạn vẫn được chấm sau deadline.
- Judge không được mở rộng quyền qua `/submissions`. API chấm mới chỉ trả bài tiến độ trong phạm vi phân công và không thêm email, mã mời hay người nộp. Cấu hình hiển thị danh tính hiện có được giữ.
- Điểm cũ gắn với bài không hợp lệ không bị xóa khỏi DB. Giao diện judge không tính chúng là đã chấm xong/đủ điều kiện; dữ liệu lịch sử và kết quả đã công bố cần BTC rà soát riêng, bản vá không tự viết lại bảng điểm đã công bố.
- Không thay bố cục trang hoặc thay thư viện giao diện. Giữ form, tab, bảng, Badge, Modal và các xác nhận đã có; bổ sung thông báo/disabled theo metadata.

## 2. Dữ liệu demo và lịch cũ

Hai tiêu đề mẫu cũ “Chặng 1 — Đã đóng” và “Chặng 3 — Chưa mở” được trình bày trung tính trên luồng candidate; trạng thái nằm ở badge, không suy ra từ tên. Các tên tùy chỉnh khác được giữ.

Công cụ tạo demo mới dùng tên trung tính, hạn chung kết sau các chặng tiến độ (96 giờ thay vì 36 giờ), thời gian cuộc thi bao phủ lịch mới. README và kịch bản demo được cập nhật: final fixture chưa xác minh SHA chỉ để xem, cần nộp final hợp lệ để chấm.

**Không tự dời deadline của CSDL đang dùng.** Nếu lịch cũ có chung kết sớm hơn chặng tiến độ, trang Candidate và Admin Checkpoints hiển thị cảnh báo. BTC phải xem lại và xác nhận sửa lịch qua trang quản trị. Việc tự kéo dài hạn khi cuộc thi đang chạy sẽ thay đổi nghiệp vụ, nên không được thực hiện ngầm trong bản vá.

## 3. Hợp đồng FE–BE

| API | Hợp đồng sau sửa |
| --- | --- |
| `GET /checkpoints` | Giữ field cũ, FE dùng giờ server và refetch để tính trạng thái sống |
| `GET /topics/cancellation-policy` | `can_cancel_topic`, `reason`; lỗi đọc làm FE khóa hủy |
| `POST /topics/cancel` | 409 `TOPIC_CANCELLATION_LOCKED` khi không còn quyền; topic/quota/bài nộp không đổi |
| `GET /evaluations/submissions` | Giữ các field bài thật; bổ sung `review_id`, `can_evaluate`, `evaluation_block_reason`, `submission_status`, `checkpoint_submissions`; `submission_id=null` với đội được phân công chưa có final |
| `POST /evaluations` | Không final: 404; final không hợp lệ: 409 `FINAL_SUBMISSION_NOT_ELIGIBLE`; không tự tạo dữ liệu; quyền phân công và rubric vẫn được kiểm tra |
| API tạo/sửa/join đội | Cùng validation mã mời; mã trùng vẫn bị chặn; mã cũ không tự bị thay |
| Directory/unassigned/auto-match | Cùng cờ active; 400 `NO_ELIGIBLE_CANDIDATES` khi tập ứng viên đã hết; 401 là lỗi xác thực riêng |

FE và BE cần triển khai cùng phiên bản. Nếu chưa đọc được metadata mới, FE ưu tiên khóa thao tác thay vì cho ghi dựa trên dữ liệu cũ. Không cần migration DB.

## 4. Kết quả kiểm thử

| Nhóm | Kết quả |
| --- | --- |
| Toàn bộ backend với cấu hình CI | **202 passed** |
| Ca backend mới | **21 ca**, nằm trong tổng trên |
| Frontend unit/adapter | **18 ca đạt**: 13 cũ và 5 mới |
| Trình duyệt mới | **5 nhóm đạt** |
| Trình duyệt hồi quy | **23 nhóm đạt** cho audit API, BUG-35–45 và xác nhận admin |
| TypeScript, ESLint các phần FE sửa | Thành công |
| Production build | Thành công; còn cảnh báo bundle khoảng 1,22 MB |

Backend mới kiểm tra các phase hủy, đội khóa/có bài nộp, từ chối draft/submitted của final bất hợp lệ, chấm bài hợp lệ sau deadline, không tự sinh final cả khi bật demo, 3 bài tiến độ đúng phạm vi, quyền đọc của judge, mã 6/9/12/15/16 và mã cũ 4, mã sai/trùng, inactive trong directory và tập ghép.

Trình duyệt mới kiểm tra:

1. Dùng đồng hồ điều khiển để đi qua chưa mở → mở → đóng: badge và trường nhập thay đổi cùng nhau, không cần reload.
2. Đề tài đã chốt hiển thị lý do, nút hủy bị khóa, không phát sinh request hủy.
3. Judge xem 3 bài tiến độ và trạng thái pending thật, nhưng cả lưu nháp/khóa điểm đều disabled khi chưa có final; reload vẫn đúng.
4. Chỉ có inactive: số thí sinh hợp lệ bằng 0 và nút ghép bị khóa.
5. Form admin giữ nguyên mã 15 ký tự, giới hạn input 16 và nhãn nhất quán.

Hai kiểm thử cũ được cập nhật đúng yêu cầu mới: fixture dùng để kiểm tra trọng số phải có final hợp lệ; demo không còn được hủy trong hacking hoặc chấm final chưa xác minh. Không bỏ qua test hay mở lại đường demo để làm test xanh.

Các ca API chạy trên SQLite tách biệt; trình duyệt dùng API mô phỏng. CSDL cục bộ chỉ được đọc khi xác minh, không dùng làm nơi chạy thao tác phá dữ liệu. Kết quả CI GitHub và commit được báo trong tin nhắn bàn giao sau khi đẩy; chưa coi CI xanh là đã triển khai Railway.
