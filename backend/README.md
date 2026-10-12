# 🚀 HackFlow9 — Backend API

Backend phục vụ nền tảng HackFlow9 được xây dựng với **FastAPI** và kiến trúc **3 tầng (3-Tier Architecture)** chuẩn công nghiệp, sẵn sàng tích hợp cơ sở dữ liệu Supabase PostgreSQL thông qua async SQLAlchemy 2.0.

---

## 🏗️ Kiến trúc 3 tầng (3-Tier Architecture)

Dữ liệu và luồng xử lý đi qua 3 tầng phân tách rõ ràng trách nhiệm:

```
                  ┌────────────────────────────────────────┐
                  │          Client (Frontend / Postman)   │
                  └───────────────────┬────────────────────┘
                                      │ HTTP Request / Response (ApiResponse[T])
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  TẦNG 1: ROUTER / CONTROLLER (app/api/v1/)                                       │
│  - Nhận HTTP Request, validate schema đầu vào qua Pydantic.                      │
│  - Điều hướng tới Service phù hợp, trả về response chuẩn hóa (API Envelope).     │
└─────────────────────────────────────┬────────────────────────────────────────────┘
                                      │ Gọi hàm nghiệp vụ (DTO / Schemas)
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  TẦNG 2: SERVICE LAYER (app/services/)                                           │
│  - Chứa toàn bộ Business Logic, quy tắc kiểm tra nghiệp vụ (Hackathon rules).    │
│  - Không phụ thuộc vào HTTP (có thể test độc lập hoặc gọi từ background job).     │
│  - Ném AppException (NotFoundException, ConflictException, ...) khi vi phạm.    │
└─────────────────────────────────────┬────────────────────────────────────────────┘
                                      │ Gọi thao tác dữ liệu (AsyncSession)
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  TẦNG 3: REPOSITORY LAYER (app/repositories/)                                    │
│  - Điểm duy nhất giao tiếp trực tiếp với cơ sở dữ liệu qua async SQLAlchemy 2.0. │
│  - Thực thi các câu lệnh SELECT, INSERT, UPDATE, DELETE, SELECT FOR UPDATE.      │
│  - Không chứa logic nghiệp vụ và không quan tâm đến HTTP Status Code.            │
└─────────────────────────────────────┬────────────────────────────────────────────┘
                                      │ Async Engine (asyncpg)
                                      ▼
                       ┌──────────────────────────────┐
                       │  Database (PostgreSQL / ...) │
                       └──────────────────────────────┘
```

---

## 📂 Cấu trúc thư mục

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── health.py        # Kiểm tra sức khỏe hệ thống & kết nối DB
│   │       │   └── example.py       # API mẫu minh họa ApiResponse envelope
│   │       └── router.py            # Tổng hợp các router API v1
│   ├── core/
│   │   ├── config.py                # Cấu hình Pydantic Settings đọc .env
│   │   ├── database.py              # Async SQLAlchemy engine & get_db dependency
│   │   ├── security.py              # Xử lý JWT tokens, mã hóa mật khẩu
│   │   └── exceptions.py            # Global Exception Handlers & custom exceptions
│   ├── models/
│   │   └── base.py                  # DeclarativeBase, UUID primary key & Timestamps
│   ├── repositories/
│   │   └── base.py                  # Generic Async BaseRepository (CRUD chuẩn)
│   ├── schemas/
│   │   ├── response.py              # Chuẩn ApiResponse[T] & ErrorResponse
│   │   └── base.py                  # Pagination params & generic paginated data
│   ├── services/
│   │   └── base.py                  # Generic Async BaseService (nghiệp vụ dùng chung)
│   └── main.py                      # FastAPI App Factory, CORS, Middleware
├── tests/
│   ├── conftest.py                  # Async client fixture cho Pytest
│   ├── test_health.py               # Test health check & CORS
│   └── test_envelope.py             # Test format chuẩn hóa envelope (200, 400, 404, 422)
├── main.py                          # File chạy server nhanh (python main.py)
├── requirements.txt                 # Danh sách thư viện Python
├── pytest.ini                       # Cấu hình kiểm thử tự động
├── .env.example                     # Mẫu biến môi trường
├── .env                             # Biến môi trường local (KHÔNG push Git)
└── README.md                        # Tài liệu hướng dẫn này
```

---

## 📦 Chuẩn hóa phản hồi (API Envelope)

Toàn bộ API (cả thành công lẫn thất bại, kể cả lỗi validate 422 hoặc lỗi 404/500) đều trả về định dạng đồng nhất, ăn khớp 100% với `ApiResponse<T>` bên Frontend:

### Phản hồi thành công (HTTP 200/201):
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "project": "HackFlow Backend API",
    "version": "1.0.0"
  },
  "message": "Hệ thống Backend FastAPI đang hoạt động bình thường."
}
```

