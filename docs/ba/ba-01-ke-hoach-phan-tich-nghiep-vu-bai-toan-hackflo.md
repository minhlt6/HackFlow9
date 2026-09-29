---
id: "BA-01"
title: "Kế hoạch Phân tích Nghiệp vụ & Bài toán HackFlow (Sprint 0)"
status: "Done"
assignee: "Đinh Phương Ly"
priority: "P1"
deadline: "2026-09-26"
notion_url: "https://app.notion.com/p/BA-01-K-ho-ch-Ph-n-t-ch-Nghi-p-v-B-i-to-n-HackFlow-Sprint-0-3c275aae392744c0be6f759b7ebef88f"
pulled_at: "29/09/2026"
---

# BA-01 — Kế hoạch Phân tích Nghiệp vụ & Bài toán HackFlow

| | |
|---|---|
| **Phụ trách** | Đinh Phương Ly |
| **Sprint** | Sprint 0 |
| **Ưu tiên** | P1 |
| **Deadline** | 26/09/2026 |
| **Trạng thái** | ✅ Done |
| **Notion** | [Mở trang gốc](https://app.notion.com/p/BA-01-K-ho-ch-Ph-n-t-ch-Nghi-p-v-B-i-to-n-HackFlow-Sprint-0-3c275aae392744c0be6f759b7ebef88f) |

---

## 1. Mục tiêu

Xây dựng nền tảng nghiệp vụ đủ rõ để nhóm kỹ thuật **không code sai luồng** và có thể bắt đầu thiết kế, phát triển từ Sprint 1.

**Đầu ra gồm:**
- Báo cáo thị trường & đối thủ
- Personas & User Flow
- Bảng User Stories & Acceptance Criteria
- Biên bản review 1-1 với PM

---

## 2. User Stories

### Quy ước mức độ ưu tiên
- **P0** — Bắt buộc cho MVP/Core
- **P1** — Mở rộng Sprint 2

> Quyền truy cập phải được kiểm tra ở cả giao diện (UI) và Backend/API.  
> Người dùng chỉ xem hoặc thao tác trong phạm vi vai trò được cấp.

### 2.1 Nhóm A — Đăng nhập & quyền truy cập

| ID | User Story | Vai trò | Ưu tiên | Phạm vi |
|----|-----------|---------|---------|---------|
| **US-01** | Đăng nhập bằng email hợp lệ và được phân quyền, để truy cập đúng chức năng | Thí sinh | P0 | MVP Core |

### 2.2 Nhóm B — Luồng thí sinh & đội thi

| ID | User Story | Vai trò | Ưu tiên | Phạm vi |
|----|-----------|---------|---------|---------|
| **US-02** | Xem thông tin cuộc thi, đề bài, thể lệ, checkpoint và deadline | Thí sinh | P0 | MVP Core |
| **US-03** | Tạo đội hoặc tham gia đội bằng mã mời, cùng đồng đội tham gia đúng quy chế | Thí sinh | P0 | MVP Core |
| **US-04** | Chọn một đề tài/bài toán phù hợp để xác định hướng thực hiện bài thi | Thí sinh | P0 | MVP Core |
| **US-05** | Nộp bài theo từng checkpoint, hệ thống ghi nhận sản phẩm đúng hạn | Thí sinh | P0 | MVP Core |
| **US-06** | Xem lịch sử nộp bài, trạng thái, lỗi và kết quả | Thí sinh | P0 | MVP Core |
| **US-07** | Gửi câu hỏi hỗ trợ, nhận hướng dẫn khi gặp vấn đề | Thí sinh | P1 | Sprint 2 |
| **US-08** | Gửi yêu cầu thay đổi thông tin/email đăng nhập | Thí sinh | P1 | Sprint 2 |

### 2.3 Nhóm C — Luồng ban tổ chức

| ID | User Story | Vai trò | Ưu tiên | Phạm vi |
|----|-----------|---------|---------|---------|
| **US-09** | Tạo và cấu hình cuộc thi, vận hành thống nhất | Ban tổ chức | P0 | MVP Core |
| **US-10** | Quản lý hồ sơ và đội thi, kiểm tra điều kiện tham gia | Ban tổ chức | P0 | MVP Core |
| **US-11** | Theo dõi checkpoint, lưu lượng bài nộp và sự cố | Ban tổ chức | P0 | MVP Core |
| **US-12** | Quản lý Whitelist email thí sinh đủ điều kiện | Ban tổ chức | P0 | MVP Core |
| **US-13** | Duyệt yêu cầu thay đổi tài khoản/email của thí sinh | Ban tổ chức | P0 | MVP Core |
| **US-14** | Phân công đội cho giám khảo và ticket cho mentor | Ban tổ chức | P1 | Sprint 2 |
| **US-15** | Tổng hợp và công bố kết quả cuộc thi | Ban tổ chức | P1 | Sprint 2 |

### 2.4 Nhóm D — Luồng ban giám khảo

| ID | User Story | Vai trò | Ưu tiên | Phạm vi |
|----|-----------|---------|---------|---------|
| **US-16** | Xem đội và bài nộp được phân công, đánh giá đúng phạm vi | Ban giám khảo | P1 | Sprint 2 |
| **US-17** | Chấm điểm theo tiêu chí và lưu nhận xét | Ban giám khảo | P1 | Sprint 2 |
| **US-18** | Rà soát và xác nhận bảng điểm chính thức | Ban giám khảo | P1 | Sprint 2 |

### 2.5 Nhóm E — Luồng mentor

| ID | User Story | Vai trò | Ưu tiên | Phạm vi |
|----|-----------|---------|---------|---------|
| **US-19** | Xem ticket được giao và tiến độ đội trong phạm vi phụ trách | Mentor | P1 | Sprint 2 |
| **US-20** | Phân loại, trả lời, chuyển tiếp và đóng ticket | Mentor | P1 | Sprint 2 |

---

## 3. Acceptance Criteria

### US-01 — Đăng nhập & phân quyền

**Đầu vào:** Mã xác thực GitHub OAuth, email GitHub, Whitelist email, bảng ánh xạ quyền truy cập Backend.

| AC | Kịch bản | Given | When | Then |
|----|---------|-------|------|------|
| AC-01.1 | Đăng nhập lần đầu thành công | Email GitHub nằm trong Whitelist | Người dùng bấm "Đăng nhập bằng GitHub" và cấp quyền | Hệ thống định danh, gán role, tạo phiên và chuyển hướng đến màn hình Onboarding |
| AC-01.2 | Đăng nhập từ lần 2 trở đi | Đã hoàn tất Onboarding, email trong Whitelist | Người dùng đăng nhập lại | Xác thực thành công, khôi phục phiên đúng vai trò, chuyển thẳng đến màn hình chức năng (bỏ qua Onboarding) |
| AC-01.3 | Email không trong Whitelist | Xác thực GitHub thành công nhưng email không có trong Whitelist | Hệ thống đối chiếu email với CSDL | Từ chối phiên, thông báo lỗi "chưa được cấp quyền", hướng dẫn liên hệ BTC/Mentor |
| AC-01.4 | Lỗi xác thực / phiên hết hạn | Token GitHub lỗi hoặc phiên đã hết hạn | Người dùng truy cập hoặc gọi API bảo mật | Không hiển thị dữ liệu bảo mật, trả mã lỗi xác thực, bắt buộc đăng nhập lại |
| AC-01.5 | Truy cập trái phép | Đã đăng nhập với vai trò thí sinh | Người dùng cố gọi API hoặc truy cập giao diện vai trò khác | RBAC từ chối ở cả UI lẫn Backend, trả 403 FORBIDDEN, ghi log |

---

### US-02 — Xem thông tin cuộc thi

**Đầu vào:** Cuộc thi đang tham gia, đề bài, thể lệ, checkpoint, thời gian, deadline.

- **AC-02.1** Hiển thị đầy đủ tên, trạng thái, thể lệ, đề bài, checkpoint và deadline khi cuộc thi đã công bố.
- **AC-02.2** Trạng thái thời gian rõ ràng: đang mở / sắp mở / đã đóng.
- **AC-02.3** Khi chưa công bố hoặc dữ liệu lỗi → hiển thị trạng thái "chưa sẵn sàng", không màn hình trống.

---

### US-03 — Tạo hoặc tham gia đội

**Đầu vào:** Tên đội, mã mời, danh sách thành viên, cuộc thi, giới hạn số lượng thành viên.

- **AC-03.1** `approval_status = PENDING` → chặn tạo/tham gia đội, hiển thị thông báo chờ BTC duyệt.
- **AC-03.2** `approval_status = APPROVED` + tên đội hợp lệ + chưa thuộc đội khác → tạo đội, gán Đội trưởng, sinh mã mời duy nhất.
- **AC-03.3** Mã mời còn hiệu lực + đội chưa đủ số lượng + chưa thuộc đội khác → tham gia thành công.
- **AC-03.4** Mã sai/hết hạn, đã thuộc đội khác, vượt giới hạn → từ chối, dữ liệu cũ không thay đổi.
- **AC-03.5** Đủ thành viên theo quy chế → đội tự động được đánh dấu hợp lệ.
- **AC-03.6** `approval_status = REJECTED` → khóa toàn bộ tính năng đội thi, hiển thị lý do từ chối.

---

### US-04 — Chọn đề tài/bài toán

**Đầu vào:** Đội hợp lệ, danh sách đề tài đang mở, lựa chọn của đội.

- **AC-04.1** Đội hợp lệ + trong thời gian cho phép → chọn được, hiển thị cho mọi thành viên.
- **AC-04.2** Đề tài đã bị giữ theo quy tắc → từ chối, yêu cầu chọn đề tài khác.
- **AC-04.3** Hết hạn chọn / cuộc thi chưa mở → khóa thao tác, hiển thị thời điểm được phép.

---

### US-05 — Nộp bài theo checkpoint

**Đầu vào:** Đội nộp bài, checkpoint, `repo_url` (GitHub public), `demo_url`, thời điểm nộp.

| AC | Kịch bản | Mô tả |
|----|---------|-------|
| AC-05.1 | Kiểm tra trước khi nhận | Gọi GitHub REST API kiểm tra tồn tại & quyền truy cập repo. Nếu private/không tồn tại → trả `GITHUB_REPO_INACCESSIBLE`, không tạo bản ghi. |
| AC-05.2 | Nộp thành công | `server_timestamp < deadline` + repo hợp lệ → Backend gọi GitHub lấy commit SHA, lưu vào `submissions`, trả về commit SHA đã đóng băng. |
| AC-05.3 | Nộp quá hạn | `server_timestamp > deadline` → từ chối, trả `DEADLINE_EXCEEDED`, không tạo/sửa bản ghi. |
| AC-05.4 | Lỗi hệ thống | Lỗi mạng/API GitHub → không tạo bản ghi hợp lệ, hiển thị nguyên nhân, cho phép thử lại nếu còn hạn. |
| AC-05.5 | Chống nộp trùng | Nhiều request đồng thời → khóa tạm thời / nhận diện trùng → chỉ tạo 1 bản ghi duy nhất. |
| AC-05.6 | Gia hạn có kiểm soát | Sau deadline, Admin/BTC cấp quyền gia hạn → hệ thống mở lại cửa sổ nộp có thời hạn và ghi log. |

---

### US-06 — Xem lịch sử & kết quả bài nộp

- **AC-06.1** Thành viên đội xem các lần nộp của đội mình theo checkpoint, sắp xếp thời gian, trạng thái rõ ràng.
- **AC-06.2** Bài nộp thất bại → hiển thị lý do để sửa và thử lại (nếu còn hạn).
- **AC-06.3** Không xem được bài nộp, điểm, dữ liệu nội bộ của đội khác.

---

### US-07 — Gửi câu hỏi hỗ trợ (ticket)

- **AC-07.1** Tiêu đề/nội dung hợp lệ → tạo ticket với mã duy nhất, người gửi, thời điểm, trạng thái "Mới".
- **AC-07.2** Thiếu nội dung bắt buộc → không tạo ticket, highlight trường cần sửa.
- **AC-07.3** Thí sinh chỉ xem ticket của mình/đội mình.

---

### US-08 — Gửi yêu cầu thay đổi thông tin/email đăng nhập

**Đầu vào:** Thí sinh đã đăng nhập, thông tin/email mới cần thay đổi, lý do, minh chứng đính kèm.

- **AC-08.1** Thí sinh gửi form yêu cầu cập nhật thông tin/email với đầy đủ lý do hợp lệ.
- **AC-08.2** Hệ thống tiếp nhận, tạo yêu cầu ở trạng thái `PENDING` và gửi thông báo tới Ban tổ chức.
- **AC-08.3** Thí sinh theo dõi trạng thái yêu cầu (`PENDING`, `APPROVED`, `REJECTED`) trên giao diện cá nhân.

---

### US-09 — Tạo & cấu hình cuộc thi

- **AC-09.1** Lưu bản nháp khi đủ trường tối thiểu (bản nháp chưa cho thí sinh tham gia).
- **AC-09.2** Công bố khi đủ trường bắt buộc + thời gian hợp lệ → ghi nhận người & thời điểm công bố.
- **AC-09.3** Từ chối thời gian kết thúc < thời gian bắt đầu, checkpoint ngoài khung cuộc thi.
- **AC-09.4** Sau khi có đội/bài nộp → khóa hoặc yêu cầu xác nhận cao hơn khi sửa trường ảnh hưởng tính toàn vẹn dữ liệu.

---

### US-10 — Quản lý hồ sơ & đội thi

- **AC-10.1** Thêm/xóa/cập nhật Whitelist email và danh sách thí sinh.
- **AC-10.2** Lọc đội theo trạng thái, đề tài, đăng ký; hiển thị lý do đội chưa hợp lệ.
- **AC-10.3** Chỉ người có quyền thay đổi thành viên; kiểm tra trùng đội, giới hạn số lượng, lưu lịch sử.
- **AC-10.4** Email sai định dạng hoặc thiếu trường bắt buộc → từ chối, nêu rõ dòng/trường lỗi.

---

### US-11 — Theo dõi checkpoint & sự cố

- **AC-11.1** Dashboard: số đội, bài nộp theo trạng thái/checkpoint, lỗi chính trong phạm vi cuộc thi.
- **AC-11.2** Lọc theo đội, checkpoint, trạng thái, khoảng thời gian; mở danh sách bản ghi từ chỉ số.
- **AC-11.3** Phát hiện lỗi/lưu lượng bất thường → ghi nhận sự cố, hiển thị cảnh báo cho BTC.
- **AC-11.4** Chỉ BTC xem dữ liệu giám sát tổng hợp và thông tin sự cố nội bộ.

---

### US-12 — Quản lý Whitelist email thí sinh đủ điều kiện

**Đầu vào:** File danh sách email (CSV/Excel) hoặc nhập email đơn lẻ từ Ban tổ chức.

- **AC-12.1** BTC import danh sách email Whitelist từ file CSV/Excel hoặc nhập trực tiếp từng email.
- **AC-12.2** Hệ thống tự động kiểm tra trùng lặp email, chuẩn hóa định dạng chữ thường và loại bỏ khoảng trắng.
- **AC-12.3** Tra cứu, thêm mới hoặc xóa email khỏi Whitelist theo thời gian thực.
- **AC-12.4** Ghi log lịch sử thay đổi danh sách Whitelist (người thực hiện, thời điểm, nội dung thay đổi).

---

### US-13 — Duyệt yêu cầu thay đổi tài khoản/email của thí sinh

**Đầu vào:** Danh sách yêu cầu thay đổi thông tin/email từ thí sinh (`status = PENDING`).

- **AC-13.1** BTC xem danh sách các yêu cầu thay đổi tài khoản/email đang chờ duyệt kèm lý do và minh chứng.
- **AC-13.2** BTC phê duyệt (`APPROVED`) → hệ thống tự động cập nhật email/thông tin tài khoản và đồng bộ Whitelist.
- **AC-13.3** BTC từ chối (`REJECTED`) → bắt buộc nhập lý do từ chối và gửi thông báo phản hồi cho thí sinh.

---

### US-14 — Phân công giám khảo & mentor

**Đầu vào:** Danh sách giám khảo/mentor, đội, ticket, quy tắc phân công.

| AC | Kịch bản | Given | When | Then |
|----|---------|-------|------|------|
| AC-14.1 | Phân công thành công | Đội hợp lệ, giám khảo có sẵn | BTC xác nhận phân công | Ghi nhận, cập nhật danh sách phụ trách, người được gán thấy ngay dữ liệu |
| AC-14.2 | Giới hạn phạm vi | Giám khảo/Mentor đã đăng nhập | Cố truy cập dữ liệu ngoài danh sách được giao | Chặn, trả lỗi bảo mật, không hiển thị thông tin ngoài phạm vi |
| AC-14.3 | Phân công sai vai trò | BTC gán việc cho tài khoản sai vai trò | Hệ thống kiểm tra trước khi lưu | Từ chối, thông báo lỗi, giữ nguyên trạng thái cũ |
| AC-14.4 | Lưu lịch sử | BTC thực hiện phân công mới hoặc điều chuyển | Hệ thống hoàn tất thao tác | Lưu đầy đủ: lịch sử thay đổi, thời điểm, danh tính người thao tác |

---

### US-15 — Tổng hợp & công bố kết quả

- **AC-15.1** Gom điểm theo cấu hình, kiểm tra đủ điều kiện, chỉ cho phép chuyển bước tiếp khi không còn lỗi nghiêm trọng.
- **AC-15.2** Tính điểm trung bình, gắn cờ cảnh báo điểm lệch vượt ngưỡng, xử lý đồng điểm theo tiêu chí phụ.
- **AC-15.3** Trạng thái `DRAFT → PUBLISHED`: BTC rà soát xong → xác nhận → kích hoạt hiển thị công khai đúng phạm vi.
- **AC-15.4** Ghi nhận người công bố, thời điểm, mã phiên bản; sau công bố khóa cứng dữ liệu, không cho sửa trực tiếp.
- **AC-15.5** Xuất file Excel đầy đủ điểm thành phần, tổng kết, thứ hạng.

---

### US-16 — Giám khảo xem đội & bài nộp

- **AC-16.1** Chỉ thấy đội/bài nộp được phân công và trạng thái xử lý cá nhân.
- **AC-16.2** Chế độ ẩn danh: che tên đội, tên thành viên, tên trường — chỉ hiển thị mã định danh ẩn danh.
- **AC-16.3** Giao diện chia đôi màn hình: bên trái demo URL của thí sinh, bên phải bảng tiêu chí chấm điểm.
- **AC-16.4** Chưa được phân công → danh sách rỗng kèm thông báo.

---

### US-17 — Chấm điểm theo tiêu chí

- **AC-17.1** Chỉ nhập điểm trong khoảng cho phép của từng tiêu chí; hiển thị tổng điểm tạm tính.
- **AC-17.2** Thiếu tiêu chí bắt buộc → không cho lưu hoàn tất, chỉ rõ tiêu chí còn thiếu.
- **AC-17.3** Lưu bản nháp, tiếp tục chỉnh sửa trong thời gian được phép; lịch sử chỉnh sửa được ghi nhận.
- **AC-17.4** Không xem điểm/nhận xét của người chấm khác (nếu chưa được phép), không sửa bài nộp thí sinh.

---

### US-18 — Xác nhận bảng điểm

- **AC-18.1** Đủ tiêu chí + dữ liệu hợp lệ → xem bản tổng hợp, xác nhận → trạng thái "Đã xác nhận".
- **AC-18.2** Còn thiếu tiêu chí / điểm ngoài phạm vi → không cho xác nhận, nêu rõ nguyên nhân.
- **AC-18.3** Sau xác nhận → bảng điểm không thể sửa trực tiếp; nếu cần phải qua quy trình mở khóa có lưu lịch sử.

---

### US-19 — Mentor xem ticket & tiến độ đội

- **AC-19.1** Xem ticket được giao: mã, tiêu đề, loại vấn đề, ưu tiên, trạng thái, thời điểm cập nhật.
- **AC-19.2** Vòng đời ticket: `open → in_progress → resolved`.
- **AC-19.3** Chỉ xem trạng thái checkpoint/tiến độ chung của đội được cấp quyền.
- **AC-19.4** Lọc ticket theo trạng thái, loại vấn đề, ưu tiên, đội.
- **AC-19.5** Mentor **tuyệt đối không** được xem bài nộp, repo link, điểm số. Cố truy cập → 403 ngay lập tức.

---

### US-20 — Mentor xử lý ticket

- **AC-20.1** Gửi phản hồi → lưu người gửi, thời điểm, cập nhật trạng thái "Đã trả lời"/"Đang xử lý".
- **AC-20.2** Phải có loại vấn đề và mức độ ưu tiên hợp lệ trước khi đóng/chuyển tiếp.
- **AC-20.3** Vượt thẩm quyền → chuyển cho BTC kèm lý do, người nhận, trạng thái "Đã chuyển".
- **AC-20.4** Chỉ người có quyền mới đóng ticket; lịch sử trao đổi vẫn được giữ sau khi đóng.
- **AC-20.5** Lưu thất bại → báo lỗi, không tạo bản ghi, giữ nội dung người dùng đã nhập.

---

## 4. Ma trận ưu tiên

| Nhóm | P0 — MVP Core | P1 — Sprint 2 |
|------|--------------|--------------|
| **Đăng nhập** | US-01 | |
| **Thí sinh** | US-02, US-03, US-04, US-05, US-06 | US-07, US-08 |
| **Ban tổ chức** | US-09, US-10, US-11, US-12, US-13 | US-14, US-15 |
| **Ban giám khảo** | | US-16, US-17, US-18 |
| **Mentor** | | US-19, US-20 |

---

## 5. Sáu quyết định kỹ thuật đã chốt sau Review 1-1 với PM

1. **Phương thức đăng nhập:** Thí sinh bắt buộc dùng GitHub OAuth 2.0; Ban tổ chức (Admin), Ban Giám khảo (Judge) và Mentor dùng Email/Password nội bộ (mã hóa mật khẩu chuẩn SHA-256 + Salt, xác thực bằng JWT Bearer Token).
2. **Vòng đời tài khoản & Phê duyệt Onboarding:** Thí sinh đăng nhập lần đầu có trạng thái `PENDING`. Chỉ khi Ban tổ chức phê duyệt sang `APPROVED` mới được phép tạo đội, tham gia đội và nộp bài. Nếu bị `REJECTED`, hệ thống khóa toàn bộ chức năng và hiển thị lý do từ chối.
3. **Đóng băng bài nộp & cơ chế Commit SHA:** Khi thí sinh bấm nộp bài Checkpoint, Backend tự động gọi GitHub REST API để lấy chính xác HEAD Commit SHA tại thời điểm đó và lưu vào CSDL (`submissions`) kèm Server Timestamp UTC (`datetime.now(timezone.utc)`), ngăn chặn tuyệt đối việc chỉnh sửa code sau deadline.
4. **Deadline & cơ chế gia hạn có kiểm soát:** Hệ thống từ chối mọi bài nộp sau deadline (`server_timestamp > deadline`), trả về mã lỗi `400 DEADLINE_EXCEEDED`. Việc gia hạn chỉ do Ban tổ chức thực hiện thông qua việc mở lại cửa sổ nộp bài và bắt buộc lưu log kiểm toán (audit log) chi tiết.
5. **Khóa tranh chấp khi chọn đề tài (Concurrency Lock):** Áp dụng `SELECT FOR UPDATE` trong transaction PostgreSQL khi đội thi đăng ký đề tài để ngăn chặn race condition khi nhiều đội cùng tranh chấp slot cuối cùng của đề tài.
6. **Phân quyền và bảo mật dữ liệu (RBAC):** Ban Giám khảo chấm thi theo cơ chế Blind Judging (ẩn danh toàn bộ thông tin đội thi và thành viên). Mentor chỉ được phân công xem và xử lý Ticket hỗ trợ, tuyệt đối không được xem bài nộp, repo URL hay điểm số của thí sinh (trả về 403 FORBIDDEN nếu cố tình truy cập).

---

## 6. Tiêu chí hoàn thành (DoD)

- [x] Mỗi User Story có: vai trò, mục tiêu, lợi ích, ưu tiên, phạm vi
- [x] Mỗi Acceptance Criteria có: điều kiện thành công, dữ liệu đầu vào, trường hợp lỗi/biên
- [x] Các yêu cầu nhất quán với Personas/User Flow (Thí sinh, BTC, Giám khảo, Mentor)
- [x] Các điểm chưa đủ thông tin được ghi rõ ở mục 5

---

*Tài liệu được kéo từ Notion và định dạng lại ngày 29/09/2026.*  
*Phụ trách: Đinh Phương Ly · Review: Lê Tiến Minh (PM)*
