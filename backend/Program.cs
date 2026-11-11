using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var bugSeeds = QaBugSeedService.FromConfiguration(builder.Environment, builder.Configuration);
var port = Environment.GetEnvironmentVariable("PORT");
if (bugSeeds.RequiresLoopbackOnly)
    builder.WebHost.UseUrls("http://localhost:5080");
else if (int.TryParse(port, out var renderPort) && renderPort is > 0 and <= 65535)
    builder.WebHost.UseUrls($"http://0.0.0.0:{renderPort}");
else if (builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("QA"))
    builder.WebHost.UseUrls("http://localhost:5080");

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException("Jwt:Key must contain at least 32 bytes.");

var adminPassword = builder.Configuration["Admin:Password"];
if (string.IsNullOrWhiteSpace(adminPassword))
    throw new InvalidOperationException("Admin:Password must be configured.");
var demoCustomerUserId = builder.Configuration.GetValue<int?>("DemoAccount:CustomerUserId");
bool IsDemoCustomer(User user) =>
    user.Id == demoCustomerUserId && string.Equals(user.Role, "Customer", StringComparison.Ordinal);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=motorental.db";
connectionString = bugSeeds.GetConnectionString(connectionString);
builder.Services.AddDbContext<AppDb>(o => o.UseSqlite(connectionString));
builder.Services.AddSingleton(bugSeeds);
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(
        "https://hettendedatroi.github.io",
        "https://testing-cyan-kappa.vercel.app",
        "http://localhost:4200",
        "https://localhost:4200")
     .AllowAnyHeader()
     .AllowAnyMethod()));
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
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
            Role = "Admin"
        });
        db.SaveChanges();
    }
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

// FR-01: Đăng ký (vai trò mặc định: Khách thuê)
app.MapPost("/api/auth/register", async (RegisterDto d, AppDb db, CancellationToken cancellationToken) =>
{
    var enteredEmail = (d.Email ?? "").Trim();
    var email = bugSeeds.IsBugEnabled("BUG-07") ? enteredEmail : enteredEmail.ToLowerInvariant();
    if (string.IsNullOrWhiteSpace(d.FullName) || !Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$")
        || !Regex.IsMatch(d.Phone ?? "", @"^0\d{9}$") || (d.Password?.Length ?? 0) < 6)
        return Results.BadRequest(new { message = "Thông tin đăng ký không hợp lệ." });

    if (await db.Users.AnyAsync(u => u.Email == email, cancellationToken))
        return Results.Conflict(new { message = "Email này đã được đăng ký." });

    var user = new User
    {
        FullName = d.FullName.Trim(),
        Email = email,
        Phone = d.Phone!,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword(d.Password),
        Role = bugSeeds.IsBugEnabled("BUG-08")
            && string.Equals(d.Role, "Admin", StringComparison.OrdinalIgnoreCase)
                ? "Admin"
                : "Customer"
    };
    db.Users.Add(user);
    try
    {
        await db.SaveChangesAsync(cancellationToken);
    }
    catch (DbUpdateException ex) when (ex.InnerException is Microsoft.Data.Sqlite.SqliteException sqlite
        && sqlite.SqliteErrorCode == 19)
    {
        return Results.Conflict(new { message = "Email này đã được đăng ký." });
    }
    return Results.Ok(TokenService.Create(user, jwtKey, IsDemoCustomer(user)));
});

// FR-02: Đăng nhập
app.MapPost("/api/auth/login", async (LoginDto d, AppDb db, CancellationToken cancellationToken) =>
{
    var enteredEmail = (d.Email ?? "").Trim();
    var email = bugSeeds.IsBugEnabled("BUG-07") ? enteredEmail : enteredEmail.ToLowerInvariant();
    var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    if (user is null)
    {
        var message = bugSeeds.IsBugEnabled("BUG-09")
            ? "Email không tồn tại."
            : "Email hoặc mật khẩu không đúng.";
        return Results.Json(new { message }, statusCode: 401);
    }

    if (!BCrypt.Net.BCrypt.Verify(d.Password ?? "", user.PasswordHash))
    {
        var message = bugSeeds.IsBugEnabled("BUG-09")
            ? "Mật khẩu không chính xác."
            : "Email hoặc mật khẩu không đúng.";
        return Results.Json(new { message }, statusCode: 401);
    }

    return Results.Ok(TokenService.Create(user, jwtKey, IsDemoCustomer(user)));
});

