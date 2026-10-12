# 📑 BÀN GIAO TÀI LIỆU API CONTRACT & SWAGGER DOCS (HF-22)

- **Người thực hiện:** Lê Tiến Minh (Tech Lead / Core Backend Architect)
- **Nhiệm vụ:** `HF-22` — Xuất tài liệu Swagger API Docs bàn giao
- **Người nhận bàn giao:**
  - **Trần Thùy Linh** — Frontend Lead (Tích hợp giao diện & API client)
  - **Đỗ Thị Lan Anh** — UI/UX Designer & QA / Postman Tester (Viết kịch bản kiểm thử API)
  - **Dương Thị Khánh Ly** — Business Analyst (Nghiệm thu nghiệp vụ SRS)
- **Ngày bàn giao:** 06/10/2026
- **Trạng thái:** ✅ Sẵn sàng tích hợp & kiểm thử (Sprint 1 Completed)

---

## 1. 🎯 Tổng quan & Hướng dẫn truy cập tài liệu

### 1.1. Các đường dẫn truy cập trực tiếp
Khi khởi chạy server backend (`http://127.0.0.1:8000`):
- **Interactive Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
  *Giao diện trực quan cho phép gọi thử API, tự động lưu token với `Authorize (Bearer)`.*
- **ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)  
  *Giao diện tài liệu kỹ thuật tĩnh, tra cứu schema và cấu trúc request/response chi tiết.*
