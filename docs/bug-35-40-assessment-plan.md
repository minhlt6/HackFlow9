# Đánh giá BUG-35–40 và kế hoạch vá

> Cập nhật sau triển khai: đã phát hiện thêm hộp thoại từ chối điền sẵn lý do thiếu thành viên cho mọi đội. Nhận định BUG-38 ban đầu bên dưới được bổ sung bằng bằng chứng này; bản vá đã bỏ lý do mặc định, đặt lại form theo đội và lưu ngữ cảnh xét duyệt. Kết quả triển khai và kiểm thử xem `bug-35-40-completion-report.md`.

Ngày đánh giá: 28/10/2026. Phạm vi: mã nguồn trong checkout hiện tại và truy vấn chỉ đọc `backend/hackflow.db`. Chưa chạy lại thao tác trên bản triển khai mà QA sử dụng. Không sửa mã ứng dụng hoặc dữ liệu. File DB đã có thay đổi trước khi bắt đầu đánh giá.

## 1. Kết luận

| Mã | Kết luận theo bằng chứng hiện có | Hướng xử lý |
| --- | --- | --- |
| BUG-35 | Chưa tái hiện; không phải hành vi được thiết kế. DB cục bộ có 5 đội, chỉ một GreenPulse AI / GP2026, không có GreenPulse IoT; không có tên hoặc mã trùng kể cả sau trim và chuẩn hóa hoa/thường. | Kiểm tra đúng môi trường QA, ID từng dòng và phản hồi API trước khi quyết định sửa. |
| BUG-36 | Xác nhận lỗi qua logic mã và phép tái hiện chuyển đổi thời gian ở UTC+7. | Sửa chuẩn hóa thời gian và mốc dữ liệu đã lưu. |
| BUG-37 | Hiện tượng thêm bản ghi tạm rồi mất khi F5 không khớp mã hiện tại. Tuy nhiên API tạo mới đang cập nhật tài khoản có sẵn theo email, có thể đổi cả vai trò. | Tách tạo mới và cập nhật; nếu hợp đồng là mời mới, trả 409 khi email đã tồn tại. |
| BUG-38 | Chưa đủ bằng chứng là lỗi. Lý do từ chối là nội dung BTC nhập tại thời điểm quyết định, không phải thông báo tự tính từ sĩ số hiện tại. DB cục bộ không có BlockShield. | Kiểm tra lịch sử; bổ sung ngữ cảnh xét duyệt và luồng yêu cầu duyệt lại. |
| BUG-39 | Xác nhận thiếu kiểm tra khóa đội trong backend; chưa xác nhận hiện tượng thành công giả/khôi phục sau F5. Quy tắc cấm giảm dưới min khi “đang dự thi” cần diễn đạt thành điều kiện trạng thái cụ thể. | Bảo vệ thao tác tại backend; đồng bộ UI theo response và thông báo lỗi nghiệp vụ. |
| BUG-40 | Xác nhận mẫu số 4 bị gắn cố định. Chưa tái hiện tử số 2 so với 3: dữ liệu cục bộ đội của leader có 3 thành viên. | Dùng chung nguồn dữ liệu đội và cấu hình; bỏ các giới hạn gắn cố định liên quan. |

## 2. Bằng chứng và phân tích

### BUG-35 — Hai dòng cùng tên và mã

- `backend/app/models/team.py:27,29` và migration `001_initial_schema.py` có unique index cho tên và mã mời. Kiểm tra cấu trúc SQLite thực tế xác nhận cả hai unique index tồn tại.
- `backend/app/api/v1/endpoints/admin.py:757` truy vấn Team với selectinload; không join tạo nhiều dòng theo thành viên. `frontend/src/api/adminTeamsApi.ts:212` chỉ map dữ liệu API; `frontend/src/hooks/useAdminTeams.ts:130,151` thay thế danh sách bằng `setTeams(result)`, không nối danh sách mẫu với dữ liệu thật.
- Khác ngày tạo/chặng không đủ chứng minh là hai đội độc lập; phải đối chiếu ID và dữ liệu trả về. Không xóa/gộp theo tên vì có thể mất liên kết bài nộp, thành viên và điểm.

### BUG-36 — Lưu xong vẫn dirty

- `AdminConfigPage.tsx:108–115` so sánh chuỗi `datetime-local` với `config.finalSubmissionDeadline.slice(0,16)`.
- `AdminConfigPage.tsx:156` chuyển `new Date(finalDeadline).toISOString()`. `useMockStore.ts:452` ghi chuỗi UTC này vào config sau khi API thành công, nhưng input vẫn giữ chuỗi giờ cũ.
- Phép tái hiện bằng Node tại Asia/Ho_Chi_Minh: input `2026-12-31T11:00` → lưu `2026-12-31T04:00:00.000Z` → baseline `2026-12-31T04:00` → dirty=true. Cùng lỗi ở luồng Lưu và rời trang.
- Đây còn là nguy cơ dịch giờ deadline khi bấm lưu mà không chỉnh: cắt chuỗi UTC để điền giờ địa phương đã thay đổi ý nghĩa thời điểm. Không chỉ tắt cảnh báo để che triệu chứng.

