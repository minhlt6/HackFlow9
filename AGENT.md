# AGENT.md — Quy tắc Lập trình & Hướng dẫn Vận hành Nhóm 9

> **Dự án:** HackFlow — Nền tảng Quản lý Hackathon Toàn diện  
> **Repository:** https://github.com/minhlt6/HackFlow9  
> **Áp dụng cho:** Tất cả thành viên Nhóm 9 và các trợ lý AI hỗ trợ lập trình.  
> *Tài liệu này là quy chuẩn bắt buộc (Standard Operating Procedure). Mọi hành động code, tạo nhánh và push mã nguồn đều phải tuân thủ nghiêm ngặt.*

---

## 1. Thành viên & Ma trận Phân công Trách nhiệm

| Thành viên | Vai trò phát triển chính | Trách nhiệm cốt lõi | Mảng Kiểm thử (QA/QC) |
|---|---|---|---|
| **Lê Tiến Minh** | **PM & Tech Lead / Core Backend** | Quản lý dự án, thiết kế kiến trúc DB, bảo mật (OAuth/JWT), Concurrency, DevOps | Load & Stress Testing, Security Audit |
| **Đinh Phương Ly** | **Lead Business Analyst (BA)** | Phân tích bài toán, viết SRS, User Stories & Acceptance Criteria, quản lý scope | UAT Testing (Kiểm thử chấp nhận nghiệp vụ) |
| **Nông Lan Anh** | **Lead UI/UX Designer & Backend Dev** | Thiết kế Figma (Design System, Wireframe, Mockup), viết API Content/CRUD | Usability Testing & API Testing (Postman) |
| **Phạm Thị Huyền Linh** | **Lead Frontend Developer** | Xây dựng giao diện React + TypeScript + Tailwind, quản lý state, tích hợp API | Client-side & Component Form Validation Testing |

---

## 2. Cấu trúc Thư mục Chuẩn của Dự án

```
HackFlow9/
├── backend/                  # Mã nguồn Backend Python FastAPI
│   ├── app/
│   │   ├── api/              # Controllers / Routers (Khai báo endpoints)
│   │   │   └── v1/           # API Version 1 (auth, teams, topics, checkpoints,...)
│   │   ├── core/             # Cấu hình hệ thống, bảo mật, kết nối DB
│   │   │   ├── config.py     # Đọc biến môi trường từ .env
│   │   │   ├── security.py   # Mã hóa mật khẩu, tạo & verify JWT
│   │   │   └── database.py   # SQLAlchemy Async Session & Engine
│   │   ├── models/           # SQLAlchemy ORM Models (ánh xạ bảng DB)
│   │   ├── schemas/          # Pydantic Schemas (Validate dữ liệu Request & Response)
│   │   ├── services/         # Business Logic Layer (Xử lý nghiệp vụ chính)
│   │   ├── repositories/     # Data Access Layer (Query cơ sở dữ liệu)
│   │   └── utils/            # Hàm trợ giúp dùng chung
│   ├── migrations/           # Alembic Database Migrations
│   ├── tests/                # Unit Tests & Integration Tests (Pytest)
│   ├── main.py               # Điểm khởi chạy ứng dụng FastAPI
│   ├── requirements.txt      # Danh sách thư viện Python
│   ├── .env.example          # Mẫu biến môi trường Backend (commit lên Git)
│   └── .env                  # Biến môi trường thực tế (KHÔNG ĐƯỢC COMMIT)
│
├── frontend/                 # Mã nguồn Frontend React + TypeScript (Vite)
│   ├── src/
│   │   ├── api/              # Axios instance & các hàm gọi API theo module
│   │   ├── components/       # UI Components dùng chung (Button, Modal, Card, Navbar, Sidebar)
│   │   ├── features/         # Module tính năng (auth, teams, topics, submissions, scoring)
│   │   ├── hooks/            # Custom React Hooks
│   │   ├── pages/            # Các trang giao diện chính (Route Pages)
│   │   ├── store/            # Quản lý State toàn cục (Zustand)
│   │   ├── types/            # Khai báo TypeScript Interfaces & Types
│   │   └── utils/            # Hàm tiện ích phía client
│   ├── package.json          # Quản lý thư viện NPM
│   ├── .env.example          # Mẫu biến môi trường Frontend
│   └── .env                  # Biến môi trường Frontend thực tế (KHÔNG ĐƯỢC COMMIT)
│
├── docs/                     # Tài liệu đặc tả nghiệp vụ SRS, Wireframe, sơ đồ DB
├── README.md                 # Giới thiệu tổng quan dự án
├── AGENT.md                  # Quy tắc làm việc này
└── .gitignore                # Danh sách loại trừ khỏi Git
```

---

## 3. Thiết lập Môi trường Phát triển (Local Setup)

