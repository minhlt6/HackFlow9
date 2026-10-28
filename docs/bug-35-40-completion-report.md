# Báo cáo hoàn thành bản vá BUG-35–40

Ngày: 28/10/2026.

## Kết quả thực hiện

Đã hoàn thành thay đổi mã nguồn và kiểm thử cục bộ cho các luồng trong phạm vi BUG-35–40. Giao diện giám khảo/cố vấn sử dụng thao tác **Tạo tài khoản**; không có thao tác gửi thư hoặc thông báo giả rằng đã gửi thư.

Các thao tác ghi thuộc phạm vi bản vá phải nhận kết quả từ backend trước khi giao diện hiển thị thành công. Backend lưu dữ liệu trong CSDL; trạng thái frontend chỉ dùng để trình bày dữ liệu đã đọc hoặc ghi thành công.

| Báo cáo | Kết quả xử lý |
| --- | --- |
| BUG-35 — Đội trùng tên/mã | Chưa tái hiện dữ liệu trùng trong DB cục bộ. Giữ ràng buộc duy nhất đang tồn tại. Khi BTC yêu cầu mã đã có, API trả 409 thay vì tự thay bằng mã khác. Chuẩn hóa phản hồi khi ràng buộc tên/mã/email tại DB từ chối thao tác. Kiểm thử xác nhận danh sách và DB vẫn chỉ có một đội sau các yêu cầu trùng. Không xóa/gộp dữ liệu đội theo tên. |
| BUG-36 — Lưu xong còn cảnh báo chưa lưu | Sửa chuyển đổi UTC ↔ giờ địa phương, giữ cả giây/mili giây nếu người dùng không đổi phút đang hiển thị. Baseline của form lấy từ kết quả lưu của server. Lưu thường và Lưu & Rời đi dùng chung xử lý. Lỗi tải/lưu không tạo thành công giả; chặn gửi lặp khi đang lưu. Backend trả thời gian có múi giờ UTC rõ ràng, kể cả khi SQLite trả datetime không có múi giờ. |
| BUG-37 — Tạo chuyên gia trùng | POST tạo mới từ chối email đã có bằng 409 EMAIL_ALREADY_EXISTS; không đổi tên, vai trò hoặc trạng thái tài khoản cũ. Email được chuẩn hóa và kiểm tra định dạng. UI kiểm tra cả hai nhóm giám khảo/cố vấn, dùng ID và thông tin thật từ response, không tạo ID tạm. Đổi nút, tiêu đề, trạng thái trống và thông báo thành Tạo tài khoản. |
| BUG-38 — Lý do từ chối không phù hợp | Khi triển khai phát hiện hộp thoại đang điền sẵn “thiếu thành viên” cho mọi đội. Đã bỏ lý do mặc định, bắt buộc BTC nhập căn cứ, đặt lại form theo đội để không giữ lý do của đội khác. Backend lưu lịch sử quyết định, người duyệt, thời điểm, sĩ số và min/max lúc duyệt. Chi tiết đội phân biệt lý do xét duyệt với sĩ số hiện tại. API có reason_code=under_min và chặn mã lý do này khi đội đã đủ min. |
| BUG-39 — Xóa/rời đội không đồng bộ | Backend chặn xóa/rời đội bị khóa; chặn giảm dưới min khi đội đã được duyệt hoặc có đăng ký đề tài. Đội trưởng phải chuyển quyền trước khi rời đội còn thành viên khác. Các thao tác join/xóa/rời/chuyển trưởng dùng khóa cùng đội; xóa/rời kiểm tra lại dữ liệu trước khi ghi. UI dừng khi lỗi và hiển thị lý do server, chỉ cập nhật từ response thành công. Bỏ đoạn startup tự thêm lại thành viên vào đội cũ. |
| BUG-40 — Sĩ số/giới hạn khác giữa các trang | Response đội, store, dashboard, trang Teams, bộ lọc, biểu mẫu, huy hiệu và thông báo quản lý đội đều dùng giới hạn từ cấu hình. Sĩ số được tính từ quan hệ thành viên thật thay cho số cũ trong metadata. Cập nhật cả ghép đội, xét duyệt và chọn đề tài để không tiếp tục áp dụng cố định 3–5 khi cấu hình thay đổi. |

### Phạm vi kết luận

