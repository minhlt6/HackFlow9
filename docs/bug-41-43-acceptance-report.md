# Báo cáo xác minh, sửa lỗi và nghiệm thu BUG-41–43

Ngày: 29/10/2026. Phạm vi: mã nguồn hiện tại, kiểm thử API/CSDL tách biệt và trình duyệt có API mô phỏng. Không triển khai Railway, không chỉnh dữ liệu nghiệp vụ đang sử dụng.

## 1. Kết luận xác minh

| Mã | Kết luận trước sửa | Phân loại |
| --- | --- | --- |
| BUG-41 | Với cấu hình 3–5, hàm hiện tại đã chia được 6 người thành 3–3, chưa tái hiện chính xác 5+1 như mô tả. Tuy nhiên thuật toán ưu tiên cỡ đội mong muốn, không tối đa số đội hợp lệ; ví dụ 9 người có thể thành 5+4 thay vì 3+3+3. Nhánh dư còn tạo được đội dưới tối thiểu. | Lỗi logic ghép đội so với yêu cầu mới; tình huống 5+1 có thể thuộc phiên bản/cấu hình khác, chưa xác nhận trên bản hiện tại. |
| BUG-42 | Dashboard đếm mọi ticket chưa resolved/closed, gồm cả ticket đang được xử lý; trang chi tiết chỉ đếm open chưa có người nhận. Dashboard còn coi bất kỳ người được gán nào cũng là “tôi phụ trách”. Lỗi tải API bị nuốt và có thể giữ dữ liệu cũ. | Lỗi logic thống kê và xử lý trạng thái FE, không phải tính năng. |
| BUG-43 | Dashboard đếm số dòng bài nộp, không kiểm tra kết quả xử lý; store ép `pending_sha_freeze`, `sha_verification_failed` và các trạng thái khác thành submitted. Trang checkpoint dùng trạng thái thật nên hai trang lệch nhau. | Lỗi ánh xạ dữ liệu và tính tiến độ FE, không phải lỗi CSDL tự tạo thêm chặng. |

Riêng **401 tại `/api/v1/tickets`**: kiểm thử cho thấy mentor có token hợp lệ nhận 200, không có token nhận 401 đúng thiết kế. Chưa có bằng chứng đủ để kết luận nguyên nhân token trong phiên được báo cáo. Không bỏ xác thực hay biến 401 thành dữ liệu thành công; FE nay hiển thị lỗi hoặc chuyển đăng nhập, không dùng hàng đợi cũ làm kết quả tải mới.

Trang quản trị ghép đội trong mã hiện tại là `/admin/teams`, khác đường dẫn `/teams` trong phiếu BUG-41.

## 2. Thay đổi thực hiện

### BUG-41 — Ghép đội

- Tính số đội mới tối đa `floor(số thí sinh / số thành viên tối thiểu)` và phân bổ cân bằng trong giới hạn SQL config. `target_team_size` được giữ tương thích request, không còn được ưu tiên hơn điều kiện tối đa số đội.
- Ví dụ 6 người, min=3/max=5 → 3+3; 9 → 3+3+3; 12 → 3+3+3+3. Với min=max=4 và 11 người → 4+4, còn 3 chờ ghép, không tạo đội 3 người.
- Giữ bước bổ sung đội hiện có khi `fill_incomplete_teams=true`: chỉ bổ sung đội có thể đạt tối thiểu, không sửa đội bị khóa/bị từ chối. Sau bước này mới tối đa số đội mới từ số người còn lại. Tùy chọn false không tự bổ sung người dư vào đội hiện có.
- Nếu chưa đủ người tạo đội, trả thông tin chờ ghép; không báo đã tạo thành công đội thiếu người. Trường hợp không còn thí sinh lẻ vẫn trả 400 với lý do cụ thể, đây là từ chối thao tác hợp lệ.
- Thêm `remaining_candidates_count` trong response và adapter FE; thông báo phân biệt có ghép được người và chưa có đội mới.
- Tự gán đề tài chỉ khi cả lĩnh vực và đề tài nhánh đang hoạt động/còn chỗ; cập nhật bộ đếm trong cùng transaction. Không còn gán vòng tròn vượt hạn mức. Nếu hết chỗ, đội vẫn được tạo hợp lệ nhưng chưa gán đề tài.
- Bổ sung khóa hàng khi lấy ứng viên, topic/subtopic trên DB hỗ trợ `FOR UPDATE`. Kiểm thử hiện tại dùng SQLite, chưa xác nhận cạnh tranh nhiều tiến trình trên PostgreSQL.
- Sửa nội dung hộp xác nhận để giải thích số đội tối đa, người còn chờ và điều kiện bổ sung đội.

