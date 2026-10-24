# HF-50: Báo cáo Nghiệm thu Đồ án Cuối kỳ & Ma trận Truy vết Yêu cầu (RTM)

- **Mã công việc:** `HF-50`
- **Người thực hiện:** Đinh Phương Ly (Lead Business Analyst)
- **Sprint:** Sprint 5 (Final Release & Defense Readiness)
- **Trạng thái:** Hoàn thành & Đã nghiệm thu

---

## 1. Tổng kết Dự án HackFlow 2026

**HackFlow** là nền tảng quản lý, vận hành và chấm thi Hackathon toàn diện theo thời gian thực, hỗ trợ **4 vai trò chuyên biệt** (`Admin`, `Candidate`, `Judge`, `Mentor`) với kiến trúc **FastAPI Async 3 tầng + SQLAlchemy 2.0** ở Backend và **React 18 + TypeScript + Zustand + TailwindCSS Design System** ở Frontend.

### Thống kê Hoàn thành qua 5 Sprints:
- **Tổng số công việc trên Notion:** `61/61 Tasks` hoàn thành (`100% Done`).
- **Độ phủ User Stories:** `22/22 User Stories` (`US-01` → `US-22`) đạt `100% Pass`.
- **Kiểm thử Tự động Backend (`pytest`):** `104/104 Automated Tests` đạt `100% Pass`.
- **Kiểm tra Chất lượng Frontend (`tsc -b && vite build` & `eslint`):** `0 errors, 0 warnings`.

---

## 2. Ma trận Truy vết Yêu cầu Toàn diện (Requirements Traceability Matrix — RTM)