- Hiện tượng hai dòng GreenPulse IoT/GP2026 và hiện tượng 404 nhưng UI vẫn báo thành công trong báo cáo ban đầu chưa được tái hiện trên đúng bản triển khai QA. Không coi dữ liệu cục bộ là bằng chứng rằng dữ liệu trên môi trường QA đã sạch.
- BlockShield không có trong DB cục bộ. Đã sửa nguyên nhân điền sẵn lý do sai trong UI; lý do cũ của một đội cụ thể cần đối chiếu lịch sử thực tế trước khi sửa dữ liệu.
- Lý do từ chối tự do vẫn do BTC chịu trách nhiệm nhập. Không suy luận và thay nội dung lịch sử bằng sĩ số hôm nay. Dữ liệu cũ chưa có snapshot được ghi rõ là chưa có thời điểm/sĩ số xét duyệt.

## Chuẩn hóa FE ↔ API ↔ CSDL

| Luồng | API | Dữ liệu lưu/đọc và hành vi lỗi |
| --- | --- | --- |
| Cấu hình | GET/PATCH /api/v1/admin/config; GET /api/v1/config | Lưu HackathonConfig và settings_data. Đồng nhất alias minTeamSize/minTeamMembers, maxTeamSize/maxTeamMembers. Từ chối giới hạn không phải số nguyên dương, alias mâu thuẫn, min > max hoặc thời gian không hợp lệ. Response thời gian có UTC offset. Đồng bộ nhãn giai đoạn với trạng thái vận hành khi nhận các giá trị được hỗ trợ. |
| Tài khoản chuyên gia | GET/POST /api/v1/admin/personnel; DELETE /api/v1/admin/personnel/{id} | Lưu User và profile_meta. Trùng email không cập nhật user cũ. Tạo/xóa được xác nhận qua lần đọc lại bằng session DB mới; kiểm thử cả đăng nhập tài khoản vừa tạo. Cơ chế mật khẩu hiện có được giữ nguyên. |
| Thành viên đội | GET /api/v1/teams; GET /api/v1/teams/me; DELETE /api/v1/teams/members/{user_id}; POST /api/v1/teams/leave | Ghi TeamMember trong transaction và commit. Khi bị chặn, DB và danh sách thành viên giữ nguyên. Phân biệt 403 không có quyền, 404 không tìm thấy thành viên, 409 vi phạm quy tắc đội. |
| Thông tin đội/chuyên môn/chuyển trưởng | PATCH /api/v1/teams/me; PATCH /api/v1/teams/members/{user_id}/skills; PATCH /api/v1/teams/leader | Kiểm tra quyền, lưu description/profile_meta/vai trò thành viên. Bỏ nhánh UI tự cập nhật kỹ năng và báo thành công khi API thất bại. Kiểm thử đọc lại và quyền sau khi chuyển trưởng. |
| Xét duyệt | PATCH /api/v1/admin/teams/{id}/approve hoặc /reject; POST /api/v1/admin/teams/bulk-approve | Lưu quyết định và review_history trong Team.admin_meta. Phê duyệt chỉ khi sĩ số hợp lệ; bulk trả đội bỏ qua. FE dùng response bulk để tránh báo sai tất cả đội đã được duyệt. |

Lớp Axios đọc cả message ở cấp ngoài và error.message của response để thông báo nghiệp vụ từ server được hiển thị nhất quán.

## Rà soát component và phần mã được thay thế

- **Thêm:** tiện ích chuyển đổi thời gian `frontend/src/utils/configForm.ts`; chính sách giới hạn/giảm thành viên dùng chung `backend/app/services/team_policy.py`; các kiểm thử hồi quy.
- **Cập nhật:** AdminConfigPage, AdminMentorsJudgesPage, AdminTeamsPage, TeamsPage, CandidateDashboardPage, TeamFormDialog, TeamDetailDialog; các API adapter, store và kiểu dữ liệu liên quan.
- **Hộp thoại từ chối:** tiếp tục dùng ConfirmDialog hiện có; thêm key theo đội và bỏ lý do mặc định, không thay đổi hợp đồng dùng chung của component này.
- **CountdownTimer:** thêm prop compact mặc định false để phần xem trước trong trang cấu hình không ép tiêu đề thành cột chữ hẹp. Các nơi dùng khác giữ mặc định. Đã biên dịch và kiểm tra trang candidate/admin.
- **Xóa:** các hàm tạo/join/rời/chuyển trưởng/xóa thành viên cũ trong store không còn caller và có đường cập nhật bộ nhớ riêng; các cache metadata trong backend và fixture kiểm thử tương ứng; đoạn startup sửa lại thành viên đội cũ. Đã tìm kiếm caller và kiểm tra TypeScript sau khi xóa.
- Metadata đội và chuyên gia đọc từ cột JSON của CSDL, không còn ghép với cache tiến trình. Bản vá không cần thêm bảng/cột mới vì các cột JSON cần thiết đã tồn tại.

## Kết quả kiểm thử

