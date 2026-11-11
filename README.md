# MotoRental

Hệ thống hiện có phần đăng ký, đăng nhập và trang tổng quan demo cho cửa hàng thuê xe máy. https://hettendedatroi.github.io/He-thong-quan-li-va-cho-thue-xe-may/

## Công nghệ

- Backend: ASP.NET Core 8, Entity Framework Core, SQLite, JWT và BCrypt.
- Frontend: Angular 18.
- Deploy dự kiến: backend trên Render, frontend trên GitHub Pages.

## Deploy backend lên Render

Tạo một **Web Service** từ repository:

1. Chọn runtime Docker và đặt Dockerfile là `backend/Dockerfile`, build context là `backend`.
2. Tạo biến môi trường:
   - `Jwt__Key`: khóa bí mật ngẫu nhiên tối thiểu 32 bytes.
   - `Admin__Password`: mật khẩu quản trị mạnh.
   - `ConnectionStrings__DefaultConnection`: `Data Source=/var/data/motorental.db`.
3. Nếu gói Render hỗ trợ persistent disk, gắn disk tại `/var/data`. Nếu không gắn persistent disk, dữ liệu SQLite có thể mất khi service được tạo lại hoặc khởi động lại.
4. Có thể đặt health check path là `/health`.

Ứng dụng tự lắng nghe trên cổng do Render cấp qua biến `PORT`. `DemoAccount:CustomerUserId` chỉ định User ID Customer demo (hiện là `2`; có thể ghi đè bằng biến Render `DemoAccount__CustomerUserId`). Backend chỉ trả `isDemoAccount=true` sau khi xác thực token và khớp ID với bản ghi có role Customer; Admin và các tài khoản khác không được đánh dấu. Không commit khóa JWT hoặc mật khẩu thật vào repository. Endpoint API nằm dưới `/api`; URL gốc của service không phải trang web.

## Deploy frontend lên GitHub Pages

Workflow `.github/workflows/deploy-frontend.yml` tự build và deploy khi có thay đổi trong `moto-rental-web/` trên nhánh `main`, hoặc khi chạy thủ công:

1. Trong **Settings → Pages**, chọn GitHub Actions làm nguồn deploy.
2. Đảm bảo API Render được cấu hình cho phép origin `https://hettendedatroi.github.io` (CORS đã khai báo origin này ở backend).
3. Trang web được build với base path `/He-thong-quan-li-va-cho-thue-xe-may/`; workflow cũng tạo `404.html` để hỗ trợ điều hướng trực tiếp tới route Angular trên GitHub Pages.

Frontend production gọi API ở `https://he-thong-quan-li-va-cho-thue-xe-may.onrender.com/api`. Nếu URL service Render của bạn khác, cập nhật `apiUrl` trong `moto-rental-web/src/environments/environment.ts`.

Bản frontend Production chỉ bật BUG-03, BUG-05, BUG-06 và BUG-11 cho tài khoản demo mà backend xác thực qua `isDemoAccount`; không cần bật QA mode trên Render. BUG-03 trì hoãn tìm kiếm kết hợp khoảng 2 giây; BUG-05/06 đăng xuất Customer demo khi chọn Xe số/mở Honda Wave RSX; BUG-11 đảo kết quả khi chọn giá thấp đến cao. Admin và Customer khác không bị áp dụng các lỗi này; tìm kiếm kết hợp và sắp xếp hoạt động bình thường. Không gửi cờ bật BUG từ frontend lên backend. Tắt/thay đổi danh sách trong `productionBugIds` hoặc `productionDemoBugIds` tại `moto-rental-web/src/environments/environment.ts`.

## Chạy local

Yêu cầu: .NET 8 SDK, Node.js 20 trở lên và npm.

Backend dùng `Jwt:Key` và `Admin:Password` từ .NET user-secrets hoặc biến môi trường. Ví dụ PowerShell:

