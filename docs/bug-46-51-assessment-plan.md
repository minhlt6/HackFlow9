# Xác minh và kế hoạch sửa BUG-46–51

Ngày: **01/11/2026**. Báo cáo này lưu kết quả xác minh trước sửa. Bản vá đã được triển khai sau đó; xem `bug-46-51-completion-report.md`.

Phương pháp: đọc mã FE/BE, đọc SQLite hiện tại bằng kết nối `mode=ro`, chạy 10 ca chẩn đoán bằng API với CSDL kiểm thử tách biệt. Không thao tác ghi lên CSDL đang dùng. Các ca chẩn đoán khẳng định hành vi lỗi hiện tại, không phải kiểm thử chứng minh đã sửa.

## 1. Kết luận từng lỗi

| Mã | Kết luận | Nguyên nhân/phân loại |
| --- | --- | --- |
| BUG-46 | **Có vấn đề tên dữ liệu và lịch demo; chưa chứng minh backend mở sai theo thời gian.** | Tên “Chặng 3 — Chưa mở” là chuỗi cố định trong DB. Khi thời gian đã tới, API tính `open` là đúng dù tên vẫn ghi chưa mở. Lịch demo còn cho chung kết đóng trước chặng 3. Trang chỉ tải trạng thái ban đầu nên cũng có nguy cơ lỗi thời khi vượt giờ mở/đóng. |
| BUG-47 | **Lỗi logic thật, đã tái hiện qua API.** | Trong phase `hacking`, leader vẫn hủy đề tài thành công; cả đội `is_locked=true` cũng hủy được. BE chỉ chặn sau `config.end_time`, bỏ qua phase, khóa đội và bài đã nộp. FE chỉ kiểm tra leader để hiện nút. |
| BUG-48 | **Lỗi kiểm tra hợp lệ thật; tình huống không có final phụ thuộc chế độ demo.** | `invalid`, `pending_sha_freeze`, `sha_verification_failed` vẫn nhận điểm submitted. Nếu không có final: tắt demo trả 404 đúng; bật demo tự tạo final từ bài chặng khác, kể cả checkpoint đã đóng, rồi lưu được 90/100. |
| BUG-49 | **Lỗi hợp đồng/validation thật.** | Nhãn form nói 6 ký tự, Zod chấp nhận 4–12, API join chấp nhận 6–16, admin API nhận chuỗi tùy chỉnh không có validation độ dài tương ứng, DB cho 16, generator thường tạo 6 nhưng fixture có 9–15. |
| BUG-50 | **Lỗi thiếu đầu nối dữ liệu đúng quyền, đã xác minh.** | Tab judge đọc `store.submissions`; luồng sync cố ý không gọi `/submissions` với judge, và endpoint đó trả 403 đúng thiết kế. API `/evaluations/submissions` hiện chỉ cấp bài chung kết, không có danh sách checkpoint tiến độ để thay thế. |
| BUG-51 | **Lỗi lọc/ánh xạ thật; 401 chưa được quy nguyên nhân cho ghép đội.** | Directory/unassigned vẫn trả candidate inactive và không trả trường active để FE lọc. FE chỉ lọc approved + chưa có đội; BE ghép đội lại lọc active, gây lệch số đếm và thao tác. Token admin hợp lệ nhận 200 tại `/submissions` và `/auth/me` trong kiểm tra. |

## 2. Bằng chứng và giới hạn

### BUG-46 — Phân biệt tên và trạng thái

DB cục bộ được kiểm tra có:

| Mốc | Giờ mở (Việt Nam, UTC+7) | Giờ đóng (Việt Nam, UTC+7) |
| --- | --- | --- |
| Chặng 3 — Chưa mở | 31/10/2026 01:54 | 01/11/2026 01:54 |
| Chung kết | 28/10/2026 19:54 | 30/10/2026 13:54 |

Do đó, trong khoảng mở chặng 3 ngày 31/10, badge “Đang mở” có thể đúng theo giờ; chữ “Chưa mở” trong tiêu đề là sai/lỗi thời. Đến ngày kiểm tra, các mốc trên đã qua hạn. Chưa có bằng chứng trong mã cho thấy backend cho nộp một checkpoint có thời gian bắt đầu còn ở tương lai.

