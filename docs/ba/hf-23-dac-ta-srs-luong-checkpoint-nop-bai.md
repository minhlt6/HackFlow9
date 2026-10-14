---
id: "HF-23"
title: "Đặc tả SRS: Luồng Checkpoint nộp bài"
status: "Done"
assignee: "Phuong ly Dinh"
priority: "P0"
deadline: "2026-10-12"
notion_url: "https://app.notion.com/p/HF-23-c-t-SRS-Lu-ng-Checkpoint-n-p-b-i-3f51caaa7e8581a08393ef2507a88a99"
last_edited: "12:40:00 14/10/2026"
pulled_at: "15:21:38 14/10/2026"
---

# HF-23 — Đặc tả SRS: Luồng Checkpoint nộp bài

| | |
|---|---|
| **Status** | Done |
| **Assignee** | Phuong ly Dinh |
| **Sprint** | — |
| **Ưu tiên** | P0 |
| **Hạn hoàn thành** | 2026-10-12 |
| **Cập nhật** | 12:40:00 14/10/2026 |
| **Notion** | [Mở trang](https://app.notion.com/p/HF-23-c-t-SRS-Lu-ng-Checkpoint-n-p-b-i-3f51caaa7e8581a08393ef2507a88a99) |

---

## 🎯 Mục tiêu
Viết tài liệu đặc tả hệ thống (SRS) cho chức năng Checkpoint.

## ✅ Acceptance Criteria
- [ ] Định nghĩa rõ luồng Business logic: Thí sinh nộp -> Backend Check giờ -> Backend lấy SHA -> Trả kết quả.
- [ ] Ghi rõ quy tắc xử lý độ trễ mạng (Network Latency) - có cho phép grace period (VD: 5 giây) hay chặn cứng tuyệt đối.
- [ ] Cập nhật tài liệu trên Wiki/Notion dự án.

# SRS — Module Checkpoint & Nộp bài (HackFlow)

# 

## 1. Tổng quan & Cấu hình dữ liệu Checkpoint:
- Module Checkpoint & Nộp bài đóng vai trò cốt lõi trong hệ thống quản lý cuộc thi lập trình HackFlow, cho phép các đội thi nộp sản phẩm mã nguồn và tài liệu theo từng mốc thời gian (checkpoint) do Ban tổ chức quy định.
1.1. Cấu hình Checkpoint tại cấp độ Admin:
- is_final_checkpoint (boolean): Xác định đây có phải là checkpoint cuối cùng của cuộc thi hay không.
  - true: Bắt buộc đóng băng Commit SHA từ GitHub. Lưu ý: Thuộc tính apply_sha_freeze chỉ hợp lệ và có hiệu lực khi is_final_checkpoint = true. Checkpoint cuối bắt buộc phải cấu hình đúng 1 trường repo_url với apply_sha_freeze = true và required = true.
  - false: Checkpoint trung gian, chỉ nộp tài liệu/tiến độ, không gọi GitHub API hay freeze SHA (apply_sha_freeze tự động bỏ qua).
- grace_period_seconds (integer): Khoảng thời gian dung thứ tính bằng giây cho checkpoint này (mặc định là 5 giây, BTC có thể tùy chỉnh linh hoạt theo từng vòng thi).
- submission_fields (JSON/List): Danh sách các trường dữ liệu động yêu cầu thí sinh nộp, được cấu hình theo từng checkpoint. Mỗi field bao gồm:
  - field_key (string): Khóa định danh (ví dụ: repo_url, demo_url, slide_url, progress_note).
  - field_label (string): Tên hiển thị trên giao diện.
  - required (boolean): Bắt buộc nhập hay không.
  - apply_sha_freeze (boolean): Trường này có dùng để lấy Commit SHA hay không (chỉ hợp lệ khi is_final_checkpoint = true).
2. Luồng Business Logic chi tiết:
Quy trình nộp bài từ phía thí sinh đến hệ thống Backend được thực hiện qua các bước tuần tự chuẩn hóa:

### 2.1: Khởi tạo & Kiểm tra Phân quyền Đội trưởng:
- Thí sinh đăng nhập, xác thực token hợp lệ, kiểm tra approval_status == APPROVED. Nếu chưa được duyệt, trả về mã lỗi ACCOUNT_NOT_APPROVED (403).
- Quy tắc phân quyền bắt buộc: Hệ thống kiểm tra vai trò trong đội của user. Chỉ thành viên giữ vai trò Đội trưởng (TEAM_LEADER) mới được phép gửi request nộp bài. Nếu thành viên thường gọi API -> Từ chối ngay với mã lỗi FORBIDDEN_NOT_TEAM_LEADER (403) để tránh xung đột dữ liệu do nhiều thành viên cùng nộp.
2.2: Kiểm tra thời gian & Trạng thái Checkpoint (Cập nhật công thức):
- Thay vì chỉ kiểm tra trạng thái đơn thuần, hệ thống lấy server_timestamp và kiểm tra tính hợp lệ của thời điểm nộp bài theo công thức tính hạn chót và vùng ân hạn (Grace Period) quy định tại Mục 3. Nếu vượt quá deadline + grace_period_seconds, hệ thống chặn ngay lập tức.
2.3: Validate Dữ liệu động theo submission_fields:
- Kiểm tra submission_data do client gửi lên có đáp ứng đầy đủ các trường required = true hay không. Nếu thiếu thì trả về mã lỗi MISSING_REQUIRED_FIELD (422).
2.4: Xử lý trạng thái trung gian, Gọi GitHub API & Cơ chế Fallback/Resubmission:
- Ghi nhận trạng thái PENDING_SHA_FREEZE: Đối với is_final_checkpoint = true, hệ thống ghi nhận ngay submitted_at và tạo bản ghi ở trạng thái trung gian PENDING_SHA_FREEZE ngay tại thời điểm vượt qua Time-Gated Check (trước khi gọi GitHub API), nhằm loại bỏ hoàn toàn bài toán Race Condition về thời gian.
- Chiến lược Retry & Fallback cho GitHub API:
  - Backend tự động gọi GitHub REST API để lấy Commit SHA mới nhất của branch mặc định.
  - Nếu gặp lỗi kết nối tạm thời / timeout / rate limit từ GitHub, hệ thống áp dụng Retry tối đa 3 lần (khoảng chờ 1s giữa mỗi lần).
  - Trường hợp repo private hoặc không tồn tại: Trả về mã lỗi GITHUB_REPO_INACCESSIBLE (422) (lỗi từ phía thí sinh). Đặc biệt trong kịch bản Nộp lại (Resubmission): Nếu đội thi đã có một bài nộp hợp lệ trước đó (SUBMITTED) nhưng trong lần nộp cập nhật lại gặp lỗi GITHUB_REPO_INACCESSIBLE (ví dụ thí sinh đổi repo sang private), hệ thống phải tự động rollback/quay về phiên bản SUBMITTED trước đó, đảm bảo đội thi không bị mất bài nộp hợp lệ.
  - Trường hợp hết 3 lần retry mà GitHub API vẫn lỗi (503 / GITHUB_API_UNAVAILABLE): Hệ thống chuyển submission sang trạng thái đặc biệt SHA_VERIFICATION_FAILED. Quy định Response cho Frontend: Trả về HTTP Status 200 OK (với status: "SHA_VERIFICATION_FAILED" trong body response), vẫn chấp nhận thời điểm nộp đúng hạn của thí sinh, đồng thời gửi cảnh báo cho Ban tổ chức để verify Commit SHA thủ công, tránh làm frontend bị crash/lỗi 503.
- Nếu is_final_checkpoint = false -> Bỏ qua toàn bộ bước gọi GitHub API.
2.5 Hoàn tất và Phản hồi kết quả:
- Cập nhật trạng thái bản ghi thành SUBMITTED kèm Commit SHA đã đóng băng (đối với checkpoint cuối) hoặc dữ liệu đã lưu trữ, đảm bảo tuân thủ ràng buộc duy nhất Unique Constraint (team_id, checkpoint_id).
3. Quy tắc xử lý độ trễ mạng & Grace Period cấu hình:
Nhằm đảm bảo tính công bằng và linh hoạt, hệ thống áp dụng công thức kiểm tra thời hạn tại Server dựa trên tham số cấu hình riêng cho từng checkpoint:
Is_Valid = (server_timestamp <= checkpoint.deadline + checkpoint.grace_period_seconds)
- Trường hợp server_timestamp <= checkpoint.deadline : Nộp bài hợp lệ hoàn toàn, ghi nhận bình thường (không bật cờ trễ).
- Trường hợp checkpoint.deadline < server_timestamp <= checkpoint.deadline + grace_period_seconds: Nộp bài trong vùng Grace Period. Hệ thống vẫn chấp nhận bài nộp, đồng thời tự động bật late_grace_period = true trong Audit Log để Ban tổ chức rà soát.
- Trường hợp server_timestamp > checkpoint.deadline + grace_period_seconds : Quá hạn hoàn toàn. Hệ thống chặn cứng tuyệt đối và trả về mã lỗi DEADLINE_EXCEEDED (400).
4. Cơ chế Idempotency & Phát hiện Request Trùng:
Để xử lý các tình huống mạng lag, F5 refresh hoặc thí sinh bấm nút submit nhiều lần:
4.1: Ràng buộc cơ sở dữ liệu:
- Bảng submissions có khóa unique kết hợp (team_id, checkpoint_id), đảm bảo ở tầng DB chỉ tồn tại 1 bản ghi chính thức duy nhất cho mỗi đội tại mỗi checkpoint.

### 4.2: Quy tắc Nộp lại & Chống trùng lặp:
- Nộp lại khi đã có submission và vẫn trong hạn (trước deadline + grace period): Cho phép ghi đè dữ liệu mới (overwrite), tự động lưu lịch sử phiên bản (version history) để phục vụ tra soát.
- Nộp lại khi đã có submission và đã quá hạn: Từ chối ngay lập tức với mã lỗi DEADLINE_EXCEEDED (400).
- Phát hiện request trùng (Duplicate Detection):
  - Hỗ trợ chuẩn hóa qua HTTP Header Idempotency-Key (nếu client gửi lên).
  - Ngoài ra, hệ thống tự động nhận diện request trùng dựa trên tiêu chí: Gửi trong cửa sổ thời gian ngắn (trong vòng 10 giây kể từ request trước đó) có cùng team_id, checkpoint_id và payload JSON submission_data hoàn toàn giống hệt. Hệ thống sẽ nhận diện và trả về ngay bản ghi submission hiện tại (200 OK) mà không tạo mới bản ghi rác hay gọi lại GitHub API thừa thãi.
5. Bảng mã lỗi chuẩn:

6. API Contract Đề Xuất (POST /api/v1/submissions):
- Quyền yêu cầu: Thí sinh đã đăng nhập, APPROVED, vai trò TEAM_LEADER.
- Request Headers (Tùy chọn): Idempotency-Key: uuid-string
- Request Body (JSON động theo cấu hình checkpoint):
{
"checkpoint_id": "cp_uuid_987654",
"submission_data": {
"repo_url": "[duong_dan_github_repository]",
"demo_url": "[duong_dan_demo_ung_dung]",
"slide_url": "[duong_dan_slide_trinh_bay]"
}
}
- Response Thành Công (200 OK - SUBMITTED):
{
"success": true,
"data": {
"submission_id": "sub_uuid_123456",
"team_id": "team_uuid_789",
"checkpoint_id": "cp_uuid_987654",
"status": "SUBMITTED",
"submitted_at": "2026-10-15T23:59:52Z",
"commit_sha": "a1b2c3d4e5f67890123456789abcdef012345678",
"grace_period_applied": true
},
"message": "Nộp bài thành công."
}
- Response Khi Lỗi Hạ Tầng GitHub (200 OK - SHA_VERIFICATION_FAILED):
{
"success": true,
"data": {
"submission_id": "sub_uuid_123456",
"team_id": "team_uuid_789",
"checkpoint_id": "cp_uuid_987654",
"status": "SHA_VERIFICATION_FAILED",
"submitted_at": "2026-10-15T23:59:52Z",
"commit_sha": null,
"grace_period_applied": false
},
"message": "Bài nộp đã được ghi nhận nhưng không thể lấy Commit SHA do GitHub API gián đoạn. BTC sẽ xác thực thủ công."
}
7. Bộ Kịch bản Kiểm thử UAT & Test Cases:
7.1: UAT-FIX-01: Chặn thành viên thường nộp bài
- Given: User A có vai trò là thành viên thường (MEMBER), thuộc đội hợp lệ (APPROVED).
- When: User A gọi API POST /api/v1/submissions.
- Then: Hệ thống từ chối ngay lập tức với mã lỗi FORBIDDEN_NOT_TEAM_LEADER (403).
7.2: UAT-FIX-02: Checkpoint trung gian không freeze SHA & validate dynamic fields
- Given: Checkpoint giữa kỳ có is_final_checkpoint = false, yêu cầu trường slide_url là bắt buộc (required = true).
- When: Đội trưởng nộp thiếu slide_url.
- Then: Hệ thống trả về MISSING_REQUIRED_FIELD (422); khi nộp đủ, hệ thống lưu dữ liệu mà hoàn toàn bỏ qua việc gọi GitHub API.
7.3: UAT-FIX-03: Nộp lại trước deadline & Chống Race Condition
- Given: Đội trưởng đã nộp bài một lần, thời gian server nằm trong hạn (kể cả vùng Grace Period).
- When: Đội trưởng nộp lại bản cập nhật mới trước deadline.
- Then: Hệ thống ghi nhận submitted_at chuẩn từ lúc nhận request, ghi đè (overwrite) vào unique record (team_id, checkpoint_id), đồng thời lưu lịch sử version cũ.
7.4: UAT-FIX-04: Grace Period cấu hình linh hoạt
- Given: Checkpoint được cấu hình grace_period_seconds = 10.
- When: Thí sinh nộp bài trễ 8 giây sau deadline chính thức.
- Then: Hệ thống vẫn chấp nhận bài nộp và đánh dấu cờ late_grace_period = true trong Audit Log.
7.5: UAT-FIX-05: Chặn quá hạn hoàn toàn (DEADLINE_EXCEEDED)
- Given: Checkpoint đã qua deadline cộng thêm grace period (ví dụ trễ 12 giây với grace period 10s).
- When: Thí sinh gọi API nộp bài.
- Then: Hệ thống chặn cứng tuyệt đối và trả về mã lỗi DEADLINE_EXCEEDED (400).
7.6: UAT-FIX-06: Xử lý Repo Private / Inaccessible & Rollback an toàn
- Given: Đội trưởng nộp bài checkpoint cuối với URL GitHub trỏ tới repo ở chế độ Private hoặc không tồn tại. Đội đã từng có 1 bài nộp hợp lệ trước đó.
- When: Hệ thống gọi GitHub API và nhận lỗi 422 GITHUB_REPO_INACCESSIBLE.
- Then: Hệ thống trả về mã lỗi 422 GITHUB_REPO_INACCESSIBLE cho client, đồng thời tự động rollback về trạng thái và phiên bản SUBMITTED hợp lệ trước đó để đội không bị mất bài.
7.7: UAT-FIX-07: Xử lý hết 3 lần retry GitHub API (SHA_VERIFICATION_FAILED)
- Given: Checkpoint cuối có is_final_checkpoint = true. GitHub API liên tục gặp sự cố mạng/timeout (503).
- When: Hệ thống thực hiện retry đủ 3 lần nhưng vẫn thất bại.
- Then: Hệ thống chuyển submission sang trạng thái SHA_VERIFICATION_FAILED, trả về HTTP Status 200 OK kèm thông báo để Frontend hiển thị trạng thái chờ BTC kiểm tra thủ công.
7.8: UAT-FIX-08: Nộp thành công checkpoint cuối có khóa SHA
- Given: Checkpoint cuối có is_final_checkpoint = true, cấu hình đúng 1 field repo_url (apply_sha_freeze = true, required = true).
- When: Đội trưởng gửi request nộp bài hợp lệ trong thời hạn.
- Then: Hệ thống ghi nhận trạng thái PENDING_SHA_FREEZE, gọi GitHub API thành công, lấy được Commit SHA chính xác, cập nhật trạng thái thành SUBMITTED kèm Commit SHA trong response.

---
*Kéo từ Notion lúc 15:21:38 14/10/2026 bởi notion-module*