```powershell
cd backend
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "replace-with-a-random-secret-at-least-32-characters"
dotnet user-secrets set "Admin:Password" "replace-with-a-strong-admin-password"
dotnet run
```

API local chạy tại `http://localhost:5080`; cơ sở dữ liệu mặc định là `backend/motorental.db`. Tài khoản quản trị được tạo khi database chưa có Admin: `admin@motorental.vn`, với mật khẩu lấy từ `Admin:Password`.

Chạy frontend ở cửa sổ terminal khác:

```powershell
cd moto-rental-web
npm ci
npm start
```

Mở `http://localhost:4200`. Proxy dev chuyển `/api` tới backend local tại cổng 5080.

## API tài khoản

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Tạo tài khoản Customer |
| POST | `/api/auth/login` | Đăng nhập và nhận JWT |
| GET | `/api/auth/me` | Thông tin tài khoản hiện tại (cần JWT) |
| PUT | `/api/auth/me` | Cập nhật họ tên và số điện thoại của chính người dùng (cần JWT) |
| GET | `/api/admin/ping` | Endpoint kiểm tra quyền Admin |
| POST | `/api/admin/demo-rentals/export` | Xuất các đơn mẫu đang hiển thị thành `.xlsx` (chỉ Admin; không lưu dữ liệu) |
| GET | `/api/qa/bug-seeds` | Danh sách mã BUG đang bật (chỉ có trong Development/QA và cần JWT) |

## Normal Mode và dữ liệu mẫu

Trang tổng quan hiện dùng danh sách xe, giá, ảnh, lượt đánh giá, số liệu báo cáo và đơn thuê mẫu; các mục này không được lấy từ backend.

- Quy trình đặt xe chỉ hiển thị thông báo thành công trên giao diện; chưa lưu đơn, kiểm tra tồn xe hoặc gửi yêu cầu tới cửa hàng.
- Ngày trả xe chưa được kiểm tra phải sau ngày nhận xe.
- Nút yêu thích chỉ thay đổi trạng thái tạm thời trong phiên; tải lại trang sẽ mất.
- Khách hàng bấm “Đơn thuê” không tới được danh sách đơn; mục này chỉ xuất hiện trong giao diện Admin. Liên kết “Báo cáo” của Admin cũng chưa có khu vực đích.
- Biểu tượng thông báo và phím tắt `⌘ K` đang chỉ mang tính trang trí, chưa mở thông báo hoặc đưa con trỏ tới ô tìm kiếm.
- Dashboard, danh sách xe và đơn thuê đều là dữ liệu minh họa, không phản ánh giao dịch thật. Xác nhận đơn chỉ thay đổi trạng thái trong phiên trình duyệt.
- Xuất Excel chỉ xuất các đơn mẫu đang hiển thị, có chú thích “Dữ liệu minh họa, không phải giao dịch thật”; file được tạo trong bộ nhớ và không lưu ở backend.
- Hồ sơ Customer lưu họ tên và số điện thoại trong SQLite. Vai trò, email và mật khẩu không được cập nhật qua chức năng này.

Normal Mode là chế độ mặc định khi chạy local và backend. Frontend Production hiện bật riêng BUG-03 theo cấu hình tĩnh; các seed còn lại vẫn tắt. Backend chỉ bật QA seeds khi cấu hình `QA_BUG_SEEDING_ENABLED=true` cùng danh sách `QA_BUG_IDS`.

## QA Bug Seed Mode

Chỉ dùng tài khoản, dữ liệu giả và cơ sở dữ liệu QA riêng. Backend từ chối khởi động nếu bật QA seeding ngoài môi trường `Development` hoặc `QA`; khi có bất kỳ BUG nào được bật, phải chỉ rõ `QA_DATABASE_PATH`. Backend cũng từ chối nếu đường dẫn này trùng cơ sở dữ liệu bình thường. Không bật QA seeding trên dịch vụ Production hoặc trên dữ liệu người dùng thật. BUG-07 đến BUG-10 chỉ chạy trên loopback (không chấp nhận biến `PORT`/binding công khai); BUG-10 chỉ trả chuỗi `QA_ONLY_DUMMY_HASH`, không bao giờ trả password hash thật.