### BUG-37 — Mời email đã có

- `AdminMentorsJudgesPage.tsx:149–207` đã await POST, catch lỗi rồi return; danh sách trong tab được lọc theo email trước khi thêm. Vì vậy response 404 không đi tới nhánh thành công theo mã hiện tại.
- `admin.py:1407–1426` chuẩn hóa email, tìm user có sẵn rồi ghi đè full_name, role, approval_status, is_active. Đây là upsert đang được triển khai, không tạo user thứ hai cùng email. Chưa có bằng chứng nghiệp vụ cho phép nút “mời mới” âm thầm chuyển vai trò tài khoản.
- Chuyển người từ mentor sang judge có thể để trạng thái tab còn lại cũ đến lần tải tiếp theo; cần tải lại toàn bộ roster sau thành công.
- Thông báo “đã gửi thư mời” cũng cần bám đúng kết quả thực hiện: endpoint hiện thấy tạo/cập nhật user, không thấy gửi email trong luồng này.

### BUG-38 — Lý do thiếu thành viên khi hiện tại đã đủ

- `admin.py:1288–1314` lưu `body.reason` vào `admin_meta.rejection_reason`; serializer và `TeamDetailDialog.tsx:91` hiển thị lại lý do lưu. Không có logic tự suy ra “Thiếu thành viên” từ số lượng hiện tại.
- Đủ thành viên hiện tại không tự hủy quyết định bị từ chối trước đó. Nếu đã thiếu tại thời điểm duyệt thì đây là lịch sử hợp lệ; nếu đủ ngay tại thời điểm quyết định thì có thể là lỗi thao tác BTC hoặc dữ liệu, cần bằng chứng lịch sử để kết luận.
- Không tự sửa lý do cũ hoặc tự phê duyệt đội chỉ vì sĩ số tăng.

### BUG-39 — Xóa thành viên

- `TeamsPage.tsx:446–465` đã await DELETE; catch báo lỗi và return; không có nhánh thành công khi API trả 404 trong mã hiện tại.
- Route DELETE `/api/v1/teams/members/{user_id}` đã tồn tại; không thể kết luận endpoint thiếu chỉ từ báo cáo 404. Cần phân biệt route không được triển khai với user_id sai/không tìm thấy thành viên.
- `team_service.py:327–347` kiểm tra leader, thành viên cùng đội và không tự xóa, sau đó delete/commit trực tiếp; không kiểm tra `is_locked`, trạng thái cuộc thi hoặc sĩ số tối thiểu. `leave_team` cũng thiếu bảo vệ tương ứng.
- User manual HF-49 nêu leader được xóa trước khi khóa đội; UAT HF-53 nêu chặn xóa/rời đội đã khóa. Đây là căn cứ rõ cho lỗi thiếu chặn khóa đội. Yêu cầu cấm dưới min khi đang dự thi cần thống nhất trạng thái cụ thể, tránh cấm cả đội còn trong giai đoạn lập nhóm.
- Demo startup trong `backend/app/main.py:328` có thể bổ sung lại member2 cho đội đầu tiên khi user chưa thuộc đội nào. Đó là tác động khi backend khởi động; chưa có bằng chứng F5 trình duyệt kích hoạt nó.

### BUG-40 — Dashboard và Teams khác nhau

- `CandidateDashboardPage.tsx:131` hiển thị `${myTeam.members.length}/4`.
- Dashboard đọc đội từ store đồng bộ `/teams`; TeamsPage đọc `/teams/me` vào state riêng. `useMockStore.ts:1815` còn gắn `maxMembers: 5`.
- `TeamService.build_team_response` mặc định 3–5; các luồng list/get hiện gọi mà không truyền cấu hình thực tế. Serializer admin cũng gắn 3–5. Chỉ thay 4 thành 5 sẽ chưa đáp ứng khi BTC đổi cấu hình.
- DB cục bộ cho thấy leader@cybersamurai.team thuộc ChanBoMayDI, có 3 thành viên. Chưa xác định căn nguyên tử số 2 ở môi trường QA.

## 3. Kế hoạch thực hiện

### Đợt 1 — Sửa lỗi đã có bằng chứng

