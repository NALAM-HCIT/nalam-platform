using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
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

        // ── Doctor Profile Management ───────────────────────────
        group.MapGet("/doctor-profiles", GetDoctorProfiles);
        group.MapPost("/doctor-profiles", CreateDoctorProfile);
        group.MapPut("/doctor-profiles/{id:guid}", UpdateDoctorProfile);
        group.MapDelete("/doctor-profiles/{id:guid}", DeleteDoctorProfile);

        // ── Doctor Schedule Management ──────────────────────────
        group.MapPost("/doctor-schedules", CreateDoctorSchedule);
        group.MapDelete("/doctor-schedules/{id:guid}", DeleteDoctorSchedule);

        // ── Seed Data ─────────────────────────────────────────────
        group.MapPost("/seed-doctors", SeedDoctors);
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
        var query = db.Users.AsNoTracking().AsQueryable();

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
        var mobile = AuthEndpoints.NormalizeMobile(request.MobileNumber);

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

        // Auto-create DoctorProfile when role is "doctor"
        DoctorProfile? doctorProfile = null;
        if (user.Role == "doctor")
        {
            var specialty = request.Specialty?.Trim() ?? request.Department?.Trim() ?? "General Medicine";
            var fee = request.ConsultationFee ?? 500m;

            doctorProfile = new DoctorProfile
            {
                HospitalId = hospitalId,
                UserId = user.Id,
                Specialty = specialty,
                ExperienceYears = request.ExperienceYears ?? 0,
                ConsultationFee = fee,
                AvailableForVideo = true,
                AvailableForInPerson = true,
                Languages = request.Languages?.Trim() ?? "English, Tamil",
                Bio = request.Bio?.Trim(),
                IsAcceptingAppointments = true
            };
            db.DoctorProfiles.Add(doctorProfile);
            await db.SaveChangesAsync();

            // Auto-create default weekly schedule: Mon-Fri 09:00-12:00 + 14:00-17:00, Sat 10:00-13:00
            var defaultSchedules = new (int Day, string Start, string End, string Type)[]
            {
                (1, "09:00", "12:00", "both"), (1, "14:00", "17:00", "both"),
                (2, "09:00", "12:00", "both"), (2, "14:00", "17:00", "both"),
                (3, "09:00", "12:00", "both"), (3, "14:00", "17:00", "both"),
                (4, "09:00", "12:00", "both"), (4, "14:00", "17:00", "both"),
                (5, "09:00", "12:00", "both"), (5, "14:00", "17:00", "both"),
                (6, "10:00", "13:00", "both"),
            };

            foreach (var s in defaultSchedules)
            {
                db.DoctorSchedules.Add(new DoctorSchedule
                {
                    HospitalId = hospitalId,
                    DoctorProfileId = doctorProfile.Id,
                    DayOfWeek = s.Day,
                    StartTime = TimeOnly.Parse(s.Start),
                    EndTime = TimeOnly.Parse(s.End),
                    SlotDurationMinutes = 30,
                    ConsultationType = s.Type
                });
            }
            await db.SaveChangesAsync();
        }

        await auditService.LogAsync(
            hospitalId, GetUserId(ctx),
            $"Created user: {user.FullName}" + (doctorProfile != null ? $" with doctor profile ({doctorProfile.Specialty})" : ""),
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

    /// <summary>GET /api/admin/dashboard — Dashboard stats for the hospital (cached 2 min).</summary>
    private static async Task<IResult> GetDashboard(NalamDbContext db, HttpContext ctx, IMemoryCache cache)
    {
        var hospitalId = GetHospitalId(ctx);
        var cacheKey = $"dashboard_{hospitalId}";

        if (cache.TryGetValue(cacheKey, out DashboardResponse? cached) && cached != null)
            return Results.Ok(cached);

        var users = await db.Users.AsNoTracking().ToListAsync();
        var departments = await db.Departments.AsNoTracking().CountAsync();

        var recentActivity = await db.AuditLogs.AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .Take(10)
            .Select(a => new ActivityResponse(
                a.Id, a.Action, a.User != null ? a.User.FullName : "System",
                a.Category, a.Severity, a.Details, a.CreatedAt))
            .ToListAsync();

        var result = new DashboardResponse(
            TotalUsers: users.Count,
            ActiveUsers: users.Count(u => u.Status == "active"),
            InactiveUsers: users.Count(u => u.Status == "inactive"),
            Doctors: users.Count(u => u.Role == "doctor"),
            Pharmacists: users.Count(u => u.Role == "pharmacist"),
            Receptionists: users.Count(u => u.Role == "receptionist"),
            TotalDepartments: departments,
            RecentActivity: recentActivity
        );

        cache.Set(cacheKey, result, TimeSpan.FromMinutes(2));
        return Results.Ok(result);
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
        var query = db.AuditLogs.AsNoTracking().AsQueryable();

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

        var settings = await db.HospitalSettings.AsNoTracking()
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
        var user = await db.Users.AsNoTracking().Include(u => u.Hospital).FirstOrDefaultAsync(u => u.Id == userId);

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

    // ═══════════════════════════════════════════════════════════
    //  DOCTOR PROFILE MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    private static DoctorProfileResponse ToDoctorProfileResponse(DoctorProfile dp) => new(
        dp.Id, dp.UserId, dp.User?.FullName ?? "Doctor", dp.Specialty,
        dp.ExperienceYears, dp.ConsultationFee,
        dp.AvailableForVideo, dp.AvailableForInPerson,
        dp.Languages, dp.Rating, dp.ReviewCount, dp.Bio,
        dp.IsAcceptingAppointments, dp.CreatedAt,
        dp.Schedules?.Select(s => new DoctorScheduleResponse(
            s.Id, s.DayOfWeek,
            s.StartTime.ToString("HH:mm"), s.EndTime.ToString("HH:mm"),
            s.SlotDurationMinutes, s.ConsultationType, s.IsActive
        )).ToList() ?? []
    );

    /// <summary>GET /api/admin/doctor-profiles — List all doctor profiles for this hospital.</summary>
    private static async Task<IResult> GetDoctorProfiles(NalamDbContext db)
    {
        var profiles = await db.DoctorProfiles.AsNoTracking()
            .Include(dp => dp.User)
            .Include(dp => dp.Schedules)
            .OrderBy(dp => dp.User.FullName)
            .ToListAsync();

        return Results.Ok(new { profiles = profiles.Select(ToDoctorProfileResponse) });
    }

    /// <summary>POST /api/admin/doctor-profiles — Create a doctor profile for an existing doctor user.</summary>
    private static async Task<IResult> CreateDoctorProfile(
        CreateDoctorProfileRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);

        // Verify the user exists, belongs to this hospital, and has role "doctor"
        var user = await db.Users.FindAsync(request.UserId);
        if (user is null)
            return Results.NotFound(new { error = "User not found." });
        if (user.Role != "doctor")
            return Results.BadRequest(new { error = "User must have role 'doctor' to create a doctor profile." });

        // Check if profile already exists
        var exists = await db.DoctorProfiles.AnyAsync(dp => dp.UserId == request.UserId);
        if (exists)
            return Results.Conflict(new { error = "Doctor profile already exists for this user." });

        if (string.IsNullOrWhiteSpace(request.Specialty))
            return Results.BadRequest(new { error = "Specialty is required." });
        if (request.ConsultationFee <= 0)
            return Results.BadRequest(new { error = "Consultation fee must be greater than 0." });

        var profile = new DoctorProfile
        {
            HospitalId = hospitalId,
            UserId = request.UserId,
            Specialty = request.Specialty.Trim(),
            ExperienceYears = request.ExperienceYears,
            ConsultationFee = request.ConsultationFee,
            AvailableForVideo = request.AvailableForVideo,
            AvailableForInPerson = request.AvailableForInPerson,
            Languages = request.Languages?.Trim(),
            Bio = request.Bio?.Trim()
        };

        db.DoctorProfiles.Add(profile);
        await db.SaveChangesAsync();

        // Reload with navigation
        profile.User = user;
        profile.Schedules = [];

        await auditService.LogAsync(
            hospitalId, GetUserId(ctx),
            $"Created doctor profile for {user.FullName}",
            "doctor", "info",
            $"Specialty: {profile.Specialty}, Fee: {profile.ConsultationFee}");

        return Results.Created($"/api/admin/doctor-profiles/{profile.Id}", ToDoctorProfileResponse(profile));
    }

    /// <summary>PUT /api/admin/doctor-profiles/{id} — Update a doctor profile.</summary>
    private static async Task<IResult> UpdateDoctorProfile(
        Guid id,
        UpdateDoctorProfileRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var profile = await db.DoctorProfiles
            .Include(dp => dp.User)
            .Include(dp => dp.Schedules)
            .FirstOrDefaultAsync(dp => dp.Id == id);

        if (profile is null)
            return Results.NotFound(new { error = "Doctor profile not found." });

        if (!string.IsNullOrWhiteSpace(request.Specialty)) profile.Specialty = request.Specialty.Trim();
        if (request.ExperienceYears.HasValue) profile.ExperienceYears = request.ExperienceYears.Value;
        if (request.ConsultationFee.HasValue) profile.ConsultationFee = request.ConsultationFee.Value;
        if (request.AvailableForVideo.HasValue) profile.AvailableForVideo = request.AvailableForVideo.Value;
        if (request.AvailableForInPerson.HasValue) profile.AvailableForInPerson = request.AvailableForInPerson.Value;
        if (request.Languages != null) profile.Languages = request.Languages.Trim();
        if (request.Bio != null) profile.Bio = request.Bio.Trim();
        if (request.IsAcceptingAppointments.HasValue) profile.IsAcceptingAppointments = request.IsAcceptingAppointments.Value;
        profile.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        await auditService.LogAsync(
            GetHospitalId(ctx), GetUserId(ctx),
            $"Updated doctor profile for {profile.User.FullName}",
            "doctor", "info");

        return Results.Ok(ToDoctorProfileResponse(profile));
    }

    /// <summary>DELETE /api/admin/doctor-profiles/{id} — Delete a doctor profile.</summary>
    private static async Task<IResult> DeleteDoctorProfile(
        Guid id,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var profile = await db.DoctorProfiles
            .Include(dp => dp.User)
            .FirstOrDefaultAsync(dp => dp.Id == id);

        if (profile is null)
            return Results.NotFound(new { error = "Doctor profile not found." });

        var doctorName = profile.User.FullName;
        db.DoctorProfiles.Remove(profile);
        await db.SaveChangesAsync();

        await auditService.LogAsync(
            GetHospitalId(ctx), GetUserId(ctx),
            $"Deleted doctor profile for {doctorName}",
            "doctor", "warning");

        return Results.Ok(new { message = $"Doctor profile for {doctorName} has been removed." });
    }

    // ═══════════════════════════════════════════════════════════
    //  DOCTOR SCHEDULE MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /// <summary>POST /api/admin/doctor-schedules — Add a schedule block for a doctor.</summary>
    private static async Task<IResult> CreateDoctorSchedule(
        CreateDoctorScheduleRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);

        var profile = await db.DoctorProfiles
            .Include(dp => dp.User)
            .FirstOrDefaultAsync(dp => dp.Id == request.DoctorProfileId);

        if (profile is null)
            return Results.NotFound(new { error = "Doctor profile not found." });

        if (request.DayOfWeek < 0 || request.DayOfWeek > 6)
            return Results.BadRequest(new { error = "DayOfWeek must be 0 (Sunday) to 6 (Saturday)." });

        if (!TimeOnly.TryParse(request.StartTime, out var startTime))
            return Results.BadRequest(new { error = "Invalid StartTime format. Use HH:mm." });
        if (!TimeOnly.TryParse(request.EndTime, out var endTime))
            return Results.BadRequest(new { error = "Invalid EndTime format. Use HH:mm." });

        if (endTime <= startTime)
            return Results.BadRequest(new { error = "EndTime must be after StartTime." });

        var validTypes = new[] { "video", "in-person", "both" };
        if (!validTypes.Contains(request.ConsultationType))
            return Results.BadRequest(new { error = $"ConsultationType must be: {string.Join(", ", validTypes)}" });

        if (request.SlotDurationMinutes <= 0 || request.SlotDurationMinutes > 120)
            return Results.BadRequest(new { error = "SlotDurationMinutes must be between 1 and 120." });

        var schedule = new DoctorSchedule
        {
            HospitalId = hospitalId,
            DoctorProfileId = request.DoctorProfileId,
            DayOfWeek = request.DayOfWeek,
            StartTime = startTime,
            EndTime = endTime,
            SlotDurationMinutes = request.SlotDurationMinutes,
            ConsultationType = request.ConsultationType
        };

        db.DoctorSchedules.Add(schedule);
        await db.SaveChangesAsync();

        var dayName = ((System.DayOfWeek)request.DayOfWeek).ToString();
        await auditService.LogAsync(
            hospitalId, GetUserId(ctx),
            $"Added schedule for {profile.User.FullName}: {dayName} {request.StartTime}-{request.EndTime}",
            "doctor", "info");

        return Results.Created($"/api/admin/doctor-schedules/{schedule.Id}", new DoctorScheduleResponse(
            schedule.Id, schedule.DayOfWeek,
            schedule.StartTime.ToString("HH:mm"), schedule.EndTime.ToString("HH:mm"),
            schedule.SlotDurationMinutes, schedule.ConsultationType, schedule.IsActive
        ));
    }

    /// <summary>DELETE /api/admin/doctor-schedules/{id} — Remove a schedule block.</summary>
    private static async Task<IResult> DeleteDoctorSchedule(
        Guid id,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var schedule = await db.DoctorSchedules.FindAsync(id);
        if (schedule is null)
            return Results.NotFound(new { error = "Schedule not found." });

        db.DoctorSchedules.Remove(schedule);
        await db.SaveChangesAsync();

        await auditService.LogAsync(
            GetHospitalId(ctx), GetUserId(ctx),
            "Removed doctor schedule block",
            "doctor", "info");

        return Results.Ok(new { message = "Schedule block removed." });
    }

    // ═══════════════════════════════════════════════════════════
    //  SEED DATA
    // ═══════════════════════════════════════════════════════════

    /// <summary>
    /// POST /api/admin/seed-doctors — Create sample doctor users, profiles, and schedules
    /// for testing the appointment booking flow. Skips any doctor user whose mobile already exists.
    /// </summary>
    private static async Task<IResult> SeedDoctors(
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);

        var seedDoctors = new[]
        {
            new { Name = "Dr. Aruna Reddy",     Mobile = "+919876500001", Specialty = "Cardiology",    Dept = "Cardiology",     Fee = 800m,  Exp = 15, Languages = "English, Tamil, Hindi",   Bio = "Senior cardiologist with expertise in interventional cardiology and heart failure management." },
            new { Name = "Dr. Kavitha Sundaram", Mobile = "+919876500002", Specialty = "Dermatology",   Dept = "Dermatology",    Fee = 600m,  Exp = 10, Languages = "English, Tamil",           Bio = "Specializes in cosmetic dermatology, acne treatment, and skin allergy management." },
            new { Name = "Dr. Rajesh Kumar",     Mobile = "+919876500003", Specialty = "Orthopedics",   Dept = "Orthopedics",    Fee = 750m,  Exp = 12, Languages = "English, Hindi, Telugu",   Bio = "Expert in sports medicine, joint replacement, and fracture management." },
            new { Name = "Dr. Priya Nair",       Mobile = "+919876500004", Specialty = "Pediatrics",    Dept = "Pediatrics",     Fee = 500m,  Exp = 8,  Languages = "English, Tamil, Malayalam", Bio = "Caring pediatrician focusing on child development, vaccinations, and newborn care." },
            new { Name = "Dr. Suresh Babu",      Mobile = "+919876500005", Specialty = "General Medicine", Dept = "General Medicine", Fee = 400m, Exp = 20, Languages = "English, Tamil",       Bio = "Experienced general physician with a holistic approach to patient wellness." },
        };

        // Standard weekly schedule template: Mon-Fri morning + afternoon, Sat morning only
        var scheduleTemplates = new[]
        {
            new { Day = 1, Start = "09:00", End = "12:00", Slot = 30, Type = "both" },   // Monday AM
            new { Day = 1, Start = "14:00", End = "17:00", Slot = 30, Type = "video" },   // Monday PM
            new { Day = 2, Start = "09:00", End = "12:00", Slot = 30, Type = "both" },   // Tuesday AM
            new { Day = 2, Start = "14:00", End = "17:00", Slot = 30, Type = "in-person" }, // Tuesday PM
            new { Day = 3, Start = "09:00", End = "12:00", Slot = 30, Type = "both" },   // Wednesday AM
            new { Day = 3, Start = "14:00", End = "17:00", Slot = 30, Type = "video" },   // Wednesday PM
            new { Day = 4, Start = "09:00", End = "12:00", Slot = 30, Type = "both" },   // Thursday AM
            new { Day = 4, Start = "14:00", End = "17:00", Slot = 30, Type = "in-person" }, // Thursday PM
            new { Day = 5, Start = "09:00", End = "12:00", Slot = 30, Type = "both" },   // Friday AM
            new { Day = 5, Start = "14:00", End = "16:00", Slot = 30, Type = "video" },   // Friday PM (shorter)
            new { Day = 6, Start = "10:00", End = "13:00", Slot = 30, Type = "in-person" }, // Saturday AM
        };

        int usersCreated = 0, profilesCreated = 0, schedulesCreated = 0;

        foreach (var doc in seedDoctors)
        {
            // Find or create the user
            var user = await db.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.MobileNumber == doc.Mobile && u.HospitalId == hospitalId);

            if (user is null)
            {
                user = new User
                {
                    HospitalId = hospitalId,
                    FullName = doc.Name,
                    MobileNumber = doc.Mobile,
                    Role = "doctor",
                    Department = doc.Dept,
                    Status = "active",
                    IsVerified = true,
                    EmployeeId = $"DOC-{doc.Mobile[^3..]}"
                };
                db.Users.Add(user);
                await db.SaveChangesAsync();
                usersCreated++;
            }

            // Create profile if doesn't exist
            var profileExists = await db.DoctorProfiles
                .IgnoreQueryFilters()
                .AnyAsync(dp => dp.UserId == user.Id && dp.HospitalId == hospitalId);

            if (profileExists) continue;

            var profile = new DoctorProfile
            {
                HospitalId = hospitalId,
                UserId = user.Id,
                Specialty = doc.Specialty,
                ExperienceYears = doc.Exp,
                ConsultationFee = doc.Fee,
                AvailableForVideo = true,
                AvailableForInPerson = true,
                Languages = doc.Languages,
                Bio = doc.Bio,
                Rating = 4.0m + (decimal)(new Random(doc.Mobile.GetHashCode()).NextDouble() * 0.9),
                ReviewCount = new Random(doc.Mobile.GetHashCode()).Next(20, 150),
                IsAcceptingAppointments = true
            };

            db.DoctorProfiles.Add(profile);
            await db.SaveChangesAsync();
            profilesCreated++;

            // Add schedules
            foreach (var tmpl in scheduleTemplates)
            {
                db.DoctorSchedules.Add(new DoctorSchedule
                {
                    HospitalId = hospitalId,
                    DoctorProfileId = profile.Id,
                    DayOfWeek = tmpl.Day,
                    StartTime = TimeOnly.Parse(tmpl.Start),
                    EndTime = TimeOnly.Parse(tmpl.End),
                    SlotDurationMinutes = tmpl.Slot,
                    ConsultationType = tmpl.Type
                });
                schedulesCreated++;
            }

            await db.SaveChangesAsync();
        }

        await auditService.LogAsync(
            hospitalId, GetUserId(ctx),
            $"Seeded doctor data: {usersCreated} users, {profilesCreated} profiles, {schedulesCreated} schedules",
            "system", "info");

        return Results.Ok(new
        {
            message = "Seed data created successfully.",
            usersCreated,
            profilesCreated,
            schedulesCreated
        });
    }
}
