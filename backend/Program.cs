using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://localhost:5080");
var jwtKey = builder.Configuration["Jwt:Key"]!;

builder.Services.AddDbContext<AppDb>(o => o.UseSqlite("Data Source=motorental.db"));
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:4200").AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// Tạo CSDL và tài khoản quản trị mẫu
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    db.Database.EnsureCreated();
    if (!db.Users.Any(u => u.Role == "Admin"))
    {
        db.Users.Add(new User
        {
            FullName = "Chủ cửa hàng",
            Email = "admin@motorental.vn",
            Phone = "0900000000",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            Role = "Admin"
        });
        db.SaveChanges();
    }
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// FR-01: Đăng ký (vai trò mặc định: Khách thuê)
app.MapPost("/api/auth/register", async (RegisterDto d, AppDb db) =>
{
    var email = (d.Email ?? "").Trim().ToLowerInvariant();
    if (string.IsNullOrWhiteSpace(d.FullName) || !email.Contains('@')
        || !Regex.IsMatch(d.Phone ?? "", @"^0\d{9}$") || (d.Password?.Length ?? 0) < 6)
        return Results.BadRequest(new { message = "Thông tin đăng ký không hợp lệ." });

    if (await db.Users.AnyAsync(u => u.Email == email))
        return Results.Conflict(new { message = "Email này đã được đăng ký." });

    var user = new User
    {
        FullName = d.FullName.Trim(),
        Email = email,
        Phone = d.Phone!,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(d.Password),
        Role = "Customer"
    };
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Ok(TokenService.Create(user, jwtKey));
});

// FR-02: Đăng nhập
app.MapPost("/api/auth/login", async (LoginDto d, AppDb db) =>
{
    var email = (d.Email ?? "").Trim().ToLowerInvariant();
    var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
    if (user is null || !BCrypt.Net.BCrypt.Verify(d.Password ?? "", user.PasswordHash))
        return Results.Json(new { message = "Email hoặc mật khẩu không đúng." }, statusCode: 401);
    return Results.Ok(TokenService.Create(user, jwtKey));
});

// Lấy thông tin người đang đăng nhập (dùng để kiểm tra token)
app.MapGet("/api/auth/me", async (ClaimsPrincipal p, AppDb db) =>
{
    var id = int.Parse(p.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var user = await db.Users.FindAsync(id);
    return user is null ? Results.Unauthorized() : Results.Ok(user.ToDto());
}).RequireAuthorization();

// FR-03: Ví dụ endpoint chỉ dành cho quản trị viên
app.MapGet("/api/admin/ping", () => Results.Ok(new { message = "Xin chào quản trị viên" }))
   .RequireAuthorization(p => p.RequireRole("Admin"));

app.Run();

// ---------------- Models ----------------
public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "Customer"; // Customer | Admin
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public UserDto ToDto() => new(Id, FullName, Email, Phone, Role);
}

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    protected override void OnModelCreating(ModelBuilder b) =>
        b.Entity<User>().HasIndex(u => u.Email).IsUnique();
}

public record RegisterDto(string? FullName, string? Email, string? Phone, string? Password);
public record LoginDto(string? Email, string? Password);
public record UserDto(int Id, string FullName, string Email, string Phone, string Role);
public record AuthResult(string Token, UserDto User);

public static class TokenService
{
    public static AuthResult Create(User u, string key)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, u.Id.ToString()),
            new Claim(ClaimTypes.Email, u.Email),
            new Claim(ClaimTypes.Role, u.Role)
        };
        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var jwt = new JwtSecurityToken(claims: claims, expires: DateTime.UtcNow.AddHours(8), signingCredentials: creds);
        return new AuthResult(new JwtSecurityTokenHandler().WriteToken(jwt), u.ToDto());
    }
}