### Phản hồi lỗi (HTTP 400/401/403/404/422/500):
```json
{
  "success": false,
  "data": null,
  "message": "Bản ghi với ID 'xxx' không tồn tại."
}
```

---

## 🛠️ Hướng dẫn cài đặt & chạy Local

### 1. Kích hoạt môi trường ảo (Virtualenv)

Trên Windows (PowerShell):
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
```

*(Nếu chưa có .venv):*
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Cài đặt thư viện dependencies

```powershell
pip install -r requirements.txt
```

### 3. Cấu hình biến môi trường

Copy `.env.example` thành `.env` (nếu chưa có):
```powershell
cp .env.example .env
```
Chỉnh sửa `DATABASE_URL` sang URL Supabase PostgreSQL của bạn khi tiến hành HF-18.

### 4. Khởi chạy Server phát triển

Cách 1 (Uvicorn reload trực tiếp):
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Cách 2 (Chạy qua main.py):
```powershell
python main.py
```

### 5. Truy cập tài liệu tương tác & OpenAPI Specification

- **Swagger UI (Interactive)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) (Hỗ trợ gọi thử API trực tiếp, lưu token xác thực Bearer)
- **ReDoc (Technical Documentation)**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Raw OpenAPI 3.1.0 Spec**: [http://127.0.0.1:8000/api/v1/openapi.json](http://127.0.0.1:8000/api/v1/openapi.json)
- **Tài liệu Bàn giao API Contract**: [`docs/backend/api-contract-handover.md`](../docs/backend/api-contract-handover.md)
- **Lược đồ OpenAPI xuất sẵn cho Postman**: [`docs/backend/openapi.json`](../docs/backend/openapi.json)

#### Lệnh xuất lại file `openapi.json` khi cập nhật API:
```powershell
python export_openapi.py
```

---

## 🧪 Chạy Kiểm thử tự động (Unit & Integration Tests)

Bộ kiểm thử được xây dựng bằng `pytest` và `httpx`, sử dụng SQLite in-memory engine mô phỏng toàn bộ hành vi database:

```powershell
pytest -v
```

Kết quả: **55/55 bài test vượt qua (100% Pass)**:
- `tests/test_health.py` (3 tests): Liveness, Database check, CORS headers.
- `tests/test_docs.py` (3 tests): Swagger UI (/docs), ReDoc (/redoc), OpenAPI JSON schema (/api/v1/openapi.json).
- `tests/test_envelope.py` (4 tests): Định dạng chuẩn ApiResponse envelope (200, 400, 404, 422).
- `tests/test_auth.py` (9 tests): Đăng nhập, Đăng ký, GitHub OAuth mock, RBAC, phân quyền vai trò.
- `tests/test_admin_whitelist.py` (8 tests): Quản lý Whitelist, bulk import, auto-whitelist khi duyệt ứng viên.
- `tests/test_teams.py` (7 tests): Tạo đội, gia nhập đội, sinh mã mời ngẫu nhiên 6 ký tự, kiểm tra giới hạn 3-5 thành viên.
- `tests/test_topics.py` (9 tests): Danh sách đề tài, quota giới hạn số đội, giao dịch nguyên tử chống tranh chấp đồng thời (`SELECT FOR UPDATE`), hủy đề tài.
- `tests/test_checkpoints.py` (12 tests): Time-gating mở/khóa cổng nộp bài, thời gian ân hạn mạng 5 giây (Grace Period), Admin CRUD, FastAPI dependency.