- **OpenAPI 3.1.0 Raw JSON:** [http://127.0.0.1:8000/api/v1/openapi.json](http://127.0.0.1:8000/api/v1/openapi.json)  
  *Dùng để import trực tiếp vào Postman, Insomnia hoặc OpenAPI Code Generator (TypeScript/Axios).*
- **Tệp xuất lưu trữ trong repository:** `docs/backend/openapi.json`

### 1.2. Cách import nhanh vào Postman (Dành cho Lan Anh QA)
1. Mở ứng dụng **Postman**.
2. Chọn **Import** (hoặc phím tắt `Ctrl + O`).
3. Chọn file `docs/backend/openapi.json` hoặc nhập URL `http://127.0.0.1:8000/api/v1/openapi.json`.
4. Toàn bộ danh mục 27 endpoints thuộc 7 nhóm sẽ được tạo thành Collection hoàn chỉnh kèm request body mẫu.

### 1.3. Lệnh xuất lại file `openapi.json` khi có cập nhật code
```powershell
cd backend
.\.venv\Scripts\python.exe export_openapi.py
```

---

## 2. 📦 Chuẩn hóa cấu trúc dữ liệu (API Envelope Pattern)

Toàn bộ các API trong hệ thống đều tuân thủ 100% chuẩn phản hồi thống nhất, đồng bộ trực tiếp với kiểu dữ liệu `ApiResponse<T>` của Frontend.

### 2.1. Phản hồi thành công (HTTP 200 OK / HTTP 201 Created)
```json
{
  "success": true,
  "data": {
    "key": "value"
  },
  "message": "Thông báo thao tác thành công."
}
```

### 2.2. Phản hồi thất bại (HTTP 400, 401, 403, 404, 409, 422, 500)
```json
{
  "success": false,
  "data": null,
  "message": "Mô tả nguyên nhân lỗi rõ ràng cho người dùng.",
  "error_code": "TEN_MA_LOI_HE_THONG"
}
```

---

## 3. 🔐 Cơ chế Xác thực & Phân quyền (Auth & RBAC)

- **Chuẩn xác thực:** JWT Bearer Token theo RFC 7519.
- **Header bắt buộc:**
  ```http
  Authorization: Bearer <access_token>
  ```
- **Vai trò người dùng (`role`):**
  - `admin`: Ban Tổ Chức (BTC) — Có quyền quản lý Whitelist, duyệt ứng viên, cấu hình đề tài.
  - `judge`: Ban Giám Khảo — Chấm điểm bài thi.
  - `mentor`: Cố vấn — Xem tiến độ và hỗ trợ kỹ thuật cho đội thi.
  - `candidate`: Thí sinh tham gia thi đấu (chia thành Leader hoặc Member trong đội).
- **Trạng thái phê duyệt (`approval_status`):**
  - `pending`: Thí sinh đăng ký qua form hoặc GitHub lần đầu, cần chờ BTC duyệt.
  - `approved`: Thí sinh đã được duyệt hoặc email nằm trong Whitelist từ trước (toàn quyền tạo đội và chọn đề tài).
  - `rejected`: Đơn đăng ký bị BTC từ chối.

---

## 4. 📋 Bảng tổng hợp API Endpoints (Sprint 1)

| Nhóm | Phương thức | Endpoint | Yêu cầu Auth / Phân quyền | Mô tả chức năng |
|---|---|---|---|---|
| **Health** | `GET` | `/api/v1/health` | Không | Kiểm tra trạng thái server & kết nối Database Supabase |
| **Root** | `GET` | `/` | Không | Thông tin phiên bản & link Swagger |
| **Auth** | `POST` | `/api/v1/auth/login` | Không | Đăng nhập tài khoản nội bộ (Admin/Judge/Mentor) |
| **Auth** | `POST` | `/api/v1/auth/register` | Không | Đăng ký tài khoản nội bộ mới (mặc định pending) |
| **Auth** | `GET` | `/api/v1/auth/github` | Không | Lấy URL ủy quyền đăng nhập GitHub OAuth 2.0 |
| **Auth** | `POST` | `/api/v1/auth/github/callback` | Không | Xử lý code đổi lấy GitHub profile & JWT token |
| **Auth** | `GET` | `/api/v1/auth/me` | Bearer Token | Lấy thông tin hồ sơ của người dùng đang đăng nhập |
| **Auth** | `GET` | `/api/v1/auth/test-admin` | Bearer Token (`admin`) | Endpoint kiểm tra phân quyền RBAC chỉ Admin |
| **Auth** | `GET` | `/api/v1/auth/test-approved` | Bearer Token (`approved`) | Endpoint kiểm tra điều kiện tài khoản đã được duyệt |
| **Admin** | `GET` | `/api/v1/admin/whitelist` | Bearer Token (`admin`) | Xem danh sách email trong Whitelist |
| **Admin** | `POST` | `/api/v1/admin/whitelist` | Bearer Token (`admin`) | Thêm 1 email vào Whitelist |
| **Admin** | `POST` | `/api/v1/admin/whitelist/bulk` | Bearer Token (`admin`) | Thêm hàng loạt email vào Whitelist |
| **Admin** | `DELETE`| `/api/v1/admin/whitelist/{entry_id}` | Bearer Token (`admin`) | Vô hiệu hóa (soft-delete) email trong Whitelist |
| **Admin** | `PATCH` | `/api/v1/admin/whitelist/{entry_id}/reactivate` | Bearer Token (`admin`) | Kích hoạt lại email đã vô hiệu hóa |
| **Admin** | `GET` | `/api/v1/admin/candidates/pending` | Bearer Token (`admin`) | Lấy danh sách thí sinh PENDING chờ duyệt |
| **Admin** | `POST` | `/api/v1/admin/candidates/{user_id}/approval` | Bearer Token (`admin`) | Duyệt (`approve`) hoặc từ chối (`reject`) thí sinh |
| **Teams** | `POST` | `/api/v1/teams` | Bearer Token (`approved`) | Tạo đội thi mới (tự sinh mã mời 6 ký tự) |
| **Teams** | `POST` | `/api/v1/teams/join` | Bearer Token (`approved`) | Gia nhập đội bằng mã mời (invite code) |
| **Teams** | `GET` | `/api/v1/teams/me` | Bearer Token (`approved`) | Lấy thông tin đội thi hiện tại của người dùng |
| **Teams** | `GET` | `/api/v1/teams/{team_id}` | Bearer Token | Lấy chi tiết thông tin một đội thi theo UUID |
| **Topics**| `GET` | `/api/v1/topics` | Bearer Token | Xem danh sách đề tài thi & Quota |
| **Topics**| `POST` | `/api/v1/topics/select` | Bearer Token (`approved` + Leader) | Đăng ký đề tài chống race condition (`SELECT FOR UPDATE`) |
| **Topics**| `POST` | `/api/v1/topics/cancel` | Bearer Token (`approved` + Leader) | Hủy đăng ký chọn đề tài |
| **Checkpoints**| `GET` | `/api/v1/checkpoints` | Không | Xem danh sách các mốc nộp bài & thời gian còn lại |
| **Checkpoints**| `GET` | `/api/v1/checkpoints/{id}` | Không | Xem chi tiết 1 mốc Checkpoint |
| **Checkpoints**| `GET` | `/api/v1/checkpoints/{id}/status` | Không | Kiểm tra trạng thái time-gated (upcoming/open/grace/closed) |
| **Checkpoints**| `POST` | `/api/v1/checkpoints/{id}/validate-window` | Bearer Token | Xác thực cửa sổ nộp bài (ném 403 nếu ngoài giờ/quá hạn) |
| **Checkpoints**| `POST` | `/api/v1/checkpoints` | Bearer Token (`admin`) | Tạo mới mốc Checkpoint |
| **Checkpoints**| `PUT` | `/api/v1/checkpoints/{id}` | Bearer Token (`admin`) | Cập nhật mốc Checkpoint / Gia hạn deadline |
| **Checkpoints**| `PATCH`| `/api/v1/checkpoints/{id}/toggle-active` | Bearer Token (`admin`) | Khóa hoặc mở kích hoạt mốc Checkpoint |

---

## 5. 🔍 Đặc tả chi tiết từng Module & Payload mẫu

### 5.1. Module Auth (HF-19)

#### 🔹 `POST /api/v1/auth/login`
- **Request Body:**
  ```json
  {
    "email": "admin@hackflow.dev",
    "password": "AdminPassword123!"
  }
  ```
- **Response Success (200):**
  ```json
  {
    "success": true,
    "data": {
      "access_token": "eyJhbGciOiJIUzI1Ni...",
      "token_type": "bearer",
      "user": {
        "id": "c138f5f4-3456-42d3-982e-9d29f8c6b73a",
        "email": "admin@hackflow.dev",
        "full_name": "BTC HackFlow Administrator",
        "role": "admin",
        "approval_status": "approved",
        "avatar_url": null,
        "is_active": true
      }
    },
    "message": "Đăng nhập thành công."
  }
  ```

#### 🔹 `GET /api/v1/auth/github`
- **Response Success (200):**
  ```json
  {
    "success": true,
    "data": {
      "url": "https://github.com/login/oauth/authorize?client_id=xxx&scope=read:user,user:email",
      "client_id": "xxx"
    },
    "message": "Lấy liên kết GitHub OAuth thành công."
  }
  ```

#### 🔹 `POST /api/v1/auth/github/callback`
- **Request Body:**
  ```json
  {
    "code": "a1b2c3d4e5f6"
  }
  ```
- **Response Success (200):**
  Trả về Bearer token và thông tin User. Nếu email thuộc Whitelist, tài khoản sẽ có `approval_status: "approved"`, ngược lại là `pending`.

---

### 5.2. Module Admin & Whitelist (HF-19)

#### 🔹 `POST /api/v1/admin/whitelist/bulk`
- **Request Body:**
  ```json
  {
    "emails": [
      "developer1@fpt.edu.vn",
      "developer2@fpt.edu.vn",
      "hacker@gmail.com"
    ],
    "note": "Import danh sách vượt qua vòng đơn"
  }
  ```
- **Response Success (201):**
  ```json
  {
    "success": true,
    "data": {
      "imported": 3,
      "emails": [
        "developer1@fpt.edu.vn",
        "developer2@fpt.edu.vn",
        "hacker@gmail.com"
      ]
    },
    "message": "Đã import 3 email vào whitelist."
  }
  ```

#### 🔹 `POST /api/v1/admin/candidates/{user_id}/approval`
- **Request Body:**
  ```json
  {
    "action": "approve",
    "note": "Hồ sơ hợp lệ và đạt điều kiện"
  }
  ```
- **Lưu ý nghiệp vụ:** Khi chọn `action: "approve"`, backend tự động thêm email thí sinh vào Whitelist để các lần đăng nhập tiếp theo luôn là `approved`.

---

### 5.3. Module Teams (HF-20)

#### 🔹 `POST /api/v1/teams` (Tạo đội thi mới)
- **Request Body:**
  ```json
  {
    "team_name": "CyberSamurai"
  }
  ```
- **Response Success (201):**
  ```json
  {
    "success": true,
    "data": {
      "id": "e4277ec5-3642-4581-995f-9aa071191ca7",
      "name": "CyberSamurai",
      "invite_code": "CYB89A",
      "leader_id": "c138f5f4-3456-42d3-982e-9d29f8c6b73a",
      "topic_id": null,
      "member_count": 1,
      "is_locked": false,
      "members": [
        {
          "user_id": "c138f5f4-3456-42d3-982e-9d29f8c6b73a",
          "email": "leader@fpt.edu.vn",
          "full_name": "Trần Thùy Linh",
          "role_in_team": "leader",
          "joined_at": "2026-10-06T14:00:00Z"
        }
      ]
    },
    "message": "Tạo đội thi thành công."
  }
  ```

#### 🔹 `POST /api/v1/teams/join` (Gia nhập đội)
- **Request Body:**
  ```json
  {
    "invite_code": "CYB89A"
  }
  ```
- **Quy tắc kiểm tra:**
  - Không cho phép người đã có đội gia nhập (`ALREADY_IN_TEAM`).
  - Không cho phép gia nhập nếu đội đã đủ 5 thành viên (`TEAM_FULL`).
  - Mã mời không phân biệt hoa thường và tự loại bỏ khoảng trắng thừa.

#### 🔹 `GET /api/v1/teams/me`
- Trả về thông tin đội hiện tại của tài khoản đăng nhập kèm danh sách thành viên.
- Nếu chưa có đội, `data: null` và `message: "Người dùng chưa tham gia đội thi nào."` (HTTP 200).

---

### 5.4. Module Topics (HF-21)

#### 🔹 `GET /api/v1/topics` (Xem danh sách đề tài & Quota)
- **Response Success (200):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "993a652a-9e11-4770-8bfa-1c620409a805",
        "title": "Fintech & Web3 Payment Gateway",
        "code": "TOPIC_FINTECH",
        "description": "Xây dựng cổng thanh toán bảo mật ứng dụng Smart Contract",
        "quota": 10,
        "current_teams_count": 8,
        "remaining_slots": 2,
        "is_full": false,
        "subtopics": [
          "Micro-transactions for IoT",
          "Cross-border remittance with Zero Knowledge Proof"
        ]
      }
    ],
    "message": "Lấy danh sách đề tài thành công (1 đề tài)."
  }
  ```

#### 🔹 `POST /api/v1/topics/select` (Đăng ký chọn đề tài)
- **Request Body:**
  ```json
  {
    "topic_id": "993a652a-9e11-4770-8bfa-1c620409a805",
    "subtopic_selection": "Micro-transactions for IoT"
  }
  ```
- **Cơ chế chống tranh chấp (Concurrency Safety):**  
  Backend sử dụng `SELECT FOR UPDATE` trên dòng Topic trong transaction kết hợp `asyncio.Lock` để đảm bảo khi hàng chục đội cùng bấm đăng ký vào giây cuối cùng, số đội đăng ký **tuyệt đối không bao giờ vượt quá quota**.
- **Điều kiện đăng ký:**
  - Người gọi phải là **Leader** của đội.
  - Đội phải đạt **tối thiểu 3 thành viên** (`TEAM_NOT_QUALIFIED`).
  - Đề tài còn chỗ (`TOPIC_FULL`).
  - Đội chưa chọn đề tài trước đó (`TOPIC_ALREADY_SELECTED`).

#### 🔹 `POST /api/v1/topics/cancel` (Hủy chọn đề tài)
- Chỉ Leader được phép hủy. Khi hủy thành công, `remaining_slots` của đề tài tự động tăng thêm 1 và đội có thể chọn đề tài khác.

---

### 5.5. Module Checkpoints & Time-Gated API (HF-32)

#### 🔹 `GET /api/v1/checkpoints` (Danh sách Checkpoints)
- **Response Success (200):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "cp_uuid_123",
        "title": "Checkpoint 1 — Nộp ý tưởng & Kiến trúc",
        "description": "Nộp tài liệu kiến trúc hệ thống và link repo GitHub khởi tạo.",
        "start_time": "2026-10-15T00:00:00Z",
        "deadline": "2026-10-15T23:59:59Z",
        "requirements": "- Sơ đồ ERD\n- Kiến trúc 3 tầng\n- Repo GitHub public",
        "is_active": true,
        "status": "open",
        "is_open": true,
        "can_submit": true,
        "grace_period_seconds": 5,
        "time_remaining_seconds": 14400,
        "time_until_start_seconds": 0,
        "server_time": "2026-10-15T20:00:00Z"
      }
    ],
    "message": "Lấy danh sách checkpoint thành công (1 mốc)."
  }
  ```

