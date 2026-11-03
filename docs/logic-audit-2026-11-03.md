# Báo cáo xác minh logic — 03/11/2026

Phạm vi: 8 mục người dùng cung cấp và rà soát bổ sung các luồng công bố kết quả, chấm điểm, duyệt đội, quota đề tài và thống kê. Đây là báo cáo trước sửa; chưa sửa mã nguồn nghiệp vụ, chưa đẩy Git hoặc triển khai.

Phương pháp: đọc trực tiếp frontend/backend hiện tại; chạy 3 ca tái hiện API với SQLite kiểm thử trong bộ nhớ. Không thay đổi CSDL demo. Các kết luận chỉ dựa trên mã nguồn được ghi rõ, không thay thế kiểm thử giao diện thực tế hoặc kiểm thử đồng thời PostgreSQL.

## 1. Đối chiếu 8 mục được gửi

| Mục | Kết luận | Căn cứ và đính chính | Ưu tiên đề xuất |
|---|---|---|---|
| 1. Cờ khóa/nháp sau công bố/ẩn | Có lỗi frontend | `AdminResultsPage.tsx`, `handleTogglePublish` gán cứng cờ của toàn bộ dòng thay vì giữ dữ liệu thực. Công bố không có nghĩa phiếu chuyển thành nháp; ẩn không có nghĩa mọi đội đã có điểm khóa. | P2 |
| 2. Điểm và độ lệch sau mở khóa | Có sai lệch tạm thời, mô tả ban đầu chưa đầy đủ | `handleConfirmUnlock` cập nhật số phiếu và danh sách giám khảo nhưng giữ điểm/độ lệch/cảnh báo cũ. Tuy nhiên cuối hàm ĐÃ gọi `syncFromBackend` và tăng `refreshTick` để tải lại leaderboard. Vì vậy không thể khẳng định luôn sai đến khi F5; sai có thể kéo dài nếu yêu cầu tải lại thất bại. | P2 |
| 3a. Ngày công bố viết cứng | Có lỗi hiển thị | `Scoreboard.tsx:171` ghi `20:00 - 15/11/2026`. Không nên tự đồng nhất thời điểm công bố với hạn nộp chung kết: đây là hai mốc nghiệp vụ khác nhau. Cần trường thời gian công bố riêng hoặc hiển thị “Chờ BTC công bố”. | P2 |
| 3b. Thiếu kiểm tra trước công bố | Có lỗ hổng kiểm soát | `LeaderboardService.publish_leaderboard` chỉ kiểm tra quyền và đã công bố hay chưa. API thực tế trả 200 khi không có phiếu điểm nào. Frontend ĐÃ có hộp xác nhận chung nhưng không cảnh báo riêng còn phiếu nháp/thiếu điểm. Việc cấm tuyệt đối mọi phiếu nháp cần quy định rõ, tránh chặn nháp dư không liên quan. | P1 |
| 4. Đội bị từ chối vẫn chiếm slot | Có hiện tượng; quy tắc trả slot cần chốt nghiệp vụ | `reject_admin_team` giữ liên kết đề tài và không giảm quota. Nếu từ chối là loại đội và giải phóng chỗ thì đây là lỗi logic. Nếu là yêu cầu bổ sung hồ sơ và giữ chỗ thì có thể là tính năng. Hiện chưa có trạng thái giữ chỗ riêng để phân biệt. Không nên chỉ thêm phép trừ: phải xử lý từ chối lặp, duyệt lại, xóa và chuyển đề tài để tránh trừ/cộng hai lần. | P2, P1 nếu đang cản đăng ký |
| 5. Bỏ qua quota đề tài cha | Có lỗi backend | Tạo đội qua nhánh chỉ kiểm quota nhánh rồi tăng cha. Cập nhật chỉ kiểm cha khi `not new_subtopic_id`; chọn nhánh có thể vượt quota cha. | P1 |
| 6. Tiến độ Admin lấy metadata | Có lỗi nguồn dữ liệu | `_serialize_admin_team` dùng `admin_meta`, mặc định 0/3; `_serialize_admin_teams` không tổng hợp Submission/Checkpoint. Đã tái hiện API trả 0/3 dù đội có bài nộp. Không phải mọi đội luôn 0/3 nếu metadata đã chứa giá trị khác; vấn đề là không lấy tiến độ thật. | P2 |
| 7. Ticket đóng vẫn được tính đang mở | Có lỗi ở cả hai phía | Backend dùng `status != resolved`; AdminDashboard cũng dùng điều kiện tương tự. Enum có cả `closed`. Chỉ nên đếm `open`, `in_progress`. | P2 |
| 8. JudgeResults vẫn có nút chấm đội không hợp lệ | Có lỗi giao diện | `pages/judge/JudgeResultsPage.tsx` chỉ xét phiếu tồn tại/đã khóa, không xét `canEvaluate`. Workspace và API đã chặn bài chung kết không hợp lệ nên đây không phải lỗ hổng ghi điểm vượt quyền. Tên thuộc tính hiện tại là `evaluationBlockReason`, không phải `evaluationBlockedReason`. Quy định bắt buộc đủ mọi chặng trước chấm không được suy ra từ lỗi này; chính sách hiện tại tập trung bài chung kết hợp lệ. | P2 |

