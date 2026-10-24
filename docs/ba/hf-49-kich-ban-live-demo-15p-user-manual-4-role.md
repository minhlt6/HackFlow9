# HF-49: Kịch bản Thuyết trình Live Demo (Golden Path 15 Phút) & Hướng dẫn Sử dụng 4 Vai trò

- **Mã công việc:** `HF-49`
- **Người thực hiện:** Đinh Phương Ly (Lead Business Analyst)
- **Sprint:** Sprint 5 (Final Release & Defense Readiness)
- **Trạng thái:** Hoàn thành & Đã nghiệm thu

---

## Phần I. Kịch bản Thuyết trình Live Demo "Golden Path" (15 Phút)

| Phân cảnh | Thời lượng | Vai trò Demo | Thao tác Trực tiếp trên Hệ thống | Điểm nhấn Kỹ thuật & Nghiệp vụ |
| :--- | :---: | :---: | :--- | :--- |
| **Cảnh 1: Thiết lập & Điều hành Cuộc thi** | `00:00 – 03:30` | **Admin (BTC)** | 1. Đăng nhập tài khoản Admin (`/admin/dashboard`).<br>2. Truy cập `/admin/config` kiểm tra chế độ `Blind Judging = ON` và mốc thời gian.<br>3. Mở `/admin/topics` và `/admin/checkpoints` kiểm tra hạn mức Quota đề tài & các chặng nộp bài.<br>4. Phát thông báo khẩn cấp từ `/admin/announcements`. | • Đồng bộ cấu hình thời gian thực (`/api/v1/admin/config`).<br>• Quản trị tiêu chí chấm Rubric tổng trọng số 100% (`/admin/criteria`). |
| **Cảnh 2: Hành trình Thí sinh (Lập đội, Chọn đề tài, Nộp bài & Helpdesk)** | `03:30 – 08:00` | **Candidate (Đội trưởng)** | 1. Đăng nhập tài khoản Thí sinh (`/dashboard`).<br>2. Vào `/teams` kiểm tra mã mời 6 ký tự và danh sách thành viên.<br>3. Vào `/topics` đăng ký đề tài (minh họa trừ Quota tức thì với `SELECT FOR UPDATE`).<br>4. Vào `/checkpoints` & `/final-submission` nộp link GitHub Repo và xác thực Commit SHA.<br>5. Tạo 1 Ticket hỗ trợ kỹ thuật tại `/tickets`. | • Chống Race Condition khi tranh chấp slot đề tài cuối cùng (`409 Conflict`).<br>• Đóng băng mã nguồn qua GitHub Commit SHA Freeze + 5s Grace Period. |
| **Cảnh 3: Cố vấn Hỗ trợ Kỹ thuật (Helpdesk 3 Trạng thái)** | `08:00 – 10:30` | **Mentor (Cố vấn)** | 1. Chuyển sang vai trò Mentor (`/mentor/dashboard`).<br>2. Mở `/mentor/tickets`, bấm **Nhận xử lý (Claim)** ticket vừa tạo (`OPEN` → `IN_PROGRESS`).<br>3. Gửi phản hồi hướng dẫn kỹ thuật và bấm **Hoàn tất (Resolve)** (`IN_PROGRESS` → `RESOLVED`). | • Luồng máy trạng thái 3 bước (`OPEN` → `IN_PROGRESS` → `RESOLVED`) và kiểm soát quyền RBAC Mentor. |
| **Cảnh 4: Giám khảo Chấm thi Ẩn danh (Split-screen Blind Judging)** | `10:30 – 13:30` | **Judge (Giám khảo)** | 1. Chuyển sang vai trò Giám khảo (`/judge/dashboard`).<br>2. Mở không gian chấm thi đôi `/judging` (Trái: Bảng tiêu chí Rubric thanh trượt; Phải: Preview Repo/Slide ẩn danh `Team #XXXX`).<br>3. Lưu nháp (`draft`) sau đó bấm **Khóa phiếu chấm (`submitted`)**. | • Chế độ Blind Judging ẩn hoàn toàn tên thật đội thi.<br>• Tự động quy đổi điểm trọng số về thang 100 chuẩn xác. |
| **Cảnh 5: Tổng hợp Kết quả, Kiểm soát Lệch điểm & Công bố BXH** | `13:30 – 15:00` | **Admin & Toàn hệ thống** | 1. Quay lại Admin tại `/admin/results`.<br>2. Quan sát cảnh báo lệch điểm (`> 15đ`), thử nghiệm tính năng **Mở khóa phiếu chấm** và **Xuất CSV**.<br>3. Bật công tắc **Công Bố Cho Thí Sinh** và kiểm tra `/scoreboard`. | • Cảnh báo `HIGH_DISCREPANCY_WARNING` tự động.<br>• Công bố Leaderboard tức thì cho toàn bộ thí sinh. |

