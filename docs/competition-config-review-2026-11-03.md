# Rà soát logic và cấu hình cuộc thi — 03/11/2026

Đánh giá trên commit `362aac7`, sau bản sửa 13 phát hiện của báo cáo trước. Không coi các lỗi đã sửa là phát hiện mới. Đợt này rà soát mã nguồn và chạy 4 ca kiểm chứng API trên CSDL trong bộ nhớ; chưa chỉnh mã nghiệp vụ, dữ liệu thật hoặc triển khai. Chưa kiểm tra biến môi trường thực tế của Railway.

## Các điểm cần sửa hoặc hoàn thiện

### C01. “Tạm dừng cuộc thi” chưa có hiệu lực nghiệp vụ đầy đủ — P1

`frontend/src/store/useMockStore.ts:494` chuyển trạng thái về `registration`. Hộp xác nhận ở `AdminConfigPage.tsx:608` lại nói hệ thống tạm dừng và chuyển chế độ chờ. `submission_service.py:250` chỉ chặn `judging/completed`, nên chuyển về registration không khóa nộp bài nếu checkpoint còn mở. Đồng hồ tổng chỉ ngừng hiển thị đếm; deadline tuyệt đối không được dịch khi tiếp tục.

Cần tách `paused` khỏi giai đoạn cuộc thi. Khi tạm dừng, backend phải chặn các thao tác được quy định và trả lý do cho frontend. Nêu rõ tạm dừng có giữ nguyên deadline hay cộng bù thời gian; không tự cộng bù mà không cho BTC xem trước.

### C02. Trạng thái checkpoint và quyền nộp bài không cùng một chính sách — P1

`CheckpointService.build_checkpoint_response` tính `can_submit` chỉ từ thời gian và `is_active`; SubmissionService còn xét giai đoạn cuộc thi. Đã kiểm chứng: đặt `judging`, checkpoint đang mở vẫn trả `can_submit=true`, trong khi luồng ghi có chặn giai đoạn này.

Nên phân biệt “cổng đang trong giờ mở” với “người dùng được phép nộp”, có trường lý do khóa. Dùng chung chính sách ở API đọc và ghi, cập nhật hook thời gian frontend để không tự mở lại form đã bị khóa bởi cuộc thi.

### C03. Cấu hình thiếu kiểm tra kiểu và tính nhất quán — P1

`update_hackathon_config` nhận `Dict[str, Any]`, mặc dù dự án có schema cấu hình. Các trường metadata được gán thẳng. Đã kiểm chứng:

- Gửi `status=completed` cùng `currentPhase` mô tả đang thực thi: được lưu cả hai, HTTP 200.
- Gửi `blindJudgingEnabled="false"`: phản hồi lại `true` vì ép `bool` của chuỗi khác rỗng.

`discrepancyThreshold` được serialize bằng `int(...)` nhưng không kiểm dữ liệu đầu vào tương ứng; thời gian đăng ký/công bố cũng chưa được kiểm kiểu và quan hệ lịch đầy đủ. Đây là rủi ro API, dù form hiện tại thường gửi đúng kiểu.

Cần schema chặt: enum giai đoạn, boolean nghiêm ngặt, datetime có múi giờ, giới hạn ngưỡng hợp lệ. Chỉ lưu mã giai đoạn; nhãn được suy ra. Trả lỗi 422/400 trước khi ghi dữ liệu. Giữ alias cũ có kiểm tra mâu thuẫn để không phá kết nối frontend hiện có.

### C04. Một số trường cấu hình được lưu nhưng chưa điều khiển nghiệp vụ — P2

- `registrationDeadline` xuất hiện trong schema và endpoint cấu hình nhưng AuthService không đọc nó. Đã kiểm chứng tạo tài khoản mới vẫn 201 sau hạn đăng ký và khi `completed`.
- `submissionFreezeEnabled` được lưu/trả về nhưng chưa thấy service nộp bài/SHA sử dụng cờ này; SHA đang được quyết định theo cấu hình checkpoint và luồng xác minh.

Cần xác định “hạn đăng ký” là hạn tạo tài khoản hay hạn đăng ký tham gia cuộc thi. Nếu chỉ là hạn tham gia, có thể cho tạo tài khoản nhưng phải có cổng đăng ký cuộc thi riêng. Với SHA, nên giữ bảo vệ bắt buộc cho bài chung kết và bỏ/đổi tên cờ không có tác dụng, thay vì cho tắt vô điều kiện.

