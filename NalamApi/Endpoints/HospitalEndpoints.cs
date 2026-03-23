using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.DTOs.Hospital;
using NalamApi.Entities;
using NalamApi.Services;

namespace NalamApi.Endpoints;

/// <summary>
/// Hospital registration endpoint (public — called from web portal).
/// Auto-creates the admin user from the hospital's mobile number.
/// </summary>
public static class HospitalEndpoints
{
    public static void MapHospitalEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/hospitals")
            .WithTags("Hospital Registration");

        group.MapPost("/register", RegisterHospital);
    }

    /// <summary>
    /// POST /api/hospitals/register
    /// Creates a new hospital + admin user + default departments.
    /// </summary>
    private static async Task<IResult> RegisterHospital(
        RegisterHospitalRequest request,
        NalamDbContext db,
        AuditService auditService,
        ILogger<Program> logger)
    {
        // Validation
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new RegisterHospitalResponse(false, "Hospital name is required."));

        if (string.IsNullOrWhiteSpace(request.Phone))
            return Results.BadRequest(new RegisterHospitalResponse(false, "Hospital phone is required."));

        if (string.IsNullOrWhiteSpace(request.AdminMobile))
            return Results.BadRequest(new RegisterHospitalResponse(false, "Admin mobile number is required."));

        if (string.IsNullOrWhiteSpace(request.AdminName))
            return Results.BadRequest(new RegisterHospitalResponse(false, "Admin name is required."));

        var adminMobile = request.AdminMobile.Trim().Replace(" ", "");

        // Check if admin mobile is already registered
        var existingUser = await db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.MobileNumber == adminMobile);

        if (existingUser != null)
        {
            return Results.Conflict(new RegisterHospitalResponse(
                false, "This mobile number is already registered as a user."));
        }

        // Check if hospital name already exists (optional business rule)
        var existingHospital = await db.Hospitals
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(h => h.Name.ToLower() == request.Name.Trim().ToLower());

        if (existingHospital != null)
        {
            return Results.Conflict(new RegisterHospitalResponse(
                false, "A hospital with this name already exists."));
        }

        // ── Create Hospital ──────────────────────────────────────
        var hospital = new Hospital
        {
            Name = request.Name.Trim(),
            LicenseNo = request.LicenseNo?.Trim(),
            Address = request.Address?.Trim(),
            City = request.City?.Trim(),
            State = request.State?.Trim(),
            Phone = request.Phone.Trim(),
            Email = request.Email?.Trim(),
            Status = "active"
        };

        db.Hospitals.Add(hospital);

        // ── Create Admin User ────────────────────────────────────
        var adminUser = new User
        {
            HospitalId = hospital.Id,
            FullName = request.AdminName.Trim(),
            MobileNumber = adminMobile,
            Email = request.Email?.Trim(),
            Role = "admin",
            Department = "Administration",
            EmployeeId = "ADM-001",
            Status = "active",
            IsVerified = true  // Admin is auto-verified on registration
        };

        db.Users.Add(adminUser);

        // ── Create Default Departments ───────────────────────────
        var defaultDepartments = new[]
        {
            "General Medicine", "Cardiology", "Neurology", "Orthopedics",
            "Pediatrics", "Pharmacy", "Front Desk", "Emergency",
            "ICU", "General Ward", "Administration"
        };

        foreach (var deptName in defaultDepartments)
        {
            db.Departments.Add(new Department
            {
                HospitalId = hospital.Id,
                Name = deptName,
                IsActive = true
            });
        }

        // ── Create Default Settings ──────────────────────────────
        var defaultSettings = new Dictionary<string, string>
        {
            { "session_timeout_minutes", "15" },
            { "two_factor_enabled", "true" },
            { "max_login_attempts", "5" },
            { "audit_logging", "true" },
            { "email_notifications", "true" },
            { "push_notifications", "true" },
            { "sms_notifications", "false" },
        };

        foreach (var (key, value) in defaultSettings)
        {
            db.HospitalSettings.Add(new HospitalSetting
            {
                HospitalId = hospital.Id,
                Key = key,
                Value = value
            });
        }

        await db.SaveChangesAsync();

        // ── Audit Log ────────────────────────────────────────────
        await auditService.LogAsync(
            hospital.Id, adminUser.Id,
            "Hospital registered",
            "system", "info",
            $"Hospital: {hospital.Name}, Admin: {adminUser.FullName}");

        logger.LogInformation(
            "Hospital {HospitalName} registered with admin {AdminMobile}",
            hospital.Name, adminMobile);

        return Results.Created(
            $"/api/hospitals/{hospital.Id}",
            new RegisterHospitalResponse(true, "Hospital registered successfully.", hospital.Id));
    }
}
