# Báo cáo rà soát kết nối frontend–backend và dữ liệu mock

Ngày: 26/10/2026. Phạm vi: mã nguồn trong workspace HackFlow9; chưa triển khai lên máy chủ đang vận hành.

## Kết quả kiểm tra

- Backend: 114/114 kiểm tra tự động đạt, gồm các ca mới kiểm tra tắt demo, quyền nộp bài, deadline, SHA do backend xác minh, mô tả đội, cấu hình, trao đổi ticket, đối tượng nhận thông báo, trạng thái đọc/ẩn và lưu trọng số/thứ tự chặng.
- Frontend: TypeScript và bản build production đạt; ESLint đạt.
- Đối chiếu tĩnh: 113 lời gọi trực tiếp qua apiClient/axiosClient khớp phương thức HTTP và đường dẫn trong OpenAPI; 51 đích navigate/Link tĩnh khớp route đã khai báo.
- Script tái kiểm tra: scripts/audit-frontend-connections.cjs và scripts/audit-backend-contract.py. Chạy script frontend trước, sau đó script Python trong môi trường backend.
- Migration 005: thử upgrade/downgrade trên schema nền riêng biệt đạt. Thử toàn bộ lịch sử migration trên SQLite thất bại tại migration 003 cũ do ALTER constraint không được SQLite hỗ trợ.
- Chưa chạy thao tác trình duyệt đầu-cuối trên môi trường triển khai, GitHub OAuth thật, GitHub API thật hoặc PostgreSQL thật. Kiểm tra tĩnh không chứng minh mọi nhánh click động đều đúng.

## Các kết nối đã sửa

| Nhóm thao tác | Thay đổi |
| --- | --- |
| Button dùng chung | Mặc định type=button, tránh nút phụ tự gửi form; nút submit tường minh vẫn hoạt động. |
| Tạo/tham gia/rời đội, chuyển trưởng nhóm, sửa mô tả | Gọi API thật; bỏ fallback thành công cục bộ; bổ sung lưu mô tả đội và kiểm tra quyền trưởng nhóm. Wizard onboarding cũng dùng API thật. |
| Chọn/hủy đề tài | Chỉ cập nhật thành công khi backend xác nhận; bỏ dữ liệu mock thay thế khi mất mạng. |
| Nộp bài chung cuộc | Một yêu cầu nộp thay vì gửi trùng; backend áp dụng quyền, deadline, lịch sử và xác minh SHA. Bỏ SHA giả và tự tạo checkpoint cuối. |
| Quản trị đội/tài khoản/whitelist/nhân sự | Bỏ các đường báo thành công khi API lỗi; không tự sinh thành viên giả trong chế độ vận hành. |
| Cấu hình cuộc thi | Lưu cấu hình bổ sung trong DB; có API đọc cấu hình chung cho các vai trò; đợi backend xác nhận trước thông báo thành công. |
| Chặng nộp | Lưu trọng số, thứ tự, chèn chặng và sắp xếp theo deadline qua backend; tải lại trạng thái khi lỗi. Lưu ý thao tác sắp xếp nhiều chặng gồm nhiều request, chưa là giao dịch nguyên tử. |
| Tiêu chí/chấm thi | Sửa thao tác lưu rubric sang POST đúng API; bỏ phương thức DELETE không tồn tại. Lưu/khóa/mở khóa điểm dừng khi API lỗi. |
| Không gian giám khảo | Lấy danh sách bài được backend cấp; dùng định danh ẩn danh; đồng bộ chế độ chấm ẩn danh. |
| Bảng xếp hạng/công bố | Hiển thị dữ liệu leaderboard thật, không thay bằng bảng điểm tính cục bộ; công bố qua API tương ứng. |
| Ticket hỗ trợ | Thí sinh được trả lời ticket của đội, lưu lịch sử trao đổi; không cho payload phản hồi tự thay người phụ trách/trạng thái/độ ưu tiên. |
| Thông báo | Lưu và lọc đúng đối tượng all/candidate/judge/mentor; bảo vệ API đọc/ẩn; trạng thái đọc/ẩn lưu DB thay vì bộ nhớ tiến trình. |
| Đồng bộ | Refresh từ máy chủ khi focus, quay lại tab và định kỳ; bỏ đồng bộ dữ liệu nghiệp vụ giả qua localStorage; hạn chế dữ liệu tài khoản cũ xuất hiện khi đổi người dùng. |
| Xử lý lỗi/API URL | Chuẩn hóa lỗi backend cho giao diện; hỗ trợ base URL tương đối bắt đầu bằng dấu /. |