#### 🔹 `GET /api/v1/checkpoints/{checkpoint_id}/status` (Kiểm tra trạng thái đóng/mở)
- Trả về thông tin trạng thái thời gian thực của Server UTC:
  - `status`: `"upcoming"` | `"open"` | `"grace_period"` | `"closed"`
  - `can_submit`: `true` nếu cổng đang mở hoặc trong khoảng ân hạn 5 giây.
  - `grace_period_applied`: `true` nếu nộp sau `deadline` nhưng trước `deadline + 5s`.

#### 🔹 `POST /api/v1/checkpoints/{checkpoint_id}/validate-window` (Xác thực cửa sổ nộp bài)
- Endpoint dùng để kiểm tra điều kiện nộp bài trước khi upload code.
- **Quy tắc Time-Gated (Theo SRS HF-23):**
  1. `now < start_time`: Trả HTTP 403 Forbidden kèm `error_code="CHECKPOINT_NOT_OPEN"`.
  2. `is_active == false`: Trả HTTP 403 Forbidden kèm `error_code="CHECKPOINT_INACTIVE"`.
  3. `now > deadline + 5s`: Trả HTTP 403 Forbidden kèm `error_code="DEADLINE_EXCEEDED"`.
  4. `deadline < now <= deadline + 5s`: Trả HTTP 200 OK kèm `grace_period_applied=true` (Ghi nhận độ trễ mạng).
  5. `start_time <= now <= deadline`: Trả HTTP 200 OK kèm `grace_period_applied=false`.