| Kiểm tra | Kết quả |
| --- | --- |
| Toàn bộ backend | **139 passed**, 8 warnings; bao gồm **23 ca mới** trong test_bug_35_40.py. |
| Xử lý thời gian frontend | **3 passed**: UTC+7, UTC, thời gian không hợp lệ. |
| Trình duyệt Chrome | **5 nhóm tình huống passed**, không ghi nhận pageerror trong các nhóm kiểm thử. |
| TypeScript và production build | Thành công. |
| ESLint trên toàn bộ file frontend đã sửa và tiện ích mới | Thành công, không lỗi/cảnh báo. |
| git diff --check | Thành công. |

Các ca backend mới kiểm tra:

1. Tên đội/mã mời trùng, danh sách admin và dữ liệu DB không nhân bản.
2. Cấu hình 2–6 được giữ qua lần đọc lại và đồng nhất giữa API public, admin, list đội, đội hiện tại và chi tiết đội.
3. Tạo giám khảo/cố vấn, đăng nhập, đọc lại, xóa và đọc lại.
4. Email trùng cùng/khác vai trò, email khác hoa thường/khoảng trắng, tài khoản candidate/admin có sẵn; không ghi đè tài khoản cũ.
5. Email, tên, vai trò hoặc cấu hình không hợp lệ; thao tác lỗi không làm thay đổi dữ liệu đã lưu.
6. Xóa/rời đội khóa; xóa/rời làm giảm dưới min; xóa được phép; thiếu thành viên đích; người không có quyền.
7. Hai yêu cầu xóa đồng thời trên đội 4 người: một thành công, một bị từ chối, còn 3 người.
8. Lý do có cấu trúc under_min, snapshot xét duyệt, bổ sung thành viên và phê duyệt lại không mất lịch sử.
9. Bulk approve bỏ qua đội chưa đủ điều kiện.
10. Sửa mô tả, kỹ năng, chuyển trưởng và thay đổi quyền được lưu chính xác.
11. Ghép 11 thí sinh với cấu hình 2–6 tạo hai đội 5 và 6 người, đọc lại đúng CSDL.
12. Deadline có giây/mili giây, UTC offset và thay đổi giai đoạn được giữ qua lần đọc lại.

Năm nhóm trình duyệt kiểm tra:

1. Cấu hình ở UTC+7: lưu không đổi, giữ thời điểm, hết cảnh báo, Lưu & Rời đi, lưu lỗi vẫn cảnh báo.
2. Cùng các tình huống cấu hình ở UTC.
3. Tạo giám khảo/cố vấn, nội dung “Tạo tài khoản”, tải lại, email trùng phía UI/server, xóa cố vấn và tải lại.
4. Dashboard và Teams cùng 3/6; xóa bị từ chối giữ nguyên; sửa kỹ năng thất bại không đổi UI; xóa thành công cập nhật 2/6 ở cả hai trang.
5. Hộp thoại từ chối không có sẵn lý do thiếu thành viên, không giữ lý do đội trước, không cho lý do trống và hiển thị ngữ cảnh xét duyệt.

## Giới hạn xác minh và bàn giao

- Kiểm thử backend dùng CSDL SQLite tách biệt; kiểm thử trình duyệt dùng API giả lập để kiểm tra hành vi component và hợp đồng phản hồi. Đây là hai lớp kiểm thử bổ trợ, không phải phiên kiểm thử browser kết nối tới CSDL production.
- Chưa kiểm thử trên PostgreSQL nhiều tiến trình hoặc bản triển khai QA. SQL row lock đã được sử dụng trong các luồng thành viên có liên quan; kết quả kiểm thử đồng thời hiện xác nhận trên môi trường SQLite một tiến trình.
- Production build có cảnh báo bundle JavaScript khoảng 1,2 MB; cảnh báo không chặn build.
- Không thực hiện thao tác ghi lên môi trường QA/production, không dọn dữ liệu trùng hay sửa quyết định cũ của GreenPulse/BlockShield. File `backend/hackflow.db` đã có thay đổi từ trước phiên làm việc và không bị công việc này chủ động chỉnh sửa.
- Khi triển khai cần đưa frontend và backend cùng phiên bản để thống nhất mã lỗi, min/max và snapshot xét duyệt. Các dữ liệu nghiệp vụ mới được lưu bằng schema hiện có.

Tệp kiểm thử bàn giao:

- `backend/tests/test_bug_35_40.py`
- `frontend/tests/configForm.test.mjs`
- `frontend/tests/bug-35-40.ui.mjs`

Ảnh kiểm tra giao diện cục bộ được tạo trong `tmp/bug-35-40/` và đã được xem lại, gồm trang cấu hình sau lưu, tài khoản đã tạo, đội sau xóa thành viên và chi tiết lịch sử xét duyệt.