Tạo secret local một lần (nếu chưa có) và chạy backend trong một cửa sổ PowerShell:

```powershell
Set-Location .\backend
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "<secret-ngẫu-nhiên-tối-thiểu-32-bytes>"
dotnet user-secrets set "Admin:Password" "<mật-khẩu-admin-qa>"

$env:ASPNETCORE_ENVIRONMENT = "QA"
$env:QA_BUG_SEEDING_ENABLED = "true"
$env:QA_BUG_IDS = "BUG-01"
$env:QA_DATABASE_PATH = ".\motorental-qa.db"
dotnet run
```

Trong cửa sổ PowerShell khác, chạy frontend ở chế độ Development để nó đọc danh sách BUG từ API QA:

```powershell
Set-Location .\moto-rental-web
npm ci
npm start
```

Mở `http://localhost:4200`. Mỗi lần chỉ bật một mã BUG để kết quả không phụ thuộc các kịch bản khác. Thay giá trị `QA_BUG_IDS` bằng một mã bất kỳ trong bảng dưới đây rồi khởi động lại backend; danh sách được phân tích nghiêm ngặt và mã không hợp lệ sẽ làm backend báo lỗi cấu hình.

| Mã | Mô phỏng QA |
|---|---|
| BUG-01 | Xác nhận đơn mẫu làm Admin đăng xuất |
| BUG-02 | Lệch nhẹ thanh tìm kiếm trên bố cục desktop |
| BUG-03 | Trễ bất đồng bộ 2 giây khi đã lọc nhóm và tìm từ khóa `honda`; không chặn luồng giao diện |
| BUG-04 | Yamaha Exciter 155 hiển thị đơn vị `đ/giờ` |
| BUG-05 | Customer chọn nhóm Xe số bị đăng xuất |
| BUG-06 | Customer chọn thuê Honda Wave RSX bị đăng xuất |
| BUG-07 | Chấp nhận email khác kiểu chữ và lưu nguyên kiểu chữ trong cơ sở dữ liệu QA |
| BUG-08 | Chỉ trong cơ sở dữ liệu QA, payload đăng ký có `role: "Admin"` tạo tài khoản Admin |
| BUG-09 | Hai thông báo đăng nhập sai khác nhau giữa email không tồn tại và mật khẩu sai |
| BUG-10 | API hồ sơ thêm trường hash giả `QA_ONLY_DUMMY_HASH` |
| BUG-11 | Chọn giá thấp đến cao nhưng danh sách hiển thị cao đến thấp |
| BUG-12 | File Excel bỏ bản ghi cuối cùng trong danh sách đơn mẫu |
| BUG-13 | API/UI báo cập nhật hồ sơ thành công nhưng không lưu vào SQLite |

BUG-07 đến BUG-10 yêu cầu `QA_DATABASE_PATH` riêng. Có thể dùng tên file khác nhau cho từng lượt kiểm thử để mỗi lượt dùng dữ liệu sạch; ứng dụng không tự xóa hoặc sửa cơ sở dữ liệu hiện có. Để tắt chế độ, dừng backend QA và chạy lại trong cửa sổ mới với `QA_BUG_SEEDING_ENABLED=false` (hoặc bỏ các biến QA). Bản build Production của Angular không gọi API lấy cấu hình BUG; chỉ BUG-03 được bật từ cấu hình frontend tĩnh.

API và trang home hiện dùng Minimal API/EF Core trực tiếp theo cấu trúc dự án; bảng SQLite không đổi nên không cần migration. Không có thư viện Excel mới: backend tạo gói `.xlsx` OpenXML bằng các API có sẵn của .NET.
