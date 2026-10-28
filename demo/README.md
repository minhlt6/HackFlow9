# Bộ CSDL demo HackFlow

Bộ demo dùng đúng schema và API của ứng dụng. Không thay thế `backend/hackflow.db`, không gửi email và không sao chép người dùng thật. Công cụ chỉ ghi vào tệp mới hoặc CSDL đích chưa có bản ghi nghiệp vụ.

## Hai trạng thái

| Bản | Mục đích | Điểm | Công bố kết quả |
| --- | --- | --- | --- |
| `generated/hackflow-rehearsal.db` | Demo thao tác cấu hình → thi → hỗ trợ → chấm | Chưa có điểm, có thể sửa rubric trước khi chấm | Chưa công bố |
| `generated/hackflow-results.db` | Demo nhanh tổng hợp, đồng điểm, chênh lệch, mở khóa chấm lại, xuất CSV | 32 điểm thành phần: 4 đội × 2 giám khảo × 4 tiêu chí | Chưa công bố, để trình diễn thao tác công bố |

Mỗi tệp có `.manifest.json` chứa mật khẩu, email, ID, mã đội và số lượng bản ghi. Hai bản đã tạo trong lần bàn giao dùng chung mật khẩu demo; các lần tạo mới tự sinh mật khẩu nếu không đặt `DEMO_PASSWORD`.

Tệp `.accounts.md` đi kèm là bảng tài khoản/mật khẩu và mã đội dễ đọc để mở trong lúc diễn tập.

**Không cộng điểm có sẵn vào bản rehearsal**: một phiếu submitted đã đủ để khóa sửa rubric toàn hệ thống. Đây là lý do cần hai bản riêng.

## Dữ liệu được thiết kế

| Nhóm | Số lượng mỗi bản | Vai trò trong demo |
| --- | --- | --- |
| Tài khoản | 38 | 1 admin, 2 judge, 2 mentor, 33 candidate; có pending/rejected/inactive và thiếu hồ sơ |
| Danh sách trắng | 32 | Email đã duyệt và 1 email chưa có tài khoản |
| Đội / quan hệ thành viên | 8 / 25 | Đủ, thiếu, tối đa, chờ duyệt, bị từ chối, bị khóa, chưa chọn đề tài |
| Lĩnh vực / đề tài nhánh | 3 / 6 | Còn chỗ, hết chỗ, nhánh ngừng hoạt động; có phân công mentor |
| Checkpoint | 4 | Đã đóng, đang mở, chưa mở và chung kết đang mở |
| Bài nộp | 12 | 4 đội × 3 chặng; bài tiến độ có lịch sử v1→v2 |
| Rubric | 4 | Sáng tạo 30%, Kỹ thuật 30%, Ứng dụng 25%, Trình bày 15% |
| Phân công giám khảo | 8 | Hai giám khảo đều được chấm bốn đội đã có bài chung kết |
| Ticket | 6 | Open; mentor1 xử lý; mentor2 xử lý; giải quyết 1h/60h trước; closed |
| Thông báo | 4 | Chung, candidate, mentor và judge |
| Audit | 12 | Ghi rõ `DEMO_FIXTURE_CREATED`, phân biệt bản ghi mẫu với thao tác thật |

Quan hệ chính: `users → team_members → teams → submissions → evaluations`; bài nộp liên kết checkpoint, điểm liên kết judge và rubric. Topic/subtopic liên kết đội; subtopic liên kết mentor. Ticket liên kết người gửi, đội và người xử lý. Ràng buộc FK, email/tên đội/mã đội duy nhất và bài nộp duy nhất theo đội–checkpoint được giữ nguyên.

## Chạy trên máy hiện tại

Tắt backend đang chạy trước khi đổi CSDL. Từ thư mục `backend`, cập nhật các giá trị sau trong `.env`, giữ nguyên `SECRET_KEY` đã dùng lúc tạo dữ liệu:

```dotenv
DATABASE_URL="sqlite+aiosqlite:///../demo/generated/hackflow-rehearsal.db"
ENABLE_STARTUP_SEED=false
ENABLE_DEMO_DATA=false
```

Khởi động backend bằng môi trường Python của dự án:

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Frontend giữ `VITE_API_BASE_URL=http://localhost:8000/api/v1`, rồi chạy `npm run dev` trong `frontend`. Đăng xuất, xóa dữ liệu trang trong trình duyệt hoặc dùng phiên riêng khi đổi DB để tránh giữ token, thông báo và trạng thái từ phiên trước.

Để chuyển sang kết quả, dừng backend, đổi tên tệp trong `DATABASE_URL` sang `hackflow-results.db`, khởi động lại và đăng nhập lại. Không đổi DB khi backend còn chạy.

`ENABLE_STARTUP_SEED=false` là tùy chọn bổ sung trong lần bàn giao này: vẫn khởi tạo/kiểm tra schema, nhưng không thêm đội mẫu cũ hay đặt lại mật khẩu mặc định khi restart.

## Tạo lại trước buổi demo