### BUG-42 — Dashboard và hàng đợi mentor

- “Chờ tiếp nhận” chỉ gồm `status=open` và chưa có người được gán, cùng điều kiện với tab tương ứng trên trang ticket.
- “Tôi phụ trách” chỉ gồm ID người được gán trùng người đang đăng nhập. Đổi nhãn thành “Tickets Tôi Phụ Trách” và mô tả bao gồm toàn bộ trạng thái, phù hợp tab chi tiết.
- Dashboard đọc danh sách trực tiếp qua `ticketService`, không dùng số ticket cũ từ store sau lỗi. Không âm thầm bỏ qua lỗi nhận ticket rồi điều hướng như đã nhận thành công.
- `getAllTickets` dùng đúng `skip/limit` của BE, tải tiếp sau 100 bản ghi; kiểm tra response dạng mảng và từ chối trang trùng/không tiến triển. Store, Dashboard và trang ticket dùng cùng adapter.
- Trang ticket báo lỗi tải và xóa danh sách đang hiển thị khi request thất bại; xác thực hiện có vẫn xử lý token hết hạn.
- Thay tên lĩnh vực mẫu và nhãn “Đội thi thuộc lĩnh vực” trên Dashboard bằng nội dung phù hợp phạm vi hiện có; không ngụ ý đã có giới hạn mentor theo lĩnh vực mà BE chưa triển khai.

### BUG-43 — Tiến độ checkpoint

- Dashboard và `/checkpoints` cùng đọc `GET /checkpoints` với `latest_submission` theo đội đăng nhập, thay cho đếm tất cả bản ghi trong store.
- Dùng hàm chung `isCompletedSubmission`: submitted/evaluated/late được tính là đã hoàn tất nộp; pending SHA, chờ BTC xác minh SHA, invalid, trạng thái thiếu/không xác định không được tính. “Hoàn tất nộp” không có nghĩa đã chấm điểm.
- Tính theo từng checkpoint, không tăng số chặng vì lịch sử nộp lại. Ví dụ hai chặng đã nộp, một chưa mở, một chờ SHA → **2/4**, không phải 4/4.
- Giữ nguyên trạng thái BE khi ánh xạ `/submissions` vào store; mở rộng kiểu FE tương ứng các trạng thái thực tế.
- Dùng chung nhãn/badge trạng thái bài nộp. Không hiển thị “SHA:” rỗng; chỉ hiển thị hash nếu có. Trạng thái không xác định có badge trung tính, không ngầm coi là thành công.
- Dashboard hiển thị hạn nộp thực tế thay cho thời lượng giả định 180 phút; chọn chặng chưa hoàn tất làm bước tiếp theo. Trang checkpoint bổ sung tổng tiến độ và giải thích bài chờ SHA chưa được tính.
- Bổ sung trạng thái đang tải/lỗi để không đưa ra tỷ lệ hoàn thành giả khi không lấy được dữ liệu.

## 3. Kiểm tra thành phần và API

Không thêm/xóa/thay thế component React hoặc thư viện. Các component được chỉnh: `AdminTeamsPage`, `MentorDashboardPage`, `CandidateDashboardPage`, `candidateCheckpointsPage`, `SupportTickets`; hook `useAdminTeams` cập nhật thông báo ghép đội.

Thêm utility `frontend/src/utils/progress.ts`; cập nhật `ticketService`, `adminTeamsApi`, `useMockStore` và kiểu dữ liệu liên quan. Giữ nguyên đường dẫn API, cơ chế token và các form nộp bài/chấm điểm đã có.

