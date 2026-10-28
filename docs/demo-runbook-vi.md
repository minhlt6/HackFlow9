# Kịch bản demo HackFlow theo thứ tự thao tác

## 1. Chuẩn bị

Thời lượng chính khoảng 35–45 phút; bản rút gọn khoảng 12–15 phút. Bắt đầu bằng DB **rehearsal**. Dành DB **results** cho phần bảng điểm nhiều đội hoặc khi cần trình diễn kết quả nhanh.

Đọc `demo/README.md` để chọn DB và cấu hình `ENABLE_STARTUP_SEED=false`. Tạo dữ liệu mới trong ngày diễn ra. Mở manifest đi kèm để lấy mật khẩu chung. Dữ liệu thực tế của dự án vẫn nằm nguyên trong `backend/hackflow.db`.

Chuẩn bị các phiên trình duyệt tách biệt cho Admin, Candidate Leader, Mentor và Judge; có thể dùng trình duyệt khác hoặc profile khác. Hai tab cùng profile dùng chung localStorage, không được xem là hai phiên đăng nhập độc lập.

Chuẩn bị repo công khai có commit thật và link demo/video/slide của nhóm. Kiểm tra mạng và OAuth trước khi lên trình bày. Tệp manifest chứa thông tin đăng nhập, không chia sẻ lên repo công khai.

## 2. Tài khoản dùng theo cảnh

Mọi email dưới đây có đuôi **`@demo.example.com`**. Mật khẩu xem trường `password` trong manifest.

| Phần trước @ | Dùng để |
| --- | --- |
| `admin` | Cấu hình, xét duyệt, nội dung, nhân sự, kết quả |
| `cyber.leader` | Demo chính: đội 3/5, bài nộp, ticket |
| `cyber.member1` | Kiểm tra member không có thao tác leader |
| `green.leader` | Đội 5/5, xóa thành viên hợp lệ rồi đối chiếu reload |
| `chain.leader` | Đội bị khóa |
| `block.leader` | Đội 2 người bị từ chối, lý do khớp dữ liệu |
| `pendingteam.leader` | Đội đủ 3 người, chờ admin xét duyệt |
| `builders.leader` | Đội 2 người chưa đủ điều kiện |
| `explore.leader` | Đội đủ 3 người nhưng chưa chọn đề tài |
| `newleader`, `join1`, `join2`, `join3` | Tạo đội/join/rời/chuyển leader trực tiếp |
| `onboarding` | Thiếu hồ sơ, minh họa hoàn thiện hồ sơ và cam kết |
| `pending`, `rejected`, `inactive` | Tài khoản chờ duyệt/bị từ chối/ngừng hoạt động |
| `mentor1`, `mentor2` | Hai người xử lý ticket độc lập |
| `judge1`, `judge2` | Chấm ẩn danh; hai giám khảo đều được phân công 4 đội |

Mã các đội có sẵn xem manifest; ví dụ `DEMOCYBER`, `DEMOGREEN`, `DEMOBUILDERS`. Mã đội tạo trực tiếp lấy từ giao diện, không dùng mã giả định.

## 3. Thứ tự demo chính

### Cảnh 1 — Tổng quan hệ thống (2 phút)

Đăng nhập `admin`, vào `/admin/dashboard`. Giới thiệu bốn vai trò và số liệu đã có. Mở `/admin/teams` cho thấy danh sách đội có trạng thái khác nhau; tìm `GreenPulse IoT`, chỉ ra một tên/một mã đội duy nhất.

Lời dẫn: “Dữ liệu đã được lưu trong CSDL; sau các thao tác tôi sẽ tải lại trang để kiểm tra kết quả.”

### Cảnh 2 — Cấu hình cuộc thi và tiêu chí trước khi chấm (3 phút)

Vào `/admin/config`: tên cuộc thi, giai đoạn, tối thiểu 3/tối đa 5, công bố đề tài, trạng thái bảng điểm. Đổi tên thành “HackFlow — Demo trực tiếp”, lưu, F5; bấm lưu lại khi không đổi gì và rời trang: không cảnh báo chưa lưu.