Thời gian chặng tính theo lúc tạo: chặng mở còn 24 giờ, chung kết còn 36 giờ. **Tạo bộ mới trong ngày demo**; đừng chỉ sửa giờ máy. Muốn diễn lại từ đầu, tạo tệp tên mới và chuyển cấu hình sang tệp đó; công cụ không ghi đè DB đã tồn tại.

Chạy từ `backend`, sau khi đã cấu hình đúng `SECRET_KEY` giống backend sẽ sử dụng:

```powershell
# Tùy chọn: đặt cùng một mật khẩu riêng cho hai bản.
$env:DEMO_PASSWORD = "ThayBangMatKhauDemoCuaBan!"
python scripts/build_demo.py --stage rehearsal --output ../demo/generated/buoi-moi-rehearsal.db
python scripts/build_demo.py --stage results --output ../demo/generated/buoi-moi-results.db
Remove-Item Env:DEMO_PASSWORD
```

Không đặt `SECRET_KEY` mới sau khi tạo DB: cách băm mật khẩu hiện tại phụ thuộc khóa này. Nếu chuyển môi trường với khóa khác, tạo lại dữ liệu bằng đúng khóa của môi trường đích. Có thể đặt `--at 2026-11-01T02:00:00+00:00` để chủ động chọn giờ gốc; mặc định là thời gian UTC hiện tại.

## Nạp lên PostgreSQL demo riêng

Công cụ hỗ trợ driver `asyncpg` đã có trong requirements; không cần nhập file SQLite vào PostgreSQL. Dùng cùng mã nguồn, schema và `SECRET_KEY` như backend đích. Chỉ thao tác trên CSDL demo riêng, không phải CSDL thật:

```powershell
# Giá trị lấy từ PostgreSQL demo; không commit chuỗi kết nối hoặc khóa vào Git.
$env:DEMO_DATABASE_URL = "postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
$env:SECRET_KEY = "KhoaGiongBackendDemoItNhat32KyTu"
python scripts/build_demo.py --stage rehearsal --database-url-env DEMO_DATABASE_URL --manifest ../demo/generated/railway-rehearsal.manifest.json
Remove-Item Env:DEMO_DATABASE_URL
Remove-Item Env:SECRET_KEY
```

CSDL đích phải rỗng về dữ liệu nghiệp vụ; công cụ từ chối nếu một bảng nghiệp vụ đã có dữ liệu. Nó không xóa bảng hoặc reset dữ liệu. Nếu DB đang quản lý bằng Alembic, chạy migration của môi trường đó trước khi nạp; công cụ giữ nguyên bảng revision. Đối với DB được tạo trực tiếp từ model bằng công cụ này, không chạy lại các migration khởi tạo lên bảng đã có mà chưa kiểm tra revision.

Railway cần `DATABASE_URL` đúng PostgreSQL, `ENABLE_STARTUP_SEED=false`, `ENABLE_DEMO_DATA=false`, `DEBUG=false`, khóa bí mật riêng, CORS và địa chỉ API/callback chính xác. Tạo schema và dữ liệu xong mới mở bản demo. Không đưa file DB/manifest chứa tài khoản vào Git; `demo/generated/` đã được loại khỏi Git.

## Giới hạn trình diễn cần biết

- Dữ liệu bài nộp là fixture có nhãn, **không giả mạo SHA đã xác minh**: bài chung kết dùng `sha_verification_failed`, `commit_sha=null`. Bộ hiện tại cho phép giám khảo chấm các bài đó và đã được kiểm tra qua API. Để trình diễn đóng băng SHA thật, dùng leader nộp lại bằng repo GitHub công khai hoạt động và kiểm tra kết quả trả về.
- Các link `example.com` chỉ minh họa dữ liệu; trước buổi trình diễn thay bằng link demo/video/slide thật của nhóm. Link repo mẫu không thể hiện quyền sở hữu của các đội giả lập.
- GitHub OAuth cần tài khoản GitHub thật và callback đã cấu hình. Email `@demo.example.com` không phải hộp thư thực, không dùng để nhận mail hay giả vờ xác minh OAuth.
- Grace period 5 giây, retry GitHub, idempotency và quyền truy cập trực tiếp phù hợp với kịch bản API bổ sung; không dựa vào thao tác chuột sát giây trong buổi thuyết trình.
- Hai khoảng trống chức năng đã nêu trong audit vẫn còn: UI phân công giám khảo; giới hạn đội mentor theo lĩnh vực. Dữ liệu có phân công sẵn, không coi hai khoảng trống đó là đã triển khai.
- Chưa triển khai Railway và chưa chạy thử bộ dữ liệu này trên PostgreSQL thực tế; đã kiểm tra SQLite có FK và API thật trong môi trường tách biệt.
- Khi rà soát để soạn kịch bản, phát hiện thêm luồng đăng ký công khai đang nhận `role` từ request và có thể tạo vai trò quản trị đã duyệt (`auth_service.register_user`). Cần xử lý trước khi mở demo công khai; bộ dữ liệu này không sửa luồng đăng ký đó. Các vấn đề fallback SQLite khi deploy đã nêu trước đó cũng chưa được xử lý trong phạm vi tạo dữ liệu.

Kịch bản đầy đủ: [docs/demo-runbook-vi.md](../docs/demo-runbook-vi.md).
