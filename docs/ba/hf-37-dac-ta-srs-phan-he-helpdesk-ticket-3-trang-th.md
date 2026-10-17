---
id: "HF-37"
title: "Đặc tả SRS: Phân hệ Helpdesk Ticket 3 Trạng thái & Phân quyền Mentor"
status: "Done"
assignee: "Phuong ly Dinh"
priority: "P1"
deadline: "2026-10-18"
notion_url: "https://app.notion.com/p/HF-37-c-t-SRS-Ph-n-h-Helpdesk-Ticket-3-Tr-ng-th-i-Ph-n-quy-n-Mentor-3f91caaa7e858134b88cc01638c1e580"
last_edited: "23:03:00 17/10/2026"
pulled_at: "23:03:43 17/10/2026"
---

# HF-37 — Đặc tả SRS: Phân hệ Helpdesk Ticket 3 Trạng thái & Phân quyền Mentor

| | |
|---|---|
| **Status** | Done |
| **Assignee** | Phuong ly Dinh |
| **Sprint** | — |
| **Ưu tiên** | P1 |
| **Hạn hoàn thành** | 2026-10-18 |
| **Cập nhật** | 23:03:00 17/10/2026 |
| **Notion** | [Mở trang](https://app.notion.com/p/HF-37-c-t-SRS-Ph-n-h-Helpdesk-Ticket-3-Tr-ng-th-i-Ph-n-quy-n-Mentor-3f91caaa7e858134b88cc01638c1e580) |

---

## 🎯 Mục tiêu công việc
Xây dựng tài liệu Đặc tả Yêu cầu Phần mềm (SRS) cho phân hệ Hỗ trợ Kỹ thuật trực tuyến (Helpdesk Support Ticket) và Ma trận Phân quyền Bảo mật cho Mentor, làm căn cứ chuẩn cho Lan Anh lập trình API /api/v1/tickets (HF-40) và Huyền Linh dựng giao diện /tickets (HF-47).

## 🛠️ Các bước thực hiện chi tiết (Step-by-step Guide)
1. Bước 1 — Đặc tả Cấu trúc Dữ liệu (Data Dictionary) khớp với backend/app/models/support.py: Định nghĩa chi tiết bảng support_tickets gồm: id (UUID), team_id (FK teams.id, nullable), user_id (FK users.id - người tạo), assigned_to (FK users.id - Mentor/Admin nhận xử lý), title (VARCHAR(128)), content (TEXT), category (VARCHAR(64): "technical" | "topic_clarification" | "submission_issue" | "account_team" | "other"), priority (TicketPriority: "low" | "normal" | "high" | "urgent"), status (TicketStatus: "open" | "in_progress" | "resolved" | "closed"), response (TEXT - câu trả lời hướng dẫn), created_at, updated_at.
1. Bước 2 — Đặc tả Máy Trạng Thái (Ticket Lifecycle State Machine): Quy định luồng chuyển trạng thái hợp lệ: (1) open (Mới tạo bởi Thí sinh) -> in_progress (Khi Mentor/Admin bấm "Nhận xử lý", hệ thống tự động gán assigned_to = current_user.id); (2) open hoặc in_progress -> resolved (Khi Mentor/Admin nhập response không rỗng và bấm "Gửi phản hồi & Hoàn tất"); (3) resolved -> closed (Đóng ticket) hoặc in_progress (Mở lại nếu cần hỗ trợ thêm). Quy định mã lỗi 422 MISSING_TICKET_RESPONSE nếu chuyển sang resolved mà trường response bị trống.
1. Bước 3 — Đặc tả Quy tắc Nghiệp vụ & Cô lập Dữ liệu (RBAC & Isolation - AC-19.5): (1) Candidate: Chỉ tài khoản APPROVED mới được tạo ticket; khi gọi GET /api/v1/tickets/me chỉ nhìn thấy ticket do mình tạo hoặc thuộc team_id của đội mình (tuyệt đối không thấy ticket đội khác); (2) Mentor: Được quyền xem danh sách ticket (GET /api/v1/tickets), lọc theo status/priority/category và nhận xử lý/phản hồi (PATCH /api/v1/tickets/{id}), nhưng CẤM TUYỆT ĐỐI truy cập các API chấm điểm (/api/v1/evaluations, /api/v1/admin/leaderboard/publish -> 403 FORBIDDEN); (3) Admin: Toàn quyền quản lý mọi ticket.
1. Bước 4 — Đặc tả Hợp đồng API (API Contracts) & Bảng Mã Lỗi: Viết rõ Request/Response JSON mẫu cho 4 endpoint (POST /api/v1/tickets, GET /api/v1/tickets/me, GET /api/v1/tickets, PATCH /api/v1/tickets/{ticket_id}) kèm bảng mã lỗi chuẩn (TICKET_NOT_FOUND, MISSING_TICKET_RESPONSE, INVALID_TICKET_TRANSITION, FORBIDDEN_ROLE).

## ✅ Acceptance Criteria (Tiêu chí nghiệm thu)
- [x] Định nghĩa đầy đủ Data Dictionary và luồng Thí sinh tạo Ticket (title, category, priority: low/normal/high/urgent, content) + quy tắc chỉ xem được ticket của đội mình.
- [x] Đặc tả rõ State Machine vòng đời Ticket (open -> in_progress -> resolved -> closed) và điều kiện bắt buộc có response khi chuyển sang resolved.
- [x] Quy định nghiêm ngặt phân quyền bảo mật Mentor (AC-19.5) và bảng API Contracts chuẩn ApiResponse.
> **📌** 💡 Lưu ý kỹ thuật: Trình bày tài liệu trực tiếp trên trang Notion của task HF-37 theo đúng bố cục chuẩn như HF-36 để hệ thống tự động đồng bộ về thư mục docs/ba/ khi hoàn thành.

## 1. Tổng quan

### 1.1. Mục tiêu
Phân hệ support ticket cho phép thí sinh gửi yêu cầu hỗ trợ trong quá trình tham gia HackFlow. Mentor tiếp nhận và xử lý các vấn đề thuộc phạm vi hướng dẫn; Admin tiếp nhận các vấn đề cần quyền quản trị hoặc vượt thẩm quyền của Mentor.
Hệ thống cần đảm bảo:
- Thí sinh chỉ xem được ticket của bản thân hoặc đội mình theo quy tắc phân quyền.
- Mentor xem được ticket đang chờ tiếp nhận và ticket được phân công cho mình.
- Mentor không được truy cập bài nộp, repository hoặc dữ liệu chấm điểm.
- Judge chỉ thực hiện nghiệp vụ chấm thi, không có quyền truy cập hay xử lý ticket.
- Các thao tác tiếp nhận, phản hồi, chuyển giao, đóng và mở lại ticket đều được Backend kiểm tra quyền và trạng thái.

### 1.2. Các vai trò hệ thống

| Role | Tên gọi | Quyền chính trong Support Ticket |
| --- | --- | --- |
| candidate | Thí sinh | Tạo ticket, xem ticket của mình/đội mình, đóng ticket đã giải quyết và mở lại ticket trong thời hạn cho phép. |
| mentor | Người hướng dẫn | Xem ticket đang chờ tiếp nhận và ticket được phân công cho mình; tiếp nhận, phản hồi, hoàn tất xử lý hoặc chuyển lên Admin. |
| judge | Giám khảo | Không có quyền truy cập hay xử lý ticket. |
| admin | Quản trị viên, thuộc nhóm nghiệp vụ BTC | Quản lý toàn bộ ticket, tiếp nhận ticket được chuyển giao, phản hồi, đóng và mở lại ticket. |


### 1.3. User Stories liên quan
- US-07: Thí sinh gửi yêu cầu hỗ trợ và theo dõi ticket của mình.
- US-19: Mentor tiếp nhận, xử lý và phản hồi các ticket thuộc phạm vi được phân công.
- US-20: Ticket cần hỗ trợ vượt thẩm quyền được chuyển lên Admin để tiếp tục xử lý.

## 2. Data Dictionary

### 2.1. Bảng support_tickets
Đặc tả các trường dữ liệu theo model backend/app/models/support.py.

| Trường | Kiểu dữ liệu | Bắt buộc | Mô tả |
| --- | --- | --- | --- |
| id | UUID | Có | Khóa chính của ticket. |
| team_id | FK → teams.id, nullable | Không | Đội liên quan đến ticket; có thể NULL nếu ticket không gắn với đội. |
| user_id | FK → users.id | Có | Người tạo ticket. |
| assigned_to | FK → users.id, nullable | Không | Người đang phụ trách ticket; NULL khi chưa được phân công hoặc đang chờ Admin tiếp nhận. |
| title | VARCHAR(128) | Có | Tiêu đề yêu cầu hỗ trợ. |
| content | TEXT | Có | Nội dung mô tả vấn đề. |
| category | VARCHAR(64), model cho phép NULL | Có theo quy tắc nghiệp vụ | Nhóm vấn đề. Backend phải kiểm tra giá trị khi tạo ticket. |
| priority | TicketPriority | Có | Mức độ ưu tiên. |
| status | TicketStatus | Có | Trạng thái hiện tại. |
| response | TEXT, nullable | Không | Nội dung phản hồi hoặc ghi chú hỗ trợ gần nhất. |
| created_at | Datetime | Có | Thời điểm tạo ticket. |
| updated_at | Datetime | Có | Thời điểm cập nhật gần nhất. |


### 2.2. Giá trị hợp lệ của các trường
category:
- technical: Lỗi kỹ thuật.
- topic_clarification: Cần giải thích đề tài hoặc yêu cầu cuộc thi.
- submission_issue: Vấn đề nộp bài.
- account_team: Tài khoản hoặc đội thi.
- other: Vấn đề khác.
priority:
- low: Thấp.
- normal: Bình thường.
- high: Cao.
- urgent: Khẩn cấp.
status:
- open: Ticket mới, đang chờ tiếp nhận.
- in_progress: Đang được xử lý.
- resolved: Đã có phản hồi và được đánh dấu đã giải quyết.
- closed: Ticket đã đóng.
Không bổ sung trạng thái escalated vào enum hiện tại. Việc chuyển giao được biểu diễn thông qua thay đổi assigned_to và ghi nhận sự kiện trong Audit Log.

## 3. Quy trình nghiệp vụ và State Machine

### 3.1. Luồng tổng quan
1. Thí sinh đã được duyệt tài khoản tạo ticket.
1. Ticket được tạo với status = open, assigned_to = NULL.
1. Mentor nhìn thấy ticket mới trong tab Ticket chờ xử lý.
1. Mentor bấm Nhận xử lý; hệ thống gán assigned_to cho Mentor hiện tại và chuyển trạng thái thành in_progress.
1. Mentor có thể cập nhật phản hồi tạm, hoàn tất xử lý hoặc chuyển ticket lên Admin.
1. Khi vấn đề đã được giải quyết, Mentor gửi phản hồi cuối cùng và chuyển ticket sang resolved.
1. Thí sinh xác nhận kết quả bằng cách đóng ticket. Nếu vấn đề chưa được giải quyết, thí sinh có thể mở lại ticket trong vòng 48 giờ kể từ thời điểm ticket chuyển sang resolved.
1. Admin có quyền quản lý và mở lại ticket bất kỳ lúc nào theo nghiệp vụ quản trị.

### 3.2. Quy tắc chuyển trạng thái

| Trạng thái hiện tại | Hành động | Trạng thái tiếp theo | Vai trò được phép |
| --- | --- | --- | --- |
| open | accept | in_progress | Mentor; Admin có thể tiếp nhận theo quyền quản trị |
| open | escalate | in_progress | Mentor đang xử lý hoặc Admin |
| in_progress | update_response | in_progress | Mentor được phân công hoặc Admin |
| in_progress | resolve | resolved | Mentor được phân công hoặc Admin |
| in_progress | escalate | in_progress | Mentor được phân công |
| resolved | close | closed | Thí sinh tạo ticket hoặc Admin |
| resolved | reopen | in_progress | Thí sinh tạo ticket trong 48 giờ hoặc Admin bất kỳ lúc nào |
| closed | reopen | in_progress | Admin |

Mọi hành động không có trong bảng hoặc không đáp ứng điều kiện phân quyền phải bị từ chối.

### 3.3. Hành động tiếp nhận — accept
- Chỉ Mentor hoặc Admin có quyền mới được tiếp nhận ticket.
- Với Mentor, ticket phải có status = open và assigned_to = NULL.
- Backend đặt assigned_to = current_user.id và status = in_progress.
- Nếu ticket đã được người khác nhận trước đó, Backend không ghi đè người phụ trách và trả về 409 TICKET_ALREADY_ASSIGNED.
- Việc tiếp nhận phải được xử lý nguyên tử để tránh hai Mentor cùng nhận một ticket.

### 3.4. Hành động phản hồi tạm — update_response
- Mentor được phân công có thể cập nhật phản hồi trong khi ticket vẫn ở in_progress.
- Admin có thể cập nhật phản hồi theo quyền quản trị.
- Trường response lưu nội dung phản hồi mới nhất.
- Hành động này không chuyển trạng thái ticket.
- Backend cập nhật updated_at và ghi nhận thao tác vào Audit Log.
Giới hạn dữ liệu: Model hiện có chỉ cung cấp một trường response, không phải bảng lịch sử phản hồi. Nếu cần hiển thị nhiều lần trao đổi như một cuộc hội thoại, cần bổ sung model lưu từng phản hồi. Không được giả định trường response tự lưu toàn bộ lịch sử.

### 3.5. Hành động hoàn tất xử lý — resolve
- Mentor được phân công hoặc Admin gửi phản hồi cuối cùng và chuyển ticket sang resolved.
- response không được để trống hoặc chỉ chứa khoảng trắng.
- Backend lưu nội dung phản hồi, cập nhật trạng thái và ghi nhận thời điểm giải quyết.
- Nếu thiếu phản hồi, trả về 422 MISSING_TICKET_RESPONSE.
- Thí sinh có thể xem phản hồi và quyết định đóng ticket hoặc mở lại nếu vấn đề chưa được giải quyết.
Để kiểm tra chính xác thời hạn mở lại 48 giờ, Backend phải lưu thời điểm chuyển sang resolved, ví dụ bằng trường resolved_at hoặc sự kiện tương ứng trong Audit Log. Không nên dựa vào updated_at hiện tại vì trường này có thể thay đổi do các thao tác khác.

### 3.6. Hành động đóng — close
- Thí sinh tạo ticket: được đóng ticket ở trạng thái resolved.
- Admin: được đóng ticket theo quyền quản trị.
- Mentor: không được trực tiếp đóng ticket; Mentor chỉ chuyển sang resolved.
- Khi đóng thành công, trạng thái chuyển sang closed.
- Nếu ticket chưa ở trạng thái hợp lệ hoặc người dùng không có quyền, Backend trả về lỗi phù hợp.

### 3.7. Hành động mở lại — reopen
- Thí sinh tạo ticket: được mở lại ticket resolved trong vòng 48 giờ tính từ thời điểm chuyển sang resolved.
- Admin: được mở lại ticket bất kỳ lúc nào, kể cả ticket closed.
- Mentor: không được tự mở lại ticket đã resolved hoặc closed.
- Khi mở lại thành công, trạng thái chuyển về in_progress.
- Nếu thí sinh yêu cầu mở lại sau thời hạn 48 giờ, Backend từ chối và trả về 403 FORBIDDEN_ROLE hoặc một mã lỗi nghiệp vụ riêng như 409 REOPEN_WINDOW_EXPIRED nếu dự án thống nhất bổ sung mã này.

### 3.8. Hành động chuyển giao — escalate
Khi vấn đề vượt quá phạm vi hỗ trợ của Mentor:
1. Mentor gửi hành động escalate kèm lý do chuyển giao.
1. Backend kiểm tra Mentor có đang được phân công cho ticket hay không.
1. Backend chuyển ticket sang hàng chờ Admin hoặc gán cho một Admin cụ thể.
1. Ticket vẫn giữ trạng thái in_progress; không thêm trạng thái escalated vào enum.
1. Backend ghi Audit Log, gồm người chuyển, người nhận nếu có, lý do và thời điểm chuyển.
Hai cách chuyển giao được hỗ trợ:
- Chuyển vào hàng chờ Admin: đặt assigned_to = NULL. Danh sách ticket của Admin phải bao gồm ticket chờ tiếp nhận này.
- Chuyển trực tiếp cho Admin: đặt assigned_to = admin_user_id của người tiếp nhận.
Nếu dùng hàng chờ Admin, Backend cần bảo đảm ticket in_progress có assigned_to = NULL vẫn xuất hiện trong danh sách của Admin. Quy tắc lọc ticket của Mentor không được áp dụng cho danh sách Admin.

## 4. Phân quyền và bảo mật

### 4.1. Ma trận phân quyền

| Hành động | Candidate | Mentor | Judge | Admin |
| --- | --- | --- | --- | --- |
| Tạo ticket | Có, nếu tài khoản đã được duyệt | Không theo nghiệp vụ thí sinh | Không | Có thể quản lý theo quyền |
| Xem ticket của mình/đội mình | Có | Không áp dụng | Không | Có |
| Xem ticket chờ tiếp nhận | Không | Có, nếu open và chưa gán | Không | Có |
| Xem ticket được phân công | Không áp dụng | Có, nếu được gán cho mình | Không | Có |
| Nhận xử lý ticket | Không | Có | Không | Có |
| Cập nhật phản hồi tạm | Không | Có, với ticket được phân công | Không | Có |
| Hoàn tất xử lý (resolve) | Không | Có, với ticket được phân công | Không | Có |
| Chuyển giao lên Admin | Không | Có, với ticket được phân công | Không | Có thể phân công lại |
| Đóng ticket (close) | Có, nếu là người tạo và ticket resolved | Không | Không | Có |
| Mở lại (reopen) | Có, nếu là người tạo và còn trong 48 giờ | Không | Không | Có, bất kỳ lúc nào |
| Xem bài nộp, repository, điểm thi | Không qua quyền Support Ticket | Không qua quyền Support Ticket | Theo quyền chấm thi riêng | Theo quyền quản trị riêng |

Các quyền trong bảng chỉ áp dụng cho phân hệ Support Ticket
4.2. Quy tắc lọc dữ liệu
Candidate — GET /api/v1/tickets/me và GET /api/v1/tickets/{ticket_id}
- Chỉ trả về ticket do người dùng tạo hoặc thuộc đội mà người dùng là thành viên hợp lệ.
- Không trả về ticket của đội khác.
- Với ticket có team_id = NULL, chỉ người tạo và Admin được xem.
- Phải kiểm tra quyền truy cập ở Backend cho từng ticket; không chỉ dựa vào ID do Frontend gửi lên.
Mentor — GET /api/v1/tickets
Mentor được xem ticket thỏa mãn một trong hai điều kiện:
(status = open AND assigned_to IS NULL) OR (assigned_to = current_user.id)
Frontend có thể chia thành hai tab:
- Ticket chờ xử lý: status = open AND assigned_to IS NULL.
- Ticket tôi đang phụ trách: assigned_to = current_user.id.
Mentor chỉ được thực hiện accept, update_response, resolve và escalate trên ticket đang được phân công cho mình, ngoại trừ accept trên ticket chưa được phân công.
Admin — GET /api/v1/tickets
- Được xem toàn bộ ticket.
- Có thể lọc theo trạng thái, mức ưu tiên, danh mục và người phụ trách.
- Phải nhìn thấy ticket trong hàng chờ Admin sau khi Mentor chuyển giao bằng cách đặt assigned_to = NULL.
Judge — mọi API Support Ticket
- Không có quyền xem danh sách, xem chi tiết, tạo, cập nhật hoặc xử lý ticket.
- Các yêu cầu truy cập API Support Ticket trả về 403 FORBIDDEN_ROLE.

### 4.3. Quy tắc cấm truy cập chéo phân hệ
- Mentor không được truy cập API chấm điểm như GET/POST /api/v1/evaluations hoặc PATCH /api/v1/admin/leaderboard/publish; yêu cầu không được phép trả về 403 FORBIDDEN_ROLE.
- Mentor không được truy cập bài nộp, repository URL hoặc điểm thi thông qua API ticket.
- Judge không được truy cập hay xử lý ticket; mọi yêu cầu vào API Support Ticket phải trả về 403 FORBIDDEN_ROLE.
- Candidate chưa được duyệt không được tạo ticket. Khi gọi POST /api/v1/tickets, Backend trả về 403 ACCOUNT_NOT_APPROVED.
- Frontend chỉ hỗ trợ hiển thị giao diện theo role; Backend vẫn là nơi quyết định quyền truy cập cuối cùng.

## 5. API Contracts

### 5.1. Quy ước chung
Base path: /api/v1
Response envelope thống nhất:
{
"success": true,
"data": {},
"message": "Request successful",
"error_code": null
}
Khi có lỗi:
{
"success": false,
"data": null,
"message": "Access denied",
"error_code": "FORBIDDEN_ROLE"
}
Các endpoint yêu cầu xác thực phải kiểm tra token/session và role trước khi thực hiện nghiệp vụ. Dữ liệu user_id, team_id, assigned_to và status khi tạo ticket được Backend kiểm soát, không tin tưởng giá trị do Candidate gửi lên.

### 5.2. Tạo ticket — POST /api/v1/tickets
Quyền: Candidate có tài khoản đã được duyệt.
Request:
{
"title": "Không thể nộp bài checkpoint",
"content": "Hệ thống báo lỗi khi tôi gửi liên kết repository.",
"category": "submission_issue",
"priority": "high"
}
Validation:
- title: bắt buộc, tối đa 128 ký tự.
- content: bắt buộc, không rỗng.
- category: bắt buộc, phải thuộc danh sách enum hợp lệ.
- priority: bắt buộc, phải thuộc low, normal, high, urgent.
- Tài khoản phải được duyệt.
Backend tự thiết lập:
- user_id = current_user.id.
- team_id theo đội hợp lệ của thí sinh nếu ticket gắn với đội; nếu không thì NULL.
- assigned_to = NULL.
- status = open.
- created_at và updated_at theo thời gian hệ thống.
Response 201 Created:
{
"success": true,
"data": {
"id": "uuid",
"title": "Không thể nộp bài checkpoint",
"content": "Hệ thống báo lỗi khi tôi gửi liên kết repository.",
"category": "submission_issue",
"priority": "high",
"status": "open",
"assigned_to": null,
"response": null,
"created_at": "2026-10-17T10:00:00Z",
"updated_at": "2026-10-17T10:00:00Z"
},
"message": "Ticket created successfully",
"error_code": null
}
Lỗi có thể gặp: 401 UNAUTHENTICATED, 403 ACCOUNT_NOT_APPROVED, 403 FORBIDDEN_ROLE, 422 INVALID_TICKET_PAYLOAD, 422 INVALID_TICKET_CATEGORY, 422 INVALID_TICKET_PRIORITY.

### 5.3. Xem ticket của mình — GET /api/v1/tickets/me
Quyền: Candidate.
Query parameters:
- status: lọc trạng thái, tùy chọn.
- priority: lọc mức ưu tiên, tùy chọn.
- category: lọc danh mục, tùy chọn.
- page: mặc định 1.
- page_size: mặc định 20, tối đa 50.
Backend chỉ trả về ticket của người dùng hoặc đội hợp lệ của người dùng. Không cho phép query parameter ghi đè điều kiện phân quyền.
Response 200 OK:
{
"success": true,
"data": {
"items": [
{
"id": "uuid",
"title": "Không thể nộp bài checkpoint",
"category": "submission_issue",
"priority": "high",
"status": "in_progress",
"assigned_to": "mentor-user-uuid",
"response": "Bạn vui lòng kiểm tra quyền truy cập repository.",
"created_at": "2026-10-17T10:00:00Z",
"updated_at": "2026-10-17T10:15:00Z"
}
],
"page": 1,
"page_size": 20,
"total": 1
},
"message": "Tickets retrieved successfully",
"error_code": null
}

### 5.4. Xem danh sách ticket — GET /api/v1/tickets
Quyền: Mentor, Admin.
Query parameters:
- status: lọc trạng thái.
- priority: lọc mức ưu tiên.
- category: lọc danh mục.
- page: mặc định 1.
- page_size: mặc định 20, tối đa 50.
Quy tắc lọc theo role:
- Mentor: (status = open AND assigned_to IS NULL) OR (assigned_to = current_user.id).
- Admin: được truy vấn toàn bộ ticket, bao gồm ticket chờ tiếp nhận và ticket đã chuyển giao.
Quy tắc sắp xếp mặc định:
1. Ưu tiên theo thứ tự urgent → high → normal → low.
1. Trong cùng mức ưu tiên, sắp xếp created_at giảm dần, ticket mới hơn đứng trước.
Thứ tự ưu tiên phải được triển khai bằng thứ tự enum hoặc biểu thức sắp xếp tường minh, không sắp xếp chuỗi theo alphabet.
Response 200 OK:
{
"success": true,
"data": {
"items": [
{
"id": "uuid",
"title": "Không thể nộp bài checkpoint",
"category": "submission_issue",
"priority": "urgent",
"status": "open",
"assigned_to": null,
"created_at": "2026-10-17T10:00:00Z",
"updated_at": "2026-10-17T10:00:00Z"
}
],
"page": 1,
"page_size": 20,
"total": 1
},
"message": "Tickets retrieved successfully",
"error_code": null
}
Nếu Mentor yêu cầu lọc theo assigned_to hoặc trạng thái khác, Backend vẫn phải áp dụng điều kiện phân quyền bắt buộc; filter do người dùng cung cấp không được mở rộng phạm vi dữ liệu được xem.

### 5.5. Xem chi tiết ticket — GET /api/v1/tickets/{ticket_id}
Quyền: Candidate, Mentor, Admin; Judge bị từ chối.
Backend phải kiểm tra quyền truy cập ticket theo role trước khi trả về dữ liệu.
- Candidate: chỉ xem ticket do mình tạo hoặc thuộc đội hợp lệ của mình.
- Mentor: chỉ xem ticket đang chờ tiếp nhận (open và assigned_to = NULL) hoặc ticket được phân công cho mình.
- Admin: xem được toàn bộ ticket.
- Judge: trả về 403 FORBIDDEN_ROLE.
Response 200 OK:
{
"success": true,
"data": {
"id": "uuid",
"team_id": "team-uuid",
"user_id": "candidate-user-uuid",
"assigned_to": "mentor-user-uuid",
"title": "Không thể nộp bài checkpoint",
"content": "Hệ thống báo lỗi khi tôi gửi liên kết repository.",
"category": "submission_issue",
"priority": "high",
"status": "in_progress",
"response": "Bạn vui lòng kiểm tra quyền truy cập repository.",
"created_at": "2026-10-17T10:00:00Z",
"updated_at": "2026-10-17T10:15:00Z"
},
"message": "Ticket retrieved successfully",
"error_code": null
}
Nếu ticket không tồn tại, trả về 404 TICKET_NOT_FOUND. Nếu ticket tồn tại nhưng người dùng không có quyền truy cập, trả về 403 FORBIDDEN_ROLE theo quy ước phân quyền của API.

### 5.6. Cập nhật và xử lý ticket — PATCH /api/v1/tickets/{ticket_id}
Quyền: Mentor được phân công hoặc đang tiếp nhận ticket hợp lệ; Admin theo quyền quản trị; Candidate chỉ được dùng các hành động close và reopen nếu đáp ứng điều kiện.
A. Nhận xử lý — accept
Request:
{
"action": "accept"
}
Backend kiểm tra ticket có status = open và assigned_to = NULL, sau đó gán:
- assigned_to = current_user.id.
- status = in_progress.
Response 200 OK:
{
"success": true,
"data": {
"id": "uuid",
"assigned_to": "current-user-uuid",
"status": "in_progress"
},
"message": "Ticket accepted successfully",
"error_code": null
}
Nếu ticket đã được nhận bởi người khác, trả về 409 TICKET_ALREADY_ASSIGNED.
B. Cập nhật phản hồi tạm — update_response
Request:
{
"action": "update_response",
"response": "Tôi đang kiểm tra lỗi quyền truy cập repository."
}
Điều kiện:
- Ticket phải đang ở in_progress.
- Người gửi phải là Mentor được phân công hoặc Admin.
- response không được rỗng.
Backend cập nhật trường response, giữ nguyên trạng thái in_progress, cập nhật updated_at và ghi Audit Log.
Response 200 OK:
{
"success": true,
"data": {
"id": "uuid",
"status": "in_progress",
"response": "Tôi đang kiểm tra lỗi quyền truy cập repository."
},
"message": "Ticket response updated successfully",
"error_code": null
}
C. Hoàn tất xử lý — resolve
Request:
{
"action": "resolve",
"response": "Bạn đã có thể nộp bài sau khi cập nhật quyền truy cập repository."
}
Điều kiện:
- Ticket đang ở in_progress.
- Người gửi là Mentor được phân công hoặc Admin.
- response bắt buộc và không được chỉ chứa khoảng trắng.
Backend lưu phản hồi, chuyển trạng thái sang resolved và ghi nhận thời điểm giải quyết để kiểm tra thời hạn mở lại.
Response 200 OK:
{
"success": true,
"data": {
"id": "uuid",
"status": "resolved",
"response": "Bạn đã có thể nộp bài sau khi cập nhật quyền truy cập repository."
},
"message": "Ticket resolved successfully",
"error_code": null
}
Nếu thiếu phản hồi, trả về 422 MISSING_TICKET_RESPONSE.
D. Chuyển giao lên Admin — escalate
Request chuyển vào hàng chờ Admin:
{
"action": "escalate",
"note": "Vấn đề cần quyền quản trị hệ thống nên vượt thẩm quyền xử lý của Mentor."
}
Request chuyển trực tiếp cho một Admin:
{
"action": "escalate",
"note": "Cần Admin kiểm tra cấu hình hệ thống.",
"target_admin_id": "admin-user-uuid"
}
Quy tắc xử lý:
- Người gọi phải là Mentor được phân công cho ticket hoặc Admin có quyền quản trị.
- note bắt buộc và không được rỗng.
- Nếu có target_admin_id, Backend phải xác minh người nhận tồn tại và có role admin.
- Nếu không có target_admin_id, Backend đặt assigned_to = NULL để đưa ticket vào hàng chờ Admin.
- Ticket giữ trạng thái in_progress.
- Backend ghi Audit Log gồm ticket ID, người chuyển, người nhận nếu có, lý do chuyển giao và thời điểm.
Response 200 OK khi chuyển vào hàng chờ:
{
"success": true,
"data": {
"id": "uuid",
"status": "in_progress",
"assigned_to": null
},
"message": "Ticket escalated to admin queue successfully",
"error_code": null
}
Nếu chuyển trực tiếp, assigned_to trong response là ID của Admin nhận ticket.
E. Đóng ticket — close
Request:
{
"action": "close"
}
Quyền và điều kiện:
- Candidate chỉ được đóng ticket do mình tạo, khi ticket đang resolved.
- Admin được đóng ticket theo quyền quản trị.
- Mentor không được đóng ticket.
Backend chuyển trạng thái sang closed và ghi Audit Log.
Response 200 OK:
{
"success": true,
"data": {
"id": "uuid",
"status": "closed"
},
"message": "Ticket closed successfully",
"error_code": null
}
F. Mở lại ticket — reopen
Request:
{
"action": "reopen"
}
Quyền và điều kiện:
- Candidate chỉ được mở lại ticket do mình tạo trong vòng 48 giờ kể từ thời điểm ticket chuyển sang resolved.
- Admin được mở lại ticket ở trạng thái resolved hoặc closed bất kỳ lúc nào.
- Mentor không được tự mở lại ticket.
Backend chuyển trạng thái sang in_progress, cập nhật updated_at và ghi Audit Log.
Response 200 OK:
{
"success": true,
"data": {
"id": "uuid",
"status": "in_progress"
},
"message": "Ticket reopened successfully",
"error_code": null
}
Nếu Candidate vượt quá thời hạn 48 giờ, Backend từ chối yêu cầu. Nếu dự án sử dụng mã lỗi riêng, trả về 409 REOPEN_WINDOW_EXPIRED.

### 5.7. Quy tắc xử lý lỗi

| HTTP Status | Error code | Trường hợp |
| --- | --- | --- |
| 400 | INVALID_TICKET_TRANSITION | Hành động không hợp lệ với trạng thái hiện tại. |
| 401 | UNAUTHENTICATED | Chưa xác thực hoặc thông tin xác thực không hợp lệ. |
| 403 | FORBIDDEN_ROLE | Role không có quyền sử dụng API hoặc thực hiện hành động. |
| 403 | ACCOUNT_NOT_APPROVED | Candidate chưa được duyệt nhưng cố tạo ticket. |
| 403 | FORBIDDEN | Người dùng không được phép truy cập tài nguyên theo chính sách bảo mật chung, nếu codebase vẫn sử dụng mã này. |
| 404 | TICKET_NOT_FOUND | Ticket không tồn tại. |
| 409 | TICKET_ALREADY_ASSIGNED | Ticket đã được người khác tiếp nhận. |
| 409 | REOPEN_WINDOW_EXPIRED | Candidate mở lại ticket sau thời hạn 48 giờ, nếu triển khai mã lỗi riêng. |
| 422 | INVALID_TICKET_PAYLOAD | Thiếu trường bắt buộc hoặc dữ liệu không hợp lệ. |
| 422 | INVALID_TICKET_CATEGORY | Danh mục thiếu hoặc không thuộc enum cho phép. |
| 422 | INVALID_TICKET_PRIORITY | Mức ưu tiên không hợp lệ. |
| 422 | MISSING_TICKET_RESPONSE | Gửi hành động resolve nhưng không có phản hồi hợp lệ. |
| 500 | INTERNAL_SERVER_ERROR | Lỗi máy chủ không dự kiến. |

Để thống nhất, các lỗi phân quyền theo role trong phân hệ Support Ticket sử dụng 403 FORBIDDEN_ROLE. 403 FORBIDDEN chỉ được giữ cho các trường hợp thuộc quy ước chung của codebase, tránh sử dụng lẫn lộn hai mã cho cùng một tình huống.

## 6. Yêu cầu Audit Log
Backend phải ghi nhận các sự kiện quan trọng:
- Ticket được tạo.
- Ticket được tiếp nhận.
- Phản hồi tạm được cập nhật.
- Ticket được chuyển sang resolved.
- Ticket được chuyển giao lên Admin.
- Ticket được đóng.
- Ticket được mở lại.
Mỗi bản ghi Audit Log cần có tối thiểu: ticket_id, actor_user_id, action, timestamp và thông tin thay đổi cần thiết. Với hành động escalate, phải lưu thêm lý do chuyển giao và người nhận nếu có.
Nếu cần kiểm tra chính xác thời hạn mở lại 48 giờ, Audit Log hoặc trường resolved_at phải lưu được thời điểm chuyển trạng thái sang resolved.

---
*Kéo từ Notion lúc 23:03:43 17/10/2026 bởi notion-module*
