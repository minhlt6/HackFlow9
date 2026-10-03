---
id: "HF-03"
title: "Viết đặc tả SRS luồng Auth & Onboarding"
status: "In Review"
assignee: "Phuong ly Dinh"
priority: "P0"
deadline: "2026-10-02"
notion_url: "https://app.notion.com/p/HF-03-Vi-t-c-t-SRS-lu-ng-Auth-Onboarding-55d1d47124604474889ca0466f4a2bd2"
last_edited: "23:31:00 2/10/2026"
pulled_at: "01:09:53 4/10/2026"
---

# HF-03 — Viết đặc tả SRS luồng Auth & Onboarding

| | |
|---|---|
| **Status** | In Review |
| **Assignee** | Phuong ly Dinh |
| **Sprint** | — |
| **Ưu tiên** | P0 |
| **Hạn hoàn thành** | 2026-10-02 |
| **Cập nhật** | 23:31:00 2/10/2026 |
| **Notion** | [Mở trang](https://app.notion.com/p/HF-03-Vi-t-c-t-SRS-lu-ng-Auth-Onboarding-55d1d47124604474889ca0466f4a2bd2) |

---

@Phuong ly Dinh

# Mục tiêu
Viết đặc tả chức năng chi tiết cho luồng đăng nhập, onboarding và phê duyệt tài khoản thí sinh.

## Checklist thực hiện
- Tạo trang/thư mục SRS — Sprint 1 & 2 và phân khu SRS cho luồng Auth & Onboarding.
- Mô tả điều kiện email Whitelist, GitHub OAuth 2.0, tạo User mới và approval_status = PENDING.
- Đặc tả form hồ sơ sinh viên: họ tên, MSSV, trường/viện, số điện thoại và kỹ năng chính.
- Mô tả luồng BTC duyệt thành APPROVED, từ chối REJECTED, và quyền API tương ứng.
- Ghi happy path, lỗi OAuth/token/phiên hết hạn, email ngoài whitelist, dữ liệu hồ sơ thiếu và truy cập trái phép 403.
- Vẽ flowchart bằng Mermaid hoặc Draw.io; nêu input, output, trạng thái và mã lỗi chuẩn.

## Definition of Done
SRS có đủ actor, precondition, input/output, happy path, exception/error path, trạng thái và flowchart; nội dung thống nhất với Bước 3–4.

## Quy ước bàn giao
- Cập nhật trạng thái In Review khi đã có sản phẩm và link bàn giao.
- Chỉ chuyển Done sau khi PM kiểm tra DoD và nghiệm thu.

## Sản phẩm bàn giao

  # SRS — Sprint 1 & 2: Auth & Onboarding

  ## @Lê Tiến Minh  kiểm tra hộ t với
  1.Tác nhân:
  - Thí sinh: người tham gia cuộc thi, đăng nhập qua GitHub, hoàn thiện Onboarding nếu cần và được cấp quyền theo approval_status.
  - Ban tổ chức: Người quản lý whitelist, duyệt/từ chối tài khoản thí sinh và cấp quyền chính thức.
  - GitHub OAuth Provider: Hệ thống xác thực cung cấp Access Token và email đã được xác minh.
  - HackFlow System / Backend API: Hệ thống xử lý logic xác thực, đối chiếu whitelist, validate dữ liệu profile và phân quyền API.
  1. Tác nhân và quyền chính:

  1. Phạm vi và nguyên tắc nghiệp vụ:
  3.1. Phạm vi:
  - Đăng nhập thí sinh bằng GitHub OAuth 2.0.
  - Đăng nhập nội bộ bằng Email/Password cho Ban tổ chức, Giám khảo và Mentor.
  - Kiểm tra email GitHub với danh sách Whitelist.
  - BTC pre-import Whitelist từ kết quả chọn lọc.
  - Tạo tài khoản thí sinh mới với trạng thái APPROVED nếu email có trong Whitelist hoặc PENDING nếu email chưa có trong Whitelist.
  - Onboarding hồ sơ sinh viên.
  - Ban tổ chức xem, duyệt hoặc từ chối hồ sơ.
  - Phân quyền theo role và approval_status.
  - Quản lý phiên đăng nhập, logout và các lỗi xác thực.
  - Tạo bản ghi Audit log cho các quyết định duyệt/từ chối và thay đổi Whitelist.
  3.2. Quyết định nghiệp vụ áp dụng:
  1. Thí sinh đăng nhập bằng GitHub OAuth; tài khoản vận hành nội bộ đăng nhập bằng Email/Password.
  1. BTC có thể pre-import danh sách email đủ điều kiện vào Whitelist bằng endpoint quản trị trước khi cuộc thi bắt đầu.
  1. Khi thí sinh đăng nhập GitHub lần đầu:
    - Email có trong Whitelist và đang active → tạo user với approval_status = APPROVED và được vào hệ thống ngay.
    - Email chưa có trong Whitelist → tạo user với approval_status = PENDING để chờ BTC duyệt thủ công.
  1. Tài khoản PENDING phải hoàn thành hồ sơ nhưng chưa được tạo hoặc tham gia đội.
  1. Chỉ tài khoản APPROVED mới được sử dụng chức năng đội thi và các chức năng MVP tiếp theo.
  1. Tài khoản REJECTED bị khóa chức năng đội thi; giao diện phải hiển thị lý do từ chối.
  1. Mọi quyết định duyệt/từ chối phải lưu người thao tác, thời điểm và lý do trong Audit Log. Khi BTC approve tài khoản PENDING, hệ thống chuyển approval_status sang APPROVED và tự động thêm email vào Whitelist nếu email chưa tồn tại.
  1. Trạng thái tài khoản:
  - PENDING: Đang chờ BTC duyệt-> được xem/cập nhật onboarding, không được tạo/ tham gia đội
  - APPROVED: Được BTC phê duyệt-> Được sử dụng các chức năng tương ứng role
  - REJECTED: Không được BTC phê duyệt-> Không được thực hiện các chức năng, được biết lý do từ chối
  4.1. Chuyển đổi trạng thái:
  ```
flowchart TD
    A[Thí sinh đăng nhập GitHub] --> B{Email có trong Whitelist active?}
    B -- Có --> C[Tạo hoặc cập nhật user: APPROVED]
    B -- Không --> D[Tạo user: PENDING]
    C --> E[Được truy cập hệ thống theo role]
    D --> F[Hoàn thành/cập nhật Onboarding]
    F --> G{BTC xét duyệt}
    G -- Approve --> H[APPROVED + tự động thêm email vào Whitelist]
    G -- Reject --> I[REJECTED + lưu lý do]
    H --> E
    I --> J[Khóa chức năng đội thi]
  ```
  5.1 — Bắt đầu GitHub OAuth cho thí sinh:
  - Bấm nút để đăng nhập bằng tài khoản GitHub có sẵn.
  - Khi bạn chọn, ứng dụng sẽ báo cho hệ thống bên trong xử lý.
  - Tự động tạo mã xác nhận tạm để chống giả mạo trước khi chuyển bạn sang GitHub.
  - Thông tin yêu cầu: tên tài khoản và email.
  5.2 — Xử lý callback OAuth:
  - Hệ thống bên trong nhận thông tin phản hồi gửi về từ GitHub.
  - Xác nhận mã an toàn là đúng, chưa được sử dụng và còn thời hạn.
  - Dùng mã vừa nhận để lấy access token vào hệ thống từ GitHub.
  - Yêu cầu GitHub cung cấp mã người dùng, tên tài khoản và email đã xác minh.
  - Xóa toàn bộ khoảng trắng thừa và chuyển tất cả chữ cái thành chữ viết thường.
  - Không cho phép truy cập nếu bất kỳ mã hoặc thông tin nào không hợp lệ.
  5.3 — Kiểm tra Whitelist
  - BTC có thể pre-import hoặc cập nhật Whitelist bằng chức năng quản trị; mọi thao tác thêm, sửa, xóa hoặc import đều phải lưu Audit Log.
  - Email có trong Whitelist và đang ở trạng thái active được cấp quyền đăng nhập với approval_status = APPROVED.
  - Email chưa có trong Whitelist vẫn được tạo tài khoản với approval_status = PENDING để hoàn thành hồ sơ và chờ BTC duyệt thủ công.
  - Khi BTC approve tài khoản PENDING, hệ thống chuyển sang APPROVED và tự động thêm email vào Whitelist nếu chưa tồn tại.
  - Thông báo lỗi phải rõ ràng nhưng tuyệt đối không làm lộ các email khác trong Whitelist.
  5.4 — Tạo user lần đầu
  Khi email hợp lệ nhưng chưa có tài khoản:
  1. Tạo user mới nếu github_id hoặc email chưa tồn tại.
  1. Gán role = CANDIDATE.
  1. Nếu email có trong Whitelist active, gán approval_status = APPROVED; nếu email chưa có trong Whitelist, gán approval_status = PENDING.
  1. Lưu github_id và email đã xác minh.
  1. User APPROVED được cấp quyền truy cập hệ thống theo role; user PENDING chỉ được truy cập giới hạn để hoàn thành onboarding và chờ duyệt.
  1. Tạo phiên đăng nhập hợp lệ với phạm vi quyền tương ứng.
  1. Chuyển hướng user APPROVED đến dashboard; chuyển hướng user PENDING đến onboarding hoặc màn hình chờ duyệt.
  1. Khi BTC approve user PENDING, chuyển approval_status sang APPROVED và tự động thêm email vào Whitelist nếu chưa tồn tại.
    - — Đăng nhập các lần sau
  - User PENDING: chuyển người dùng tới màn hình chờ duyệt.
  - User APPROVED: chuyển người dùng đến trang làm việc tương ứng với role.
  - User REJECTED: hiển thị màn hình bị từ chối và lý do (nếu có).
  - Không tạo tài khoản mới nếu mã GitHub hoặc email đã có sẵn trên hệ thống.
    - — Đăng nhập nội bộ
  - BTC, Giám khảo và Mentor đăng nhập bằng email/password đã được cấp.
  - Mật khẩu phải được mã hóa an toàn, tuyệt đối không lưu ở dạng chữ rõ nguyên bản.
  - Kiểm tra role trước khi cấp quyền vào khu vực vận hành.
  - Sai thông tin đăng nhập không được tiết lộ email có tồn tại hay không.
  5.7 — Phiên đăng nhập và logout
  - Mã đăng nhập phải chứa ít nhất mã người dùng, vai trò, trạng thái duyệt, thời điểm tạo và thời hạn sử dụng.
  - Hệ thống phải xác nhận độ tin cậy, thời hạn và thông tin người dùng trước khi cho phép truy cập.
  - Hệ thống từ chối truy cập, ứng dụng sẽ hủy trạng thái đăng nhập và đưa bạn về màn hình đăng nhập.
  - Xóa thông tin đăng nhập trên thiết bị người dùng, đồng thời hủy bỏ mã gia hạn trên hệ thống (nếu có).
  - Không cung cấp bất kỳ thông tin bảo mật nào nếu trạng thái đăng nhập không hợp lệ.
  5.8 — Hiển thị form Onboarding
  Form gồm các trường:

  - Frontend hiển thị thông tin email GitHub ở chế độ chỉ đọc.
  - User chỉ được cập nhật hồ sơ của chính mình.
  - Lỗi validation phải hiển thị cạnh trường sai.
    - — Gửi hồ sơ
  - User đã đăng nhập và ở trạng thái PENDING mới được gửi hồ sơ onboarding để BTC xét duyệt; user APPROVED chỉ cập nhật hồ sơ theo quyền được cấp.
  - Hệ thống bên trong phải tự kiểm tra lại toàn bộ dữ liệu, không tin tưởng hoàn toàn vào kết quả kiểm tra từ giao diện người dùng.
  - Lưu hồ sơ và chuyển/giữ approval_status = PENDING.
  - Hiển thị thông báo: Hồ sơ đã được gửi và đang chờ BTC phê duyệt.
  - Không cho phép tạo hoặc tham gia đội ngay sau khi gửi hồ sơ.
    - — Cập nhật hồ sơ đang chờ duyệt
  - Tài khoản người dùng ở trạng thái PENDING được xem hồ sơ hiện tại.
  - Người dùng được sửa các trường được phép trước khi BTC duyệt.
  - Mỗi lần cập nhật phải ghi updated_at.
  - Nếu hồ sơ thiếu trường bắt buộc, không cho submit và không thay đổi dữ liệu hợp lệ trước đó.
  - — Danh sách hồ sơ chờ duyệt
  - BTC xem được danh sách tài khoản trạng thái
  - Có thể lọc theo thời gian gửi, tên, MSSV hoặc email.
  - Danh sách hiển thị tối thiểu: họ tên, MSSV, trường, email GitHub, thời điểm gửi và trạng thái.
    - — Duyệt hồ sơ
  - BTC mở chi tiết hồ sơ và bấm Approve.
  - Hệ thống kiểm tra hồ sơ vẫn ở PENDING trước khi cập nhật.
  - Chuyển trạng thái sang APPROVED.
  - Ghi Audit Log gồm user được duyệt, người duyệt, thời điểm.
    - — Từ chối hồ sơ
  - BTC bấm Reject và bắt buộc nhập lý do.
  - Lý do phải được lưu cùng quyết định.
  - Chuyển trạng thái sang REJECTED.
  - Ghi Audit Log.
  - User nhìn thấy trạng thái và lý do; không được tạo/tham gia đội.
    - — Kiểm tra RBAC và approval status
  - Kiểm tra quyền hạn ở cả giao diện bên ngoài lẫn hệ thống xử lý bên trong.
  - Tài khoản đang chờ hoặc bị từ chối sẽ bị ngăn lại nếu cố truy cập vào tính năng đội nhóm.
  - Người dùng không thể tự thay đổi vai trò hay trạng thái xét duyệt từ thiết bị của mình.
  - Cố tình truy cập khu vực quản lý khi chưa được phép sẽ bị chặn ngay và lưu lại nhật ký cảnh báo.
  1. Use case chính:
  6.1 — Thí sinh đăng nhập lần đầu
  - Người thực hiện: Thí sinh
  - Điều kiện ban đầu: Email GitHub hợp lệ; hệ thống kết nối GitHub hoạt động bình thường; email có thể đã có hoặc chưa có trong Whitelist.
  + Thí sinh truy cập vào màn hình đăng nhập.
  + Bấm chọn đăng nhập bằng tài khoản GitHub.
  + GitHub kiểm tra tài khoản và gửi phản hồi lại cho hệ thống.
  + Hệ thống bên trong xác minh các mã an toàn và đối chiếu địa chỉ email với Whitelist.
  + Nếu email có trong Whitelist active, tạo hoặc khôi phục user với approval_status = APPROVED và cho phép truy cập theo role.
  + Nếu email chưa có trong Whitelist, tạo user với approval_status = PENDING và chỉ cấp phạm vi truy cập giới hạn.
  + User PENDING được đưa đến Onboarding; user APPROVED được đưa đến dashboard tương ứng.
  - > User được tạo hoặc khôi phục đúng một lần, không tạo duplicate theo github_id/email.
  6.2 — Email không nằm trong Whitelist
  - Người dùng đăng nhập bằng tài khoản GitHub thành công.
  - Hệ thống bên trong chuẩn hóa và đối chiếu địa chỉ email với Whitelist.
  - Vì email chưa có trong Whitelist, user được tạo với approval_status = PENDING.
  - User được chuyển đến Onboarding để hoàn thiện hồ sơ và chưa được dùng chức năng đội thi.
  - Màn hình hiển thị trạng thái chờ duyệt; không làm lộ danh sách Whitelist hoặc email của người khác.
  - — Gửi hồ sơ onboarding
  - Tài khoản người dùng trạng thái PENDING mở giao diện.
  - Nhập họ tên, MSSV, trường/viện, số điện thoại, kỹ năng.
  - Giao diện bên ngoài kiểm tra dữ liệu, sau đó hệ thống bên trong kiểm tra lại một lần nữa rồi mới lưu hồ sơ.
  - Hệ thống vẫn giữ trạng thái PENDING.
  - Hiển thị thông báo chờ duyệt.
  6.4 — BTC duyệt hồ sơ
  - Ban tổ chức đăng nhập vào tài khoản quản lý.
  - Mở danh sách các hồ sơ đang chờ duyệt.
  - Xem đầy đủ thông tin của hồ sơ.
  - Chọn duyệt hồ sơ.
  - Hệ thống bên trong xác minh lại tình trạng hồ sơ hiện tại.
  - Chuyển trạng thái từ "chờ duyệt" sang "đã duyệt" trong một bước xử lý duy nhất.
  - Ghi lại thao tác vừa thực hiện vào nhật ký hệ thống.
  1. API contract đề xuất:

  7.1. Ví dụ request cập nhật hồ sơ
  {
  "full_name": "Nguyen Van A",
  "student_id": "20240001",
  "school": "Truong Dai hoc ABC",
  "phone": "0900000000",
  "skills": ["Python", "React"]
  }
  7.2. Ví dụ response thành công
  {
  "success": true,
  "data": {
  "user_id": "uuid",
  "email": "student@example.edu",
  "role": "CANDIDATE",
  "approval_status": "PENDING",
  "profile_completed": true
  },
  "message": "Ho so da duoc gui va dang cho phe duyet",
  "error_code": null
  }
  7.3. Chuẩn API Envelope cho lỗi
  {
  "success": false,
  "data": null,
  "message": "Email chua duoc phe duyet",
  "error_code": "ACCOUNT_NOT_APPROVED"
  }
  7.4. Ví dụ approve/reject
  Approve:
  {
  "note": "Ho so hop le"
  }
  Reject:
  {
  "reason": "MSSV chua khop voi danh sach dang ky"
  }
  1. Mã lỗi chuẩn:

---
*Kéo từ Notion lúc 01:09:53 4/10/2026 bởi notion-module*
