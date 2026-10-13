---
id: "HF-24"
title: "Đặc tả SRS: Module Thông báo chung"
status: "In Review"
assignee: "Phuong ly Dinh"
priority: "P1"
deadline: "2026-10-13"
notion_url: "https://app.notion.com/p/HF-24-c-t-SRS-Module-Th-ng-b-o-chung-3f51caaa7e85815cad87f99720cab33d"
last_edited: "22:23:00 13/10/2026"
pulled_at: "22:25:40 13/10/2026"
---

# HF-24 — Đặc tả SRS: Module Thông báo chung

| | |
|---|---|
| **Status** | In Review |
| **Assignee** | Phuong ly Dinh |
| **Sprint** | — |
| **Ưu tiên** | P1 |
| **Hạn hoàn thành** | 2026-10-13 |
| **Cập nhật** | 22:23:00 13/10/2026 |
| **Notion** | [Mở trang](https://app.notion.com/p/HF-24-c-t-SRS-Module-Th-ng-b-o-chung-3f51caaa7e85815cad87f99720cab33d) |

---

## 🎯 Mục tiêu
Đặc tả yêu cầu cho phân hệ Thông báo.

## ✅ Acceptance Criteria
- [ ] Định nghĩa các loại thông báo (Info, Warning, Urgent).
- [ ] Xác định rule hiển thị (Ví dụ: thông báo Urgent tự động popup hay chỉ hiện badge đỏ?).

## PHẦN I: MODULE CƠ CHẾ THÔNG BÁO (NOTIFICATION SYSTEM)

### 1. Định nghĩa các loại thông báo
- Thông báo loại Info( Thông báo chung)
  - Mức độ ưu tiên: Thấp / Bình thường.
  - Mục đích: Cập nhật trạng thái hệ thống, xác nhận hành động thao tác thành công hoặc thông tin điều hướng chung mà không bắt buộc người dùng phải phản hồi ngay.
  - Ví dụ:
    - Hồ sơ onboarding đã được gửi thành công và đang chờ xét duyệt.
    - Bạn đã tạo hoặc tham gia đội thi thành công.
    - Lịch trình vòng loại/danh sách đề tài đã được công bố.
- Thông báo loại Warning (Cảnh báo):
  - Mức độ ưu tiên: Trung bình.
  - Mục đích: Nhắc nhở người dùng về các mốc thời gian quan trọng sắp đến hạn, các hạn chế tài khoản hoặc nguy cơ phát sinh sự cố nếu không xử lý kịp thời.
  - Ví dụ:
    - Checkpoint sắp đóng trong vòng 30 phút tới.
    - Tài khoản của bạn đang ở trạng thái PENDING, chưa thể tạo hoặc tham gia đội thi.
    - Phát hiện điểm số lệch giữa các giám khảo vượt ngưỡng quy định.
- Thông báo loại Urgent (Khẩn cấp / Quan trọng):
  - Mức độ ưu tiên: Cao nhất.
  - Mục đích: Truyền tải thông tin thay đổi đột xuất, sự cố nghiêm trọng, thông báo từ chối hồ sơ hoặc chốt kết quả mốc thi ảnh hưởng trực tiếp đến quyền lợi của người dùng.
  - Ví dụ:
    - Checkpoint đã đóng hạn chót; hệ thống đã ghi nhận đóng băng Commit SHA.
    - Ban tổ chức đã từ chối hồ sơ của bạn (kèm lý do chi tiết).
    - Có ticket hỗ trợ mới cần xử lý gấp dành cho Mentor.

### 2. Quy tắc hiển thị thông báo (UX/UI Rules)
- Rule hiển thị cho loại Info:
  - Hiển thị dạng Toast Message tự động biến mất sau 3 đến 5 giây ở góc màn hình.
  - Tăng số đếm trên Badge chuông thông báo ở thanh menu chính với tông màu xám hoặc xanh nhạt.
  - Người dùng có thể xem lại trong trung tâm thông báo (Notification Center) bất cứ lúc nào.
- Rule hiển thị cho loại Warning:
  - Hiển thị dạng Banner cảnh báo (Sticky Banner hoặc Alert Box màu vàng/cam) cố định ở vị trí dễ nhìn trên Dashboard của người dùng.
  - Cập nhật Badge chuông thông báo với màu cam nổi bật.
  - Duy trì hiển thị cho đến khi người dùng bấm nút "Đã hiểu" (Dismiss) hoặc hoàn thành hành động được nhắc nhở.
- Rule hiển thị cho loại Urgent (Khẩn cấp):
  - Tự động kích hoạt Modal Popup (hộp thoại nổi giữa màn hình): Xuất hiện ngay khi thông báo phát ra hoặc ngay khi người dùng đăng nhập/tải lại trang.
  - Tính chất chặn tương tác: Người dùng bắt buộc phải tương tác (bấm xác nhận "Tôi đã hiểu" hoặc thực hiện hành động yêu cầu) thì mới có thể tắt popup và tiếp tục sử dụng các chức năng khác. Không cho phép click ra ngoài khoảng xám để tắt (Prevent backdrop close).
  - Hiển thị Badge chuông đỏ kèm số lượng thông báo chưa đọc để gây sự chú ý tối đa.

### 3. Phân quyền & Tác nhân tạo thông báo
- Phân loại tác nhân:
  - Hệ thống tự sinh (System Auto-generated): Các sự kiện nghiệp vụ tự động kích hoạt thông báo.
  - BTC thủ công (Admin Manual): Thông báo do Ban tổ chức soạn thảo và phát đi qua Admin Dashboard.
- Quy tắc phân quyền & Bảo mật:
  - Chỉ tài khoản có quyền Admin / BTC mới được phép tạo và gửi thông báo thủ công. Thành viên/Thí sinh cố tình gọi API tạo thông báo sẽ bị chặn với mã lỗi 403 FORBIDDEN.
  - Bảo mật tầng Backend: Backend tự động lọc phạm vi hiển thị khớp với role, team_id hoặc user_id của người gọi.
  - Lưu ý nghiệp vụ đặc thù: Trường hợp "Tài khoản PENDING chưa tạo được đội" được thể hiện bằng Status Banner cố định (HF-15) trên Dashboard thay vì tạo bản ghi thông báo trong CSDL để tránh trùng lặp.

### 4. Tiêu chí chọn đối tượng nhận thông báo
Khi soạn thông báo thủ công, BTC có thể linh hoạt chọn các phạm vi:
- ALL: Tất cả người dùng.
- ROLE: Chọn 1 hoặc nhiều nhóm (Thí sinh candidate - kèm tùy chọn lọc thí sinh APPROVED / đội chưa nộp checkpoint, Mentor mentor, BGK judge).
- TEAM: Chọn cụ thể một hoặc nhiều đội thi (target_team_ids).
- USER: Chọn cá nhân cụ thể (target_user_ids).

### 5. Bảng ánh xạ Sự kiện — Loại — Người nhận


### 6. Định nghĩa Dữ liệu & Vòng đời (Data & Lifecycle)
- Bảng notifications: notification_id (UUID, PK), type (INFO/WARNING/URGENT), title, content, target_scope, target_roles, target_team_ids, target_user_ids, created_by, created_at, expires_at.
- Bảng notification_reads: notification_id, user_id, read_at, dismissed_at.
- Vòng đời & Hết hạn: Trạng thái Unread → Read → Dismissed. Thông báo Warning sẽ tự động ẩn khi quá expires_at.

### 7. API Contract Tiêu Chuẩn & Cơ chế Gửi
- API Endpoints (Envelope { success, data, message, error_code }):
  - POST /api/v1/admin/notifications
  - GET /api/v1/notifications/me
  - GET /api/v1/notifications/unread-count
  - PATCH /api/v1/notifications/{id}/read
- Cơ chế Gửi (MVP Strategy): Sử dụng Polling định kỳ 30–60s kết hợp Kiểm tra khi đăng nhập / tải lại trang.

### 8. Mã lỗi chuẩn & Flowchart Quy trình Thông báo
- Mã lỗi: 403 FORBIDDEN (Không phải BTC), 404 TARGET_NOT_FOUND, 422 INVALID_NOTIFICATION_PAYLOAD.
- Sơ đồ luồng (Flowchart):
graph TD
A[Admin soạn thông báo trên Dashboard] --> B[Chọn Target Scope: ALL / ROLE / TEAM / USER]
B --> C[Gửi Request POST /api/v1/admin/notifications]
C --> D{Backend Validate}
D -- Lỗi (Thiếu data / Không phải Admin) --> E[Trả về lỗi 403 / 422]
D -- Hợp lệ --> F[Lưu DB bảng notifications]
F --> G[Client gọi API GET /notifications/me (Polling 30-60s)]
G --> H[Backend tự động lọc theo role/team/user]
H --> I{Phân loại hiển thị UI}
I -- Info --> J[Toast Message + Badge chuông]
I -- Warning --> K[Sticky Banner + Badge chuông]
I -- Urgent --> L[Blocking Modal Popup + Red Badge]
J --> M[User bấm Xác nhận / Đã đọc / Dismiss]
K --> M
L --> M
M --> N[Cập nhật bảng notification_reads (Read/Dismissed)]

## PHẦN II: MODULE CHECKPOINT & NỘP BÀI

## 1. Tổng quan & Cấu hình Dữ liệu Checkpoint
- is_final_checkpoint (boolean): true bắt buộc đóng băng Commit SHA từ GitHub; false là checkpoint trung gian, chỉ nộp tài liệu/tiến độ, không gọi GitHub API.
- submission_fields (JSON/List): Danh sách trường dữ liệu động cấu hình theo từng checkpoint (field_key, field_label, required, apply_sha_freeze).

### 2. Luồng Business Logic Chi Tiết & Kiểm tra Thời hạn (Strict Deadline)
1. Phân quyền Đội trưởng: Chỉ thành viên giữ vai trò TEAM_LEADER mới được nộp bài. Nếu thành viên thường gọi API -> Chặn với mã lỗi FORBIDDEN_NOT_TEAM_LEADER (403).
1. Kiểm tra thời hạn nghiêm ngặt (Loại bỏ Grace Period tự động):
  - Lấy server_timestamp làm mốc nộp chính thức (submitted_at).
  - Công thức kiểm tra hợp lệ tại Server:
  - Is_Valid=(server_timestampcheckpoint.deadline)
  - Trường hợp đúng hạn (server_timestampdeadline ): Hệ thống chấp nhận bản nộp bình thường.
  - Trường hợp quá hạn (server_timestamp>deadline ): Từ chối ngay lập tức, chặn cứng tuyệt đối, trả về mã lỗi DEADLINE_EXCEEDED (400).
1. Xử lý trạng thái trung gian & Gọi GitHub API (is_final_checkpoint = true):
  - Ghi nhận ngay submitted_at ở trạng thái trung gian PENDING_SHA_FREEZE trước khi gọi GitHub API để tránh Race Condition.
  - Chiến lược Retry & Fallback: Retry tối đa 3 lần khi GitHub API timeout/503. Nếu vẫn lỗi -> Chuyển sang trạng thái SHA_VERIFICATION_FAILED, giữ nguyên thời gian hợp lệ của thí sinh và báo BTC xử lý thủ công. Nếu repo private -> Lỗi GITHUB_REPO_INACCESSIBLE (422).

### 3. Cơ chế Idempotency & Quy tắc Nộp lại (Resubmission)
- Unique Constraint tại DB: Khóa duy nhất (team_id, checkpoint_id) bảo đảm mỗi đội chỉ có 1 bản ghi submission chính thức.
- Quy tắc nộp lại: Nộp lại khi còn trong hạn cho phép ghi đè (overwrite) và lưu lịch sử version; nộp lại khi đã quá hạn sẽ bị từ chối với DEADLINE_EXCEEDED. Duplicate detection xử lý các request trùng lặp trong tích tắc do mạng lag.

### 4. Bảng mã lỗi chuẩn Checkpoint Module

---
*Kéo từ Notion lúc 22:25:40 13/10/2026 bởi notion-module*
