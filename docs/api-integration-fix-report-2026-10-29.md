# Báo cáo sửa lỗi tích hợp API FE–BE

Ngày: **29/10/2026**. Phạm vi: tám lỗi API-AUD-01 đến API-AUD-08 trong bản kiểm tra trước sửa.

## 1. Kết quả thực hiện

| Mã | Thay đổi đã thực hiện |
| --- | --- |
| API-AUD-01 | Store đọc đúng response thông báo phân trang qua adapter chung, lấy đủ các trang và ánh xạ audience/priority. Dashboard đọc lại được thông báo từ server. Response không hợp lệ hoặc phân trang không tiến triển được xử lý thành lỗi. |
| API-AUD-02 | Thống nhất ánh xạ audience cho list/create/update và lúc mở form sửa. Thông báo riêng cho giám khảo giữ phạm vi judge khi sửa nội dung và tải lại. Giữ phần ánh xạ danh sách đã có trong workspace. |
| API-AUD-03 | Thay tên cố vấn tự do bằng lựa chọn tài khoản mentor đang hoạt động. FE gửi mentor_id; BE kiểm tra vai trò/trạng thái và lưu quan hệ CSDL. Response trả mentor_id/mentor_name. Hỗ trợ tạo, đọc lại, đổi, bỏ phân công; xóa cố vấn gỡ liên kết. Trường lạ trong request đề tài nhánh bị từ chối, không âm thầm bỏ qua. |
| API-AUD-04 | Danh sách đội yêu cầu xác thực. Candidate chỉ xem đội của mình; admin có dữ liệu quản trị; mentor nhận dữ liệu đã che mã mời/email; judge dùng API chấm ẩn danh. Chi tiết đội áp dụng kiểm tra tương ứng. |
| API-AUD-05 | Mentor nhận tiến độ nhưng không nhận repo_url, demo_url, commit_sha, submission_data, note, feedback hoặc lịch sử chứa tài liệu. Bảo vệ danh sách, chi tiết và đường dẫn theo checkpoint. Mentor/judge không được đọc audit log bài nộp; judge sử dụng API chấm ẩn danh. |
| API-AUD-06 | Sửa bộ lọc ticket “tôi phụ trách”. BE lọc danh sách trước phân trang và kiểm tra quyền ở đọc chi tiết/mọi thao tác ghi. Mentor không xử lý ticket giao cho người khác; admin giữ quyền điều phối. Tiếp nhận đồng thời dùng khóa theo ticket trong tiến trình và khóa dòng SQL. |
| API-AUD-07 | Thêm resolved_at trong CSDL/response; FE dùng cùng mốc. API chặn candidate mở lại sau 48 giờ. Đóng ticket không gia hạn thời hạn; giải quyết lần tiếp theo có mốc mới. Ticket cũ chưa có timestamp được giữ căn cứ updated_at trước khi đóng. |
| API-AUD-08 | FE không bật allow_override. BE không cho cờ này vượt khóa khi đã có điểm submitted. Bỏ sinh điểm 85% cho tiêu chí mới; không tự tạo điểm hoặc đánh dấu submitted cho tiêu chí chưa được chấm. Sửa rubric và lưu điểm khóa cùng các dòng rubric trong SQL. |

Không sửa hoặc tái tính điểm lịch sử. Các thay đổi quyền ở API chi tiết/lịch sử/audit log ngăn đường vòng qua endpoint khác.

## 2. CSDL và migration

Thêm `backend/migrations/versions/006_api_integration.py`, nối sau `005_team_description`:

- subtopics.mentor_id: nullable, có index và FK tới users.id, ON DELETE SET NULL.
- support_tickets.resolved_at: nullable, thời gian UTC.
- Ticket resolved/closed cũ chưa có resolved_at dùng updated_at làm căn cứ dự phòng. Không thể khôi phục chính xác thời điểm giải quyết nếu dữ liệu cũ chưa từng lưu riêng mốc này.
- Migration kiểm tra cột/ràng buộc/index có sẵn, tương thích trường hợp startup đã tự thêm cột.

**Đã áp dụng và xác minh trên SQLite cục bộ:** sao lưu, thử trên bản sao, áp dụng riêng thay đổi 006 lên tệp backend/hackflow.db được chỉ định, đối chiếu dữ liệu và ràng buộc. CSDL cục bộ vốn không quản lý revision Alembic; giữ nguyên trạng thái đó, không stamp các migration cũ.

Bản sao nguyên trạng trước thay đổi: `tmp/api-audit/before-006-20261029-004702-original.db`.