// Lấy thông tin người đang đăng nhập (dùng để kiểm tra token)
app.MapGet("/api/auth/me", async (ClaimsPrincipal p, AppDb db, CancellationToken cancellationToken) =>
{
    var id = int.Parse(p.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    if (user is null) return Results.Unauthorized();
    if (bugSeeds.IsBugEnabled("BUG-10"))
    {
        return Results.Ok(new
        {
            user.Id,
            user.FullName,
            user.Email,
            user.Phone,
            user.Role,
            IsDemoAccount = IsDemoCustomer(user),
            PasswordHash = "QA_ONLY_DUMMY_HASH"
        });
    }

    return Results.Ok(user.ToDto(IsDemoCustomer(user)));
}).RequireAuthorization();

app.MapPut("/api/auth/me", async (
    UpdateProfileDto request,
    ClaimsPrincipal principal,
    AppDb db,
    CancellationToken cancellationToken) =>
{
    var fullName = request.FullName?.Trim();
    if (string.IsNullOrWhiteSpace(fullName) || !Regex.IsMatch(request.Phone ?? "", @"^0\d{9}$"))
        return Results.BadRequest(new { message = "Họ tên không được để trống; số điện thoại gồm 10 chữ số và bắt đầu bằng 0." });

    var id = int.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
    var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    if (user is null) return Results.Unauthorized();

    if (bugSeeds.IsBugEnabled("BUG-13"))
        return Results.Ok(new UserDto(
            user.Id, fullName, user.Email, request.Phone!, user.Role, IsDemoCustomer(user)));

    user.FullName = fullName;
    user.Phone = request.Phone!;
    await db.SaveChangesAsync(cancellationToken);
    return Results.Ok(user.ToDto(IsDemoCustomer(user)));
}).RequireAuthorization();

app.MapPost("/api/admin/demo-rentals/export", (
    DemoRentalExportRequest request,
    CancellationToken cancellationToken) =>
{
    var rows = request.Rows ?? Array.Empty<DemoRentalExportRow>();
    if (rows.Count > 100 || rows.Any(row => row is null
        || string.IsNullOrWhiteSpace(row.OrderId) || row.OrderId.Length > 40
        || string.IsNullOrWhiteSpace(row.CustomerName) || row.CustomerName.Length > 100
        || string.IsNullOrWhiteSpace(row.MotorcycleName) || row.MotorcycleName.Length > 100
        || string.IsNullOrWhiteSpace(row.Period) || row.Period.Length > 100
        || string.IsNullOrWhiteSpace(row.Amount) || row.Amount.Length > 50
        || string.IsNullOrWhiteSpace(row.Status) || row.Status.Length > 50))
    {
        return Results.BadRequest(new { message = "Danh sách đơn mẫu không hợp lệ." });
    }

    var exportRows = bugSeeds.IsBugEnabled("BUG-12") && rows.Count > 0
        ? rows.Take(rows.Count - 1).ToArray()
        : rows;
    var file = DemoExcelExport.Create(exportRows, cancellationToken);
    return Results.File(file,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "motorental-don-mau.xlsx");
}).RequireAuthorization(policy => policy.RequireRole("Admin"));

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("QA"))
{
    app.MapGet("/api/qa/bug-seeds", (QaBugSeedService seeds) =>
            Results.Ok(new { bugIds = seeds.EnabledIds }))
        .RequireAuthorization();
}

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
    public UserDto ToDto(bool isDemoAccount = false) =>
        new(Id, FullName, Email, Phone, Role, isDemoAccount);
}

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    protected override void OnModelCreating(ModelBuilder b) =>
        b.Entity<User>().HasIndex(u => u.Email).IsUnique();
}

public record RegisterDto(string? FullName, string? Email, string? Phone, string? Password, string? Role);
public record LoginDto(string? Email, string? Password);
public record UpdateProfileDto(string? FullName, string? Phone);
public record UserDto(
    int Id,
    string FullName,
    string Email,
    string Phone,
    string Role,
    bool IsDemoAccount = false);
public record AuthResult(string Token, UserDto User);

public static class TokenService
{
    public static AuthResult Create(User u, string key, bool isDemoAccount)
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
        return new AuthResult(
            new JwtSecurityTokenHandler().WriteToken(jwt),
            u.ToDto(isDemoAccount));
    }
}