---

## Phần II. Hướng dẫn Sử dụng Nhanh theo 4 Vai trò (User Manual)

### 1. Dành cho Ban Tổ Chức (`Admin`)
- **Quản lý Whitelist & Phê duyệt (`/admin/whitelist`, `/admin/approvals`):** Import danh sách email hợp lệ hoặc duyệt trực tiếp hồ sơ thí sinh đang ở trạng thái `PENDING`.
- **Quản lý Đội thi & Nhân sự (`/admin/teams`, `/admin/personnel`):** Kiểm tra quy mô đội (3–5 thành viên), phê duyệt hàng loạt và phân công Giám khảo/Mentor phụ trách.
- **Quản lý Đề tài, Checkpoint & Rubric (`/admin/topics`, `/admin/checkpoints`, `/admin/criteria`):** Thiết lập đề tài kèm giới hạn số đội tối đa (`max_teams`), cấu hình cửa sổ thời gian nộp bài và bộ tiêu chí chấm điểm có tổng trọng số bằng `100%`.
- **Tổng hợp & Công bố Kết quả (`/admin/results`, `/admin/config`):** Rà soát bảng điểm tổng hợp, mở khóa phiếu chấm khi cần thẩm định lại, xuất báo cáo CSV và bật chế độ công bố kết quả.

### 2. Dành cho Thí sinh (`Candidate`)
- **Hoàn thiện Hồ sơ & Onboarding (`/onboarding`, `/profile`):** Cập nhật thông tin trường học, mã sinh viên và kỹ năng chuyên môn.
- **Quản lý Đội thi (`/teams`):** Tạo đội mới (nhận mã mời 6 ký tự) hoặc nhập mã mời để gia nhập đội; Đội trưởng có quyền chuyển nhượng quyền Leader hoặc xóa thành viên trước khi khóa đội.
- **Đăng ký Đề tài (`/topics`):** Chỉ Đội trưởng được bấm chọn đề tài khi đề tài còn hạn mức (`current_teams < max_teams`).
- **Nộp bài Checkpoint & Chung cuộc (`/checkpoints`, `/final-submission`):** Nộp link GitHub Repository, Video Demo và Slide thuyết trình trước khi đồng hồ đếm ngược kết thúc.

### 3. Dành cho Giám khảo (`Judge`)
- **Theo dõi Tiến độ Chấm (`/judge/dashboard`):** Xem tổng số bài nộp được phân công, số bài đã khóa điểm và số bài đang lưu nháp.
- **Chấm điểm Split-screen (`/judging`):** Đánh giá bài nộp dưới mã ẩn danh (`Team #XXXX`), chấm điểm từng tiêu chí Rubric, nhập nhận xét chi tiết và khóa phiếu chấm chính thức.

### 4. Dành cho Cố vấn (`Mentor`)
- **Bảng điều khiển & Giám sát Đội thi (`/mentor/dashboard`, `/mentor/teams`, `/mentor/checkpoints`):** Theo dõi tiến độ nộp bài qua các chặng của các đội thi.
- **Xử lý Yêu cầu Hỗ trợ (`/mentor/tickets`):** Tiếp nhận (`Claim`), phản hồi và đóng (`Resolve`) các yêu cầu hỗ trợ kỹ thuật của thí sinh.