## Khảo sát mock và dữ liệu cục bộ

**Vẫn còn mã mock trong repository**, không thể kết luận đã xóa sạch:

- frontend/src/mock/, frontend/src/mocks/, các persona và một số phương thức cũ trong useMockStore.ts.
- Tên useMockStore vẫn được dùng cho kho trạng thái giao diện và dữ liệu tải từ API; tên này không có nghĩa mọi dữ liệu trong store đều là giả.
- Trang UI preview, đổi persona và nút minh họa quyền truy cập được giới hạn vào DEV cùng VITE_USE_MOCK=true.
- Fallback chỉnh sửa topics/checkpoints/criteria chỉ hoạt động trong chế độ demo tường minh.
- Backend chỉ cho phép persona/token/demo seed khi ENABLE_DEMO_DATA=true và ENVIRONMENT thuộc development/test; mặc định tắt. Test fixtures chủ động bật demo trong môi trường kiểm thử riêng.
- Một số view vẫn có thể hiển thị bản dữ liệu API đã tải trước đó khi tải lại thất bại (ví dụ ticket/dashboard). Đây là dữ liệu cache có thể cũ, cần phân biệt với dữ liệu máy chủ vừa xác nhận.
- Hồ sơ bổ sung và metadata quản trị vẫn còn dùng file JSON phía backend. Đây là lưu trữ thật nhưng chưa phù hợp nhiều instance/ổ đĩa tạm.
- localStorage còn phục vụ token, tùy chọn giao diện/onboarding và một số cache hồ sơ cũ.
- Tắt seed demo không tự xóa tài khoản/dữ liệu demo đã tồn tại trong DB. Chưa xóa dữ liệu vận hành.

## Trước khi đưa bản sửa vào sử dụng

1. Sao lưu DB, kiểm tra revision hiện tại và áp dụng migration 005 trên môi trường thử nghiệm trước. Migration thêm các trường cho đội, cấu hình, ticket, user, thông báo và checkpoint. Chưa áp dụng vào DB đang chạy; code mới cần schema mới.
2. Nếu triển khai SQLite từ lịch sử migration cũ: sửa/chuẩn bị riêng bước ALTER constraint của migration 003; không coi toàn bộ chuỗi migration đã đạt. Nếu dùng PostgreSQL: chạy và xác minh toàn bộ chuỗi trên PostgreSQL thử nghiệm.
3. Đặt ENVIRONMENT=production, ENABLE_DEMO_DATA=false, DEBUG=false; frontend không bật VITE_USE_MOCK. Cấu hình đúng API URL, CORS, JWT secret và thông tin GitHub OAuth/API.
4. Kiểm tra, xử lý dữ liệu/tài khoản demo đã có trong DB theo danh sách được chủ hệ thống duyệt.
5. Chuyển metadata JSON sang DB hoặc bố trí lưu trữ bền vững trước khi chạy nhiều instance.
6. Kiểm thử trình duyệt với bốn vai trò trên staging: tạo đội → chọn đề tài → nộp bài → chấm → công bố; ticket và thông báo; làm mới trang sau từng thao tác để xác nhận lưu thật.
7. Trọng số chặng đã được lưu và trả về API; chưa xác nhận nghiệp vụ tổng hợp điểm nhiều chặng dùng trường này. Không coi việc lưu trọng số là bằng chứng công thức leaderboard đã hỗ trợ tổng hợp nhiều chặng.

## Kết luận phạm vi

Các lỗi kết nối được phát hiện trong lượt rà soát đã được sửa tại mã nguồn và kiểm tra tự động như trên. Chưa đủ bằng chứng để xác nhận toàn bộ hệ thống sẵn sàng production hoặc mọi click đã được kiểm thử trực tiếp. Các giới hạn triển khai, lưu trữ và kiểm thử còn lại được ghi rõ để tránh nhận định sai về mức độ hoàn thành.
