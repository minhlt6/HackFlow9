---
id: "HF-35"
title: "Thiết kế kịch bản UAT (Test Cases) bổ sung luồng Checkpoint"
status: "Done"
assignee: "Phuong ly Dinh"
priority: "P0"
deadline: "2026-10-15"
notion_url: "https://app.notion.com/p/HF-35-Thi-t-k-k-ch-b-n-UAT-Test-Cases-b-sung-lu-ng-Checkpoint-3f51caaa7e8581639f2ae68743a73965"
last_edited: "22:00:00 14/10/2026"
pulled_at: "22:27:40 14/10/2026"
---

# HF-35 — Thiết kế kịch bản UAT (Test Cases) bổ sung luồng Checkpoint

| | |
|---|---|
| **Status** | Done |
| **Assignee** | Phuong ly Dinh |
| **Sprint** | — |
| **Ưu tiên** | P0 |
| **Hạn hoàn thành** | 2026-10-15 |
| **Cập nhật** | 22:00:00 14/10/2026 |
| **Notion** | [Mở trang](https://app.notion.com/p/HF-35-Thi-t-k-k-ch-b-n-UAT-Test-Cases-b-sung-lu-ng-Checkpoint-3f51caaa7e8581639f2ae68743a73965) |

---

## 🎯 Mục tiêu
Xây dựng kịch bản kiểm thử User Acceptance Testing (UAT).

## ✅ Acceptance Criteria
- [x] Viết test case: Nộp bài thành công trước deadline.
- [x] Viết test case: Nộp bài bị lỗi do Repo Private.
- [x] Viết test case: Nộp bài quá hạn 1 giây.
- [x] Trình bày dạng Excel / Google Sheet format chuẩn để báo cáo.

## 1. Quy tắc kỹ thuật cốt lõi:
- Phân quyền: Chỉ tài khoản trạng thái APPROVED và giữ vai trò Đội trưởng (TEAM_LEADER) mới có quyền gửi yêu cầu nộp bài.
- Công thức kiểm tra hạn chót: Is_Valid = (server_timestamp <= checkpoint.deadline + checkpoint.grace_period_seconds).
- Đóng băng Commit SHA: Chỉ áp dụng đối với checkpoint cuối (is_final_checkpoint = true). Các checkpoint trung gian bỏ qua việc gọi GitHub API.
- Chống Race Condition: Ghi nhận ngay trạng thái trung gian PENDING_SHA_FREEZE và timestamp tại thời điểm nhận request trước khi gọi GitHub API.
- Cơ chế Rollback an toàn: Nếu thao tác resubmission thất bại do lỗi phía thí sinh (repo private/invalid), hệ thống tự động rollback về bản SUBMITTED hợp lệ trước đó.
- Cửa sổ Idempotency: Tự động nhận diện request trùng trong vòng 10 giây hoặc qua header Idempotency-Key để trả về kết quả hiện tại mà không tạo bản ghi rác.

### 2. Bảng mã lỗi chuẩn hóa:
- INVALID_CHECKPOINT_STATUS (400): Checkpoint chưa mở, đã đóng hoặc không ở trạng thái active.
- DEADLINE_EXCEEDED (400): Thời điểm server vượt quá deadline + grace_period_seconds.
- FORBIDDEN_NOT_TEAM_LEADER (403): Thành viên thường thực hiện nộp bài.
- ACCOUNT_NOT_APPROVED (403): Tài khoản chưa được duyệt (PENDING/REJECTED).
- MISSING_REQUIRED_FIELD (422): Thiếu các trường dữ liệu bắt buộc cấu hình động.
- GITHUB_REPO_INACCESSIBLE (422): Đường dẫn repo không tồn tại hoặc ở chế độ Private.
- INVALID_GITHUB_URL / GITHUB_REPO_EMPTY (422): Sai định dạng URL GitHub hoặc repository rỗng không có commit.
- GITHUB_API_UNAVAILABLE (200 / 503): Gián đoạn GitHub API sau 3 lần retry. Trả về status "sha_verification_failed" trong body response 200 OK để BTC hỗ trợ thủ công.

### 3. API Contract Updates & Formatting Note:
Lưu ý: Các giá trị của trường status trong JSON response thống nhất sử dụng chuỗi viết thường dạng snake_case ("submitted", "pending_sha_freeze", "sha_verification_failed").

## Phần II: Bộ Kịch bản Kiểm thử UAT Suite (HF-35 Core Focus)

| Mã TC | Tên kịch bản kiểm thử | Vai trò (Actor) | Điều kiện tiên quyết (Given) | Các bước & Dữ liệu test (When) | Kết quả mong đợi (Then) | Mức độ ưu tiên | Trạng thái |
|---|---|---|---|---|---|---|---|
| **UAT-CP-01** | Nộp bài thành công trước deadline (Checkpoint cuối) | Đội trưởng (`TEAM_LEADER`) | Checkpoint `OPEN`, `is_final_checkpoint = true`, tài khoản `APPROVED`. | Gửi `POST /api/v1/submissions` trước deadline 10 phút với `repo_url` public hợp lệ. | HTTP `200 OK`, `status: "submitted"`, lưu `commit_sha` chính xác từ GitHub. | Cao | Sẵn sàng |
| **UAT-CP-02** | Chặn thành viên thường nộp bài | Thành viên (`MEMBER`) | User thuộc đội hợp lệ nhưng không phải Đội trưởng. | Gửi `POST /api/v1/submissions` với payload nộp bài. | HTTP `403 Forbidden`, `error_code: "FORBIDDEN_NOT_TEAM_LEADER"`. | Cao | Sẵn sàng |
| **UAT-CP-03** | Checkpoint trung gian không freeze SHA & validate field động | Đội trưởng | `is_final_checkpoint = false`, yêu cầu `required: slide_url`. | 1. Nộp thiếu `slide_url`.<br>2. Nộp đủ `slide_url`. | 1. HTTP `422 MISSING_REQUIRED_FIELD`.<br>2. HTTP `200`, `status: "submitted"`, không gọi GitHub API. | Trung bình | Sẵn sàng |
| **UAT-CP-04** | Nộp lại trước deadline & chống Race Condition | Đội trưởng | Đã có 1 bài nộp thành công trước đó, còn trong hạn. | Gửi request nộp lại bản mới trước deadline. | HTTP `200`, ghi đè dữ liệu mới, trạng thái trung gian `PENDING_SHA_FREEZE` ghi nhận timestamp tức thì. | Cao | Sẵn sàng |
| **UAT-CP-05** | Xử lý Grace Period linh hoạt | Đội trưởng | `grace_period_seconds = 10`. | Nộp bài trễ 8 giây so với deadline chính thức. | HTTP `200 OK`, `status: "submitted"`, Audit Log đánh dấu `late_grace_period = true`. | Trung bình | Sẵn sàng |
| **UAT-CP-06** | Chặn quá hạn tuyệt đối & kiểm thử trễ 1s | Đội trưởng | `grace_period_seconds = 0`. | Gửi request nộp bài tại `server_timestamp = deadline + 1s`. | HTTP `400 Bad Request`, `error_code: "DEADLINE_EXCEEDED"`. | Cao | Sẵn sàng |
| **UAT-CP-07** | Xử lý Repo Private/Inaccessible & Rollback | Đội trưởng | Đã có 1 bài nộp hợp lệ trước đó. | Nộp lại với `repo_url` trỏ tới Repo Private. | HTTP `422 GITHUB_REPO_INACCESSIBLE`, tự động rollback về bản `submitted` cũ thành công. | Cao | Sẵn sàng |
| **UAT-CP-08** | Xử lý sự cố GitHub API sau 3 lần retry | Đội trưởng | GitHub API phản hồi lỗi 503/timeout. | Nộp bài hợp lệ khi GitHub gặp sự cố. | HTTP `200 OK` (hoặc 503 quy ước), `status: "sha_verification_failed"`, báo BTC verify thủ công. | Cao | Sẵn sàng |
| **UAT-CP-09** | Chống trùng lặp & Cửa sổ Idempotency | Đội trưởng | Vừa gửi request nộp bài thành công. | Gửi lại request hệt như cũ trong vòng `< 10s` hoặc gửi cùng Header `Idempotency-Key`. | HTTP `200 OK`, trả về bản ghi hiện tại, không gọi lại GitHub API. | Trung bình | Sẵn sàng |
| **UAT-CP-10** | Nộp bài khi Checkpoint chưa mở hoặc inactive | Đội trưởng | Checkpoint trạng thái `UPCOMING` hoặc `is_active = false`. | Gửi request nộp bài vào checkpoint chưa cho phép. | HTTP `400 Bad Request`, `error_code: "INVALID_CHECKPOINT_STATUS"`. | Cao | Sẵn sàng |
| **UAT-CP-11** | Chặn tài khoản chưa duyệt nộp bài | Đội trưởng | Tài khoản ở trạng thái `PENDING` hoặc `REJECTED`. | Gửi request nộp bài. | HTTP `403 Forbidden`, `error_code: "ACCOUNT_NOT_APPROVED"`. | Cao | Sẵn sàng |
| **UAT-CP-12** | Kiểm tra URL GitHub sai định dạng hoặc Repo rỗng | Đội trưởng | `is_final_checkpoint = true`. | Nộp URL không đúng dạng repo GitHub hoặc Repo chưa có commit nào. | HTTP `422 Unprocessable Entity`, `error_code: "INVALID_GITHUB_URL"` hoặc `"GITHUB_REPO_EMPTY"`. | Trung bình | Sẵn sàng |
| **UAT-CP-13** | Gia hạn thủ công từ Admin & Audit Log | Admin / Đội trưởng | Checkpoint đã qua deadline. | 1. Admin cập nhật gia hạn deadline cho checkpoint.<br>2. Đội trưởng nộp lại bài. | HTTP `200 OK`, chấp nhận bài nộp, ghi nhận chi tiết vết thay đổi trong Audit Log. | Thấp | Sẵn sàng |

---
*Kéo từ Notion lúc 22:27:40 14/10/2026 bởi notion-module*