Chẩn đoán trực tiếp `calculate_time_gate_info`: tên chứa “Chưa mở” nhưng giờ đã đến → `open`; đẩy giờ bắt đầu sang tương lai → `upcoming`, `can_submit=false`. Form hiện đã dùng `upcoming/closed/is_active/can_submit` để khóa trường nhập và nút nộp.

Bộ demo chuẩn bị trước đó chủ đích có nhiều trạng thái đồng thời nhưng tên chứa trạng thái cố định và lịch chung kết chưa tuần tự với chặng tiến độ. Điều này cần được chuẩn hóa lại, không dùng tên để quyết định cho phép nộp.

### BUG-47 — Hủy đề tài

Chẩn đoán với phase hacking và hai đội khác nhau: CyberSamurai chưa khóa và ChainTrace đã khóa. `POST /topics/cancel` đều trả 200; đọc lại DB kiểm thử thấy `topic_id=null`. Đây là lỗi ghi, không chỉ là nút chưa bị vô hiệu hóa.

Đoạn xử lý hiện tại chỉ giảm quota và gỡ liên kết đề tài, chưa thấy xóa trực tiếp bài nộp. Tác hại đã xác nhận là mất liên kết nghiệp vụ trong khi thi, không khẳng định bài nộp đã bị xóa vật lý.

### BUG-48 — Điều kiện được chấm

Các bài final mang trạng thái invalid/pending/chờ xác minh đều lưu được phiếu submitted. Ngoài ra, `settings.demo_enabled` mở đường `ensure_final_submission_for_team`, tạo bản ghi final mới bằng dữ liệu chặng khác, không kiểm tra hạn final trước khi chấm.

DB thật cục bộ của CyberSamurai hiện có final fixture `sha_verification_failed`, thiếu SHA; chưa thấy bài chặng 3. Vì vậy không dùng DB này để khẳng định đúng nguyên trạng “3 bài tiến độ, không có final” của phiên được báo lỗi. Tình huống không có final đã được dựng riêng để phân biệt demo bật/tắt.

Không được chặn chấm chỉ vì **hiện tại** checkpoint đã đóng: bài được nộp hợp lệ trước hạn vẫn phải chấm được sau deadline.

### BUG-49–51

- Mã đội thực tế trong DB có độ dài 9, 10, 11, 12 và 15. Đây là dữ liệu có thật; không nên tự đổi mã làm hỏng khả năng tham gia bằng mã đã phát.
- Judge đọc `/submissions` nhận 403; API bài chấm không trả checkpoint tiến độ. Gỡ 403 đơn thuần sẽ mở rộng quyền ngoài ý muốn.
- Có một candidate approved/inactive/chưa có đội trong DB cục bộ. Chẩn đoán `/admin/candidates/unassigned` trả tài khoản inactive nhưng không có `is_active`; trong khi API ghép đội chỉ chọn active.
- 401 tại `/auth/me` hoặc `/submissions` thường liên quan xác thực, nhưng cần token/log của phiên thực tế để xác định. Không biến 401 thành “không có thí sinh hợp lệ” hoặc bỏ kiểm tra token.

## 3. Thứ tự sửa đề xuất

1. **BUG-48:** chặn ghi điểm trên bài không hợp lệ; loại đường tự tạo final khỏi luồng chấm.
2. **BUG-47:** khóa hủy/đổi đề tài tại BE và phản ánh trạng thái ra FE.
3. **BUG-50:** cấp API tiến độ riêng cho judge đúng phạm vi phân công, phối hợp điều kiện chấm của BUG-48.
4. **BUG-51:** chuẩn hóa danh sách và số đếm thí sinh có thể ghép; xử lý phiên hết hạn riêng.
5. **BUG-46:** chuẩn hóa lịch/tên demo và cập nhật trạng thái thời gian đồng nhất.
6. **BUG-49:** thống nhất validation với chính sách tương thích mã cũ.

## 4. Kế hoạch thay đổi theo lỗi

### BUG-48 và BUG-50 — Một nguồn dữ liệu phục vụ chấm