Vào `/admin/criteria`, sửa mô tả một tiêu chí, giữ tổng trọng số 100%, lưu rồi tải lại. Làm phần này **trước khi giám khảo gửi điểm chính thức**. Có thể thêm/bớt một tiêu chí tạm rồi khôi phục bốn tiêu chí trước cảnh chấm.

### Cảnh 3 — Hồ sơ, duyệt tài khoản và whitelist (3 phút)

Mở `/admin/approvals`: duyệt tài khoản `pending`. Vào `/admin/whitelist`, tìm email vừa duyệt để xác nhận đồng bộ; thêm một email demo mới, thử trùng email và xử lý theo thông báo hệ thống. Nếu có nhập danh sách, dùng các email demo mới, không nhập dữ liệu thật.

Ở phiên candidate, đăng nhập `onboarding`, điền mã sinh viên, trường, điện thoại, kỹ năng và cam kết theo hướng dẫn. Lưu hồ sơ, đăng xuất/đăng nhập lại để chứng minh dữ liệu được giữ. Dùng `pending`, `rejected`, `inactive` để trình bày khác biệt quyền truy cập; không mất thời gian hoàn tất toàn bộ wizard của từng tài khoản phụ.

Đăng ký tài khoản mới hoặc GitHub OAuth có thể minh họa ở đây nếu đã cấu hình kết nối thật. Tài khoản cấp sẵn giúp tiếp tục demo nếu không trình diễn OAuth.

### Cảnh 4 — Tạo tài khoản chuyên gia, đề tài và thông báo (4 phút)

Vào `/admin/personnel`, chọn **tạo tài khoản** mentor/judge, dùng email mới như `mentor.live@demo.example.com`. Chỉ trình bày tạo tài khoản, **không nói gửi thư mời**. Thử tạo lại cùng email: phải có thông báo phù hợp, không thêm dòng tạm sau F5. Với tài khoản vừa tạo có thể sửa thông tin/khóa hoặc xóa nếu UI hỗ trợ; dùng tài khoản phụ để không phá dữ liệu cảnh sau.

Vào `/admin/topics`, mở một đề tài nhánh, đổi cố vấn bằng danh sách tài khoản mentor, lưu/F5 và đối chiếu. Có thể tạo/sửa/xóa một lĩnh vực hoặc đề tài tạm chưa được đội sử dụng. Không xóa các đề tài mẫu đang được dùng.

Vào `/admin/announcements`, tạo thông báo cho candidate. Mở phiên candidate để kiểm tra. Sửa thông báo dành cho judge, giữ nguyên đối tượng nhận; candidate không thấy nội dung đó. Thử đọc/đánh dấu thông báo và tải lại để kiểm tra trạng thái.

### Cảnh 5 — Tạo đội, tham gia và phân quyền leader (4 phút)

Đăng nhập `newleader`, tạo đội “LiveDemoTeam” trong `/teams` hoặc theo wizard bắt buộc. Sao chép mã mời thật. Lần lượt dùng `join1`, `join2` tham gia để đội đủ 3 người; với tài khoản chưa có đội, hoàn thành các bước hồ sơ/cam kết mà hệ thống yêu cầu.

Đối chiếu số thành viên `/dashboard` và `/teams`; thêm `join3` nếu cần minh họa 4/5. Thử nhập mã sai ở một tài khoản chưa có đội. Chuyển quyền cho `join1`, đăng nhập `join1` để thấy quyền mới; thực hiện chuyển lại hoặc dùng đội phụ này cho phần rời/xóa thành viên. Khi rời/xóa, giữ tối thiểu nếu đội đã được duyệt/chọn đề tài.

Không dùng CyberSamurai để demo chuyển leader vì các cảnh nộp bài/ticket bên dưới đã gắn với `cyber.leader`.

### Cảnh 6 — Giới hạn thành viên và xét duyệt đội (3 phút)

Đăng nhập `cyber.leader`: đội **3/5**. Thử xóa một thành viên: bị từ chối vì dưới tối thiểu, danh sách không đổi sau F5. Đăng nhập `green.leader`: đội **5/5**, xóa một member thành 4/5 thành công, F5 vẫn 4/5. Sau đó có thể cho member bị xóa nhập lại `DEMOGREEN`.

