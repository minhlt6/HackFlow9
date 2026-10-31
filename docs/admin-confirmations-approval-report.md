# Xác nhận thao tác quản trị và duyệt tài khoản hàng loạt

Ngày hoàn thành: 31/10/2026.

## Chức năng bổ sung

Trang `/admin/approvals` có nút **Duyệt tất cả (N)**. Hộp xác nhận ghi rõ số lượng và phạm vi: toàn bộ thí sinh đang chờ trong danh sách đã tải, không phụ thuộc từ khóa tìm kiếm. Danh sách chờ chỉ gồm tài khoản candidate đang hoạt động.

Danh sách ID được giữ cố định lúc mở xác nhận. Tài khoản mới xuất hiện sau đó không bị duyệt ngoài phạm vi đã xác nhận. Tài khoản đã được người khác xử lý, bị vô hiệu hóa hoặc không phải candidate được backend bỏ qua; kết quả hiển thị số duyệt thực tế và số bỏ qua.

API mới: `POST /api/v1/admin/candidates/approve-all`, body `candidate_ids` gồm 1–10.000 ID. Chỉ admin được sử dụng. Backend duyệt tài khoản, thêm/kích hoạt email trong Whitelist và ghi audit trong cùng transaction. Nếu ghi lỗi trước commit, toàn bộ giao dịch được rollback. Gửi lại cùng danh sách không duyệt lại tài khoản đã xử lý và không tạo Whitelist trùng.

Duyệt đơn cũng có xác nhận, dùng khóa hàng khi xử lý và chỉ chấp nhận candidate đang hoạt động còn pending. Giao diện khóa thao tác khi chờ xác nhận hoặc đang gửi, không xóa dòng khỏi danh sách trước khi API thành công. Nếu lỗi tải dữ liệu, không cho duyệt dựa trên danh sách cũ chưa được xác minh.

## Các xác nhận quản trị

| Thao tác | Thay đổi |
| --- | --- |
| Duyệt thí sinh / duyệt tất cả | Xác nhận đối tượng, số lượng và tác động Whitelist |
| Duyệt một đội từ bảng hoặc hồ sơ | Xác nhận tên đội và quyền tham gia/nộp bài |
| Lưu cấu hình cuộc thi | Xem trước tên, giai đoạn, giới hạn thành viên, hạn cuối trước–sau |
| Sửa đề tài nhánh/quota/mentor | Xem trước đề tài, số chỗ và cố vấn trước–sau |
| Sửa checkpoint | Xác nhận tên, trọng số, hạn nộp và yêu cầu ảnh hưởng các đội |
| Sắp xếp/đổi thứ tự checkpoint | Xác nhận thứ tự mới trước các request ghi |
| Tạo/cập nhật thông báo | Xác nhận tiêu đề và nhóm người nhận trước khi đăng |
| Nhập Whitelist hàng loạt | Xác nhận số email duy nhất và tác động kích hoạt |
| Kích hoạt lại Whitelist | Xác nhận email cụ thể |
| Lưu rubric | Xác nhận trọng số trước–sau và tổng trọng số |

Giữ các xác nhận đã có: xóa, từ chối, ghép đội, duyệt đội hàng loạt, bắt đầu/dừng cuộc thi, công bố/ẩn kết quả và các cảnh báo bỏ nội dung chưa lưu. Luồng “Lưu & Rời đi” của cấu hình và xóa tiêu chí không bị hỏi xác nhận lưu lần thứ hai.

Các form tạo/sửa thông thường đã có hành động cuối rõ ràng vẫn giữ nút Lưu/Tạo/Hủy; không thêm hộp hỏi cho thao tác chỉ xem, lọc, tìm kiếm hoặc xuất CSV.

## Cân bằng và chia đều rubric

- **Cân bằng tỷ lệ / Chia đều** chỉ sửa bản xem trước tại trang hiện tại, không gọi API lưu và không coi trọng số đó là cấu hình đã lưu trong store.
- Hiển thị nhắc nhở còn bản xem trước. Người dùng bấm **Lưu Lên Hệ Thống**, xem lại nội dung và xác nhận mới ghi vào DB.
- Bấm Hủy không gửi request ghi. Làm mới khi có bản xem trước cần xác nhận bỏ nội dung chưa lưu.
- Hủy xác nhận lưu trong form thêm/sửa tiêu chí giữ lại form để tiếp tục chỉnh.
- Tiêu chí đã khóa bởi điểm chính thức vẫn ở chế độ chỉ xem; các xác nhận không cho phép vượt khóa.

## Kiểm thử

| Nhóm | Kết quả |
| --- | --- |
| Toàn bộ backend | **181 passed**, gồm 4 ca mới cho duyệt hàng loạt |
| Frontend unit/adapter | **13 passed** |
| Trình duyệt mới | **6 nhóm passed** |
| Trình duyệt hồi quy | **14 nhóm passed**: audit API, BUG-44–45 và BUG-35–40 |
| TypeScript, ESLint các file FE sửa | Thành công |
| Production build | Thành công; còn cảnh báo bundle khoảng 1,2 MB |

Backend kiểm tra: quyền admin, request phải có danh sách ID không rỗng, duyệt/Whitelist lưu thật, ID trùng, tài khoản đổi trạng thái/inactive/staff, tài khoản mới ngoài danh sách, gọi lại và rollback khi lỗi giữa giao dịch.

Trình duyệt mới kiểm tra: Hủy không ghi; tìm kiếm không thu hẹp nút duyệt tất cả; danh sách xác nhận không tự mở rộng; duyệt đơn cần xác nhận; lỗi duyệt giữ dữ liệu và cho thử lại; rubric xem trước không gọi API; Hủy làm mới không bỏ bản xem trước; cấu hình chỉ ghi sau xác nhận; hủy duyệt đội không ghi.

Các kiểm thử hồi quy đã được cập nhật để bấm bước xác nhận mới và tách xem trước rubric khỏi lưu; không bỏ qua các kiểm tra lưu dữ liệu, xử lý lỗi và khóa rubric trước đó.

## Phạm vi bàn giao

- Dùng lại `ConfirmDialog` qua hook mới `useActionConfirmation`; không thêm thư viện.
- Thêm adapter `candidateApprovalsApi` và một API backend duyệt hàng loạt; không cần migration.
- Không gửi email, không duyệt tài khoản thật trong quá trình kiểm thử, không reset CSDL đang dùng.
- Backend kiểm thử trên SQLite riêng; trình duyệt dùng API mô phỏng. Chưa triển khai hoặc xác minh nhiều tiến trình PostgreSQL trên Railway trong lần này.