#### 🔹 `POST /api/v1/checkpoints` (Tạo mới Checkpoint - Chỉ Admin)
- **Request Body:**
  ```json
  {
    "title": "Checkpoint 2 — Báo cáo Tiến độ MVP",
    "description": "Nộp video demo và mã nguồn hoàn thiện 50%",
    "start_time": "2026-10-18T08:00:00Z",
    "deadline": "2026-10-18T22:00:00Z",
    "requirements": "Video Loom <= 5 phút và GitHub commits",
    "is_active": true
  }
  ```

---

## 6. ⚠️ Danh mục Mã lỗi Nghiệp vụ (Standard Error Codes)

Bảng đối chiếu dành cho Frontend (Linh) để hiển thị thông báo lỗi thân thiện trên giao diện (Toast/Notification/Dialog) và QA (Lan Anh) để viết Assertions:

| Mã lỗi (`error_code`) | HTTP Code | Trường hợp xảy ra | Gợi ý xử lý trên Frontend UI |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | Thiếu token, token sai hoặc đã hết hạn | Xóa token trong `localStorage`, chuyển hướng về trang `/login` |
| `FORBIDDEN_ROLE` | 403 | Không đúng vai trò (ví dụ: Candidate cố gọi API Admin) | Hiển thị thông báo "Bạn không có quyền thực hiện chức năng này" |
| `ACCOUNT_NOT_APPROVED` | 403 | Tài khoản PENDING hoặc REJECTED cố tạo đội/chọn đề tài | Hiển thị màn hình chờ: "Tài khoản của bạn đang chờ BTC xét duyệt" |
| `ALREADY_IN_TEAM` | 400 | Người dùng đã thuộc đội khác mà lại tạo đội mới hoặc join đội | Báo lỗi: "Bạn đã tham gia một đội thi. Hãy rời đội trước nếu muốn đổi đội" |
| `TEAM_FULL` | 400 | Mã mời nhập vào thuộc đội đã đủ 5 thành viên | Báo lỗi: "Đội thi này đã đạt giới hạn tối đa 5 thành viên" |
| `TEAM_NAME_TAKEN` | 400 | Tên đội đã bị đội khác đăng ký | Highlight ô input: "Tên đội này đã được sử dụng, vui lòng chọn tên khác" |
| `NOT_IN_TEAM` | 400 | Thí sinh chưa có đội nhưng gọi API thao tác theo đội | Chuyển hướng thí sinh sang màn hình Chọn/Tạo đội thi |
| `ONLY_LEADER_CAN_PERFORM`| 403 | Thành viên thường (Member) cố chọn đề tài hoặc hủy đề tài | Báo lỗi: "Chỉ Đội trưởng (Team Leader) mới có quyền thực hiện thao tác này" |
| `TEAM_NOT_QUALIFIED` | 400 | Đội chưa đủ 3 thành viên nhưng cố đăng ký đề tài | Báo lỗi: "Đội thi cần tối thiểu 3 thành viên để đăng ký đề tài thi đấu" |
| `TOPIC_FULL` | 409 | Đề tài đã hết quota (số lượng đội đạt tối đa) | Báo lỗi: "Đề tài đã hết chỉ tiêu đăng ký, vui lòng chọn đề tài khác" |
| `TOPIC_SELECTION_CLOSED` | 400 | Hết hạn đăng ký đề tài hoặc BTC đã khóa chọn đề tài | Thông báo: "Thời gian đăng ký đề tài đã kết thúc" |
| `TOPIC_ALREADY_SELECTED` | 400 | Đội đã chọn 1 đề tài rồi nhưng tiếp tục bấm chọn đề tài khác | Báo lỗi: "Đội đã đăng ký đề tài. Vui lòng hủy đề tài hiện tại trước khi chọn mới" |
| `CHECKPOINT_NOT_OPEN` | 403 | Cổng nộp bài chưa đến giờ mở (`now < start_time`) | Hiển thị thông báo: "Cổng nộp bài cho checkpoint này chưa đến giờ mở" kèm đếm ngược |
| `CHECKPOINT_INACTIVE` | 403 | Checkpoint bị khóa hoặc tạm dừng bởi BTC | Hiển thị thông báo: "Mốc nộp bài này đang tạm khóa bởi Ban tổ chức" |
| `DEADLINE_EXCEEDED` | 403/400 | Quá hạn nộp bài (kể cả thời gian ân hạn mạng 5 giây) | Khóa form nộp bài, hiển thị: "Đã quá hạn chót nộp bài cho mốc này" |
| `GITHUB_REPO_INACCESSIBLE`| 400 | Repo GitHub nộp bài bị private hoặc không tồn tại | Báo lỗi: "Không thể truy cập kho mã nguồn GitHub. Vui lòng chuyển repo sang chế độ Public" |
| `NOT_FOUND` | 404 | Không tìm thấy đội thi, đề tài hoặc tài nguyên theo UUID | Hiển thị thông báo 404 hoặc toast "Không tìm thấy dữ liệu yêu cầu" |
| `VALIDATION_ERROR` | 422 | Dữ liệu gửi lên thiếu trường bắt buộc hoặc sai định dạng | Highlight form field tương ứng với thông điệp từ backend |