### 3.1 Backend (Python FastAPI)

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Tạo môi trường ảo (.venv)
python -m venv .venv

# 3. Kích hoạt môi trường ảo
# Trên Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Trên macOS / Linux:
source .venv/bin/activate

# 4. Cài đặt thư viện phụ thuộc
pip install -r requirements.txt

# 5. Thiết lập biến môi trường
cp .env.example .env
# Mở file .env và điền chuỗi kết nối DATABASE_URL và các khóa bí mật

# 6. Chạy máy chủ phát triển
uvicorn main:app --reload --port 8000

# Kiểm tra tài liệu API tự động tại:
# Swagger UI: http://localhost:8000/docs
# ReDoc:      http://localhost:8000/redoc
```

### 3.2 Frontend (React + TypeScript + Vite)

```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Thiết lập biến môi trường
cp .env.example .env
# Cấu hình: VITE_API_BASE_URL=http://localhost:8000

# 4. Chạy máy chủ giao diện
npm run dev
# Truy cập giao diện tại: http://localhost:5173
```

---

## 4. Quy trình Quản lý Mã nguồn (Git & Branching Strategy)

### 4.1 Quy tắc đặt tên nhánh

Mọi thành viên **KHÔNG ĐƯỢC PHÉP** commit hoặc push trực tiếp lên nhánh `master`. Mọi tính năng phải được phát triển trên nhánh riêng biệt theo cấu trúc:

* `feature/<tên-tính-năng>`: Thêm tính năng mới (ví dụ: `feature/github-oauth`, `feature/team-management`).
* `bugfix/<tên-lỗi>`: Sửa lỗi phát hiện trong quá trình test (ví dụ: `bugfix/fix-submission-deadline`).
* `docs/<nội-dung>`: Thêm hoặc cập nhật tài liệu (ví dụ: `docs/add-srs-spec`).
* `refactor/<nội-dung>`: Tối ưu cấu trúc code, không đổi logic nghiệp vụ.

### 4.2 Chu trình hoàn thành một tính năng

```bash
# Bước 1: Cập nhật mã nguồn mới nhất từ master
git checkout master
git pull origin master

# Bước 2: Tạo nhánh mới cho tính năng của mình
git checkout -b feature/ten-tinh-nang

# Bước 3: Lập trình, kiểm thử trên local và commit đều đặn
git add .
git commit -m "feat(module): mô tả ngắn gọn thay đổi"

# Bước 4: [BẮT BUỘC] Xin xác nhận trước khi push (Xem Mục 4.3)

# Bước 5: Đẩy nhánh lên GitHub sau khi được chấp thuận
git push origin feature/ten-tinh-nang

# Bước 6: Tạo Pull Request (PR) trên GitHub vào nhánh master
# Yêu cầu ít nhất 1 thành viên review và Tech Lead phê duyệt trước khi Merge.
```

---

### 4.3 ⚠️ QUY TẮC BẮT BUỘC: Xác nhận trước khi Push

> **Nguyên tắc cốt lõi:** Tuyệt đối không tự ý chạy lệnh `git push` lên GitHub khi chưa có sự xác nhận rõ ràng từ Chủ dự án / Tech Lead (**minhlt6**).

#### Quy trình 2 bước xin xác nhận:

**Bước 1: Báo cáo danh sách thay đổi:**
```text
📦 Báo cáo chuẩn bị Push lên GitHub:
- Nhánh: feature/ten-tinh-nang -> origin
- Commit: feat(auth): tóm tắt nội dung thay đổi
- Danh sách file thay đổi:
  + [file 1] (thêm mới)
  + [file 2] (chỉnh sửa)