### C05. Lịch cuộc thi và lịch checkpoint chưa được bảo vệ hai chiều — P1

`admin.py:2422` đổi `end_time` và cập nhật deadline chung kết chỉ nếu end mới lớn hơn start chung kết. Khi end không lớn hơn start chung kết, vòng lặp bỏ qua cập nhật nhưng vẫn ghi end cuộc thi. Chiều sửa checkpoint cũng chưa đồng bộ end cuộc thi.

`CheckpointService.create_checkpoint` chỉ kiểm chặng tiến độ không muộn hơn chung kết khi request có `display_order`; trường này tùy chọn. Kiểm thứ tự trong update cũng phụ thuộc trường gửi lên. Chưa thấy ràng buộc duy nhất một checkpoint chung kết, dù nhiều nơi xử lý theo giả định một bài chung kết/đội.

Cần kiểm lịch theo trạng thái cuối cùng sau thay đổi, không theo việc request có gửi trường tùy chọn hay không. Thống nhất ý nghĩa `end_time` và “hạn nộp chung kết”; nếu khác nhau thì tách trường. Quy định rõ có cho nhiều chặng chung kết hay không. Khi sửa lịch đã có bài nộp, xem trước ảnh hưởng tới tính hợp lệ của bài và điểm lịch sử.

### C06. Chuyển giai đoạn chưa có điều kiện và xem trước ảnh hưởng — P2

Cấu hình hiện cho đặt trạng thái trực tiếp. Chưa có bảng chuyển trạng thái hợp lệ và điều kiện cho từng bước. Trạng thái lạ cũng không bị enum từ chối. Chọn đề tài có thể tiếp tục trong `hacking` nếu cổng vẫn công bố và đội chưa khóa; hủy đề tài lại chỉ cho ở registration/team_formation. Đây có thể là chủ ý cho đội tham gia muộn, nhưng phải được ghi rõ thay vì phụ thuộc các điều kiện rải rác.

Nên có bảng quyền theo giai đoạn và các ngoại lệ BTC cho phép. Trước khi chuyển sang chấm thi, hiển thị chặng còn mở, bài chờ xác minh và đội chưa đủ điều kiện. Quay lại giai đoạn trước cần lý do và nhật ký; không cần cấm tuyệt đối việc BTC sửa sai.

### C07. Thay đổi số thành viên có thể làm đội đã duyệt mất điều kiện — P2

Backend kiểm min/max hợp lệ nhưng chưa có bước thống kê ảnh hưởng tới các đội hiện tại trong endpoint cấu hình. Ví dụ tăng tối thiểu từ 3 lên 4 sau khi nhiều đội 3 người đã được duyệt sẽ thay đổi điều kiện vận hành mà BTC không thấy danh sách bị ảnh hưởng.

Nên cho xem trước số đội thiếu/thừa thành viên và cách xử lý: áp dụng quy định mới cho tất cả, giữ ngoại lệ đội đã duyệt, hoặc chỉ áp dụng trước khi chốt đội. Quyết định này cần lưu rõ, không tự xóa thành viên hay hủy bài nộp.

### C08. Thiếu phiên bản và lịch sử thay đổi cấu hình — P2

Luồng lưu cấu hình tổng quát chưa có kiểm tra phiên bản cấu hình đã đọc hoặc nhật ký trước/sau cho mọi thay đổi. Hai Admin mở form cùng lúc có thể ghi đè lựa chọn của nhau, vì form gửi lại nhiều trường kể cả trường người đó không sửa.

Nên dùng `version`/`updated_at` để từ chối bản lưu cũ, chỉ gửi các trường đã đổi, ghi người sửa, thời gian, lý do và diff. Hộp xác nhận hiện có là điểm tốt; bổ sung tác động thực tế thay vì chỉ liệt kê giá trị.

## Các điểm vận hành cần ưu tiên trước demo công khai

### C09. Khởi động có thể đặt lại mật khẩu và thay đổi quota — P1

`Settings.ENABLE_STARTUP_SEED` mặc định true. `main.py` seed tài khoản mặc định và đặt lại mật khẩu của một số tài khoản đã tồn tại; nhánh này không bị giới hạn chỉ development. Bộ đối soát còn tăng `max_teams` theo số đội thực tế nếu đang vượt quota. Vì vậy restart có thể làm mất lựa chọn quản trị hoặc che lấp trạng thái vượt giới hạn.