- Tạo một hàm BE kiểm tra khả năng chấm, dùng chung cho danh sách, chi tiết và API ghi. Chỉ bài final tồn tại, thuộc đội đúng quyền, có trạng thái hợp lệ và đáp ứng điều kiện nộp/SHA mới cho gửi điểm chính thức.
- Không tự tạo checkpoint/submission khi judge lưu điểm, kể cả đường tương thích `team_id`. Seed demo phải tách khỏi nghiệp vụ chấm.
- `pending_sha_freeze`, `sha_verification_failed`, `invalid` không được coi là bài hợp lệ để khóa điểm. Nếu cần BTC xác minh thủ công, phải có quy trình xác nhận thật và trạng thái/audit rõ ràng, không tự đổi sang submitted.
- Bổ sung metadata `can_evaluate`/lý do không được chấm; FE hiển thị “Chưa có bài chung kết hợp lệ”, khóa nút gửi và không hiện “Đã chấm xong” do fallback local.
- Tách “đội được phân công để theo dõi” khỏi “bài đủ điều kiện chấm”: đội được phân công nhưng chưa có final vẫn có thể xem tiến độ, không được chấm final.
- Bổ sung API đọc checkpoint cho đội được phân công, ví dụ `GET /evaluations/teams/{team_id}/checkpoints`. Trả ID checkpoint, tiêu đề, giờ nộp, trạng thái và dữ liệu được phép xem; không mở `/submissions` chung cho judge.
- FE map đúng `team_id`, `checkpoint_id`, `submission_id`; tab hiển thị tên chặng thực tế và badge trạng thái thật, không đánh số theo chỉ số mảng hoặc luôn gán “Đã nộp”.
- Tôn trọng cấu hình hiển thị danh tính/quyền hiện có; không thêm trường email/mã mời hay dữ liệu ngoài phạm vi phân công. Lỗi API phải có thông báo/thử lại, không biến lỗi thành danh sách rỗng hoặc điểm thành công.
- Quét chỉ đọc các điểm cũ gắn với final không hợp lệ để xuất danh sách cần rà soát; không tự xóa điểm hoặc bài nộp.

### BUG-47 — Chính sách thay đổi đề tài dùng chung

- Dùng một hàm BE xác định quyền chọn/hủy, dựa trên phase chuẩn, thời gian, trạng thái công bố, khóa đội và bài đã nộp.
- Đề xuất chỉ cho candidate hủy trong giai đoạn đăng ký/thành lập đội, trước thời điểm chốt; chặn ở hacking/judging/completed, khi đội khóa hoặc đã có bài nộp cần bảo toàn.
- Kiểm tra lại trong transaction khi ghi, trước khi giảm quota/gỡ liên kết. Không để gọi API trực tiếp vượt qua nút khóa.
- API đọc đội/đề tài trả `can_cancel_topic` và lý do. FE giữ bố cục, vô hiệu hóa nút ở cả banner lẫn card, giải thích vì sao không thể hủy. Cần BTC can thiệp thì qua luồng quản trị riêng có xác nhận/audit.

### BUG-51 — Cùng một tập ứng viên ghép đội

- Danh bạ quản trị có thể vẫn xem inactive, nhưng phải trả `is_active`; endpoint thí sinh lẻ để ghép chỉ trả approved + active + chưa có đội.
- Chuẩn hóa adapter và hook FE, dùng đúng tập ứng viên này cho số đếm, thông báo, nút ghép, danh sách chọn nhanh leader/member và nội dung xác nhận.
- Khi không có ứng viên hợp lệ: hiện trạng thái rỗng, khóa nút ghép. Nếu trạng thái đổi trong lúc xác nhận, BE kiểm tra lại, FE tải lại danh sách và giải thích đúng kết quả.
- Khi 401: xử lý hết phiên/đăng nhập lại; không giữ danh sách cũ như kết quả tải mới. Không gộp lỗi xác thực vào lỗi điều kiện ghép đội.

### BUG-46 — Trạng thái thời gian và dữ liệu demo