## 2. Lỗi/rủi ro logic tìm thêm

### L09 — Bài chung kết không hợp lệ vẫn được xếp hạng (P1)

- Căn cứ: `leaderboard_service.py`, `_list_final_submissions` chỉ lọc checkpoint cuối và đội bị từ chối; không áp dụng `judging_block_reason` đang dùng ở luồng chấm điểm.
- Tái hiện: đặt bài chung kết thành `sha_verification_failed`, SHA rỗng; GET leaderboard Admin vẫn trả dòng đó và có rank.
- Ảnh hưởng: bài chưa hợp lệ/chưa có điểm có thể xuất hiện trong kết quả công khai. Điểm lịch sử của bài sau đó mất điều kiện hợp lệ cũng chưa được loại tại bước tổng hợp.
- Hướng sửa: thống nhất chính sách hợp lệ giữa chấm và xếp hạng; giữ danh sách theo dõi nội bộ riêng nếu BTC vẫn cần xem đội thiếu điều kiện; chỉ xếp hạng chính thức các dòng đủ điều kiện theo quy định.

### L10 — Kết quả đang công bố vẫn thay đổi khi mở khóa điểm (P1)

- Căn cứ: `EvaluationService.unlock_evaluation` không kiểm trạng thái công bố và chuyển phiếu về draft. `get_leaderboard` tổng hợp trực tiếp mỗi lần đọc, không đọc bản kết quả đã chốt.
- Ảnh hưởng: mở khóa một phiếu khi bảng đang công khai làm điểm/thứ hạng thay đổi ngay ở lần đọc tiếp theo, trước khi giám khảo chấm lại hoặc BTC công bố lại.
- Đây là kết luận từ luồng mã nguồn; chưa chạy ca mở khóa khi đang công bố trong đợt kiểm chứng này.
- Hướng sửa: chặn mở khóa cho đến khi BTC ẩn kết quả, hoặc triển khai bản kết quả công bố có phiên bản. Chọn một quy tắc nhất quán và áp dụng tại backend.

### L11 — Có thể lưu đề tài cha và nhánh không cùng hệ (P1)

- Căn cứ: `update_admin_team` gán `team.topic_id` từ cha của nhánh, nhưng sau đó cho `resolved_major_id` ghi đè mà không kiểm nhánh thuộc cha mới. Gửi chỉ `major_topic_id` cũng không gỡ nhánh cũ.
- Ảnh hưởng: đội có topic A nhưng subtopic thuộc B; quota cha bị tính sang A trong khi nhánh vẫn của B. Sai liên kết có thể lan sang chọn đề tài, phân công giám khảo và báo cáo.
- Kết luận theo mã nguồn; chưa chạy API tái hiện mục này.
- Hướng sửa: một nguồn xác định cha từ nhánh; từ chối cặp ID mâu thuẫn. Đổi sang chỉ đề tài cha phải gỡ nhánh cũ một cách tường minh. Tính thay đổi quota trong cùng giao dịch.