| API | Đã kiểm tra |
| --- | --- |
| `POST /admin/teams/auto-match` | Phân bổ, số người dư, đội hợp lệ, lưu thành viên duy nhất và hạn mức đề tài |
| `GET /admin/teams` | Đọc lại quy mô đội theo cấu hình SQL |
| `GET /tickets` | Mentor có token 200; thiếu token 401; chỉ dữ liệu trong phạm vi quyền; phân trang `skip/limit` FE |
| `PATCH /tickets/{id}` | Giữ luồng tiếp nhận và quyền sửa; lỗi tiếp nhận không bị bỏ qua trên Dashboard |
| `GET /checkpoints` và `GET /submissions` | Bài của đội hiện tại, trạng thái pending/evaluated/submitted được giữ và thống nhất |

Các thao tác ghép đội tiếp tục ghi bằng SQLAlchemy transaction; FE chỉ thông báo kết quả sau API. Không cần migration và không sửa schema CSDL trong lần này.

## 4. Kiểm thử nghiệm thu

| Nhóm | Kết quả |
| --- | --- |
| Toàn bộ backend | **171 passed** |
| Backend mới | 6 ca trong tổng trên; một ca kiểm tra phân hoạch với 4 cặp cấu hình, số thí sinh 0–60 |
| Frontend unit/adapter | **10 passed**: 4 mới và 6 hồi quy |
| Trình duyệt mới | **3 nhóm passed**: 2/4 và trạng thái SHA sau reload/đối chiếu trang; hàng đợi mentor đồng bộ; 401 không fallback dữ liệu cũ |
| Trình duyệt hồi quy | **10 nhóm passed** cho BUG-35–40 và các luồng audit API trước đó |
| TypeScript | Thành công |
| ESLint các file FE thay đổi | Thành công |
| Production build | Thành công; có cảnh báo bundle khoảng 1,2 MB |

Kiểm thử cũ `test_auto_match_obeys_custom_limits_and_persists` được cập nhật theo yêu cầu tối đa số đội: 11 người, min=2/max=6 → 2+2+2+2+3 thay vì 5+6. Vẫn kiểm tra dữ liệu đọc lại qua API, không bỏ qua test hay nới điều kiện về giới hạn thành viên.

Trình duyệt dùng API mô phỏng hợp đồng; backend dùng API thật với CSDL SQLite tách biệt. Chưa coi đây là nghiệm thu trên Railway, OAuth thật hoặc PostgreSQL nhiều tiến trình.

## 5. Hướng dẫn kiểm tra nhanh

1. Admin, cấu hình min=3/max=5, tạo 6 candidate đã duyệt/active chưa có đội; tắt bổ sung đội hiện có nếu có sẵn đội thiếu người. Ghép và tải lại: hai đội 3 người, không còn thí sinh dư.
2. Dùng 9 candidate: tạo ba đội 3 người. Dùng 1–2 người và không có đội có thể bổ sung: không tạo đội mới, thông báo người đang chờ. Kiểm tra đề tài đầy không bị gán thêm.
3. Mentor có một ticket open chưa nhận và một in_progress của mình: Dashboard chờ nhận=1; click vào tab chờ nhận cũng một dòng. Ticket người khác không tính là của mình.
4. Cho token hết hạn rồi tải ticket: chuyển đăng nhập hoặc báo lỗi, không giữ số liệu như đã tải thành công.
5. Candidate có hai chặng submitted/evaluated, một chưa nộp, một pending/chờ BTC xác minh SHA: Dashboard và checkpoint đều 2/4; tải lại vẫn khớp.
6. Nộp lại một chặng đã hoàn tất: số chặng không tăng thêm. Chỉ khi trạng thái chặng chờ xác minh được cập nhật hợp lệ từ BE thì tiến độ mới thay đổi.

## 6. Phạm vi còn cần kiểm tra ở môi trường triển khai

- Tình huống 5+1 và 401 trong phiếu ban đầu cần đối chiếu phiên bản deploy, cấu hình min/max, dữ liệu đội hiện có và token thực tế nếu vẫn xuất hiện sau cập nhật.
- Số liệu giữa hai trang có thể thay đổi hợp lệ nếu người khác tiếp nhận/nộp bài trong thời gian chuyển trang; hai trang dùng cùng quy tắc và đọc lại từ API, không phải ảnh chụp đồng thời.
- Các giới hạn triển khai Railway và vấn đề đăng ký vai trò quản trị đã nêu trước đó không thuộc ba bug này và không được coi là đã sửa trong báo cáo này.
