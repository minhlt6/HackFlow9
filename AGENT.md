# 🤖 AGENT.md — Quy Chuẩn Vận Hành & Hướng Dẫn Kỹ Thuật Chi Tiết

> **Dự án:** HackFlow — Nền tảng Quản trị & Vận hành Hackathon Tập trung  
> **Repository:** [https://github.com/minhlt6/HackFlow9](https://github.com/minhlt6/HackFlow9)  
> **Áp dụng cho:** Tất cả thành viên Nhóm 9 và các Trợ lý Lập trình AI (Cursor, Copilot, Antigravity, Claude Code, ChatGPT).  
> *Mục đích: Chuẩn hóa 100% quy trình từ khâu nhận Task trên Notion, quy tắc chia nhánh Git, kịch bản dùng AI cho từng vai trò, đến tiêu chí nghiệm thu code.*

---

## 🧭 MỤC LỤC

1. [Cầu Nối Notion ↔ Git Workflow](#1-cầu-nối-notion--git-workflow)
2. [Hướng Dẫn Chi Tiết Theo Từng Vai Trò (Role Guides)](#2-hướng-dẫn-chi-tiết-theo-từng-vai-trò-role-guides)
   - [2.1 Đinh Phương Ly — Lead Business Analyst (BA)](#21-đinh-phương-ly--lead-business-analyst-ba)
   - [2.2 Nông Lan Anh — Lead UI/UX Designer & Backend CRUD](#22-nông-lan-anh--lead-uiux-designer--backend-crud)
   - [2.3 Phạm Thị Huyền Linh — Lead Frontend Developer](#23-phạm-thị-huyền-linh--lead-frontend-developer)
   - [2.4 Lê Tiến Minh — Team Lead & Core Backend Architect](#24-lê-tiến-minh--team-lead--core-backend-architect)
3. [Bộ System Prompt Mẫu Dành Cho Thành Viên Khi Dùng AI](#3-bộ-system-prompt-mẫu-dành-cho-thành-viên-khi-dùng-ai)
4. [Kiến Trúc Dữ Liệu & Quy Chuẩn API Response](#4-kiến-trúc-dữ-liệu--quy-chuẩn-api-response)
5. [Quy Tắc Quản Lý Mã Nguồn & An Toàn Git](#5-quy-tắc-quản-lý-mã-nguồn--an-toàn-git)
6. [Checklist Nghiệm Thu Task Trước Khi Tạo Pull Request](#6-checklist-nghiệm-thu-task-trước-khi-tạo-pull-request)

---

## 1. Cầu Nối Notion ↔ Git Workflow

Mọi công việc trong nhóm được điều phối qua **Thẻ Task trên Notion**. Mỗi thẻ bắt buộc có cấu trúc:
* **Mã Task (Task ID):** `HF-[Số]` (Ví dụ: `HF-01`, `HF-12`).
* **Tiêu đề công việc:** Rõ ràng, bắt đầu bằng động từ hành động.
* **Người phụ trách (Assignee):** 1 trong 4 thành viên.
* **Sprint:** Sprint 1, 2, 3 hoặc 4.
* **Tiêu chí nghiệm thu (Acceptance Criteria - AC):** Danh sách gạch đầu dòng các điều kiện bắt buộc để coi là hoàn thành.

### Chu trình 5 bước xử lý Task:

```
[Notion: To Do] ──► Chuyển sang [In Progress]
                           │
                           ▼ Tạo nhánh Git: feature/HF-xx-ten-task
                      Lập trình / Viết tài liệu + Tự test theo AC
                           │
                           ▼ Báo cáo Tech Lead (minhlt6) xin xác nhận Push
                      Git Push & Tạo Pull Request trên GitHub
                           │
                           ▼ Chuyển sang [In Review] ──► Tech Lead Merge ──► [Done]
```

1. **Nhận việc:** Kéo thẻ task từ `To Do` sang `In Progress` trên Notion.
2. **Tạo nhánh Git:** Đặt tên nhánh khớp với Task ID trên Notion:
   ```bash
   git checkout master
   git pull origin master
   git checkout -b feature/HF-xx-ten-tinh-nang
   ```
3. **Thực hiện & Kiểm thử cục bộ:** Lập trình hoặc viết tài liệu, đối chiếu từng gạch đầu dòng trong phần **Acceptance Criteria** của Notion.
4. **Xin xác nhận & Push:** Gửi tin nhắn báo cáo danh sách file thay đổi cho Tech Lead (**minhlt6**), nhận được "OK" mới chạy `git push`.
5. **Tạo PR & Đóng thẻ:** Mở Pull Request trên GitHub, dán link PR vào thẻ Notion và chuyển trạng thái sang `In Review`. Khi PR được merge, chuyển thẻ sang `Done`.

---

## 2. Hướng Dẫn Chi Tiết Theo Từng Vai Trò (Role Guides)

---

### 2.1 Đinh Phương Ly — Lead Business Analyst (BA)
> **Mục tiêu:** Đảm bảo toàn bộ hệ thống bám sát nghiệp vụ thực tế, không có lỗ hổng logic, chuẩn bị sẵn tài liệu nghiệm thu cho Thầy hướng dẫn.

* **Thư mục làm việc chính:** `docs/requirements/`, `docs/user_stories/`, `docs/uat_test_cases/`.
* **Nhiệm vụ trọng tâm theo Sprint:**
  * **Sprint 1:** Viết tài liệu BRD (Yêu cầu nghiệp vụ tổng thể), hoàn thiện SRS (Đặc tả chức năng 4 vai trò: Admin, Judge, Candidate, Mentor).
  * **Sprint 2:** Viết kịch bản người dùng cho luồng Lập đội (mã mời, giới hạn thành viên 3-5 người) và Đăng ký đề tài (concurrency, đề tài hết slot).
  * **Sprint 3:** Đặc tả chi tiết cơ chế Checkpoint (thời gian mở/đóng, xử lý nộp bài sát deadline) và cơ chế chống gian lận Commit SHA.
  * **Sprint 4:** Thiết kế bảng kịch bản UAT (User Acceptance Testing) với đầy đủ các trường: `Test Case ID | Bước thực hiện | Dữ liệu đầu vào | Kết quả mong đợi | Trạng thái Pass/Fail`.
* **Mẫu định dạng Acceptance Criteria khi viết trên Notion:**
  ```gherkin
  Kịch bản: Thí sinh nộp bài sau khi Checkpoint đã đóng
  Given: Checkpoint 1 có hạn chót là 23:00:00 UTC
  When: Nhóm trưởng gửi bài nộp vào lúc 23:00:05 UTC
  Then: Hệ thống từ chối nhận bài, trả về mã lỗi 400 DEADLINE_EXCEEDED
  And: Nút nộp bài chuyển sang trạng thái Disable trên giao diện
  ```

---

### 2.2 Nông Lan Anh — Lead UI/UX Designer & Backend CRUD
> **Mục tiêu:** Thiết kế giao diện hiện đại, dễ thao tác trong 24h-48h thi đấu; trực tiếp xây dựng các API danh mục nội dung và bộ kiểm thử Postman.

* **Thư mục làm việc chính:** `docs/design/`, `backend/app/api/v1/topics.py`, `backend/app/api/v1/announcements.py`, `tests/postman/`.
* **Nhiệm vụ trọng tâm theo Sprint:**
  * **Sprint 1:** Xây dựng Design System Figma (Bộ màu Dark Theme: `#0b1120`, `#3b82f6`, `#06b6d4`, `#10b981`; Typography Inter/Roboto; Bộ UI Component chuẩn: Button, Input, Modal, Table). Vẽ Wireframe 4 Portal.
  * **Sprint 2:** Thiết kế Mockup chi tiết UI Quản lý Đội thi & Danh mục Đề tài. Lập trình API CRUD Danh mục đề tài (`/topics`, `/subtopics`) và cấu hình đề tài.
  * **Sprint 3:** Thiết kế màn hình Checkpoint nộp bài & Bảng lịch sử nộp bài. Lập trình API thông báo chung (`/announcements`). Xây dựng Postman Collection kiểm thử tự động các API này.
  * **Sprint 4:** Thiết kế giao diện Giám khảo chấm thi (Split-screen) và Bảng Helpdesk Mentor. Lập trình module Ticket hỗ trợ cơ bản (`/tickets`). Chạy toàn bộ Postman Collection Runner để kiểm thử tích hợp (Regression Testing).
* **Quy tắc khi viết API Backend CRUD:**
  * Luôn kiểm tra quyền hạn (Role-based access): Chỉ `admin` mới được tạo/sửa/xóa Topic. Thí sinh chỉ được xem danh sách (`GET`).
  * Mọi dữ liệu trả về phải qua Pydantic Schema trong `backend/app/schemas/`.

---

### 2.3 Phạm Thị Huyền Linh — Lead Frontend Developer
> **Mục tiêu:** Biến bản thiết kế Figma thành giao diện web chạy thực tế bằng React + TypeScript mượt mà, type-safe 100%, không phát sinh runtime bug.

* **Thư mục làm việc chính:** `frontend/src/` (`api/`, `components/`, `features/`, `pages/`, `types/`, `store/`).
* **Nhiệm vụ trọng tâm theo Sprint:**
  * **Sprint 1:** Dựng khung dự án Vite React + Tailwind CSS, cấu hình Axios Client với Interceptor tự gắn Bearer Token, dựng layout cơ sở (Navbar, Sidebar, Footer, Protected Route theo 4 vai trò).
  * **Sprint 2:** Màn hình Đăng nhập (GitHub OAuth button + Form đăng nhập truyền thống), Trang Quản lý Đội (Tạo đội, Nhập mã mời, Danh sách thành viên, Nút rời đội / chuyển quyền nhóm trưởng), Trang Chọn đề tài có badge trạng thái Còn slot / Hết slot.
  * **Sprint 3:** Trang Checkpoint nộp bài: Bộ đếm ngược thời gian thực (Countdown Timer), Form điền link GitHub Repo & link Demo, Dialog xác nhận nộp bài, Bảng lịch sử các lần nộp kèm mã Commit hash.
  * **Sprint 4:** Màn hình Chấm thi cho Giám khảo (chia đôi màn hình: bên trái xem bài nộp, bên phải nhập điểm theo barem rubric có tính tổng tự động), Màn hình Helpdesk gửi và nhận Ticket cho Thí sinh & Mentor.
* **Quy chuẩn Code Frontend bắt buộc:**
  1. **Tuyệt đối không dùng `any`:** Mọi đối tượng API phải được định nghĩa `interface` trong `src/types/`.
  2. **Không gọi API trực tiếp trong Component:** Toàn bộ lời gọi mạng đặt trong `src/api/` (Ví dụ: `teamsApi.createTeam()`, `checkpointApi.submit()`).
  3. **Xử lý UX 3 trạng thái:** Mọi tác vụ gửi dữ liệu đều phải có `loading` (spinner/disable nút bấm chống spam click), `success` (toast xanh), và `error` (toast đỏ hiển thị đúng câu thông báo từ backend).

---

### 2.4 Lê Tiến Minh — Team Lead & Core Backend Architect
> **Mục tiêu:** Đảm bảo kiến trúc CSDL vững chắc, xử lý tải cao trong 15 phút cuối, bảo mật tuyệt đối dữ liệu chấm điểm và cơ chế chống gian lận Commit SHA.

* **Thư mục làm việc chính:** `backend/app/core/`, `backend/app/models/`, `backend/app/services/`, `backend/app/repositories/`, `migrations/`.
* **Nhiệm vụ trọng tâm theo Sprint:**
  * **Sprint 1:** Thiết kế Database Schema PostgreSQL (10 bảng: `users`, `hackathon_config`, `teams`, `team_members`, `topics`, `checkpoints`, `submissions`, `evaluations`, `rubric_criteria`, `support_tickets`). Cấu hình Alembic migration, khởi tạo bảo mật JWT + Hash password.
  * **Sprint 2:** Xây dựng Engine Quản lý Đội thi (tạo mã mời ngẫu nhiên an toàn, chuyển quyền leader nguyên tử trong 1 transaction). Xử lý tranh chấp khi đăng ký đề tài bằng `SELECT FOR UPDATE` trong transaction PostgreSQL.
  * **Sprint 3:** Xây dựng module Checkpoint Time-gated: Tự động so khớp thời gian với `datetime.now(timezone.utc)`. Tích hợp GitHub API lấy chính xác HEAD Commit SHA khi thí sinh bấm nộp, lưu trữ vĩnh viễn vào bảng `submissions`.
  * **Sprint 4:** Xây dựng Engine Chấm điểm Rubric: Tính điểm tổng có trọng số, chế độ Blind Judging (ẩn thông tin nhóm thi khỏi Giám khảo). Cấu hình môi trường triển khai (Railway/Render + Supabase), giám sát hiệu năng và bảo mật hệ thống.

---

## 3. Bộ System Prompt Mẫu Dành Cho Thành Viên Khi Dùng AI

Khi các bạn dùng các công cụ AI (Cursor, ChatGPT, Claude, GitHub Copilot), hãy **copy đoạn Prompt tương ứng** dưới đây dán vào đầu phiên làm việc để AI hiểu sâu ngữ cảnh dự án:

### 🎯 Prompt Dành Cho Frontend Dev (Phạm Thị Huyền Linh)
```text
Bạn là Trợ lý Lập trình Frontend chuyên sâu cho dự án HackFlow9.
Tech Stack: React 18, TypeScript, Tailwind CSS, Vite, Zustand, Axios, Lucide React Icons.
Quy chuẩn nghiêm ngặt:
1. KHÔNG BAO GIỜ dùng kiểu dữ liệu 'any'. Mọi dữ liệu phải có interface/type rõ ràng trong thư mục src/types/.
2. KHÔNG gọi axios trực tiếp trong Component. Mọi hàm gọi API phải nằm trong thư mục src/api/.
3. Mọi form nhập liệu đều phải kiểm tra tính hợp lệ (validation), có xử lý trạng thái Loading (disable nút bấm để tránh spam request), và hiển thị Toast thông báo lỗi/thành công.
4. Giao diện thiết kế theo phong cách Dark Tech Theme hiện đại (màu nền slate-950, card slate-900/80, viền slate-800, accent blue-500 và cyan-400).
Hãy giúp tôi hoàn thành Task [MÃ_TASK]: [MÔ_TẢ_TASK_TỪ_NOTION].
```

### 🎯 Prompt Dành Cho Backend Dev (Lê Tiến Minh / Nông Lan Anh)
```text
Bạn là Trợ lý Lập trình Backend chuyên sâu cho dự án HackFlow9.
Tech Stack: Python 3.12, FastAPI, SQLAlchemy 2.0 (Async Session), PostgreSQL (Supabase), Pydantic v2.
Quy chuẩn nghiêm ngặt:
1. Tuân thủ mô hình 3 tầng: Router (app/api/v1/) -> Service (app/services/) -> Repository (app/repositories/). Router không được chứa câu lệnh SQL hay logic nghiệp vụ phức tạp.
2. Tất cả các hàm I/O và truy vấn database đều phải là bất đồng bộ (async/await).
3. Định dạng phản hồi API phải tuân thủ chuẩn Envelope: {"success": true, "data": {...}, "message": "..."} hoặc {"success": false, "error": {"code": "...", "message": "..."}}.
4. Mọi so sánh thời hạn nộp bài (deadline) đều phải dùng thời gian Server UTC (datetime.now(timezone.utc)).
Hãy giúp tôi viết code cho Task [MÃ_TASK]: [MÔ_TẢ_TASK_TỪ_NOTION].
```

### 🎯 Prompt Dành Cho BA & QA (Đinh Phương Ly / Nông Lan Anh)
```text
Bạn là Chuyên viên Phân tích Nghiệp vụ (BA) và Kiểm thử (QA) cho dự án HackFlow9.
Hệ thống là nền tảng quản trị Hackathon tập trung với 4 vai trò: Ban Tổ Chức (Admin), Ban Giám Khảo (Judge), Thí Sinh (Candidate), và Mentor Cố Vấn.
Hãy giúp tôi viết tài liệu đặc tả chức năng và kịch bản kiểm thử cho Task [MÃ_TASK]: [TÊN_TÍNH_NĂNG].
Yêu cầu đầu ra:
1. Danh sách User Stories theo định dạng: "As a [role], I want to [action], so that [benefit]".
2. Tiêu chí nghiệm thu Acceptance Criteria (AC) theo chuẩn Gherkin: Given - When - Then bao gồm cả trường hợp Happy Path và Edge Cases (lỗi deadline, trùng lặp đề tài, vượt quá giới hạn).
3. Bảng kịch bản kiểm thử UAT/Postman (Test Case ID, Tiêu đề, Dữ liệu test, Kết quả mong đợi).
```

---

## 4. Kiến Trúc Dữ Liệu & Quy Chuẩn API Response

### 4.1 Cấu trúc phản hồi API chuẩn (Standard Envelope)

* **Khi thành công (HTTP 200 / 201):**
  ```json
  {
    "success": true,
    "data": {
      "id": "c1f7e34d-88b9-4a0b-93d1-9f936d5f7b88",
      "team_name": "CyberTeam",
      "status": "active"
    },
    "message": "Thao tác thành công."
  }
  ```

* **Khi có lỗi nghiệp vụ (HTTP 400 / 403 / 404 / 409):**
  ```json
  {
    "success": false,
    "error": {
      "code": "TOPIC_FULL",
      "message": "Đề tài này đã đủ số lượng đội thi đăng ký tối đa."
    }
  }
  ```

### 4.2 Danh sách Bảng CSDL Cốt Lõi (PostgreSQL)
1. `users`: Tài khoản, email, họ tên, role (`admin`, `judge`, `candidate`, `mentor`), avatar.
2. `hackathon_config`: Thời gian bắt đầu/kết thúc, trạng thái công bố đề tài, trạng thái công bố kết quả.
3. `teams`: Tên đội, mã mời bảo mật (`invite_code`), ID đề tài đã chọn, trạng thái khóa đội.
4. `team_members`: Quan hệ người dùng và đội thi, vai trò trong đội (`leader`, `member`).
5. `topics`: Danh mục đề tài lớn/nhỏ, số lượng đội tối đa (`max_teams`), số lượng đội hiện tại.
6. `checkpoints`: Tên mốc kiểm tra, thời gian mở (`start_time`), hạn nộp (`deadline`), yêu cầu nộp.
7. `submissions`: Lịch sử bài nộp, checkpoint_id, team_id, link GitHub, link video, mã `commit_sha`.
8. `rubric_criteria`: Tiêu chí chấm điểm, mô tả, trọng số (`weight`), điểm tối đa.
9. `evaluations`: Bảng điểm của Giám khảo chấm cho đội thi theo rubric criteria.
10. `support_tickets`: Yêu cầu trợ giúp từ thí sinh gửi đến Mentor, trạng thái (`open`, `in_progress`, `resolved`).

---

## 5. Quy Tắc Quản Lý Mã Nguồn & An Toàn Git

> 🛑 **NGUYÊN TẮC BẤT DI BẤT DỊCH:** Tuyệt đối **KHÔNG COMMIT TRỰC TIẾP LÊN MASTER**. Luôn làm việc trên nhánh tính năng và chỉ push khi có sự đồng ý của Tech Lead.

### 5.1 Quy chuẩn đặt tên nhánh
* Tính năng mới: `feature/HF-[số]-[tên-ngắn]` (Ví dụ: `feature/HF-03-team-invitation`).
* Sửa lỗi: `bugfix/HF-[số]-[mô-tả-lỗi]` (Ví dụ: `bugfix/HF-15-fix-sha-freeze`).
* Tài liệu: `docs/HF-[số]-[nội-dung]` (Ví dụ: `docs/HF-01-srs-spec`).

### 5.2 Chuẩn Commit Message (Conventional Commits)
* `feat(teams): add invite code generator and join team flow`
* `fix(checkpoints): enforce server-side UTC deadline validation`
* `docs(requirements): add UAT test cases for judging rubric`
* `style(frontend): adjust card border radius and glow effects`
* `refactor(backend): optimize topic selection transaction lock`

### 5.3 Quy trình xin duyệt trước khi Push (Cực kỳ quan trọng)
Trước khi chạy lệnh `git push origin feature/...`, thành viên gửi tin nhắn nội bộ cho Tech Lead (**minhlt6**):
```text
📢 Xin xác nhận Push Git:
- Task Notion: [HF-xx] Tên công việc
- Nhánh: feature/HF-xx-ten-nhanh
- Commit: feat(...): tóm tắt
- File chỉnh sửa:
  + src/pages/Teams.tsx (thêm mới)
  + src/api/teams.ts (chỉnh sửa)

Tech Lead duyệt để em push lên GitHub nhé!
```
👉 **Chỉ khi nhận được phản hồi "Duyệt / Push đi" thì mới chạy lệnh `git push`.**

---

## 6. Checklist Nghiệm Thu Task Trước Khi Tạo Pull Request

Trước khi gửi PR hoặc chuyển thẻ Notion sang `In Review`, thành viên tự kiểm tra:

- [ ] **Mã nguồn chạy thử nghiệm không lỗi:** Đã chạy thử trên máy local, tính năng hoạt động đúng theo **Acceptance Criteria** trên Notion.
- [ ] **Không có file rác:** Không commit file `.env`, thư mục `__pycache__`, `.venv`, `node_modules` hay file tạm.
- [ ] **Clean Code:** Đã xóa bỏ các dòng `console.log`, `print()` debug thừa thãi.
- [ ] **Code Type-safe & Format:** Không dùng `any` trong TypeScript; Python đã được format sạch sẽ.
- [ ] **Xử lý tình huống lỗi (Edge Cases):** Khi nhập sai dữ liệu hoặc mất mạng, màn hình không bị trắng (crash) mà có thông báo hướng dẫn người dùng.
- [ ] **Đã được Tech Lead xác nhận Push:** Nhánh đã được đẩy lên GitHub thành công và sẵn sàng để Review.