Admin duyệt `PendingPioneers`; thử duyệt `NewBuilders` có 2 người và quan sát điều kiện. Mở `BlockShield`: lý do từ chối nêu đúng 2 thành viên tại lúc xét duyệt. Nếu muốn demo từ chối trực tiếp, dùng đội phụ và nhập lý do cụ thể. Mở `ChainTrace` để minh họa đội khóa không tự sửa thành viên.

### Cảnh 7 — Chọn/hủy đề tài và kiểm soát chỗ (2 phút)

Đăng nhập `explore.leader`, vào `/topics`: thử lĩnh vực **Web3 — Đã hết chỗ** để thấy bị chặn. Chọn nhánh còn chỗ của **AI & Giáo dục**, F5 và quan sát chỗ đã sử dụng tăng. Hủy trong điều kiện cho phép để thấy trả lại chỗ; nếu UI đang khóa theo giai đoạn thì admin mở chọn đề tài trước cảnh này.

Nếu muốn thể hiện tính nhất quán, mở danh mục ở admin sau thao tác và đối chiếu với candidate. Không sửa tay bộ đếm slot trong CSDL.

### Cảnh 8 — Checkpoint, nộp tiến độ và lịch sử (3 phút)

Admin mở `/admin/checkpoints`, giới thiệu giờ mở/đóng, trọng số, yêu cầu và trường nộp. Có thể tạo một chặng tạm để minh họa cấu hình rồi xóa khi chưa có bài; giữ bốn chặng mẫu.

Candidate `cyber.leader` vào `/checkpoints`: một chặng đã đóng, một chưa mở, một chặng tiến độ đang mở. Mở chặng 2, nộp liên kết/ghi chú mới; tải lại và xem lịch sử chuyển từ v2 sang v3. Gửi lại y nguyên ngay có thể được coi là yêu cầu trùng, nên đổi ghi chú khi minh họa phiên bản mới.

Thử nộp tại chặng đã đóng/chưa mở nếu giao diện cho thao tác; trường hợp nút bị khóa, giải thích UI đã ngăn trước và dùng kiểm thử API bổ sung để chứng minh backend cũng chặn. Không bật giả lập thời gian trong bản demo công khai.

### Cảnh 9 — Nộp chung kết, xác minh SHA thật (2 phút)

Vẫn dùng `cyber.leader`, vào `/final-submission`, thay repo/link mẫu bằng repo GitHub công khai hoạt động, nộp lại. Kiểm tra thông báo, thời gian nhận, SHA và lịch sử sau F5. Chuẩn bị trước quyền truy cập/token nếu dùng repo riêng tư.

Bài chung kết được dựng sẵn đang ghi rõ chưa xác minh SHA. Chỉ gọi thao tác nộp lại này là “đóng băng SHA thành công” khi API thực sự trả kết quả thành công và có SHA. Nếu GitHub lỗi, trình bày đúng trạng thái lỗi và tiếp tục bằng bài mẫu; không coi bài mẫu là bằng chứng tích hợp GitHub đã chạy.

### Cảnh 10 — Ticket candidate → mentor → candidate (4 phút)

Candidate vào `/tickets`, tạo yêu cầu “Cần tư vấn trước demo”. Mentor1 vào `/mentor/tickets`, nhận ticket, phản hồi rồi đánh dấu giải quyết. Candidate tải lại, xem phản hồi và đóng hoặc mở lại trong hạn. Dùng ticket `[DEMO recent]` nếu muốn minh họa mở lại ngay.

Mở `[DEMO expired]`: đã giải quyết 60 giờ trước, thử mở lại phải bị chặn theo giới hạn 48 giờ. Mentor1 dùng bộ lọc “của tôi”: không có ticket `[DEMO other]` do mentor2 phụ trách. Đăng nhập mentor2 để thấy ticket đó. Nếu cần chứng minh quyền chống sửa chéo qua API, dùng ID trong manifest ở phần kiểm tra bổ sung.

Mentor mở `/mentor/teams` và `/mentor/checkpoints` để xem tiến độ; không thấy email/mã mời hay nội dung tài liệu, repo, SHA thuộc dữ liệu bị hạn chế.

