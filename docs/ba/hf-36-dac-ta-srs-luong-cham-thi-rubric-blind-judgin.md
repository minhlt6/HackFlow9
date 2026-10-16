---
id: "HF-36"
title: "Đặc tả SRS: Luồng Chấm thi Rubric, Blind Judging & Bảng xếp hạng"
status: "Done"
assignee: "Phuong ly Dinh"
priority: "P0"
deadline: "2026-10-17"
notion_url: "https://app.notion.com/p/HF-36-c-t-SRS-Lu-ng-Ch-m-thi-Rubric-Blind-Judging-B-ng-x-p-h-ng-3f91caaa7e8581b8934eecfb1caae053"
last_edited: "20:07:00 16/10/2026"
pulled_at: "20:44:51 16/10/2026"
---

# HF-36 — Đặc tả SRS: Luồng Chấm thi Rubric, Blind Judging & Bảng xếp hạng

| | |
|---|---|
| **Status** | Done |
| **Assignee** | Phuong ly Dinh |
| **Sprint** | — |
| **Ưu tiên** | P0 |
| **Hạn hoàn thành** | 2026-10-17 |
| **Cập nhật** | 20:07:00 16/10/2026 |
| **Notion** | [Mở trang](https://app.notion.com/p/HF-36-c-t-SRS-Lu-ng-Ch-m-thi-Rubric-Blind-Judging-B-ng-x-p-h-ng-3f91caaa7e8581b8934eecfb1caae053) |

---

## 🎯 Mục tiêu
Đặc tả chi tiết yêu cầu hệ thống (SRS) cho phân hệ Chấm điểm theo tiêu chí Barem Rubric, cơ chế Chấm ẩn danh (Blind Judging) và Tổng hợp/Công bố Bảng xếp hạng (US-15, US-16, US-17, US-18 trong BA-01).

## ✅ Acceptance Criteria (Tiêu chí hoàn thành)
- [x] Định nghĩa cấu trúc dữ liệu tiêu chí chấm (rubric_criteria: title, max_score, weight) và công thức tính tổng điểm có trọng số của mỗi Giám khảo.
- [x] Quy định rõ cơ chế Blind Judging (AC-16.2): Ẩn tên đội, tên thành viên, tên trường khi trả dữ liệu bài nộp cho Giám khảo (chỉ hiển thị mã định danh ẩn danh VD: Team #A1B2).
- [x] Đặc tả vòng đời phiếu chấm của Giám khảo: Lưu bản nháp (DRAFT) -> Xác nhận khóa bảng điểm (SUBMITTED/CONFIRMED - AC-18.3) và quy tắc không xem điểm của giám khảo khác.
- [x] Quy tắc tổng hợp điểm trung bình từ nhiều Giám khảo, ngưỡng cảnh báo khi điểm lệch lớn (AC-15.2), tiêu chí phụ khi đồng điểm và luồng BTC công bố kết quả (DRAFT -> PUBLISHED).
> **📌** Lưu ý bàn giao: Kèm bảng mã lỗi chuẩn (403 FORBIDDEN_NOT_ASSIGNED_JUDGE, 422 SCORE_OUT_OF_RANGE, 409 EVALUATION_ALREADY_LOCKED) để Backend & Frontend áp dụng thống nhất.

# 1. Tổng quan phân hệ và phạm vi user stories:
Phân hệ chấm điểm chịu trách nhiệm quản lý toàn bộ quy trình đánh giá bài nộp của các đội thi, từ việc cấu hình bộ tiêu chí chấm điểm rubric, phân công giám khảo, chấm điểm ẩn danh, tổng hợp điểm, phát hiện chênh lệch điểm giữa các giám khảo đến rà soát và công bố kết quả chính thức.
Hệ thống phải đảm bảo tính minh bạch, khách quan, bảo mật thông tin đội thi và tuân thủ phân quyền truy cập theo vai trò. Mọi thao tác quan trọng liên quan đến khóa phiếu chấm, mở khóa để thẩm định lại và công bố kết quả phải được ghi nhận trong Audit Log.
Phạm vi user stories theo BA-01:
- US-14: Phân công đội cho giám khảo. Ban tổ chức phân công đội thi cho giám khảo nhằm đảm bảo mỗi giám khảo chỉ được truy cập và xử lý các bài nộp thuộc phạm vi được giao.
- US-15: Tổng hợp và công bố kết quả cuộc thi. Ban tổ chức tổng hợp điểm, xử lý trường hợp lệch điểm hoặc đồng điểm, rà soát bảng xếp hạng và công bố kết quả chính thức.
- US-16: Giám khảo xem đội và bài nộp được phân công. Giám khảo chỉ xem các bài nộp thuộc phạm vi được phân công, sử dụng cơ chế Blind Judging và giao diện Split-screen.
- US-17: Giám khảo chấm điểm theo tiêu chí và lưu nhận xét. Giám khảo nhập điểm cho từng tiêu chí trong Rubric, ghi nhận xét, xem tổng điểm tạm tính và lưu phiếu chấm ở trạng thái bản nháp.
- US-18: Giám khảo rà soát và xác nhận khóa bảng điểm chính thức. Giám khảo kiểm tra dữ liệu chấm điểm và xác nhận phiếu chấm khi đã đáp ứng đầy đủ các điều kiện bắt buộc.

# 2. Cấu trúc dữ liệu tiêu chí rubric và công thức tính điểm

## 2.1. Mô hình dữ liệu tiêu chí động (rubric_criteria)
Bảng rubric_criteria lưu trữ các tiêu chí được sử dụng để đánh giá bài nộp.
- id (UUID): Mã định danh duy nhất của tiêu chí.
- title (String): Tên tiêu chí đánh giá.
- description (String, optional): Mô tả nội dung và yêu cầu đánh giá của tiêu chí.
- max_score (Numeric): Điểm tối đa của tiêu chí, phải lớn hơn 0.
- weight (Numeric): Trọng số của tiêu chí, thỏa mãn 0<weight1.
- is_required (Boolean): Xác định tiêu chí có bắt buộc phải nhập điểm trước khi xác nhận phiếu chấm hay không.
- display_order (Integer): Thứ tự hiển thị tiêu chí trên giao diện chấm điểm.
- is_active (Boolean): Xác định tiêu chí còn hiệu lực trong bộ Rubric hay không.

## 2.2. Quy tắc ràng buộc trọng số
Tổng trọng số của tất cả tiêu chí trong một bộ Rubric phải bằng đúng 1.00, tương đương 100%.
i=1Nweighti=1.00
Trong đó:
- N là số lượng tiêu chí trong bộ Rubric.
- weighti là trọng số của tiêu chí thứ i.
Hệ thống phải kiểm tra tổng trọng số trước khi cho phép lưu hoặc kích hoạt bộ Rubric. Nếu tổng trọng số không bằng 1.00, hệ thống từ chối thao tác và trả về mã lỗi 400 CRITERIA_WEIGHT_INVALID.
Điểm nhập vào cho mỗi tiêu chí phải nằm trong khoảng từ 0 đến max_score của tiêu chí đó.

## 2.3. Công thức tính tổng điểm có trọng số của giám khảo
Điểm tổng hợp có trọng số Sj,s của giám khảo j đối với bài nộp s được tính theo công thức:
Sj,s=i=1Nscorei,j,smax_scoreiweighti100
Trong đó:
- scorei,j,s: Điểm giám khảo j chấm cho tiêu chí i của bài nộp s.
- max_scorei: Điểm tối đa của tiêu chí i.
- weighti: Trọng số của tiêu chí i.
- Sj,s: Tổng điểm có trọng số của giám khảo j, trên thang điểm 100.
Hệ thống tự động tính tổng điểm tạm tính sau khi giám khảo nhập hoặc cập nhật điểm. Tổng điểm chính thức chỉ được sử dụng để tổng hợp và xếp hạng khi các phiếu chấm liên quan đáp ứng điều kiện xác nhận.

# 3. Cơ chế chấm ẩn danh (Blind Judging)

## 3.1. Nguyên tắc ẩn danh
Khi giám khảo truy cập danh sách bài nộp được phân công, hệ thống phải ẩn các thông tin có thể trực tiếp tiết lộ danh tính đội thi.
Các thông tin không được hiển thị trong giao diện chấm ẩn danh bao gồm:
- Tên thật của đội thi (team_name).
- Tên các thành viên trong đội.
- Tên trường đại học hoặc đơn vị của thí sinh.
- Email, số điện thoại và thông tin liên hệ cá nhân.
- Các thông tin định danh khác không cần thiết cho quá trình đánh giá.
Cơ chế ẩn danh phải được thực thi ở cả tầng Backend và Frontend. Backend không được trả các trường định danh bị cấm trong API dành cho giám khảo; Frontend không được tự suy diễn hoặc lấy thông tin danh tính từ các nguồn dữ liệu khác để hiển thị.

## 3.2. Mã ẩn danh cố định một chiều
Hệ thống sử dụng mã băm cố định một chiều được sinh từ team_id hoặc submission_id kết hợp với một giá trị salt bí mật do hệ thống quản lý.
- Ví dụ:
anonymous_team_code = "Team #" + 4 ký tự hex đầu của SHA256(team_id + salt)
- > Kết quả hiển thị có dạng: Team #A1B2.
Yêu cầu thực hiện:
- Mã ẩn danh phải được giữ cố định xuyên suốt kỳ chấm để một đội không bị đổi mã khi giám khảo tải lại trang, đăng xuất rồi đăng nhập hoặc gọi lại API.
- Hệ thống không sinh mã ngẫu nhiên mới cho mỗi lần gọi API.
- Mã ẩn danh không được chứa trực tiếp tên đội, tên thành viên hoặc các thông tin nhận diện thật.
- Backend phải đảm bảo việc ánh xạ giữa mã ẩn danh và đội thi không được cung cấp cho giám khảo.
- Mã ẩn danh phải được sử dụng thống nhất giữa danh sách bài nộp, giao diện chấm điểm và các màn hình liên quan của cùng kỳ chấm.
Giá trị salt phải được quản lý ở phía máy chủ, không được gửi về Frontend. Nếu sử dụng mã ẩn danh cho mục đích bảo mật, hệ thống không được coi riêng việc rút gọn SHA256 thành 4 ký tự là một cơ chế bảo mật tuyệt đối; quyền truy cập và việc tách biệt dữ liệu định danh vẫn phải được thực thi ở Backend.
- Ví dụ:
Đội thi có team_id = T123 được hệ thống ánh xạ thành mã ẩn danh Team #A1B2. Mã này tiếp tục được sử dụng trong các lần truy cập tiếp theo thay vì tạo mã mới.

## 3.3. Dữ liệu được phép hiển thị trên giao diện Split-screen (AC-16.3)
Khi giám khảo mở một bài nộp để chấm điểm, hệ thống hiển thị giao diện chia đôi màn hình (Split-screen).
Cột trái – Thông tin bài nộp được phép hiển thị:
- Mã đội ẩn danh, ví dụ: Team #A1B2.
- Tên đề tài (topic_title).
- Link bản demo (demo_url).
- Link kho mã nguồn (repo_url).
- Link slide thuyết trình (slide_url).
- Mã Frozen Commit SHA (commit_sha) được ghi nhận tại thời điểm nộp bài hợp lệ ở Checkpoint cuối.
- Các tài liệu hoặc link sản phẩm khác được cấu hình cho bài nộp, nếu có và được phép hiển thị.
Cột phải – Bảng tiêu chí chấm điểm:
- Danh sách tiêu chí thuộc bộ Rubric đang áp dụng.
- Điểm tối đa của từng tiêu chí.
- Trọng số của từng tiêu chí.
- Ô nhập điểm và nhận xét của giám khảo.
- Tổng điểm tạm tính trên thang 100.
- Trạng thái phiếu chấm và các thông báo kiểm tra dữ liệu.
Dữ liệu hiển thị phải tuân thủ phạm vi phân công và không được tiết lộ tên đội thật, tên thành viên hoặc thông tin định danh bị cấm.

## 3.4. Quy tắc đối với bài nộp Checkpoint cuối
Chỉ các bài nộp được xác định là Checkpoint cuối (is_final_checkpoint = true) mới thuộc phạm vi danh sách chấm cuối cùng của phân hệ này.
Đối với Checkpoint cuối:
- Bài nộp phải tuân thủ các điều kiện hợp lệ của luồng nộp bài.
- repo_url phải được cấu hình là trường bắt buộc và áp dụng cơ chế đóng băng Commit SHA.
- commit_sha phải phản ánh mã nguồn được ghi nhận tại thời điểm nộp bài hợp lệ.
- Giám khảo xem mã Frozen Commit SHA để xác định phiên bản mã nguồn được chấm.
- Việc thay đổi mã nguồn của kho GitHub sau thời điểm nộp không được làm thay đổi commit_sha đã lưu cho bài nộp đó.
Các quy tắc xác định submitted_at, kiểm tra thời hạn và ghi nhận Commit SHA phải tuân thủ đặc tả Checkpoint và Nộp bài của HackFlow.

# 4. Vòng đời phiếu chấm và quy tắc khóa/mở khóa

## 4.1. Trạng thái phiếu chấm
Mỗi phiếu chấm có các trạng thái nghiệp vụ sau:
- DRAFT: Phiếu chấm đang ở trạng thái bản nháp. Giám khảo được phân công có thể nhập, cập nhật điểm và nhận xét trong thời gian được phép.
- SUBMITTED: Giám khảo đã hoàn tất việc chấm và xác nhận khóa phiếu. Phiếu chuyển sang chế độ chỉ đọc, không được chỉnh sửa trực tiếp.
- UNLOCKED / DRAFT: Khi có yêu cầu thẩm định lại được Admin/BTC phê duyệt, phiếu chấm đã xác nhận được mở khóa và chuyển về DRAFT để giám khảo chỉnh sửa theo quy trình được cấp quyền.
- UNLOCKED là trạng thái thao tác mở khóa; trạng thái lưu của phiếu sau khi mở khóa là DRAFT.

## 4.2. Quy tắc lưu nháp (DRAFT)
- Giám khảo chỉ được tạo và chỉnh sửa phiếu chấm đối với các bài nộp thuộc phạm vi được phân công.
- Phiếu chấm ở trạng thái DRAFT không được công khai cho giám khảo khác.
- Điểm và nhận xét trong bản nháp không được sử dụng làm điểm chính thức để công bố kết quả.
- Hệ thống ghi nhận lịch sử thay đổi điểm và nhận xét theo quy định Audit Log.

## 4.3. Quy tắc xác nhận và khóa phiếu chấm (SUBMITTED)
Khi giám khảo chọn chức năng “Xác nhận khóa bảng điểm”, hệ thống phải kiểm tra các điều kiện sau:
1. Giám khảo có quyền chấm bài nộp đó.
1. Bài nộp thuộc Checkpoint cuối và hợp lệ trong phạm vi chấm.
1. Tất cả tiêu chí bắt buộc trong bộ Rubric đã có điểm.
1. Điểm của từng tiêu chí nằm trong khoảng từ 0 đến max_score.
1. Các điều kiện bắt buộc khác của phiếu chấm, nếu có, đã được hoàn thành.
1. Dữ liệu phiếu chấm hợp lệ và không vi phạm quy tắc nghiệp vụ.
Nếu đáp ứng đầy đủ điều kiện, hệ thống chuyển phiếu chấm sang trạng thái SUBMITTED.
Sau khi chuyển sang SUBMITTED:
- Phiếu chấm ở chế độ chỉ đọc.
- Giám khảo không được tự ý sửa điểm hoặc nhận xét.
- Giám khảo không được xem điểm và nhận xét của các giám khảo khác trước thời điểm BTC công bố kết quả.
- Mọi yêu cầu điều chỉnh phải đi qua quy trình mở khóa có thẩm quyền.
Nếu còn tiêu chí bắt buộc chưa được nhập điểm, hệ thống từ chối xác nhận và trả về 422 MISSING_RUBRIC_CRITERIA_SCORE.

## 4.4. Quy trình mở khóa phiếu chấm để thẩm định lại (AC-18.3)
Khi hệ thống phát hiện cảnh báo lệch điểm HIGH_DISCREPANCY_WARNING hoặc BTC có yêu cầu thẩm định lại, phiếu chấm đã xác nhận không được tự động mở khóa.
Quy tắc mở khóa:
- Chỉ Admin/BTC có quyền thực hiện thao tác mở khóa phiếu chấm đã ở trạng thái SUBMITTED.
- Giám khảo không có quyền tự mở khóa phiếu chấm của chính mình.
- Khi mở khóa, hệ thống chuyển phiếu chấm từ SUBMITTED về DRAFT.
- Hệ thống bắt buộc ghi nhận thao tác mở khóa trong Audit Log.
Audit Log tối thiểu phải lưu:
- ID người thực hiện mở khóa.
- ID phiếu chấm và bài nộp liên quan.
- Trạng thái trước khi mở khóa và trạng thái sau khi mở khóa.
- Thời điểm thực hiện.
- Lý do mở khóa hoặc nội dung yêu cầu thẩm định lại.
- Thông tin phiên bản hoặc lịch sử thay đổi liên quan, nếu có.
Sau khi giám khảo hoàn tất việc thẩm định lại, phiếu chấm phải được xác nhận lại theo quy trình tại Mục 4.3. Việc mở khóa không được làm mất lịch sử điểm và nhận xét trước đó.

## 4.5. Ràng buộc cơ sở dữ liệu đối với bảng evaluations
Bảng evaluations lưu điểm và nhận xét của giám khảo theo từng tiêu chí.
Các trường dữ liệu chính:
- id: Mã định danh phiếu chấm hoặc bản ghi chấm điểm.
- submission_id: ID bài nộp được chấm.
- judge_id: ID giám khảo thực hiện chấm.
- criteria_id: ID tiêu chí trong bộ Rubric.
- score: Điểm giám khảo nhập.
- comment: Nhận xét cho tiêu chí.
- status: Trạng thái phiếu chấm, chỉ nhận một trong hai giá trị draft hoặc submitted.
- created_at: Thời điểm tạo bản ghi.
- updated_at: Thời điểm cập nhật gần nhất.
Ràng buộc duy nhất:
UNIQUE (submission_id, judge_id, criteria_id)
Ràng buộc này đảm bảo mỗi giám khảo chỉ có một bản ghi điểm cho mỗi tiêu chí của một bài nộp trong cùng một cấu trúc dữ liệu chấm điểm. Việc cập nhật điểm phải thực hiện trên bản ghi hiện có thay vì tạo bản ghi trùng lặp.
Ràng buộc dữ liệu:
- score không được nhỏ hơn 0.
- score không được lớn hơn max_score của tiêu chí tương ứng.
- status chỉ nhận draft hoặc submitted.
- Các bản ghi thuộc cùng một phiếu chấm phải tuân thủ trạng thái nghiệp vụ của phiếu.
- Việc mở khóa phải được kiểm tra quyền tại Backend và được ghi nhận trong Audit Log.

# 5. Quy tắc tổng hợp điểm, ngưỡng cảnh báo và luồng công bố

## 5.1. Tổng hợp điểm trung bình (Final Score)
Điểm tổng kết cuối cùng của bài nộp s từ M giám khảo được tính theo công thức:
FinalScores=1Mj=1MSj,s
Trong đó:
- M là số giám khảo có phiếu chấm hợp lệ được sử dụng trong lần tổng hợp.
- Sj,s là điểm tổng hợp có trọng số trên thang 100 của giám khảo j đối với bài nộp s.
- FinalScores là điểm tổng kết của bài nộp.
Hệ thống chỉ tổng hợp và đưa vào quy trình công bố những phiếu chấm đáp ứng điều kiện xác nhận theo quy định. Trước khi cho phép công bố, hệ thống phải kiểm tra các điều kiện hoàn thành chấm điểm và dữ liệu bắt buộc của cuộc thi.

## 5.2. Ngưỡng cảnh báo điểm lệch lớn (HIGH_DISCREPANCY_WARNING)
Do điểm tổng hợp Sj,s đã được chuẩn hóa trên thang 100, hệ thống áp dụng ngưỡng cảnh báo lệch điểm theo thang 100 như sau:
- > Cảnh báo được kích hoạt nếu xảy ra ít nhất một trong hai điều kiện:
1. Khoảng cách điểm giữa giám khảo cao nhất và thấp nhất lớn hơn 15.0 điểm:
(Sj,s)-(Sj,s)>15.0
2. Độ lệch chuẩn điểm giữa các giám khảo lớn hơn 10.0:
s>10.0
Trong đó, s là độ lệch chuẩn của các điểm tổng hợp Sj,s do các giám khảo chấm cho cùng một bài nộp.
BTC được phép cấu hình các ngưỡng này theo yêu cầu của cuộc thi. Giá trị mặc định là:
- max_score_gap_threshold = 15.0
- score_stddev_threshold = 10.0
Khi một trong hai điều kiện vượt ngưỡng, hệ thống tự động gắn cờ HIGH_DISCREPANCY_WARNING trên Dashboard của BTC.
Quy trình xử lý:
- BTC rà soát bài nộp và các phiếu chấm liên quan.
- BTC quyết định có cần thẩm định lại hay không.
- Nếu cần thẩm định lại, Admin/BTC thực hiện mở khóa phiếu chấm theo Mục 4.4.
- Hệ thống ghi nhận việc mở khóa, cập nhật điểm và xác nhận lại trong Audit Log.
- Sau khi quá trình thẩm định lại hoàn tất, hệ thống tính toán lại điểm tổng kết và cập nhật trạng thái cảnh báo theo dữ liệu mới.
Cảnh báo lệch điểm không tự động cho phép giám khảo xem phiếu chấm của người khác và không tự động mở khóa phiếu chấm.

## 5.3. Tiêu chí phụ khi đồng điểm (Tie-breaker)
Khi hai hoặc nhiều đội có cùng điểm tổng kết, hệ thống áp dụng lần lượt các tiêu chí phụ sau:
1. Ưu tiên đội có điểm cao hơn ở tiêu chí cốt lõi có trọng số lớn nhất trong bộ Rubric đang áp dụng.
1. Nếu vẫn đồng điểm, ưu tiên đội có độ lệch chuẩn điểm giữa các giám khảo thấp hơn (s nhỏ hơn).
1. Nếu vẫn đồng điểm, ưu tiên đội có thời điểm nộp bài hợp lệ tại Checkpoint cuối sớm hơn, tức submitted_at nhỏ hơn.
Hệ thống phải áp dụng các tiêu chí trên theo đúng thứ tự. Không sử dụng việc BTC/BGK bỏ phiếu trực tiếp làm tiêu chí tự động xếp hạng.
Thời điểm submitted_at phải là thời điểm hệ thống ghi nhận lần nộp bài hợp lệ theo đặc tả Checkpoint cuối, không sử dụng thời gian do trình duyệt hoặc thiết bị của thí sinh tự khai báo.

## 5.4. Luồng công bố kết quả (DRAFT → PUBLISHED)
Bảng xếp hạng có hai trạng thái:
- DRAFT: Bảng xếp hạng đã được tổng hợp nhưng chưa công bố. Chỉ Admin/BTC có quyền xem dữ liệu bảng xếp hạng nội bộ.
- PUBLISHED: BTC đã xác nhận công bố kết quả. Hệ thống cho phép đối tượng người dùng được cấp quyền xem bảng xếp hạng công khai theo quy định.
Khi ở trạng thái DRAFT:
- Chỉ Admin/BTC được xem bảng xếp hạng nội bộ.
- Hệ thống có thể trả cờ has_discrepancy để chỉ ra bài nộp có cảnh báo lệch điểm.
- Thí sinh không được xem tên đội thật, tổng điểm hoặc thứ hạng nội bộ.
- Nếu thí sinh truy cập API xem bảng xếp hạng trước khi công bố, Backend trả về mã lỗi 403 RESULTS_NOT_PUBLISHED và thông báo trạng thái chờ công bố.
Khi Admin/BTC xác nhận công bố:
- Hệ thống chuyển is_result_published từ false sang true.
- Trạng thái bảng xếp hạng chuyển từ DRAFT sang PUBLISHED.
- Bảng xếp hạng công khai tên thật của đội, tổng điểm và thứ hạng theo quyền truy cập được quy định.
- Hệ thống ghi nhận người thực hiện, thời điểm công bố và mã phiên bản kết quả trong Audit Log.
- Sau khi công bố, dữ liệu kết quả chính thức không được chỉnh sửa trực tiếp. Nếu có nhu cầu điều chỉnh, phải thực hiện theo quy trình có thẩm quyền và có lịch sử kiểm toán phù hợp.

# 6. Phân quyền bảo mật (RBAC) và bảng mã lỗi chuẩn

## 6.1. Quy tắc phân quyền RBAC
Hệ thống phải kiểm tra quyền truy cập tại Backend cho từng API, không chỉ dựa vào việc ẩn hoặc hiện chức năng trên Frontend.
Admin/BTC:
- Được cấu hình và quản lý bộ Rubric theo quyền hạn.
- Được xem bảng xếp hạng nội bộ khi kết quả chưa công bố.
- Được rà soát cảnh báo lệch điểm.
- Được mở khóa phiếu chấm để thẩm định lại theo Mục 4.4.
- Được xác nhận công bố bảng xếp hạng.
- Các thao tác quan trọng phải được ghi nhận trong Audit Log.
Giám khảo (Judge):
- Chỉ xem các bài nộp được phân công.
- Chỉ xem dữ liệu bài nộp theo cơ chế Blind Judging.
- Được tạo và chỉnh sửa phiếu chấm của mình khi phiếu ở trạng thái DRAFT.
- Được xác nhận khóa phiếu chấm khi đáp ứng đủ điều kiện.
- Không được xem điểm hoặc nhận xét của giám khảo khác trước khi kết quả được công bố.
- Không được tự mở khóa phiếu chấm đã ở trạng thái SUBMITTED.
Thí sinh (Candidate):
- Không được truy cập các API nội bộ dành cho Admin/BTC hoặc Giám khảo.
- Chỉ được xem bảng xếp hạng công khai khi is_result_published = true.
- Nếu truy cập bảng xếp hạng khi is_result_published = false, hệ thống trả về 403 RESULTS_NOT_PUBLISHED và thông báo đang chờ BTC công bố kết quả.
Mentor:
- Không có quyền xem bài nộp trong phạm vi chấm điểm của Giám khảo.
- Không có quyền truy cập API chấm điểm.
- Mọi yêu cầu gọi API xem danh sách bài nộp dành cho Giám khảo, xem dữ liệu chấm điểm hoặc gửi/cập nhật phiếu chấm đều phải bị Backend từ chối với HTTP 403 Forbidden.
- Việc Mentor được phân công xử lý ticket hoặc nhiệm vụ cố vấn không đồng nghĩa với quyền truy cập dữ liệu chấm điểm.

## 6.2. Bảng mã lỗi chuẩn

Đối với các lỗi trên, Backend phải trả về đúng HTTP status tương ứng và mã lỗi trong trường error_code của JSON Response Envelope theo Mục 7.

# 7. API Contracts (Endpoints & JSON Request/Response)

## 7.1. Quy ước chung
Tất cả API thuộc phân hệ Scoring & Judging sử dụng tiền tố:
/api/v1
Dữ liệu Request và Response sử dụng định dạng JSON. Các API phải tuân thủ cơ chế xác thực, phân quyền RBAC và quy tắc nghiệp vụ đã nêu trong các mục trước.

### 7.1.1. Cấu trúc Response Envelope thống nhất
Mọi API sử dụng cấu trúc JSON Envelope sau:
{
"success": true,
"data": {},
"message": "Request processed successfully",
"error_code": null
}
Ý nghĩa các trường:
- success (Boolean): true nếu yêu cầu được xử lý thành công; false nếu yêu cầu thất bại.
- data (Object/Array/Null): Dữ liệu trả về khi xử lý thành công hoặc thông tin bổ sung phù hợp với lỗi.
- message (String): Thông báo kết quả xử lý.
- error_code (String/Null): Mã lỗi chuẩn. Giá trị là null khi thành công.
Ví dụ Response khi xảy ra lỗi:
{
"success": false,
"data": null,
"message": "You are not assigned to judge this submission",
"error_code": "FORBIDDEN_NOT_ASSIGNED_JUDGE"
}
- > HTTP status phải phản ánh đúng loại lỗi. Frontend không được chỉ dựa vào trường success để thay thế việc kiểm tra HTTP status và error_code.

## 7.2. Nhóm API Rubric (Admin/BTC)

### 7.2.1. GET /api/v1/rubrics – Xem danh sách bộ Rubric
Mục đích: Cho phép Admin/BTC xem danh sách các bộ tiêu chí chấm điểm được cấu hình trong hệ thống.
Quyền truy cập: Admin/BTC. Các vai trò khác không được tự động cấp quyền chỉ vì có thể truy cập giao diện.
Request:
GET /api/v1/rubrics
Authorization: Bearer <access_token>
Accept: application/json
API không yêu cầu JSON Request Body.
Response thành công – HTTP 200 OK:
{
"success": true,
"data": {
"rubrics": [
{
"id": "rubric-uuid-001",
"name": "HackFlow Final Rubric",
"is_active": true,
"criteria": [
{
"id": "criteria-uuid-001",
"title": "Technical Implementation",
"description": "Đánh giá chất lượng triển khai kỹ thuật",
"max_score": 10,
"weight": 0.4,
"is_required": true,
"display_order": 1,
"is_active": true
},
{
"id": "criteria-uuid-002",
"title": "Innovation",
"description": "Đánh giá tính sáng tạo của giải pháp",
"max_score": 10,
"weight": 0.6,
"is_required": true,
"display_order": 2,
"is_active": true
}
],
"total_weight": 1.0
}
]
},
"message": "Rubrics retrieved successfully",
"error_code": null
}
Quy tắc nghiệp vụ:
- Chỉ trả về dữ liệu Rubric trong phạm vi quyền của Admin/BTC.
- Mỗi tiêu chí phải có id, title, max_score, weight và các thuộc tính cần thiết để hiển thị/cấu hình.
- total_weight phải phản ánh tổng trọng số của các tiêu chí trong bộ Rubric.
- Backend phải kiểm tra quyền truy cập trước khi trả dữ liệu.

### 7.2.2. POST /api/v1/rubrics – Cấu hình bộ tiêu chí chấm
Mục đích: Cho phép Admin/BTC tạo bộ Rubric hoặc cấu hình bộ tiêu chí chấm điểm.
Quyền truy cập: Admin/BTC.
Request:
POST /api/v1/rubrics
Authorization: Bearer <access_token>
Content-Type: application/json
JSON Request Body:
{
"name": "HackFlow Final Rubric",
"criteria": [
{
"title": "Technical Implementation",
"description": "Đánh giá chất lượng triển khai kỹ thuật",
"max_score": 10,
"weight": 0.4,
"is_required": true,
"display_order": 1
},
{
"title": "Innovation",
"description": "Đánh giá tính sáng tạo của giải pháp",
"max_score": 10,
"weight": 0.6,
"is_required": true,
"display_order": 2
}
]
}
Response thành công – HTTP 201 Created:
{
"success": true,
"data": {
"rubric": {
"id": "rubric-uuid-001",
"name": "HackFlow Final Rubric",
"is_active": true,
"criteria": [
{
"id": "criteria-uuid-001",
"title": "Technical Implementation",
"description": "Đánh giá chất lượng triển khai kỹ thuật",
"max_score": 10,
"weight": 0.4,
"is_required": true,
"display_order": 1,
"is_active": true
},
{
"id": "criteria-uuid-002",
"title": "Innovation",
"description": "Đánh giá tính sáng tạo của giải pháp",
"max_score": 10,
"weight": 0.6,
"is_required": true,
"display_order": 2,
"is_active": true
}
],
"total_weight": 1.0
}
},
"message": "Rubric created successfully",
"error_code": null
}
Quy tắc nghiệp vụ:
- Tổng trọng số phải bằng đúng 1.00.
- max_score phải lớn hơn 0.
- weight phải lớn hơn 0 và nhỏ hơn hoặc bằng 1.
- Tiêu chí bắt buộc phải được xác định rõ thông qua is_required.
- Nếu tổng trọng số không hợp lệ, trả về HTTP 400 và mã lỗi CRITERIA_WEIGHT_INVALID.
- Nếu dữ liệu điểm tối đa hoặc trọng số của một tiêu chí không hợp lệ, Backend phải từ chối lưu và trả mã lỗi phù hợp.
- Chỉ Admin/BTC được phép tạo hoặc cấu hình Rubric.
Response lỗi ví dụ – HTTP 400 Bad Request:
{
"success": false,
"data": null,
"message": "The total rubric weight must equal 1.00",
"error_code": "CRITERIA_WEIGHT_INVALID"
}

## 7.3. Nhóm API Chấm thi và Blind Judging (Judge)

### 7.3.1. GET /api/v1/evaluations/submissions – Xem danh sách bài nộp được phân công
Mục đích: Trả về danh sách bài nộp thuộc Checkpoint cuối mà giám khảo hiện tại được phân công chấm, phục vụ giao diện Blind Judging.
Quyền truy cập: Judge.
Request:
GET /api/v1/evaluations/submissions
Authorization: Bearer <access_token>
Accept: application/json
API không yêu cầu JSON Request Body.
Response thành công – HTTP 200 OK:
{
"success": true,
"data": {
"submissions": [
{
"submission_id": "submission-uuid-001",
"anonymous_team_code": "Team #A1B2",
"topic_title": "AI for Smart Agriculture",
"repo_url": "https://github.com/example/project",
"demo_url": "https://demo.example.com",
"slide_url": "https://example.com/presentation",
"commit_sha": "a1b2c3d4e5f67890123456789abcdef012345678",
"evaluation_status": "draft"
},
{
"submission_id": "submission-uuid-002",
"anonymous_team_code": "Team #C3D4",
"topic_title": "Smart Campus Assistant",
"repo_url": "https://github.com/example/project-2",
"demo_url": "https://demo2.example.com",
"slide_url": "https://example.com/presentation-2",
"commit_sha": "b2c3d4e5f67890123456789abcdef01234567890",
"evaluation_status": "submitted"
}
]
},
"message": "Assigned submissions retrieved successfully",
"error_code": null
}
Các trường được phép trả về:
- submission_id: ID bài nộp.
- anonymous_team_code: Mã đội ẩn danh cố định.
- topic_title: Tên đề tài.
- repo_url: Link kho mã nguồn.
- demo_url: Link demo.
- slide_url: Link slide.
- commit_sha: Frozen Commit SHA của Checkpoint cuối.
- evaluation_status: Trạng thái phiếu chấm của giám khảo hiện tại.
evaluation_status chỉ nhận draft hoặc submitted.
Yêu cầu bảo mật bắt buộc:
- Chỉ trả về bài nộp có is_final_checkpoint = true.
- Chỉ trả về bài nộp thuộc phạm vi được phân công cho giám khảo đang đăng nhập.
- Không trả về team_name, danh sách thành viên, tên trường, email, số điện thoại hoặc các trường định danh thật.
- anonymous_team_code phải ổn định giữa các lần gọi API.
- Backend phải thực thi phân quyền và lọc dữ liệu; Frontend không được là lớp bảo mật duy nhất.
- Nếu giám khảo chưa được phân công bài nộp nào, trả về danh sách rỗng và thông báo phù hợp.
Response khi danh sách rỗng – HTTP 200 OK:
{
"success": true,
"data": {
"submissions": []
},
"message": "No submissions have been assigned to this judge",
"error_code": null
}
Response khi giám khảo truy cập bài nộp không được phân công – HTTP 403 Forbidden:
{
"success": false,
"data": null,
"message": "You are not assigned to judge this submission",
"error_code": "FORBIDDEN_NOT_ASSIGNED_JUDGE"
}
Mentor hoặc người dùng không có quyền Judge gọi API này phải bị chặn tại Backend với HTTP 403 Forbidden.

### 7.3.2. POST /api/v1/evaluations – Gửi điểm và nhận xét theo tiêu chí
Mục đích: Cho phép giám khảo tạo hoặc cập nhật phiếu chấm của mình, bao gồm điểm và nhận xét theo từng tiêu chí.
Quyền truy cập: Judge được phân công chấm bài nộp tương ứng.
Request:
POST /api/v1/evaluations
Authorization: Bearer <access_token>
Content-Type: application/json
JSON Request Body – Lưu bản nháp:
{
"submission_id": "submission-uuid-001",
"status": "draft",
"evaluations": [
{
"criteria_id": "criteria-uuid-001",
"score": 8,
"comment": "Phần triển khai kỹ thuật đáp ứng tốt các yêu cầu chính."
},
{
"criteria_id": "criteria-uuid-002",
"score": 9,
"comment": "Giải pháp có tính sáng tạo và phù hợp với đề tài."
}
]
}
JSON Request Body – Xác nhận khóa phiếu chấm:
{
"submission_id": "submission-uuid-001",
"status": "submitted",
"evaluations": [
{
"criteria_id": "criteria-uuid-001",
"score": 8,
"comment": "Phần triển khai kỹ thuật đáp ứng tốt các yêu cầu chính."
},
{
"criteria_id": "criteria-uuid-002",
"score": 9,
"comment": "Giải pháp có tính sáng tạo và phù hợp với đề tài."
}
]
}
Quy ước dữ liệu:
- submission_id: ID bài nộp cần chấm.
- status: Chỉ nhận draft hoặc submitted.
- evaluations: Danh sách điểm theo tiêu chí.
- criteria_id: ID tiêu chí trong Rubric đang áp dụng.
- score: Điểm được nhập cho tiêu chí.
- comment: Nhận xét của giám khảo cho tiêu chí.
Response thành công khi lưu nháp – HTTP 200 OK:
{
"success": true,
"data": {
"submission_id": "submission-uuid-001",
"status": "draft",
"total_score": 84.0,
"evaluations": [
{
"criteria_id": "criteria-uuid-001",
"score": 8,
"comment": "Phần triển khai kỹ thuật đáp ứng tốt các yêu cầu chính."
},
{
"criteria_id": "criteria-uuid-002",
"score": 9,
"comment": "Giải pháp có tính sáng tạo và phù hợp với đề tài."
}
]
},
"message": "Evaluation draft saved successfully",
"error_code": null
}
Response thành công khi xác nhận khóa phiếu – HTTP 200 OK:
{
"success": true,
"data": {
"submission_id": "submission-uuid-001",
"status": "submitted",
"total_score": 84.0,
"submitted_at": "2026-10-16T10:30:00Z"
},
"message": "Evaluation submitted successfully",
"error_code": null
}
Quy tắc nghiệp vụ:
- Giám khảo chỉ được chấm bài nộp thuộc phạm vi phân công.
- Mọi điểm phải nằm trong khoảng từ 0 đến max_score của tiêu chí.
- Hệ thống tính total_score theo công thức tại Mục 2.3.
- Khi status = "draft", hệ thống lưu bản nháp và cho phép chỉnh sửa trong thời gian được phép.
- Khi status = "submitted", hệ thống phải kiểm tra đầy đủ tiêu chí bắt buộc và tính hợp lệ của toàn bộ dữ liệu trước khi khóa phiếu.
- Nếu thiếu điểm của tiêu chí bắt buộc, trả về HTTP 422 với mã lỗi MISSING_RUBRIC_CRITERIA_SCORE.
- Nếu điểm ngoài phạm vi cho phép, trả về HTTP 422 với mã lỗi SCORE_OUT_OF_RANGE.
- Nếu phiếu chấm đã ở trạng thái submitted, không cho phép chỉnh sửa trực tiếp; trả về HTTP 409 với mã lỗi EVALUATION_ALREADY_LOCKED.
- Nếu giám khảo không được phân công bài nộp, trả về HTTP 403 với mã lỗi FORBIDDEN_NOT_ASSIGNED_JUDGE.
- Mentor gọi API này phải bị chặn với HTTP 403 Forbidden.
Response lỗi khi thiếu điểm bắt buộc – HTTP 422 Unprocessable Entity:
{
"success": false,
"data": {
"missing_criteria_ids": [
"criteria-uuid-002"
]
},
"message": "All required rubric criteria must have scores before submission",
"error_code": "MISSING_RUBRIC_CRITERIA_SCORE"
}
Response lỗi khi phiếu chấm đã khóa – HTTP 409 Conflict:
{
"success": false,
"data": null,
"message": "This evaluation has already been submitted and cannot be edited directly",
"error_code": "EVALUATION_ALREADY_LOCKED"
}

## 7.4. Nhóm API Bảng xếp hạng và Công bố kết quả (Leaderboard)

### 7.4.1. GET /api/v1/leaderboard – Xem bảng xếp hạng
Mục đích: Trả về bảng xếp hạng nội bộ cho Admin/BTC khi chưa công bố và bảng xếp hạng công khai khi đã công bố.
Quyền truy cập:
- Admin/BTC: Được xem bảng xếp hạng nội bộ trước khi công bố.
- Thí sinh: Chỉ được xem bảng xếp hạng khi is_result_published = true.
- Judge và Mentor: Không được tự động cấp quyền xem bảng xếp hạng nội bộ hoặc dữ liệu chấm điểm của người khác.
Request:
GET /api/v1/leaderboard
Authorization: Bearer <access_token>
Accept: application/json
API không yêu cầu JSON Request Body.

### Trường hợp 1: Kết quả chưa công bố (is_result_published = false)
Chỉ Admin/BTC được phép xem bảng xếp hạng nội bộ. Response có thể chứa has_discrepancy để cảnh báo các bài nộp có điểm lệch lớn.
Response – HTTP 200 OK:
{
"success": true,
"data": {
"is_result_published": false,
"status": "DRAFT",
"leaderboard": [
{
"submission_id": "submission-uuid-001",
"anonymous_team_code": "Team #A1B2",
"total_score": 88.5,
"rank": 1,
"has_discrepancy": false
},
{
"submission_id": "submission-uuid-002",
"anonymous_team_code": "Team #C3D4",
"total_score": 84.0,
"rank": 2,
"has_discrepancy": true
}
]
},
"message": "Draft leaderboard retrieved successfully",
"error_code": null
}
Quy tắc:
- Chỉ Admin/BTC được nhận dữ liệu bảng xếp hạng nội bộ.
- has_discrepancy = true khi bài nộp có cảnh báo lệch điểm theo Mục 5.2.
- Dữ liệu nội bộ không được công khai cho thí sinh.
- Backend phải kiểm tra vai trò trước khi trả dữ liệu.

### Trường hợp 2: Thí sinh truy cập trước khi công bố
Nếu is_result_published = false, thí sinh không được nhận dữ liệu điểm hoặc thứ hạng nội bộ.
Response – HTTP 403 Forbidden:
{
"success": false,
"data": {
"is_result_published": false,
"status": "DRAFT"
},
"message": "Results have not been published yet. Please wait for the official announcement.",
"error_code": "RESULTS_NOT_PUBLISHED"
}
Frontend hiển thị thông báo chờ công bố kết quả và không hiển thị điểm hoặc thứ hạng nội bộ.

### Trường hợp 3: Kết quả đã công bố (is_result_published = true)
Khi BTC đã công bố kết quả, thí sinh được xem bảng xếp hạng công khai.
Response – HTTP 200 OK:
{
"success": true,
"data": {
"is_result_published": true,
"status": "PUBLISHED",
"leaderboard": [
{
"team_name": "Team Alpha",
"total_score": 88.5,
"rank": 1
},
{
"team_name": "Team Beta",
"total_score": 84.0,
"rank": 2
}
]
},
"message": "Published leaderboard retrieved successfully",
"error_code": null
}
Quy tắc:
- Khi kết quả được công bố, bảng xếp hạng công khai tên thật của đội, tổng điểm và thứ hạng.
- Không trả về điểm và nhận xét riêng của từng giám khảo cho thí sinh.
- Dữ liệu công khai phải phản ánh phiên bản kết quả chính thức đã được BTC xác nhận.

### 7.4.2. PATCH /api/v1/admin/leaderboard/publish – Công bố bảng xếp hạng
Mục đích: Cho phép Admin/BTC xác nhận công bố kết quả chính thức.
Quyền truy cập: Admin/BTC.
Request:
PATCH /api/v1/admin/leaderboard/publish
Authorization: Bearer <access_token>
Content-Type: application/json
JSON Request Body:
{
"is_result_published": true
}
Response thành công – HTTP 200 OK:
{
"success": true,
"data": {
"is_result_published": true,
"status": "PUBLISHED",
"published_by": "admin-uuid-001",
"published_at": "2026-10-16T11:00:00Z",
"result_version": 1
},
"message": "Leaderboard published successfully",
"error_code": null
}
Quy tắc nghiệp vụ:
- Chỉ Admin/BTC được phép công bố kết quả.
- Thao tác công bố chỉ được thực hiện sau khi hệ thống kiểm tra điều kiện hoàn thành chấm điểm và tính hợp lệ của dữ liệu kết quả.
- Khi công bố thành công, is_result_published chuyển từ false sang true.
- Trạng thái bảng xếp hạng chuyển từ DRAFT sang PUBLISHED.
- Hệ thống phải ghi nhận người thực hiện, thời điểm công bố và mã phiên bản kết quả vào Audit Log.
- Sau khi công bố, không cho phép chỉnh sửa trực tiếp dữ liệu kết quả chính thức.
- Nếu kết quả đã được công bố, thao tác công bố lại không được tự ý tạo phiên bản kết quả mới hoặc ghi đè dữ liệu đã công bố.
Response lỗi khi người dùng không có quyền – HTTP 403 Forbidden:
{
"success": false,
"data": null,
"message": "You do not have permission to publish the leaderboard",
"error_code": "FORBIDDEN"
}
Response lỗi khi kết quả đã công bố – HTTP 409 Conflict:
{
"success": false,
"data": null,
"message": "The leaderboard has already been published",
"error_code": "RESULTS_ALREADY_PUBLISHED"
}

## 7.5. Quy tắc bảo mật và tính nhất quán cho toàn bộ API
Các API trong phân hệ phải đáp ứng các yêu cầu chung sau:
1. Xác thực: Kiểm tra trạng thái đăng nhập và thông tin xác thực trước khi xử lý yêu cầu.
1. Phân quyền: Kiểm tra vai trò và phạm vi dữ liệu ở Backend. Không coi việc ẩn nút hoặc ẩn trang ở Frontend là biện pháp bảo mật đầy đủ.
1. Blind Judging: Không trả dữ liệu định danh đội thi trong API dành cho Judge.
1. Kiểm tra phân công: Judge chỉ được xem và chấm bài nộp được phân công. Truy cập ngoài phạm vi phải bị chặn với 403 FORBIDDEN_NOT_ASSIGNED_JUDGE.
1. Kiểm tra điểm: Tất cả điểm phải được kiểm tra ở Backend, không chỉ ở giao diện.
1. Khóa phiếu: Phiếu SUBMITTED không được sửa trực tiếp. Việc mở khóa phải do Admin/BTC thực hiện và có Audit Log.
1. Công bố kết quả: Khi is_result_published = false, thí sinh không được nhận dữ liệu bảng xếp hạng nội bộ.
1. Tính nhất quán: Các thao tác ghi dữ liệu phải được xử lý theo cách tránh lưu trạng thái một phần hoặc làm sai lệch điểm tổng hợp.
1. Lịch sử kiểm toán: Các thao tác khóa phiếu, mở khóa, cập nhật kết quả quan trọng và công bố kết quả phải được ghi nhận theo yêu cầu nghiệp vụ.
1. Định dạng Response: Các API phải thống nhất cấu trúc { success, data, message, error_code } để Backend và Frontend dễ tích hợp, kiểm thử và xử lý lỗi.

---
*Kéo từ Notion lúc 20:44:51 16/10/2026 bởi notion-module*