Cần tách seed demo thành lệnh chủ động, không đổi mật khẩu tài khoản hiện hữu khi khởi động; đối soát báo sai lệch thay vì tự nới quota. Kiểm thử restart giữ nguyên dữ liệu nghiệp vụ. Đây là kết luận theo mã nguồn với điều kiện bật seed, không phải khẳng định Railway đang bật cờ đó.

### C10. Cấu hình Supabase trên Railway có thể bị đổi sang SQLite — P1

`core/config.py`, `Settings.async_database_url` trả URL SQLite khi nhận mẫu host Supabase trực tiếp và có biến môi trường Railway. Vì vậy backend có thể không dùng CSDL được cấu hình. Với SQLite cần xem xét volume bền vững và mô hình một instance; không được ngầm chuyển đích lưu trữ.

Cần giữ đúng CSDL người vận hành chọn; nếu kết nối thất bại, báo lỗi sẵn sàng dịch vụ. Kiểm thử đúng URL hiệu lực và khả năng giữ dữ liệu sau restart. Chưa kiểm tra biến môi trường hoặc storage Railway thực tế.

### C11. Thiết lập chạy công khai thiếu chốt kiểm tra đầu vào — P1

Settings có giá trị mặc định development cho DEBUG và khóa ký JWT; chưa thấy bước bắt buộc cấu hình riêng khi chạy production. Kết hợp seed ở trên tạo rủi ro khi triển khai chỉ với thiết lập mặc định.

Nên kiểm tra cấu hình lúc khởi động production: khóa ký riêng, DEBUG tắt, seed demo tắt và CSDL được khai báo rõ. Không ghi khóa/mật khẩu ra log. Chưa kết luận khóa thực tế của môi trường triển khai đang dùng giá trị mặc định.

## Hướng cải thiện giao diện và kiến trúc

1. Giữ bố cục Admin hiện có, nhóm cấu hình thành Lịch thi, Quy mô đội, Quyền thao tác theo giai đoạn, Chấm điểm và Công bố. Hiển thị rõ múi giờ.
2. Bổ sung bản xem trước “Thay đổi này ảnh hưởng gì”: đội mất điều kiện, checkpoint đổi lịch, thao tác bị khóa. Giữ hộp xác nhận cho thay đổi có tác động.
3. Một service chính sách cuộc thi trả về quyền thao tác và lý do khóa cho từng vai trò. Các API ghi vẫn phải kiểm tra lại trong giao dịch.
4. Tách phần API/config ra khỏi store dùng chung quá lớn; giữ lớp chuyển đổi tương thích để không đổi hàng loạt component cùng lúc.
5. Đồng hồ dùng giờ server; thống nhất nhãn “chưa bắt đầu/đang diễn ra/tạm dừng/chấm thi/kết thúc”. Hiện `isContestStarted` còn gộp judging/completed thành true và có thể hiển thị “Cuộc thi đang diễn ra” khi đã kết thúc.

## Kiểm chứng và thứ tự triển khai

4/4 ca chẩn đoán tái hiện thành công: giai đoạn mâu thuẫn, boolean chuỗi, quyền nộp checkpoint không theo giai đoạn, đăng ký sau hạn. Các ca nằm tại `tmp/config-audit-2026-11-03/test_config_audit.py`, dùng CSDL trong bộ nhớ; chúng xác nhận hành vi hiện tại, không phải bằng chứng hệ thống đã được sửa. Các mục còn lại là rà soát luồng mã nguồn, chưa kiểm thử trực tiếp Railway hoặc tranh chấp PostgreSQL.

Ưu tiên:

- Đợt 1: tạm dừng, quyền đọc/ghi thống nhất, schema cấu hình và bảo vệ lịch (C01–C03, C05).
- Trước demo công khai: kiểm tra và tách seed, loại chuyển CSDL ngầm, kiểm tra cấu hình môi trường (C09–C11).
- Đợt 2: quy tắc đăng ký/giai đoạn, tác động min/max, phiên bản và nhật ký cấu hình (C04, C06–C08).
- Sau cùng: chuẩn hóa màn hình và tách store dần, kèm kiểm thử API và trình duyệt theo từng luồng.

Không cần viết lại toàn bộ hệ thống. Các cải thiện nên triển khai từng nhóm, giữ hợp đồng frontend/backend và kiểm thử cả thao tác thành công lẫn bị từ chối. Báo cáo không khẳng định đã rà soát hết mọi lỗi của toàn hệ thống.
