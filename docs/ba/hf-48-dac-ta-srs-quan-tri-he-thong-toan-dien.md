# HF-48: Đặc tả SRS — Phân hệ Quản trị Hệ thống Toàn diện (Admin Config, Nhân sự & Giám sát)

- **Mã công việc:** `HF-48`
- **Người thực hiện:** Đinh Phương Ly (Lead Business Analyst)
- **Sprint:** Sprint 5 (Final Release & Defense Readiness)
- **Trạng thái:** Hoàn thành & Đã nghiệm thu

---

## 1. Tổng quan Nghiệp vụ

Phân hệ **Quản trị Hệ thống Toàn diện (Admin Command Center)** cung cấp cho Ban Tổ Chức (BTC / `role = admin`) bộ công cụ điều hành xuyên suốt vòng đời cuộc thi Hackathon từ giai đoạn khởi tạo cấu hình, phân công nhân sự chuyên môn (Giám khảo & Cố vấn), điều phối đội thi, đến giám sát kết quả và công bố bảng xếp hạng chính thức.

---

## 2. Danh mục User Stories (US-19 đến US-22)

| Mã US | Tên User Story | Mô tả Nghiệp vụ (`As a... I want... So that...`) | Độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **US-19** | Cấu hình tham số toàn cục cuộc thi (`/admin/config`) | Là **Admin (BTC)**, tôi muốn thiết lập tên sự kiện, giai đoạn hiện tại, giới hạn thành viên đội (`minTeamSize`, `maxTeamSize`), thời gian đóng băng nộp bài (`start_time`, `end_time`) và công tắc `blindJudgingEnabled`, `is_result_published` để điều khiển hành vi toàn hệ thống theo thời gian thực. | **P0 (Must Have)** |
| **US-20** | Quản lý nhân sự Giám khảo & Cố vấn (`/admin/personnel`) | Là **Admin (BTC)**, tôi muốn thêm mới, cập nhật thông tin chuyên môn, phân công danh sách đội thi phụ trách (`assigned_team_ids`) và thu hồi quyền của Giám khảo (`judge`) / Cố vấn (`mentor`) để đảm bảo nhân sự chấm thi và hỗ trợ đúng chuyên môn. | **P0 (Must Have)** |
| **US-21** | Quản trị & phê duyệt Đội thi (`/admin/teams`) | Là **Admin (BTC)**, tôi muốn tìm kiếm, lọc theo trạng thái hợp lệ (`valid`, `under_min`, `over_max`), phê duyệt hàng loạt (`bulk-approve`), chỉnh sửa hoặc từ chối đội thi vi phạm quy chế. | **P0 (Must Have)** |
| **US-22** | Giám sát tổng quan & Mở khóa phiếu chấm (`/admin/dashboard`, `/admin/results`) | Là **Admin (BTC)**, tôi muốn theo dõi số liệu thống kê thời gian thực (`/admin/stats`), phát hiện đội có độ lệch điểm cao (`has_discrepancy > 15đ`) và mở khóa phiếu chấm (`POST /admin/evaluations/{id}/unlock`) kèm lý do Audit Log để Giám khảo thẩm định lại. | **P0 (Must Have)** |

---

## 3. Quy tắc Nghiệp vụ (Business Rules)

1. **BR-ADM-01 (Kiểm soát Thời gian Cuộc thi):**
   - Mốc `start_time` bắt buộc nhỏ hơn `end_time` (`start_time < end_time`). Nếu vi phạm, hệ thống từ chối lưu với mã lỗi `400 Bad Request`.
   - Khi bảng `hackathon_config` chưa có bản ghi nào, lệnh `GET /api/v1/admin/config` tự động khởi tạo cấu hình mặc định chuẩn của cuộc thi.
2. **BR-ADM-02 (Ràng buộc Vai trò Nhân sự):**
   - Endpoint `/api/v1/admin/personnel` chỉ cho phép khởi tạo hoặc cập nhật tài khoản thuộc 2 vai trò `judge` hoặc `mentor`.
   - Khi gán `assigned_team_ids` cho Giám khảo (`judge`), hệ thống tự động đồng bộ vào bảng `judge_assignments` để phục vụ lọc bài nộp trong chế độ Blind Judging.
3. **BR-ADM-03 (Kiểm soát Độ lệch điểm & Mở khóa Phiếu chấm):**
   - Nếu chênh lệch giữa điểm cao nhất và thấp nhất của các Giám khảo cho cùng một đội vượt quá ngưỡng `discrepancyThreshold` (mặc định `15.0` điểm trên thang 100), hệ thống gắn cờ `has_discrepancy = true` (`HIGH_DISCREPANCY_WARNING`).
   - Chỉ `admin` mới được phép gọi API mở khóa phiếu chấm (`POST /api/v1/admin/evaluations/{id}/unlock`) từ trạng thái `submitted` về `draft`, bắt buộc đính kèm `reason` để ghi nhận vào bảng `audit_logs`.
4. **BR-ADM-04 (Phân quyền RBAC Tuyệt đối):**
   - Toàn bộ cụm API `/api/v1/admin/*` yêu cầu JWT Token có `role == "admin"`. Mọi truy cập từ `candidate`, `mentor`, hoặc `judge` đều bị chặn với mã `403 Forbidden`.

---

## 4. Đặc tả Giao diện & Ma trận Trạng thái

- **Empty State:** Hiển thị thông báo trực quan kèm nút CTA tương ứng khi danh sách nhân sự, đội thi hoặc kết quả chấm điểm đang trống.
- **Validation & Error State:** Hiển thị cảnh báo đỏ ngay trên form hoặc qua Toast khi nhập sai định dạng email, trùng tên đội (`409 Conflict`), hoặc sai lệch mốc thời gian (`400 Bad Request`).
- **Unsaved Changes Protection:** Trang `/admin/config` tích hợp `useUnsavedChangesWarning` cảnh báo khi Admin rời trang mà chưa lưu thay đổi.