### Cảnh 11 — Chấm ẩn danh, nháp và khóa điểm (4 phút)

Judge1 mở `/judge/dashboard` rồi `/judge/split-screen`. Bài chấm hiển thị mã đội ẩn danh. Chọn một bài, nhập điểm bốn tiêu chí và nhận xét. Lưu nháp, F5, chứng minh điểm còn giữ; sau đó gửi chính thức và thử chỉnh lại để thấy bị khóa.

Judge2 chấm cùng bài để có tổng hợp từ hai người. Có thể dùng các điểm 9/8/8/8 cho cả hai để dễ giải thích kết quả 83/100. Với chế độ ẩn danh, mở đúng bài theo mã đang hiển thị, không khẳng định mã cố định giữa các môi trường vì mã phụ thuộc `SECRET_KEY`.

Admin quay lại `/admin/criteria` thử sửa rubric: bị chặn khi đã có điểm submitted, tránh làm thay đổi ý nghĩa điểm đã chấm.

### Cảnh 12 — Kết quả, mở khóa chấm lại và công bố (4 phút)

Nếu chỉ có ít thời gian, tiếp tục ngay với bảng điểm vừa tạo. Nếu cần bảng tổng hợp đủ bốn đội, dừng backend và chuyển sang DB **results** theo README; nói rõ đây là “bộ kết quả chuẩn bị sẵn để minh họa tổng hợp”. Đăng nhập lại các phiên.

Admin vào `/admin/results`: CyberSamurai và NeuralCrafters cùng **83 điểm**, CyberSamurai đứng trên do tiêu chí ưu tiên; GreenPulse IoT có hai tổng điểm **90 và 50**, chênh lệch 40, hiển thị cảnh báo. ChainTrace có **70 điểm**.

Trước khi công bố, candidate mở `/scoreboard` để thấy kết quả chưa được công bố. Admin xuất CSV. Sau đó chọn phiếu của **judge2/GreenPulse IoT**, nhập lý do và mở khóa chấm lại. Judge2 sửa điểm, gửi lại; admin tải lại để thấy tổng điểm/cảnh báo thay đổi.

Cuối cùng admin công bố kết quả. Candidate/mentor/judge mở bảng điểm và tải lại: xem được kết quả công khai; các trường nội bộ của từng giám khảo vẫn được giới hạn theo quyền. Admin có thể ẩn lại kết quả để trình diễn vòng đời công bố.

Kết thúc bằng việc đối chiếu một thao tác ghi đã thực hiện sau tải lại: thông báo mới, đội LiveDemoTeam, lịch sử bài nộp hoặc phản hồi ticket.

## 4. Các cảnh phụ để bao phủ chức năng còn lại

Thực hiện cuối buổi hoặc trên bản rehearsal mới để không làm thay đổi dữ liệu các cảnh chính.

| Chức năng | Cách demo | Điểm cần quan sát |
| --- | --- | --- |
| Admin CRUD đội | Tạo đội phụ, sửa thông tin rồi xóa | Tải lại không còn đội; không dùng đội có bài/điểm của phần chính |
| Ghép đội tự động | Dùng thí sinh tự do, chọn cỡ đội hợp lệ | Số thành viên, leader, phân công đề tài và trạng thái lưu thật; chạy cuối vì thay đổi nhiều tài khoản |
| Duyệt nhiều đội | Chuẩn bị hai đội đủ thành viên trên bản mới | Chỉ đội hợp lệ được duyệt, xử lý lỗi theo thông báo |
| Khóa/mở khóa đội | Admin thao tác trên đội phụ hoặc ChainTrace | Candidate bị chặn/được phép theo trạng thái đã lưu |
| Sửa/xóa nhân sự | Dùng chuyên gia mới tạo ở cảnh 4 | Không mất các tài khoản chính; gán mentor của đề tài được gỡ đúng khi xóa |
| CRUD thông báo | Thông báo tạm rồi sửa/xóa | Phạm vi người nhận, số lượng và trạng thái sau F5 |
| Hồ sơ/cam kết | `/profile`, `onboarding` | Dữ liệu được giữ khi đăng nhập lại |
| Xuất kết quả | CSV ở `/admin/results` | Mở file và đối chiếu thứ hạng/điểm đang hiển thị |
| Xem nhật ký | Qua API audit nếu giao diện chưa có trang riêng | Phân biệt fixture và sự kiện thao tác thật |
| Đăng ký/GitHub OAuth | Dùng tài khoản thật đã chuẩn bị | Callback, pending/whitelist và hồ sơ sau đăng nhập; không dùng email giả để nhận mail |