Anh/Bạn có muốn đẩy nhánh này lên GitHub không?
```

**Bước 2: Chỉ thực thi khi có sự xác nhận:**
* ✅ **ĐƯỢC PUSH:** Khi nhận được tin nhắn xác nhận: *"ok"*, *"được"*, *"push đi"*, *"đẩy lên đi"*.
* ❌ **DỪNG LẠI NGAY:** Nếu chưa nhận được phản hồi hoặc nhận yêu cầu chỉnh sửa tiếp.

---

### 4.4 Quy chuẩn Commit Message (Conventional Commits)

Format chuẩn: `<type>(<scope>): <mô tả ngắn bằng tiếng Việt hoặc tiếng Anh>`

* `feat`: Tính năng mới (ví dụ: `feat(teams): add invite member endpoint`).
* `fix`: Sửa lỗi (ví dụ: `fix(auth): fix token expiration calculation`).
* `docs`: Thêm/sửa tài liệu (ví dụ: `docs(srs): add user stories for checkpoint`).
* `style`: Format code, thêm dấu cách, sửa linter (không đổi logic).
* `refactor`: Tái cấu trúc mã nguồn.
* `test`: Viết thêm test case.
* `chore`: Cập nhật cấu hình, package.json, requirements.txt.

---

## 5. Quy chuẩn Lập trình (Coding Standards)

### 5.1 Backend (Python FastAPI)

1. **Phân tách tầng rõ rệt (Separation of Concerns):**
   * **Router (`api/v1/`):** Chỉ nhận Request, gọi Service và trả về Response. Không viết logic tính toán hay câu lệnh SQL trực tiếp tại đây.
   * **Service (`services/`):** Xử lý toàn bộ logic nghiệp vụ, tính toán điểm, kiểm tra quyền hạn, điều kiện deadline.
   * **Repository (`repositories/`):** Nơi duy nhất tương tác với cơ sở dữ liệu (Database Queries).
   * **Schema (`schemas/`):** Pydantic models dùng để kiểm tra tính hợp lệ của dữ liệu đầu vào và định dạng đầu ra.
2. **Bất đồng bộ (Async/Await):** Tất cả I/O, truy vấn database và gọi API bên ngoài đều phải dùng `async` và `await`.
3. **Quản lý phiên Database:** Luôn dùng Dependency Injection `Depends(get_db)` để giải phóng kết nối tự động.
4. **Xử lý ngoại lệ:** Dùng `HTTPException` với mã lỗi HTTP chuẩn và thông báo lỗi rõ nghĩa (Ví dụ: `status_code=400, detail="Đề tài đã đủ số lượng nhóm đăng ký"`).

### 5.2 Frontend (React + TypeScript)

1. **TypeScript Nghiêm ngặt:** Tuyệt đối không dùng kiểu dữ liệu `any`. Mọi dữ liệu nhận từ API hoặc truyền qua Props đều phải định nghĩa `interface` hoặc `type` trong thư mục `src/types/`.
2. **Cô lập API (API Layer):** Không gọi trực tiếp `axios.get(...)` hay `fetch(...)` trong Component. Mọi lời gọi mạng phải nằm trong các hàm thuộc thư mục `src/api/`.
3. **Tái sử dụng Component:** Các nút bấm, ô nhập liệu, modal, bảng dữ liệu phải được module hóa trong `src/components/`.
4. **Xử lý trạng thái tải (Loading/Error States):** Mọi thao tác gửi dữ liệu lên server đều phải có hiệu ứng Loading, disable nút bấm để chống bấm lặp (debounce/throttle), và hiển thị Toast thông báo khi có lỗi.

---

## 6. Định dạng Chuẩn của API Response

Mọi API của hệ thống cần tuân thủ cấu trúc phong bì (Envelope format) thống nhất:

```json
// Phản hồi Thành công:
{
  "success": true,
  "data": {
    "team_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "name": "Nhóm Vô Địch",
    "member_count": 4
  },
  "message": "Tạo đội thi thành công."
}

// Phản hồi Thất bại / Lỗi:
{
  "success": false,
  "error": {
    "code": "DEADLINE_EXCEEDED",
    "message": "Mốc thời gian nộp bài của Checkpoint này đã kết thúc."
  }
}
```

---

## 7. Quy định về An toàn & Bảo mật Hệ thống

* **Thời gian máy chủ là Chân lý:** Mọi điều kiện mở/đóng Checkpoint, hạn chót chọn đề tài đều phải so sánh với `datetime.now(timezone.utc)` của Server. Không tin tưởng thời gian gửi từ trình duyệt Client.
* **Nguyên tắc Tách biệt Quyền hạn (Conflict of Interest):** Mentor không được xem nội dung bài nộp chi tiết của đội mình phụ trách và không được phân công chấm điểm đội đó.
* **Commit SHA Freeze:** Tại thời điểm nộp bài, hệ thống tự động ghi lại HEAD Commit Hash từ GitHub API để phát hiện mọi hành vi sửa mã nguồn sau hạn chót.
* **Tuyệt đối cấm commit Secret Keys:** Không đẩy file `.env`, mật khẩu DB hay GitHub Client Secret lên Git.

---

## 8. Checklist Nghiệm thu trước khi Tạo Pull Request (PR)

Mỗi thành viên tự rà soát danh sách kiểm tra sau trước khi xin duyệt code:

- [ ] Mã nguồn đã được định dạng chuẩn (Black cho Python, Prettier cho TypeScript).
- [ ] Không có file `.env` hoặc thông tin nhạy cảm bị commit nhầm.
- [ ] Không có console.log debug thừa hoặc comment rác.
- [ ] Đã chạy thử tính năng trên máy cá nhân và không phát sinh lỗi vỡ giao diện.
- [ ] Đã viết commit message chuẩn theo định dạng Conventional Commits.
- [ ] ⚠️ **ĐÃ BÁO CÁO VÀ NHẬN ĐƯỢC SỰ XÁC NHẬN CỦA TECH LEAD (minhlt6) TRƯỚC KHI PUSH LÊN GITHUB.**
