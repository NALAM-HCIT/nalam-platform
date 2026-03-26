using System.Text;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NalamApi.Data;
using NalamApi.Endpoints;
using NalamApi.Middleware;
using NalamApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ═══════════════════════════════════════════════════════════
//  DATABASE (Supabase PostgreSQL)
// ═══════════════════════════════════════════════════════════

var rawConnectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("DATABASE_URL or ConnectionStrings:DefaultConnection must be set.");

// Convert PostgreSQL URI format (postgresql://user:pass@host:port/db) to Npgsql format
string connectionString;
if (rawConnectionString.StartsWith("postgresql://") || rawConnectionString.StartsWith("postgres://"))
{
    // Use regex to safely parse — handles special chars like & in passwords
    var match = System.Text.RegularExpressions.Regex.Match(
        rawConnectionString,
        @"postgres(?:ql)?://(?<user>[^:]+):(?<pass>[^@]+)@(?<host>[^:]+):(?<port>\d+)/(?<db>[^?]+)");
    
    var rawDbUrl = rawConnectionString;
    
    if (match.Success)
    {
        connectionString = $"Host={match.Groups["host"].Value};Port={match.Groups["port"].Value};Database={match.Groups["db"].Value};Username={match.Groups["user"].Value};Password={match.Groups["pass"].Value};Ssl Mode=Require;Trust Server Certificate=true;Pooling=false;Max Auto Prepare=0;";
    }
    else
    {
        throw new InvalidOperationException($"Cannot parse DATABASE_URL. Expected format: postgresql://user:pass@host:port/db");
    }
}
else
{
    connectionString = rawConnectionString;
}

builder.Services.AddDbContext<NalamDbContext>(options =>
    options.UseNpgsql(connectionString));

// ═══════════════════════════════════════════════════════════
//  AUTHENTICATION (JWT)
// ═══════════════════════════════════════════════════════════

var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
    ?? builder.Configuration["Jwt:Secret"]
    ?? "NalamDefaultSecretKey_ChangeInProduction_32chars!";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // Keep JWT claim names as-is (don't remap "role" to long URI)
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "NalamApi",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "NalamApp",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            RoleClaimType = "role",
            NameClaimType = "sub"
        };
    });

// ═══════════════════════════════════════════════════════════
//  AUTHORIZATION (Role-Based Policies)
// ═══════════════════════════════════════════════════════════

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireClaim("role", "admin"));

    options.AddPolicy("DoctorOnly", policy =>
        policy.RequireClaim("role", "doctor"));

    options.AddPolicy("StaffAccess", policy =>
        policy.RequireClaim("role", "admin", "doctor", "pharmacist", "receptionist"));

    options.AddPolicy("PatientOnly", policy =>
        policy.RequireClaim("role", "patient"));
});

// ═══════════════════════════════════════════════════════════
//  RATE LIMITING
// ═══════════════════════════════════════════════════════════

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("otp", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 2
            }));
});

// ═══════════════════════════════════════════════════════════
//  CACHING & COMPRESSION
// ═══════════════════════════════════════════════════════════

builder.Services.AddMemoryCache();
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

// ═══════════════════════════════════════════════════════════
//  SERVICES (DI Registration)
// ═══════════════════════════════════════════════════════════

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<JwtService>();
builder.Services.AddScoped<OtpService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddHttpClient("Pay4Sms");

// ═══════════════════════════════════════════════════════════
//  CORS (Allow Mobile App & Web Portal)
// ═══════════════════════════════════════════════════════════

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNalamClients", policy =>
    {
        policy.WithOrigins(
                "http://localhost:3000",
                "http://localhost:8081",
                "http://localhost:19006",
                "https://nalamapp-webportal.vercel.app")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// ═══════════════════════════════════════════════════════════
//  SWAGGER (Development Only)
// ═══════════════════════════════════════════════════════════

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// ═══════════════════════════════════════════════════════════
//  BUILD APP & CONFIGURE MIDDLEWARE PIPELINE
// ═══════════════════════════════════════════════════════════

var app = builder.Build();

// Development: Swagger UI
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>()?.Error;
        Console.WriteLine($"[CRITICAL ERROR] {exception?.Message}\n{exception?.StackTrace}");
        await context.Response.WriteAsJsonAsync(new 
        { 
            success = false, 
            message = "An internal server error occurred.", 
            error = exception?.Message,
            innerError = exception?.InnerException?.Message,
            stackTrace = exception?.StackTrace
        });
    });
});

// Middleware pipeline (order matters!)
app.UseResponseCompression();
app.UseCors("AllowNalamClients");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<TenantMiddleware>();  // Defense Layer 2: inject hospital_id into PG session

// ═══════════════════════════════════════════════════════════
//  MAP ENDPOINTS
// ═══════════════════════════════════════════════════════════

app.MapAuthEndpoints();
app.MapHospitalEndpoints();
app.MapAdminEndpoints();
app.MapAppointmentEndpoints();
app.MapReceptionistEndpoints();
app.MapPharmacistEndpoints();
app.MapPatientEndpoints();
app.MapPatientProfileEndpoints();
app.MapDoctorPortalEndpoints();

// Health check
app.MapGet("/", () => Results.Ok(new
{
    service = "Nalam API",
    version = "1.0.0",
    status = "running",
    timestamp = DateTime.UtcNow
}));

// DEBUG: Show JWT claims (remove after debugging)
app.MapGet("/api/_debug/claims", (HttpContext ctx) =>
{
    var claims = ctx.User.Claims.Select(c => new { c.Type, c.Value }).ToList();
    return Results.Ok(new { authenticated = ctx.User.Identity?.IsAuthenticated, claims });
}).RequireAuthorization();

// DEBUG ENDPOINT - Safe dump of connection string details to diagnose XX000 error
app.MapGet("/api/_debug/db-config", () => {
    var rawUrl = Environment.GetEnvironmentVariable("DATABASE_URL") ?? "Not set";
    var safeUrl = System.Text.RegularExpressions.Regex.Replace(rawUrl, @"(?<=:)[^@:]+(?=@)", "********");
    
    var m = System.Text.RegularExpressions.Regex.Match(
        rawUrl,
        @"postgres(?:ql)?://(?<user>[^:]+):(?<pass>[^@]+)@(?<host>[^:]+):(?<port>\d+)/(?<db>[^?]+)");
        
    return Results.Ok(new {
        raw_safe = safeUrl,
        parsed_user = m.Success ? m.Groups["user"].Value : null,
        parsed_host = m.Success ? m.Groups["host"].Value : null,
        parsed_port = m.Success ? m.Groups["port"].Value : null,
        parsed_db = m.Success ? m.Groups["db"].Value : null,
        regex_success = m.Success
    });
});


// ═══════════════════════════════════════════════════════════
//  AUTO-MIGRATE DATABASE ON STARTUP
// ═══════════════════════════════════════════════════════════

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NalamDbContext>();
    try
    {
        await db.Database.MigrateAsync();
        Console.WriteLine("✅ Database migration applied successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠️  Migration warning: {ex.Message}");
        Console.WriteLine("   Run 'dotnet ef database update' manually if needed.");
    }
}

// ═══════════════════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════════════════

var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Urls.Add($"http://0.0.0.0:{port}");

Console.WriteLine($"""

    ╔══════════════════════════════════════════╗
    ║          🏥 Nalam API v1.0.0            ║
    ║   Multi-Tenant Telemedicine Backend      ║
    ╠══════════════════════════════════════════╣
    ║   Port: {port,-33}║
    ║   Env:  {app.Environment.EnvironmentName,-33}║
    ╚══════════════════════════════════════════╝

    """);

app.Run();