UI phân công giám khảo và phạm vi mentor theo lĩnh vực vẫn là khoảng trống chức năng đã ghi trong audit. Bộ dữ liệu chỉ gán trước quan hệ judge/team, không bổ sung các màn hình hoặc quy tắc đó.

## 5. Kiểm tra API bổ sung khi có thời gian

Không cần thực hiện tất cả trong buổi thuyết trình. Có thể dùng Swagger `/docs` với token của đúng tài khoản; lấy ID trong manifest.

1. Candidate gọi lấy đội khác: bị từ chối; chưa đăng nhập gọi danh sách đội: bị từ chối.
2. Mentor1 sửa ticket `other` của mentor2: bị từ chối; hai mentor nhận một ticket mới đồng thời: chỉ một người nhận được.
3. Candidate mở lại ticket `expired`: bị từ chối, dữ liệu không thay đổi.
4. Nộp chặng đóng/chưa mở: backend từ chối dù gửi trực tiếp ngoài giao diện.
5. Nộp trùng với cùng `Idempotency-Key`: không tạo hai bản ghi bài nộp.
6. Sau khi đã chấm, lưu rubric với `allow_override=true`: vẫn bị từ chối.
7. Mentor đọc bài nộp/lịch sử: không nhận repo, demo, commit, tài liệu hoặc nhận xét bị hạn chế; judge dùng API bài chấm ẩn danh.

Grace period 5 giây và tình huống mạng/GitHub lỗi dùng kịch bản kiểm thử riêng, không chỉnh CSDL hoặc giả lập điểm thành “dữ liệu thật” để tạo hiệu ứng trình diễn.

## 6. Bản rút gọn 12–15 phút

1. Admin tổng quan, giới hạn đội, lưu cấu hình và tạo tài khoản mentor: 2 phút.
2. Candidate CyberSamurai đối chiếu 3/5, thử xóa bị chặn, nộp lại chặng mở và F5: 3 phút.
3. Candidate tạo ticket → mentor nhận/phản hồi → candidate xem: 3 phút.
4. Judge lưu nháp → gửi điểm → khóa, admin không sửa rubric được: 3 phút.
5. Admin xem/công bố bảng điểm → candidate xem kết quả: 2 phút.

Muốn trình diễn thêm chênh lệch/đồng điểm, dùng bản results ngay từ đầu và bỏ phần sửa rubric thành công; nói rõ rubric đã bị khóa do có điểm.

## 7. Tình trạng xác minh khi bàn giao

- Hai bản được sinh thành tệp riêng, không ghi đè CSDL hiện hành.
- Đã kiểm tra qua API thật trên SQLite tách biệt: đăng nhập bốn vai trò, danh sách đội/đề tài/chặng/ticket/thông báo, bài chấm, lưu nháp→submitted, ẩn→công bố bảng điểm, đồng điểm và cảnh báo chênh lệch.
- Đã bật FK khi sinh CSDL và kiểm tra toàn vẹn, kiểm tra từ chối nạp vào DB đã có dữ liệu và tắt seed khởi động.
- Kết quả hồi quy backend sau thay đổi: **165 passed**; gồm 4 ca mới cho hai trạng thái demo, bảo vệ DB có dữ liệu và tùy chọn tắt seed. Hai tệp bàn giao đã được đọc lại để đối chiếu toàn bộ số lượng bảng, FK, tính toàn vẹn SQLite và mật khẩu với cấu hình backend hiện tại.
- Đây không phải xác nhận mọi thao tác UI đã được chạy end-to-end trên Railway. Trước buổi demo cần diễn tập trên chính địa chỉ triển khai, đặc biệt OAuth, GitHub SHA và PostgreSQL.