- Tên seed trung tính: “Chặng 3 — Tích hợp và kiểm thử”, trạng thái nằm ở badge tính theo server, không đặt “chưa mở/đã đóng” cố định trong tên.
- Đề xuất lịch chung kết có hạn cuối không sớm hơn các chặng tiến độ. Các chặng tiến độ có thể chồng thời gian nếu nghiệp vụ cho phép; không ép mọi chặng phải mở nối tiếp hoàn toàn.
- Dùng chung quy tắc cho badge, countdown và form, dựa trên `server_time`, start/deadline, active và grace period. Đọc lại trạng thái khi chọn chặng/đưa tab trở lại và tại ranh giới mở–đóng; tránh dùng ảnh chụp trạng thái lúc mount suốt phiên.
- BE tiếp tục kiểm tra giờ khi nhận POST, không dựa vào tên, trạng thái gửi từ FE hay giờ máy người dùng. Form cần khóa toàn bộ trường/nút khi không được phép.
- Lập bản xem trước thay đổi lịch/tên seed; không tự sửa giờ của cuộc thi đang chạy hoặc đổi tên tùy chỉnh của admin.

### BUG-49 — Chính sách mã mời đề xuất

- Giữ mã tự sinh 6 ký tự; hỗ trợ mã tùy chỉnh **6–16 ký tự** với cùng bộ ký tự/chuẩn hóa ở FE, API tạo/sửa, API join và schema.
- Nhãn mô tả rõ “6–16 ký tự; tự sinh 6 ký tự”, không nói mọi mã đều đúng 6. Chính sách này tương thích các mã demo 9–15 đang có và giới hạn cột DB.
- Kiểm tra thêm dữ liệu mã ngắn 4–5 ký tự từng được form cũ chấp nhận: nếu có, cần cơ chế lookup mã cũ hợp lệ, không tự phát sinh mã mới ngắn hoặc tự thay mã đã phát.
- Giữ ràng buộc duy nhất, chuẩn hóa khoảng trắng/hoa thường, xử lý trùng mã như hiện có. Trước khi chốt chính sách “chỉ đúng 6” cần kế hoạch chuyển đổi và thông báo mã cũ; không đề xuất đổi hàng loạt âm thầm.

## 5. Điều kiện nghiệm thu trước khi đẩy mã

| Luồng | Ca bắt buộc |
| --- | --- |
| Checkpoint | Trước giờ, đúng giờ mở, deadline, grace, sau grace, inactive; badge/form đồng bộ sau khi thời gian trôi và reload; POST trái phép bị từ chối |
| Đề tài | Leader/member, đội khóa, phase đăng ký/thực thi/chấm/kết thúc, có bài nộp; từ chối phải giữ nguyên topic, quota và bài |
| Chấm | Không có final, final invalid/pending/chờ SHA, bài nộp đúng hạn nhưng chấm sau deadline, sai phân công; tuyệt đối không tự tạo final và không ghi điểm trái điều kiện |
| Checkpoint của judge | 3 bài tiến độ/không final vẫn xem được nếu có phân công, không chấm final được; đúng ID/trạng thái; đội ngoài quyền bị chặn; lỗi tải không hiện 0 giả |
| Mã mời | Tự sinh 6; mã 6/9/12/15/16; quá giới hạn, mã trùng, ký tự sai, mã cũ; tạo/sửa/join và reload thống nhất |
| Ghép đội | Chỉ inactive; pending; đã có đội; danh sách hỗn hợp; tài khoản bị khóa trong lúc xác nhận; 401 không bị hiểu là thiếu ứng viên |

Chạy backend regression, frontend adapter/unit, TypeScript, ESLint, production build và các kịch bản trình duyệt ở cả viewport rộng/hẹp. Giữ `ConfirmDialog`, Modal, Form, Badge và tuyến trang hiện có; ưu tiên thêm metadata và utility chung thay vì thay toàn bộ component.

API response mới cần bổ sung tương thích; field cũ vẫn giữ khi chuyển FE/BE cùng phiên bản. Chưa thấy cần đổi schema DB cho các thay đổi logic/metadata này; nếu chọn thêm trạng thái xác minh SHA hoặc cấu hình thời hạn riêng thì phải thiết kế migration và rollback trước.

## 6. Phạm vi đã hoàn tất ở lượt xác minh

- Đã đọc và đối chiếu các đường dữ liệu liên quan; 10 ca chẩn đoán trên CSDL kiểm thử đạt kỳ vọng tái hiện/phân biệt lỗi.
- Chỉ đọc DB thật; không đổi mã nguồn, không sửa lịch thi, không hủy đề tài hoặc ghi điểm thật.
- Chưa kiểm tra phiên Railway cụ thể, chưa sửa hoặc đẩy bản vá. Tài liệu này là cơ sở cho lượt triển khai tiếp theo.
