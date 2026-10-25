# MotoRental – Đăng nhập / Đăng ký (C# + Angular)

Backend: ASP.NET Core 8 Web API + EF Core SQLite + JWT + BCrypt.
Frontend: Angular 17/18 (standalone components, reactive forms).

## Chạy riêng khi phát triển

Yêu cầu: .NET 8 SDK và Node.js 20.

- Backend: `cd backend` rồi `dotnet run` (API ở http://localhost:5080; tự tạo `motorental.db`).
- Frontend: `cd moto-rental-web`, chạy `npm ci` nếu chưa cài dependencies, sau đó `npm start` (http://localhost:4200). Proxy phát triển chuyển `/api` tới backend.
- Tài khoản quản trị mặc định khi chạy local lần đầu: `admin@motorental.vn` / `Admin@123`. Không nên sử dụng thông tin này khi deploy.

| Method | Đường dẫn | Mô tả |
|---|---|---|
| POST | /api/auth/register | Đăng ký (vai trò Customer) |
| POST | /api/auth/login | Đăng nhập, trả JWT |
| GET | /api/auth/me | Thông tin người dùng (cần token) |
| GET | /api/admin/ping | Chỉ vai trò Admin |

## Ghi chú
- Docker lấy khóa JWT và mật khẩu quản trị từ biến môi trường trong `.env`.
- Đây là phần Tài khoản (FR-01 đến FR-03). Các chức năng xe, đặt xe, đơn thuê làm tiếp theo SRS.
