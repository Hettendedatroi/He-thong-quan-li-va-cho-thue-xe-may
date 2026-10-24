# MotoRental – Đăng nhập / Đăng ký (C# + Angular)

Backend: ASP.NET Core 8 Web API + EF Core SQLite + JWT + BCrypt.
Frontend: Angular 17/18 (standalone components, reactive forms).

## 1. Chạy backend
Yêu cầu: .NET 8 SDK.

    cd backend
    dotnet run

API chạy tại http://localhost:5080 (tự tạo file motorental.db).
Tài khoản quản trị mẫu: admin@motorental.vn / Admin@123

| Method | Đường dẫn | Mô tả |
|---|---|---|
| POST | /api/auth/register | Đăng ký (vai trò Customer) |
| POST | /api/auth/login | Đăng nhập, trả JWT |
| GET | /api/auth/me | Thông tin người dùng (cần token) |
| GET | /api/admin/ping | Chỉ vai trò Admin |

## 2. Chạy frontend
Yêu cầu: Node.js 18+.

    npx @angular/cli@18 new moto-rental-web --routing --style=css --ssr=false
    cd moto-rental-web
    # xóa file mặc định rồi chép thư mục src của gói này đè lên
    rm src/app/app.component.html src/app/app.component.css src/app/app.component.spec.ts
    cp -r ../frontend/src/* src/
    ng serve

Mở http://localhost:4200.

## Ghi chú
- Đổi khóa JWT trong backend/appsettings.json (tối thiểu 32 ký tự).
- Địa chỉ API cấu hình ở hằng số API trong frontend/src/app/auth/auth.ts.
- Đây là phần Tài khoản (FR-01 đến FR-03). Các chức năng xe, đặt xe, đơn thuê làm tiếp theo SRS.
