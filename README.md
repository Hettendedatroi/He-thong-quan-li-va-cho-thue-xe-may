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

Ứng dụng tự lắng nghe trên cổng do Render cấp qua biến `PORT`. Không commit khóa JWT hoặc mật khẩu thật vào repository. Endpoint API nằm dưới `/api`; URL gốc của service không phải trang web.

## Deploy frontend lên GitHub Pages

Workflow `.github/workflows/deploy-frontend.yml` tự build và deploy khi có thay đổi trong `moto-rental-web/` trên nhánh `main`, hoặc khi chạy thủ công:

1. Trong **Settings → Pages**, chọn GitHub Actions làm nguồn deploy.
2. Đảm bảo API Render được cấu hình cho phép origin `https://hettendedatroi.github.io` (CORS đã khai báo origin này ở backend).
3. Trang web được build với base path `/He-thong-quan-li-va-cho-thue-xe-may/`; workflow cũng tạo `404.html` để hỗ trợ điều hướng trực tiếp tới route Angular trên GitHub Pages.

Frontend production gọi API ở `https://he-thong-quan-li-va-cho-thue-xe-may.onrender.com/api`. Nếu URL service Render của bạn khác, cập nhật `apiUrl` trong `moto-rental-web/src/environments/environment.ts`.

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
| GET | `/api/admin/ping` | Endpoint kiểm tra quyền Admin |

## Phạm vi demo và các điểm cần kiểm thử

Trang tổng quan hiện dùng danh sách xe, giá, ảnh, lượt đánh giá, số liệu báo cáo và đơn thuê mẫu; các mục này không được lấy từ backend.

- Quy trình đặt xe chỉ hiển thị thông báo thành công trên giao diện; chưa lưu đơn, kiểm tra tồn xe hoặc gửi yêu cầu tới cửa hàng.
- Ngày trả xe chưa được kiểm tra phải sau ngày nhận xe.
- Nút yêu thích chỉ thay đổi trạng thái tạm thời trong phiên; tải lại trang sẽ mất.
- Khách hàng bấm “Đơn thuê” không tới được danh sách đơn; mục này chỉ xuất hiện trong giao diện Admin. Liên kết “Báo cáo” của Admin cũng chưa có khu vực đích.
- Biểu tượng thông báo và phím tắt `⌘ K` đang chỉ mang tính trang trí, chưa mở thông báo hoặc đưa con trỏ tới ô tìm kiếm.
- Chức năng quản lý đội xe và đơn thuê chưa có luồng nghiệp vụ đầy đủ; yêu thích không được lưu sau khi tải lại trang.
- Dữ liệu trang Admin là dữ liệu minh họa, không phản ánh giao dịch thật.

Đây là các giới hạn/chức năng chưa hoàn thiện của bản demo, không nên xem số liệu hoặc trạng thái đặt xe là dữ liệu nghiệp vụ thật.