`tmp/api-audit/schema-result.json` xác nhận nội dung các bản ghi nghiệp vụ được bảo toàn ngoài bổ sung resolved_at theo quy tắc migration, bao gồm **22 tài khoản, 5 đội, 15 thành viên, 6 đề tài nhánh, 6 bài nộp, 12 bản ghi điểm và 2 ticket**. Đối chiếu trên nội dung bản ghi, không chỉ số lượng. Không dùng dữ liệu thật để thử xóa tài khoản, đội hoặc sửa điểm.

## 3. Kiểm thử

| Kiểm tra | Kết quả |
| --- | --- |
| Toàn bộ backend | **161 passed**, 8 warnings. |
| Kiểm thử mới cho audit/migration | **22 ca**, nằm trong tổng số trên. |
| Thời gian và adapter thông báo frontend | **6 passed**. |
| Trình duyệt cho các luồng audit | **5 nhóm tình huống passed**, không ghi nhận pageerror. |
| Hồi quy trình duyệt BUG-35–40 | **5 nhóm tình huống passed**. |
| TypeScript, ESLint trên các file FE thay đổi | Thành công. |
| Production build | Thành công; cảnh báo bundle JavaScript khoảng 1,2 MB. |
| Migration nâng/hạ trên schema cũ và schema đã tự thêm cột | Thành công, giữ bản ghi. |
| git diff --check | Không có lỗi; Git thông báo quy đổi LF/CRLF ở một file đã thay đổi từ trước. |

Kiểm thử backend mới xác nhận:

1. Audience thông báo và response phân trang; người ngoài nhóm không thấy thông báo riêng.
2. Lưu/đọc/bỏ phân công; từ chối tài khoản sai vai trò, không tồn tại hoặc ngừng hoạt động; gỡ liên kết khi xóa cố vấn.
3. Chặn đọc đội chưa đăng nhập, candidate đọc chéo và judge dùng API định danh; che đúng trường cho mentor.
4. Loại tài liệu ở bài nộp hiện tại/lịch sử cho mentor; dữ liệu gốc của admin vẫn còn.
5. Chặn Mentor B resolve/update_response/close/escalate hoặc đổi status ticket của Mentor A; admin vẫn can thiệp được.
6. Hai mentor tiếp nhận đồng thời: một thành công, một bị từ chối, không ghi đè người phụ trách.
7. Mốc mở lại 47/49/72 giờ; đóng không kéo dài hạn; ticket cũ vẫn giữ căn cứ thời gian trước khi đóng.
8. Cả allow_override=false/true đều không đổi điểm/tiêu chí đã khóa. Thêm tiêu chí khi còn điểm draft không tự sinh điểm mới.

Năm nhóm trình duyệt của audit kiểm tra dashboard tải thông báo sau reload; sửa thông báo giữ phạm vi judge; gán/đọc/bỏ cố vấn; bộ lọc quyền mentor; và lưu rubric không bật override, hiển thị đúng lỗi khóa.

Một ca kiểm thử cũ từng cho phép candidate ngoài đội đọc thông tin đội khác đã được cập nhật: người ngoài nhận 403, thành viên đội vẫn nhận 200. Không bỏ qua ca này.

## 4. Tệp bàn giao

- Migration: `backend/migrations/versions/006_api_integration.py`.
- Kiểm thử backend: `backend/tests/test_api_integration_audit.py`, `backend/tests/test_api_integration_migration.py`.
- Kiểm thử adapter: `frontend/tests/notificationsApi.test.mjs`.
- Kiểm thử trình duyệt: `frontend/tests/api-integration.ui.mjs`.
- Ảnh kiểm tra và kết quả đối chiếu CSDL: `tmp/api-audit/`.

## 5. Phạm vi và triển khai

- Hoàn thành tám lỗi xác nhận. Hai mục “khoảng trống chức năng cần chốt” trong audit — UI phân công giám khảo và phạm vi đội theo lĩnh vực mentor — là hạng mục chức năng riêng, không được tính là đã triển khai lần này.
- Backend kiểm thử bằng SQLite tách biệt; trình duyệt dùng API giả lập theo hợp đồng. Dữ liệu SQLite cục bộ được đối chiếu riêng trên tệp thực tế.
- Chưa triển khai QA/production, chưa kiểm thử PostgreSQL nhiều tiến trình hay OAuth/GitHub trực tiếp trong lần sửa này.
- Khi triển khai môi trường đã quản lý bằng Alembic, đưa schema tới revision 006 trước khi phục vụ mã mới. Với DB dùng startup tự tạo schema, cần kiểm tra cơ chế revision hiện có để tránh chạy lại migration tạo bảng đã tồn tại. Cập nhật FE–BE cùng phiên bản để đồng nhất quyền và các trường mới.
