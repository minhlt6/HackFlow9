# 🚀 HackFlow — Nền tảng Quản lý Hackathon Toàn diện

> **Học phần:** Chuyên đề Công nghệ Thông tin — Học kỳ II (2025 - 2026)  
> **Đơn vị:** Nhóm 9  
> **Repository:** [https://github.com/minhlt6/HackFlow9](https://github.com/minhlt6/HackFlow9)  
> **Bảng quản lý công việc (Notion):** Theo dõi tiến độ Sprint & Task chi tiết theo thẻ nhiệm vụ nội bộ.

---

## 👥 1. Danh sách Thành viên & Trách nhiệm Cốt lõi

| STT | Thành viên | Vai trò phát triển chính | Mảng Kiểm thử (QA/QC) | Nhánh chuyên môn trên Notion |
|:---:|---|---|---|---|
| 1 | **Lê Tiến Minh** | **Team Lead & Core Backend Architect** | Performance & Security Testing | Backend Core, Database Schema, DevOps |
| 2 | **Đinh Phương Ly** | **Lead Business Analyst (BA)** | UAT Testing (Nghiệp vụ & Kịch bản người dùng) | SRS/BRD, User Stories, Luồng người dùng |
| 3 | **Nông Lan Anh** | **Lead UI/UX Designer & Backend Dev** | Usability & API Testing (Postman) | Design System Figma, API Content/CRUD |
| 4 | **Phạm Thị Huyền Linh** | **Lead Frontend Developer** | Client-side & Component Testing | Giao diện React + TypeScript, Tích hợp API |

---

## 🎯 2. Tổng quan Bài toán & Giải pháp

**HackFlow** là hệ thống web tập trung All-in-One giải quyết triệt để vấn đề phân mảnh công cụ (Google Forms, Google Sheets, Zalo/Discord) trong các cuộc thi lập trình học thuật:

* **Quản trị 4 Vai trò độc lập:** Ban tổ chức (Admin Center), Ban giám khảo (Judging Workspace), Thí sinh (Candidate Portal), Mentor (Helpdesk).
* **Kiểm soát Tiến độ bằng Checkpoint:** Time-gated tự động mở/khóa theo giờ Server, thí sinh nộp bài theo từng chặng.
* **Chống gian lận Commit SHA Freeze:** Tự động gọi GitHub API đóng băng mã Commit hash tại deadline, phát hiện ngay nếu thí sinh push code bổ sung sau thời hạn.
* **Chọn đề tài Concurrency Control:** Đảm bảo tính nguyên tử (Atomic transaction) khi nhiều đội cùng đăng ký 1 đề tài giới hạn số lượng.
* **Chấm thi theo Barem Rubric:** Giám khảo chấm điểm tự động theo trọng số tiêu chí, hỗ trợ chế độ Blind Judging (ẩn danh đội thi).
* **Hỗ trợ qua Kênh Ticket 3 Trạng thái:** Phân luồng câu hỏi theo đề tài của Mentor, tránh trôi tin nhắn và bảo vệ tính công bằng (Mentor không chấm bài đội mình kèm).

---

## 🛠️ 3. Kiến trúc Công nghệ (Tech Stack)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (FRONTEND)                         │
│       React 18 + TypeScript + Vite + Tailwind CSS + Zustand            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Axios (REST API / Bearer JWT)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        API & BUSINESS LAYER                            │
│           Python 3.12 + FastAPI (Async ASGI) + Pydantic v2             │
│            Routers ──► Services Layer ──► Repositories Layer           │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │ GitHub REST API
                    ▼                                ▼
┌─────────────────────────────────────┐  ┌───────────────────────────────┐
│           DATABASE LAYER            │  │        EXTERNAL SERVICES      │
│      PostgreSQL (Supabase)          │  │  - GitHub OAuth 2.0           │
│   SQLAlchemy 2.0 (Async) + Alembic  │  │  - Commit SHA Verification     │
└─────────────────────────────────────┘  └───────────────────────────────┘
```

---

## 📅 4. Lộ trình 4 Sprint Thực hiện (Liên kết Thẻ Task Notion)

Mọi đầu việc được quản lý bằng thẻ Task trên Notion theo cú pháp `[MÃ_TASK] Tên công việc` (Ví dụ: `HF-01 Thiết kế CSDL`).

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  SPRINT 1   │ ──► │  SPRINT 2   │ ──► │  SPRINT 3   │ ──► │  SPRINT 4   │
│ Nền Tảng &  │     │ Xác Thực &  │     │ Checkpoint  │     │ Chấm Thi &  │
│ Phân Tích   │     │  Đội Thi    │     │ & Nộp Bài   │     │ Kiểm Thử    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Sprint 1: Khởi Tạo Nền Tảng & Đặc Tả Nghiệp Vụ
* **Đinh Phương Ly (BA):** Hoàn thiện tài liệu BRD, đặc tả kỹ thuật SRS cho 4 vai trò, viết danh sách User Stories & Acceptance Criteria.
* **Nông Lan Anh (Design):** Xây dựng Design System Figma (Màu sắc, Typography, Card, Modal, Form), vẽ Wireframe giao diện 4 Portal.
* **Lê Tiến Minh (Backend):** Khởi tạo Project FastAPI, cấu hình Docker/PostgreSQL, thiết kế Data Model SQLAlchemy & Schema migration Alembic.
* **Phạm Thị Huyền Linh (Frontend):** Khởi tạo Project Vite React + TS + Tailwind, dựng Layout chuẩn (Sidebar, Header, Protected Route).

### Sprint 2: Xác Thực, Quản Lý Đội Thi & Đề Tài
* **Đinh Phương Ly (BA):** Viết kịch bản UAT cho luồng Ghép đội bằng Mã mời và Đăng ký đề tài cạnh tranh.
* **Lê Tiến Minh (Backend):** Xây dựng Authentication (JWT + OAuth), API quản lý đội thi, API đăng ký đề tài với khóa `SELECT FOR UPDATE`.
* **Nông Lan Anh (CRUD/Design):** Thiết kế Mockup chi tiết luồng Tạo đội / Vào đội, viết API CRUD danh mục đề tài và thông báo.
* **Phạm Thị Huyền Linh (Frontend):** Dựng màn hình Đăng nhập, Trang Quản lý Đội thi (nhập mã mời, danh sách thành viên), Trang Danh mục đề tài.

### Sprint 3: Checkpoint Time-Gated & Nộp Bài (Commit SHA Freeze)
* **Đinh Phương Ly (BA):** Đặc tả quy tắc tính deadline và các kịch bản ngoại lệ khi nộp bài trễ.
* **Lê Tiến Minh (Backend):** Xây dựng module Checkpoint server-side time-gating, API nộp bài tích hợp kiểm tra GitHub Commit SHA Freeze.
* **Nông Lan Anh (CRUD/QA):** Thiết kế giao diện Nộp bài & xem lịch sử nộp bài, chuẩn bị bộ dữ liệu test case Postman.
* **Phạm Thị Huyền Linh (Frontend):** Dựng màn hình Checkpoint với đồng hồ đếm ngược, Form nộp bài, hiển thị trạng thái đã nộp / lịch sử commit.

### Sprint 4: Chấm Thi Rubric, Ticket Hỗ Trợ & Hoàn Thiện UAT
* **Đinh Phương Ly (BA):** Phối hợp kiểm thử chấp nhận UAT toàn hệ thống, nghiệm thu kết quả tính điểm theo barem rubric.
* **Lê Tiến Minh (Backend):** API chấm điểm theo tiêu chí trọng số, API bảng xếp hạng (Leaderboard), phân quyền ẩn danh Blind Judging.
* **Nông Lan Anh (CRUD/QA):** Viết module Ticket hỗ trợ (3 trạng thái), kiểm thử toàn diện API với Postman Collection Runner.
* **Phạm Thị Huyền Linh (Frontend):** Dựng giao diện Giám khảo chấm thi (Split-screen xem bài nộp & chấm điểm), Bảng Ticket Mentor, hoàn thiện Dashboard BTC.

---

## 💻 5. Hướng Dẫn Cài Đặt Môi Trường (Local Setup)

### 5.1 Yêu cầu tiên quyết
* Python >= 3.12
* Node.js >= 18.x & npm >= 9.x
* Git

### 5.2 Khởi chạy Backend (FastAPI)
```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Tạo và kích hoạt môi trường ảo
python -m venv .venv
# Trên Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Trên macOS / Linux:
source .venv/bin/activate

# 3. Cài đặt các gói phụ thuộc
pip install -r requirements.txt

# 4. Thiết lập biến môi trường
cp .env.example .env
# Chỉnh sửa thông số DATABASE_URL và JWT_SECRET trong .env

# 5. Khởi chạy máy chủ phát triển
uvicorn app.main:app --reload --port 8000

# Kiểm tra tài liệu Swagger UI tại: http://localhost:8000/docs
```

### 5.3 Khởi chạy Frontend (React + Vite)
```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các thư viện
npm install

# 3. Cấu hình biến môi trường
cp .env.example .env
# Đảm bảo: VITE_API_BASE_URL=http://localhost:8000/api/v1

# 4. Khởi chạy máy chủ giao diện
npm run dev
# Truy cập tại: http://localhost:5173
```

---

## 🚨 6. Quy Định Bắt Buộc Dành Cho Thành Viên Nhóm

Mọi thành viên trước khi bắt tay vào code hoặc thao tác Git **bắt buộc phải đọc kỹ**:
👉 **[AGENT.md](./AGENT.md)** — Quy chuẩn mã nguồn, quy trình nhận Task từ Notion, quy tắc tạo nhánh và hướng dẫn dùng AI an toàn.

> **Quy tắc vàng:** Không commit lên nhánh `master`. Luôn tạo nhánh theo mã task Notion: `feature/HF-xx-ten-task` và xin xác nhận của Tech Lead (**minhlt6**) trước khi thực hiện lệnh `git push`.