1. BUG-36 (S2): tạo hàm chuyển ISO UTC ↔ datetime-local nhất quán theo múi giờ trình duyệt; baseline lấy từ response lưu thành công và cùng cách chuẩn hóa với form. Dùng chung luồng lưu thường/Lưu và rời trang. Chặn gửi lặp lúc đang lưu; lỗi API giữ nguyên trạng thái dirty. Xử lý tải cấu hình bất đồng bộ để không ghi đè form đang nhập.
2. BUG-39 (S2): tại backend, đọc cấu hình và trạng thái đội trong transaction, chặn đội khóa theo hợp đồng hiện có. Với yêu cầu giữ min khi đang dự thi, định nghĩa hàm chính sách chung theo trạng thái chính thức; trả 409 với mã lỗi và thông báo cụ thể. Dùng cùng chính sách cho xóa và tự rời đội; khóa/tuần tự hóa thao tác trên cùng đội để hai yêu cầu không cùng vượt qua kiểm tra sĩ số. Frontend hiển thị thông báo server, chỉ cập nhật theo response thành công, tải lại store và bỏ suy luận trạng thái cục bộ bằng ngưỡng 3.
3. BUG-40 (S3): mọi response đội lấy min/max từ cấu hình thật. Store giữ trường API thay cho hằng số. Dashboard và Teams dùng cùng mô hình đội và cơ chế làm mới/invalidate sau thay đổi thành viên; hiển thị trạng thái tải nếu chưa có dữ liệu đáng tin cậy.

### Đợt 2 — Làm rõ hợp đồng mời mới

4. BUG-37 (S2): theo ý nghĩa “mời mới”, POST chỉ tạo mới; email tồn tại trả 409 EMAIL_ALREADY_EXISTS, không thay vai trò/tên/trạng thái/phan công của user cũ. Giữ chức năng sửa qua PATCH có chủ đích. Chuẩn hóa email, kiểm tra cả hai tab, bảo vệ unique DB và xử lý tranh chấp tạo đồng thời. Dùng roster/ID thật từ server, tải lại hai tab; bỏ ID tạm giả thành công. Chỉ thông báo đã gửi email nếu thực sự có kết quả gửi thư.

### Đợt 3 — Xác minh trước khi sửa dữ liệu hoặc hành vi

5. BUG-35: thu phản hồi GET admin teams ở đúng bản QA, ID hai dòng, phiên bản frontend/backend, DB đang dùng và unique index của DB đó. Nếu response trùng ID: sửa nơi truy vấn/ghép tạo trùng. Nếu chỉ UI trùng: sửa state/render. Nếu hai ID có cùng mã do schema cũ: sao lưu và đối chiếu liên kết trước khi làm migration sửa dữ liệu/constraint. Thêm kiểm thử chống tạo trùng và xử lý 409; không thêm cơ chế ẩn dòng trùng để che dữ liệu sai.
6. BUG-38: lấy lịch sử duyệt và thay đổi thành viên của BlockShield. Nếu là lý do lịch sử hợp lệ: đổi nhãn thành “Lý do từ chối tại lần xét duyệt…”, hiển thị thời điểm và cho yêu cầu duyệt lại. Khi triển khai mở rộng, lưu người duyệt, thời điểm, reason_code, reason_text và snapshot sĩ số/min/max lúc xét; không suy diễn snapshot cho dữ liệu cũ. Với lý do có cấu trúc thiếu thành viên, kiểm tra điều kiện ngay lúc ra quyết định. Nếu lý do nhập sai: sửa bằng thao tác có lưu lịch sử, không tự xóa căn cứ cũ.

## 4. Điều kiện nghiệm thu

| Mục | Kiểm chứng cần có |
| --- | --- |
| 35 | GP2026 trả một ID/một dòng; tìm kiếm và phân trang không sinh trùng; tạo trùng tên/mã bị xử lý rõ ràng, kể cả yêu cầu đồng thời. |
| 36 | UTC+7 và UTC: lưu không đổi không làm dịch deadline; dirty=false sau lưu/F5/rời trang; sửa thật dirty=true; lưu lỗi vẫn dirty; Lưu và rời trang lưu đúng dữ liệu. |
| 37 | Email trùng cùng tab, khác tab, tài khoản candidate/admin, khác hoa/thường/khoảng trắng: không tạo hoặc âm thầm đổi user cũ; 404/409/500/mất mạng không báo thành công; tạo mới hợp lệ còn sau F5. |
| 38 | Đội thiếu lúc bị từ chối rồi bổ sung: lý do lịch sử còn đúng ngữ cảnh; đội đủ ngay khi từ chối vì thiếu bị chặn nếu dùng reason_code; duyệt lại không mất lịch sử. |
| 39 | Đội khóa bị chặn dù còn nhiều thành viên; đội đang dự thi tại min bị chặn theo chính sách; đội lập nhóm chưa khóa được thao tác hợp lệ; 404/409 không đổi danh sách hoặc báo thành công; hai yêu cầu đồng thời không làm giảm dưới min; dữ liệu thống nhất sau GET/F5. |
| 40 | Cấu hình 3–5 và cấu hình khác như 2–6: cả hai trang cùng tử/mẫu số; thêm/xóa thành viên, đổi cấu hình và F5 đều nhất quán; không nháy dữ liệu đội cũ khi đổi tài khoản. |

Kiểm thử backend dùng DB tách biệt; kiểm thử UI thực hiện theo múi giờ và có giả lập lỗi API. Chưa có bản vá trong lần đánh giá này nên chưa có kết quả kiểm thử nghiệm thu bản vá.