### L12 — Tải bảng điểm thất bại nhưng không báo, có thể giữ số cũ (P2)

- Căn cứ: effect lấy leaderboard trong `AdminResultsPage.tsx` kết thúc bằng `.catch(() => {})`.
- Ảnh hưởng: sau mở khóa hoặc thao tác quản trị, người dùng không biết dữ liệu chưa đồng bộ; lỗi số 2 có thể kéo dài. Lần tải đầu lỗi có thể trông như bảng không có dữ liệu.
- Hướng sửa: phân biệt đang tải/rỗng/lỗi; hiện yêu cầu thử lại, đánh dấu dữ liệu cũ, không báo đồng bộ thành công khi chưa tải được.

### L13 — Cấu hình chung là đường công bố kết quả thứ hai (P2)

- Căn cứ: endpoint cập nhật cấu hình trong `admin.py` nhận `is_result_published` hoặc `leaderboardPublished` và gán thẳng cờ, không đi qua `publish_leaderboard`.
- Ảnh hưởng: kiểm tra điều kiện và nhật ký chuyên biệt của luồng công bố có thể bị bỏ qua; nếu chỉ sửa endpoint công bố thì đường cấu hình vẫn còn.
- Đây vẫn là API dành cho Admin, không phải bằng chứng người ngoài có quyền công bố.
- Hướng sửa: mọi đường thay đổi cờ gọi chung một service, hoặc bỏ quyền chỉnh cờ qua cấu hình tổng quát.

## 3. Kiểm chứng đã chạy

3 ca chẩn đoán đều tái hiện được hành vi lỗi trên hệ thống hiện tại:

1. Công bố khi số bản ghi Evaluation bằng 0: HTTP 200.
2. Bài chung kết lỗi xác minh SHA vẫn xuất hiện trong leaderboard và được xếp hạng.
3. Đội có Submission nhưng API Admin vẫn trả tiến độ mặc định 0/3.

Tệp chẩn đoán nằm trong thư mục tạm `tmp/logic-audit-2026-11-03/test_audit.py`, không phải bộ kiểm thử hồi quy: chúng khẳng định hành vi lỗi hiện tại và phải được đổi kỳ vọng khi sửa. Lần chạy đầu chưa nạp cấu hình asyncio cho vị trí tệp tạm; lần chạy lại với `--asyncio-mode=auto` đạt 3/3. Không chạy lại toàn bộ CI cho một đợt đánh giá chưa sửa mã nghiệp vụ.

## 4. Thứ tự xử lý đề xuất

1. Thống nhất điều kiện xếp hạng/công bố, chặn thay đổi điểm khi kết quả đang công khai, xử lý cả đường cấu hình chung (3b, L09, L10, L13).
2. Chuẩn hóa liên kết cha/nhánh, quota và vòng đời giữ/trả chỗ khi từ chối/duyệt lại/xóa; kiểm tra đồng thời trên PostgreSQL (4, 5, L11).
3. Đồng bộ AdminResults từ API sau ghi, báo lỗi tải và phân biệt điểm nháp/điểm chính thức; bỏ cờ giả lập (1, 2, L12).
4. Tính tiến độ từ CSDL, chỉ đếm ticket đang xử lý; đồng bộ nút chấm và mốc thông báo kết quả (3a, 6, 7, 8).
5. Thêm kiểm thử hồi quy cho từng lỗi và chạy bộ backend/frontend, kiểm thử trình duyệt các trang liên quan. Giữ cấu trúc giao diện và hợp đồng API hiện tại khi có thể; bổ sung trường có kiểu rõ ràng nếu cần.

Giới hạn: đây không phải kiểm toán toàn bộ hệ thống. Không kết luận không còn lỗi khác. Không tự điều chỉnh điểm cũ, số slot, lịch thi hoặc dữ liệu thật trong đợt xác minh này.