| Mã US | Tên Yêu cầu Nghiệp vụ | Tài liệu SRS | Endpoint Backend API Chính | Màn hình Frontend (`Route`) | Kịch bản Test / UAT | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **US-01** | Đăng nhập & Xác thực GitHub OAuth / JWT | `HF-03` | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | `/login`, `/auth/callback` | `test_auth.py`, `UAT-AUTH-01` | ✅ **PASS** |
| **US-02** | Kiểm tra Whitelist & Luồng chờ phê duyệt | `HF-03` | `GET / POST /api/v1/admin/whitelist` | `/onboarding`, `/rejected`, `/admin/whitelist` | `test_auth.py`, `UAT-AUTH-02` | ✅ **PASS** |
| **US-03** | Quản lý Hồ sơ Cá nhân & Phê duyệt Thí sinh | `HF-03` | `PATCH /api/v1/auth/profile`, `POST /api/v1/admin/candidates/{id}/approval` | `/profile`, `/admin/approvals` | `test_auth.py`, `UAT-AUTH-03` | ✅ **PASS** |
| **US-04** | Khởi tạo Đội thi & Sinh mã mời 6 ký tự | `HF-04` | `POST /api/v1/teams`, `GET /api/v1/teams/my` | `/teams` | `test_teams.py`, `UAT-TEAM-01` | ✅ **PASS** |
| **US-05** | Gia nhập Đội thi bằng Mã mời & Kiểm soát Sĩ số | `HF-04` | `POST /api/v1/teams/join`, `POST /api/v1/teams/leave` | `/teams` | `test_teams.py`, `UAT-TEAM-02` | ✅ **PASS** |
| **US-06** | Quản trị Thành viên Đội (Chuyển quyền Leader / Xóa) | `HF-04` | `POST /api/v1/teams/transfer-leader`, `DELETE /api/v1/teams/members/{id}` | `/teams` | `test_fe_be_sync.py`, `UAT-TEAM-03` | ✅ **PASS** |
| **US-07** | Danh mục Đề tài & Giới hạn Quota theo thời gian thực | `HF-04` | `GET / POST / PUT / DELETE /api/v1/topics` | `/topics`, `/admin/topics` | `test_topics.py`, `UAT-TOPIC-01` | ✅ **PASS** |
| **US-08** | Đăng ký Đề tài Chống Race Condition (`SELECT FOR UPDATE`) | `HF-04` | `POST /api/v1/topics/{id}/select`, `POST /api/v1/topics/cancel` | `/topics` | `test_topics.py`, `UAT-TOPIC-02` | ✅ **PASS** |
| **US-09** | Quản trị Cổng Thời gian Checkpoint (Time-gated) | `HF-23` | `GET / POST / PUT / DELETE /api/v1/checkpoints` | `/checkpoints`, `/admin/checkpoints` | `test_checkpoints_submissions.py`, `UAT-CP-01` | ✅ **PASS** |
| **US-10** | Nộp bài Checkpoint & Ân hạn 5 Giây (Grace Period) | `HF-23` | `POST /api/v1/checkpoints/{id}/submissions` | `/checkpoints` | `test_checkpoints_submissions.py`, `UAT-CP-02` | ✅ **PASS** |
| **US-11** | Đóng băng GitHub HEAD Commit SHA & Audit Log | `HF-23` | `POST /api/v1/submissions`, `POST /api/v1/submissions/final` | `/checkpoints`, `/final-submission` | `test_checkpoints_submissions.py`, `UAT-CP-03` | ✅ **PASS** |
| **US-12** | Phát sóng Thông báo Chung & Banner/Modal Khẩn cấp | `HF-24` | `GET / POST / PUT / DELETE /api/v1/announcements`, `/api/v1/notifications/*` | `/admin/announcements`, `TopNav` | `test_announcements.py`, `UAT-ANN-01` | ✅ **PASS** |
| **US-13** | Cấu hình Bộ Tiêu chí Chấm điểm Rubric (Tổng 100%) | `HF-36` | `GET / POST / PUT / DELETE /api/v1/rubrics` | `/admin/criteria` | `test_evaluations.py`, `UAT-JUD-01` | ✅ **PASS** |
| **US-14** | Phân công Giám khảo & Chế độ Chấm Ẩn danh (Blind Judging) | `HF-36` | `GET /api/v1/evaluations/submissions`, `POST /api/v1/admin/evaluations/assignments` | `/judging`, `/judge/dashboard` | `test_evaluations.py`, `UAT-JUD-02` | ✅ **PASS** |
| **US-15** | Chấm điểm Split-screen (Lưu nháp `draft` & Khóa `submitted`) | `HF-36` | `POST /api/v1/evaluations` | `/judging` | `test_evaluations.py`, `UAT-JUD-03` | ✅ **PASS** |
| **US-16** | Tổng hợp Bảng xếp hạng & Cảnh báo Lệch điểm (`> 15đ`) | `HF-36` | `GET /api/v1/leaderboard`, `PATCH /api/v1/admin/leaderboard/publish` | `/scoreboard`, `/admin/results`, `/judge/results` | `test_leaderboard.py`, `UAT-LD-01` | ✅ **PASS** |
| **US-17** | Tạo & Theo dõi Yêu cầu Hỗ trợ Kỹ thuật (Helpdesk Ticket) | `HF-37` | `GET / POST /api/v1/tickets` | `/tickets` | `test_tickets.py`, `UAT-TK-01` | ✅ **PASS** |
| **US-18** | Quy trình Mentor Xử lý Ticket 3 Trạng thái (`Claim` / `Resolve`) | `HF-37` | `PATCH /api/v1/tickets/{id}/claim`, `PATCH /api/v1/tickets/{id}/resolve` | `/mentor/tickets`, `/mentor/dashboard` | `test_tickets.py`, `UAT-TK-02` | ✅ **PASS** |
| **US-19** | Quản trị Cấu hình Hệ thống Toàn cục (`/admin/config`) | `HF-48` | `GET / PATCH /api/v1/admin/config` | `/admin/config` | `test_fe_be_sync.py`, `UAT-ADM-01` | ✅ **PASS** |
| **US-20** | Quản trị Nhân sự Giám khảo & Cố vấn (`/admin/personnel`) | `HF-48` | `GET / POST / PATCH / DELETE /api/v1/admin/personnel` | `/admin/personnel` | `test_fe_be_sync.py`, `UAT-ADM-02` | ✅ **PASS** |
| **US-21** | Quản trị Đội thi Toàn diện & Duyệt hàng loạt (`/admin/teams`) | `HF-48` | `GET / POST / PATCH / DELETE /api/v1/admin/teams` | `/admin/teams` | `test_fe_be_sync.py`, `UAT-ADM-03` | ✅ **PASS** |
| **US-22** | Giám sát Thống kê Tổng quan & Mở khóa Phiếu chấm (`/admin/stats`) | `HF-48` | `GET /api/v1/admin/stats`, `POST /api/v1/admin/evaluations/{id}/unlock` | `/admin/dashboard`, `/admin/results` | `test_fe_be_sync.py`, `UAT-ADM-04` | ✅ **PASS** |
