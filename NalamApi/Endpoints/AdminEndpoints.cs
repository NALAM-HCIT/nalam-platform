using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.DTOs.Admin;
using NalamApi.Entities;
using NalamApi.Services;

namespace NalamApi.Endpoints;

/// <summary>
/// Admin endpoints: user management, dashboard, settings, profile, activity.
/// All endpoints require 'AdminOnly' authorization policy.
/// Tenant isolation is enforced via EF Core Global Query Filters + RLS.
/// </summary>
public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/admin")
            .WithTags("Admin")
            .RequireAuthorization("AdminOnly");

        // ── User Management ──────────────────────────────────────
        group.MapGet("/users", GetUsers);
        group.MapPost("/users", CreateUser);
        group.MapGet("/users/{id:guid}", GetUserById);
        group.MapPut("/users/{id:guid}", UpdateUser);
        group.MapPatch("/users/{id:guid}/status", ChangeUserStatus);
        group.MapPatch("/users/{id:guid}/role", ChangeUserRole);
        group.MapDelete("/users/{id:guid}", DeleteUser);

        // ── Dashboard ────────────────────────────────────────────
        group.MapGet("/dashboard", GetDashboard);

        // ── Activity / Audit Log ─────────────────────────────────
        group.MapGet("/activity", GetActivity);

        // ── Settings ─────────────────────────────────────────────
        group.MapGet("/settings", GetSettings);
        group.MapPut("/settings", UpdateSettings);

        // ── Profile ──────────────────────────────────────────────
        group.MapGet("/profile", GetProfile);
        group.MapPut("/profile", UpdateProfile);
    }

    // ═══════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════

    private static Guid GetHospitalId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("hospitalId")!.Value);

    private static Guid GetUserId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("sub")!.Value);

    private static UserResponse ToUserResponse(User u) => new(
        u.Id, u.FullName, u.MobileNumber, u.Email,
        u.Role, u.Department, u.EmployeeId, u.ProfilePhotoUrl,
        u.Status, u.IsVerified, u.CreatedAt, u.LastLogin);

    // ═══════════════════════════════════════════════════════════
    //  USER MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /// <summary>GET /api/admin/users — List users with optional search and role filter.</summary>
    private static async Task<IResult> GetUsers(
        NalamDbContext db,
        string? search = null,
        string? role = null,
        string? status = null,
        int page = 1,
        int pageSize = 50)
    {
        var query = db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(role) && role.ToLower() != "all")
            query = query.Where(u => u.Role == role.ToLower());

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(u => u.Status == status.ToLower());

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(q) ||
                u.MobileNumber.Contains(q) ||
                (u.Email != null && u.Email.ToLower().Contains(q)) ||
                (u.EmployeeId != null && u.EmployeeId.ToLower().Contains(q)) ||
                (u.Department != null && u.Department.ToLower().Contains(q)));
        }

        var total = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => ToUserResponse(u))
            .ToListAsync();

        return Results.Ok(new { total, page, pageSize, users });
    }

    /// <summary>POST /api/admin/users — Create a new user for this hospital.</summary>
    private static async Task<IResult> CreateUser(
        CreateUserRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
            return Results.BadRequest(new { error = "Full name is required." });
        if (string.IsNullOrWhiteSpace(request.MobileNumber))
            return Results.BadRequest(new { error = "Mobile number is required." });
        if (string.IsNullOrWhiteSpace(request.Role))
            return Results.BadRequest(new { error = "Role is required." });

        var validRoles = new[] { "doctor", "pharmacist", "receptionist", "admin" };
        if (!validRoles.Contains(request.Role.ToLower()))
            return Results.BadRequest(new { error = $"Invalid role. Valid roles: {string.Join(", ", validRoles)}" });

        var hospitalId = GetHospitalId(ctx);
        var mobile = request.MobileNumber.Trim().Replace(" ", "");

        // Check if mobile already exists in this hospital
        var exists = await db.Users.AnyAsync(u => u.MobileNumber == mobile);
        if (exists)
            return Results.Conflict(new { error = "A user with this mobile number already exists in your hospital." });

        var user = new User
        {
            HospitalId = hospitalId,
            FullName = request.FullName.Trim(),
            MobileNumber = mobile,
            Email = request.Email?.Trim(),
            Role = request.Role.ToLower(),
            Department = request.Department?.Trim(),
            EmployeeId = request.EmployeeId?.Trim(),
            Status = "active",
            IsVerified = false
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        await auditService.LogAsync(
            hospitalId, GetUserId(ctx),
            $"Created user: {user.FullName}",
            "user", "info",
            $"Role: {user.Role}, Mobile: {user.MobileNumber}");

        return Results.Created($"/api/admin/users/{user.Id}", ToUserResponse(user));
    }

    /// <summary>GET /api/admin/users/{id} — Get user details.</summary>
    private static async Task<IResult> GetUserById(Guid id, NalamDbContext db)
    {
        var user = await db.Users.FindAsync(id);
        return user is null ? Results.NotFound(new { error = "User not found." }) : Results.Ok(ToUserResponse(user));
    }

    /// <summary>PUT /api/admin/users/{id} — Update user info.</summary>
    private static async Task<IResult> UpdateUser(
        Guid id,
        UpdateUserRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return Results.NotFound(new { error = "User not found." });

        if (!string.IsNullOrWhiteSpace(request.FullName)) user.FullName = request.FullName.Trim();
        if (request.Email != null) user.Email = request.Email.Trim();
        if (request.Department != null) user.Department = request.Department.Trim();
        if (request.EmployeeId != null) user.EmployeeId = request.EmployeeId.Trim();

        await db.SaveChangesAsync();

        await auditService.LogAsync(
            GetHospitalId(ctx), GetUserId(ctx),
            $"Updated user: {user.FullName}",
            "user", "info");

        return Results.Ok(ToUserResponse(user));
    }

    /// <summary>PATCH /api/admin/users/{id}/status — Activate or deactivate user.</summary>
    private static async Task<IResult> ChangeUserStatus(
        Guid id,
        ChangeStatusRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return Results.NotFound(new { error = "User not found." });

        if (request.Status != "active" && request.Status != "inactive")
            return Results.BadRequest(new { error = "Status must be 'active' or 'inactive'." });

        var oldStatus = user.Status;
        user.Status = request.Status;
        await db.SaveChangesAsync();

        await auditService.LogAsync(
            GetHospitalId(ctx), GetUserId(ctx),
            $"User {user.FullName} status changed: {oldStatus} → {request.Status}",
            "user", request.Status == "inactive" ? "warning" : "info");

        return Results.Ok(ToUserResponse(user));
    }

    /// <summary>PATCH /api/admin/users/{id}/role — Change user role.</summary>
    private static async Task<IResult> ChangeUserRole(
        Guid id,
        ChangeRoleRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return Results.NotFound(new { error = "User not found." });

        var validRoles = new[] { "doctor", "pharmacist", "receptionist", "admin" };
        if (!validRoles.Contains(request.Role.ToLower()))
            return Results.BadRequest(new { error = $"Invalid role. Valid: {string.Join(", ", validRoles)}" });

        var oldRole = user.Role;
        user.Role = request.Role.ToLower();
        await db.SaveChangesAsync();

        await auditService.LogAsync(
            GetHospitalId(ctx), GetUserId(ctx),
            $"User {user.FullName} role changed: {oldRole} → {request.Role}",
            "user", "warning");

        return Results.Ok(ToUserResponse(user));
    }

    /// <summary>DELETE /api/admin/users/{id} — Remove user.</summary>
    private static async Task<IResult> DeleteUser(
        Guid id,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return Results.NotFound(new { error = "User not found." });

        // Prevent deleting yourself
        if (user.Id == GetUserId(ctx))
            return Results.BadRequest(new { error = "You cannot delete your own account." });

        var userName = user.FullName;
        db.Users.Remove(user);
        await db.SaveChangesAsync();

        await auditService.LogAsync(
            GetHospitalId(ctx), GetUserId(ctx),
            $"Deleted user: {userName}",
            "user", "critical");

        return Results.Ok(new { message = $"{userName} has been removed." });
    }

    // ═══════════════════════════════════════════════════════════
    //  DASHBOARD
    // ═══════════════════════════════════════════════════════════

    /// <summary>GET /api/admin/dashboard — Dashboard stats for the hospital.</summary>
    private static async Task<IResult> GetDashboard(NalamDbContext db, HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);

        var users = await db.Users.ToListAsync();
        var departments = await db.Departments.CountAsync();

        var recentActivity = await db.AuditLogs
            .OrderByDescending(a => a.CreatedAt)
            .Take(10)
            .Select(a => new ActivityResponse(
                a.Id, a.Action, a.User != null ? a.User.FullName : "System",
                a.Category, a.Severity, a.Details, a.CreatedAt))
            .ToListAsync();

        return Results.Ok(new DashboardResponse(
            TotalUsers: users.Count,
            ActiveUsers: users.Count(u => u.Status == "active"),
            InactiveUsers: users.Count(u => u.Status == "inactive"),
            Doctors: users.Count(u => u.Role == "doctor"),
            Pharmacists: users.Count(u => u.Role == "pharmacist"),
            Receptionists: users.Count(u => u.Role == "receptionist"),
            TotalDepartments: departments,
            RecentActivity: recentActivity
        ));
    }

    // ═══════════════════════════════════════════════════════════
    //  ACTIVITY / AUDIT LOG
    // ═══════════════════════════════════════════════════════════

    /// <summary>GET /api/admin/activity — Recent audit log entries.</summary>
    private static async Task<IResult> GetActivity(
        NalamDbContext db,
        string? category = null,
        int page = 1,
        int pageSize = 20)
    {
        var query = db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(a => a.Category == category.ToLower());

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new ActivityResponse(
                a.Id, a.Action, a.User != null ? a.User.FullName : "System",
                a.Category, a.Severity, a.Details, a.CreatedAt))
            .ToListAsync();

        return Results.Ok(new { total, page, pageSize, items });
    }

    // ═══════════════════════════════════════════════════════════
    //  SETTINGS
    // ═══════════════════════════════════════════════════════════

    /// <summary>GET /api/admin/settings — Hospital settings.</summary>
    private static async Task<IResult> GetSettings(NalamDbContext db, HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);
        var hospital = await db.Hospitals.FindAsync(hospitalId);

        var settings = await db.HospitalSettings
            .Select(s => new SettingDto(s.Key, s.Value))
            .ToListAsync();

        return Results.Ok(new SettingsResponse(
            hospitalId,
            hospital?.Name ?? "Unknown",
            settings));
    }

    /// <summary>PUT /api/admin/settings — Update hospital settings (upsert).</summary>
    private static async Task<IResult> UpdateSettings(
        UpdateSettingsRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);

        foreach (var setting in request.Settings)
        {
            var existing = await db.HospitalSettings
                .FirstOrDefaultAsync(s => s.Key == setting.Key);

            if (existing != null)
            {
                existing.Value = setting.Value;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                db.HospitalSettings.Add(new HospitalSetting
                {
                    HospitalId = hospitalId,
                    Key = setting.Key,
                    Value = setting.Value
                });
            }
        }

        await db.SaveChangesAsync();

        await auditService.LogAsync(
            hospitalId, GetUserId(ctx),
            $"Settings updated ({request.Settings.Count} keys)",
            "system", "info");

        return Results.Ok(new { message = "Settings updated successfully." });
    }

    // ═══════════════════════════════════════════════════════════
    //  PROFILE
    // ═══════════════════════════════════════════════════════════

    /// <summary>GET /api/admin/profile — Get admin's own profile.</summary>
    private static async Task<IResult> GetProfile(NalamDbContext db, HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var user = await db.Users.Include(u => u.Hospital).FirstOrDefaultAsync(u => u.Id == userId);

        if (user is null) return Results.NotFound(new { error = "Profile not found." });

        return Results.Ok(new ProfileResponse(
            user.Id, user.FullName, user.MobileNumber, user.Email,
            user.Role, user.Department, user.EmployeeId, user.ProfilePhotoUrl,
            user.HospitalId, user.Hospital.Name, user.CreatedAt, user.LastLogin));
    }

    /// <summary>PUT /api/admin/profile — Update admin's own profile.</summary>
    private static async Task<IResult> UpdateProfile(
        UpdateProfileRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var user = await db.Users.FindAsync(userId);

        if (user is null) return Results.NotFound(new { error = "Profile not found." });

        if (!string.IsNullOrWhiteSpace(request.FullName)) user.FullName = request.FullName.Trim();
        if (request.Email != null) user.Email = request.Email.Trim();
        if (request.ProfilePhotoUrl != null) user.ProfilePhotoUrl = request.ProfilePhotoUrl.Trim();

        await db.SaveChangesAsync();

        await auditService.LogAsync(
            GetHospitalId(ctx), userId,
            "Profile updated",
            "user", "info");

        return Results.Ok(new { message = "Profile updated successfully." });
    }
}
