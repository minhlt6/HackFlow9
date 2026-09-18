# 🚀 HackFlow — Nền tảng Quản lý Hackathon Toàn diện

> **Học phần:** Chuyên đề Công nghệ Thông tin  
> **Đơn vị:** Nhóm 9  
> **Repository chính thức:** [https://github.com/minhlt6/HackFlow9](https://github.com/minhlt6/HackFlow9)

---

## 👥 1. Thành viên Nhóm 9 & Phân công Vai trò

| STT | Họ và tên | Vai trò phát triển chính | Vai trò Kiểm thử (QA/QC) |
|:---:|---|---|---|
| 1 | **Lê Tiến Minh** | **Team Lead & Core Backend Architect / DevOps** | Performance & Security Testing |
| 2 | **Đinh Phương Ly** | **Lead Business Analyst (BA)** | UAT Testing (Nghiệp vụ & Kịch bản người dùng) |
| 3 | **Nông Lan Anh** | **Lead UI/UX Designer** & Backend Developer (CRUD/Content) | Usability & API Testing (Postman) |
| 4 | **Phạm Thị Huyền Linh** | **Lead Frontend Developer** (React + TypeScript + Tailwind) | Client-side & Component Testing |

---

## 🎯 2. Giới thiệu Dự án

**HackFlow** là nền tảng quản lý và vận hành cuộc thi lập trình (Hackathon) tập trung, chuyên nghiệp và minh bạch, giải quyết triệt để các hạn chế của việc sử dụng rời rạc Google Form, Google Sheet và mạng xã hội:
* **Hệ thống Checkpoint theo mốc thời gian:** Tự động mở/khóa theo deadline máy chủ, kiểm soát tiến độ thi qua từng vòng.
* **Cơ chế Chọn đề tài có giới hạn:** Xử lý tranh chấp dữ liệu thời gian thực (concurrency control) khi nhiều đội cùng đăng ký.
* **Chống gian lận sau Deadline:** Lưu trữ dấu vết cam kết mã nguồn (Commit SHA Freeze) từ GitHub và khóa chỉnh sửa bài nộp.
* **Cổng Ticket hỗ trợ Mentor:** Kênh trao đổi kỹ thuật có tổ chức giữa Thí sinh và Mentor, phân quyền độc lập với Ban Giám Khảo.
* **Chấm thi Động & Minh bạch:** Hỗ trợ tiêu chí chấm điểm có trọng số (Dynamic Rubric), chế độ chấm ẩn danh (Blind Judging) và tự động xếp hạng.

---

## 🛠️ 3. Kiến trúc Công nghệ (Tech Stack)

* **Frontend:** React.js, TypeScript, Vite, Tailwind CSS, React Router, Axios, Zustand.
* **Backend:** Python 3.12, FastAPI (Async/ASGI), SQLAlchemy ORM, Pydantic v2.
* **Database & Storage:** PostgreSQL (Supabase), Supabase Storage.
* **Authentication:** GitHub OAuth 2.0 (dành cho Thí sinh), JWT & Refresh Token (bảo mật HttpOnly Cookie).
* **Quản lý & Triển khai:** Git/GitHub, Notion (Task management), Vercel (Frontend), Railway (Backend).

---

## 📂 4. Cấu trúc Thư mục Dự án

```
HackFlow9/
├── backend/                  # Mã nguồn Backend FastAPI (Python)
├── frontend/                 # Mã nguồn Frontend React + TypeScript (Vite)
├── docs/                     # Tài liệu phân tích nghiệp vụ, kịch bản SRS, Diagrams
├── AGENT.md                  # Quy tắc lập trình, quy trình Git & hướng dẫn môi trường
├── README.md                 # Giới thiệu tổng quan dự án
└── .gitignore                # Danh sách file loại trừ khỏi Git
```

---

## 📖 5. Hướng dẫn Dành cho Thành viên Mới

Mọi thành viên trong nhóm và các trợ lý AI phát triển dự án **BẮT BUỘC** đọc kỹ file:
👉 **[AGENT.md](./AGENT.md)** trước khi bắt đầu lập trình hoặc tạo nhánh code.

*Quy tắc số 1:* Luôn tạo nhánh mới từ `master` (`feature/ten-tinh-nang`), kiểm thử cẩn thận và xin xác nhận trước khi thực hiện bất kỳ thao tác đẩy mã nguồn (`git push`).