---

## 7. ⏳ Lộ trình các API còn Pending cho Sprint 2 & 3

Nhằm đảm bảo sự minh bạch trong kế hoạch phối hợp giữa các nhóm, các chức năng sau được phân kỳ thực hiện trong Sprint tiếp theo:

1. **Sprint 2: Checkpoint & Submissions**
   - ✅ `HF-32`: Lập trình API Checkpoint Time-gated (Mở/Khóa cổng nộp bài, ân hạn mạng 5s) — **Đã hoàn thành**.
   - ⏳ `HF-33`: Lập trình module tích hợp GitHub API xác thực HEAD Commit SHA.
   - ⏳ `HF-34`: Lập trình API POST /submissions (Lưu trữ bài nộp) và Audit Log.
2. **Sprint 3: Evaluation & Scoring Matrix API**
   - Bảng điểm tiêu chí (Rubric) cho Giám khảo (Judge).
   - Tổng hợp điểm số, xếp hạng (Leaderboard) tự động theo trọng số.

---

## 8. 🛡️ Báo cáo Kiểm thử Tự động (Quality Assurance)

Tất cả các endpoint bàn giao trong tài liệu này đều đã được kiểm thử tự động toàn diện qua **55 bài test (100% Pass)**:
- `tests/test_health.py`: 3/3 tests (Liveness, Database connection, CORS origins).
- `tests/test_docs.py`: 3/3 tests (Swagger UI /docs, ReDoc /redoc, OpenAPI JSON schema /api/v1/openapi.json).
- `tests/test_envelope.py`: 4/4 tests (Format chuẩn hóa `ApiResponse[T]`, xử lý lỗi 400, 404, 422).
- `tests/test_auth.py`: 9/9 tests (Local auth, Register pending, GitHub OAuth mock, RBAC roles, Token expiration).
- `tests/test_admin_whitelist.py`: 8/8 tests (Whitelist CRUD, bulk import, candidate approval auto-whitelist).
- `tests/test_teams.py`: 7/7 tests (Create team, 6-char unique invite code, member bounds 3-5, anti-duplicate team).
- `tests/test_topics.py`: 9/9 tests (Atomic selection with `SELECT FOR UPDATE`, quota limit prevention, leader-only privilege, cancel topic).
- `tests/test_checkpoints.py`: 12/12 tests (Time-gating: upcoming, open, grace period 5s, deadline exceeded, inactive toggle, Admin CRUD, FastAPI dependency).

---
*Tài liệu được lập bởi Lê Tiến Minh — HackFlow Tech Lead. Mọi thắc mắc kỹ thuật xin liên hệ kênh Slack `#backend-dev`.*
