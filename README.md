# MotoRental – Đăng nhập / Đăng ký (C# + Angular)

Backend: ASP.NET Core 8 Web API + EF Core SQLite + JWT + BCrypt.
Frontend: Angular 17/18 (standalone components, reactive forms).

## Chạy toàn bộ ứng dụng bằng Docker

Yêu cầu: Docker Desktop (Windows/macOS) hoặc Docker Engine và Docker Compose (Linux).

1. Tạo file cấu hình riêng từ mẫu:

       Copy-Item .env.example .env

2. Mở `.env`, thay cả `JWT_KEY` và `ADMIN_PASSWORD` bằng giá trị riêng, an toàn. Có thể tạo JWT key ngẫu nhiên bằng PowerShell:

       [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))

   Dùng kết quả làm `JWT_KEY`, và tự đặt mật khẩu quản trị mạnh cho `ADMIN_PASSWORD`. Không commit hoặc chia sẻ file `.env`.

3. Tại thư mục gốc dự án, build và chạy:

       docker compose up --build -d

4. Mở http://localhost. Đăng nhập quản trị bằng `admin@motorental.vn` và mật khẩu đã đặt trong `ADMIN_PASSWORD`.

SQLite được lưu trong Docker volume `motorental_data`, nên dữ liệu vẫn còn khi dừng hoặc tạo lại container. Các lệnh thường dùng:

    docker compose ps
    docker compose logs -f
    docker compose down

`docker compose down` giữ lại volume dữ liệu. Chỉ dùng `docker compose down -v` nếu thực sự muốn xóa cả dữ liệu SQLite.

## Deploy lên Internet

1. Đưa mã nguồn lên máy chủ Linux có Docker/Compose, hoặc một dịch vụ hosting hỗ trợ Docker Compose.
2. Tạo `.env` trực tiếp trên máy chủ với `JWT_KEY` và `ADMIN_PASSWORD` riêng; không đưa file này lên Git.
3. Chạy `docker compose up --build -d`, rồi cấu hình domain trỏ về máy chủ.
4. Cấu hình HTTPS bằng reverse proxy/proxy của nhà cung cấp (ví dụ Caddy, Nginx hoặc Cloudflare). Không nên để website đăng nhập công khai chỉ chạy HTTP.
5. Sao lưu volume `motorental_data` định kỳ. Với nhiều người dùng hoặc cần mở rộng nhiều instance, cân nhắc chuyển từ SQLite sang cơ sở dữ liệu máy chủ.

Container frontend phục vụ Angular và chuyển tiếp `/api/` tới backend, vì vậy trình duyệt không cần biết địa chỉ nội bộ của API.

## Chạy riêng khi phát triển

Yêu cầu: .NET 8 SDK và Node.js 20.

- Backend: `cd backend` rồi `dotnet run` (API ở http://localhost:5080; tự tạo `motorental.db`).
- Frontend: `cd moto-rental-web`, chạy `npm ci` nếu chưa cài dependencies, sau đó `npm start` (http://localhost:4200). Proxy phát triển chuyển `/api` tới backend.
- Tài khoản quản trị mặc định khi chạy local lần đầu: `admin@motorental.vn` / `Admin@123`. Không sử dụng thông tin này khi deploy.

| Method | Đường dẫn | Mô tả |
|---|---|---|
| POST | /api/auth/register | Đăng ký (vai trò Customer) |
| POST | /api/auth/login | Đăng nhập, trả JWT |
| GET | /api/auth/me | Thông tin người dùng (cần token) |
| GET | /api/admin/ping | Chỉ vai trò Admin |

## Ghi chú
- Docker lấy khóa JWT và mật khẩu quản trị từ biến môi trường trong `.env`.
- Đây là phần Tài khoản (FR-01 đến FR-03). Các chức năng xe, đặt xe, đơn thuê làm tiếp theo SRS.
