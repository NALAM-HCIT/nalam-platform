using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.DTOs.Auth;
using NalamApi.Entities;
using NalamApi.Services;

namespace NalamApi.Endpoints;

/// <summary>
/// Authentication endpoints: OTP-only login flow.
/// Patients authenticate against the patients table.
/// Staff (doctor/pharmacist/receptionist/admin) authenticate against the users table.
/// Rate-limited to 5 requests/minute per client.
/// </summary>
public static class AuthEndpoints
{
    /// <summary>
    /// Normalize mobile number: strip spaces, +91/91 prefix → always 10-digit.
    /// Handles: "+919876543210", "919876543210", "9876543210", "+91 98765 43210"
    /// </summary>
    public static string NormalizeMobile(string raw)
    {
        var m = raw.Trim().Replace(" ", "").Replace("-", "");
        if (m.StartsWith("+91")) m = m[3..];
        else if (m.StartsWith("91") && m.Length == 12) m = m[2..];
        return m;
    }

    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Authentication")
            .RequireRateLimiting("otp");

        group.MapPost("/send-otp", SendOtp);
        group.MapPost("/verify-otp", VerifyOtp);
        group.MapPost("/patient-register", PatientRegister);
        group.MapPost("/switch-role", SwitchRole).RequireAuthorization();
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /api/auth/send-otp
    //  Routes to patients or users table based on accountType.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> SendOtp(
        SendOtpRequest request,
        NalamDbContext db,
        OtpService otpService,
        IServiceScopeFactory scopeFactory,
        ILogger<Program> logger)
    {
        if (string.IsNullOrWhiteSpace(request.MobileNumber))
            return Results.BadRequest(new AuthResponse(false, "Mobile number is required."));

        var mobile = NormalizeMobile(request.MobileNumber);

        if (request.AccountType == "patient")
            return await SendOtpForPatient(mobile, request, db, otpService, scopeFactory, logger);
        else
            return await SendOtpForStaff(mobile, request, db, otpService, scopeFactory, logger);
    }

    private static async Task<IResult> SendOtpForPatient(
        string mobile,
        SendOtpRequest request,
        NalamDbContext db,
        OtpService otpService,
        IServiceScopeFactory scopeFactory,
        ILogger<Program> logger)
    {
        var patientQuery = db.Patients
            .IgnoreQueryFilters()
            .Include(p => p.Hospital)
            .Where(p => p.MobileNumber == mobile && p.Status == "active");

        if (request.HospitalId.HasValue)
            patientQuery = patientQuery.Where(p => p.HospitalId == request.HospitalId.Value);

        var patient = await patientQuery.FirstOrDefaultAsync();

        if (patient == null)
            return Results.Ok(new AuthResponse(false, "Mobile number not registered.", IsNewUser: true));

        if (patient.Hospital.Status != "active")
            return Results.Ok(new AuthResponse(false, "Hospital account is not active."));

        // Invalidate existing unused OTPs for this patient
        var existingOtps = await db.OtpVerifications
            .IgnoreQueryFilters()
            .Where(o => o.PatientId == patient.Id && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var existing in existingOtps)
            existing.IsUsed = true;

        // Generate and store new OTP
        var otpCode = otpService.GenerateOtp();
        var otpRecord = new OtpVerification
        {
            PatientId = patient.Id,
            UserId = null,
            MobileNumber = mobile,
            OtpCode = otpCode,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            AttemptCount = 0
        };

        db.OtpVerifications.Add(otpRecord);
        await db.SaveChangesAsync();

        // Fire and Forget: Send OTP in background
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var bgOtpService = scope.ServiceProvider.GetRequiredService<OtpService>();
                await bgOtpService.SendOtpAsync(mobile, otpCode);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background OTP send failed for patient {Mobile}", mobile);
            }
        });

        logger.LogInformation("OTP sent for patient {Mobile} (PatientId: {PatientId})", mobile, patient.Id);
        return Results.Ok(new AuthResponse(true, "OTP sent successfully."));
    }

    private static async Task<IResult> SendOtpForStaff(
        string mobile,
        SendOtpRequest request,
        NalamDbContext db,
        OtpService otpService,
        IServiceScopeFactory scopeFactory,
        ILogger<Program> logger)
    {
        var userQuery = db.Users
            .IgnoreQueryFilters()
            .Include(u => u.Hospital)
            .Where(u => u.MobileNumber == mobile && u.Status == "active");

        if (request.HospitalId.HasValue)
            userQuery = userQuery.Where(u => u.HospitalId == request.HospitalId.Value);

        var user = await userQuery.FirstOrDefaultAsync();

        if (user == null)
            return Results.Ok(new AuthResponse(false, "Mobile number not registered.", IsNewUser: true));

        if (user.Hospital.Status != "active")
            return Results.Ok(new AuthResponse(false, "Hospital account is not active."));

        // Invalidate existing unused OTPs for this user
        var existingOtps = await db.OtpVerifications
            .IgnoreQueryFilters()
            .Where(o => o.UserId == user.Id && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var existing in existingOtps)
            existing.IsUsed = true;

        // Generate and store new OTP
        var otpCode = otpService.GenerateOtp();
        var otpRecord = new OtpVerification
        {
            UserId = user.Id,
            PatientId = null,
            MobileNumber = mobile,
            OtpCode = otpCode,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            AttemptCount = 0
        };

        db.OtpVerifications.Add(otpRecord);
        await db.SaveChangesAsync();

        // Fire and Forget: Send OTP in background
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var bgOtpService = scope.ServiceProvider.GetRequiredService<OtpService>();
                await bgOtpService.SendOtpAsync(mobile, otpCode);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background OTP send failed for staff {Mobile}", mobile);
            }
        });

        logger.LogInformation("OTP sent for staff {Mobile} (UserId: {UserId})", mobile, user.Id);
        return Results.Ok(new AuthResponse(true, "OTP sent successfully."));
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /api/auth/verify-otp
    //  Routes to patients or users table based on accountType.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> VerifyOtp(
        VerifyOtpRequest request,
        NalamDbContext db,
        JwtService jwtService,
        AuditService auditService,
        ILogger<Program> logger)
    {
        if (string.IsNullOrWhiteSpace(request.MobileNumber) || string.IsNullOrWhiteSpace(request.OtpCode))
            return Results.BadRequest(new AuthResponse(false, "Mobile number and OTP are required."));

        var mobile = NormalizeMobile(request.MobileNumber);

        if (request.AccountType == "patient")
            return await VerifyOtpForPatient(mobile, request, db, jwtService, auditService, logger);
        else
            return await VerifyOtpForStaff(mobile, request, db, jwtService, auditService, logger);
    }

    private static async Task<IResult> VerifyOtpForPatient(
        string mobile,
        VerifyOtpRequest request,
        NalamDbContext db,
        JwtService jwtService,
        AuditService auditService,
        ILogger<Program> logger)
    {
        // Find the latest unused OTP linked to a patient
        var otpQuery = db.OtpVerifications
            .IgnoreQueryFilters()
            .Include(o => o.Patient).ThenInclude(p => p!.Hospital)
            .Where(o => o.MobileNumber == mobile && !o.IsUsed && o.PatientId != null);

        if (request.HospitalId.HasValue)
            otpQuery = otpQuery.Where(o => o.Patient!.HospitalId == request.HospitalId.Value);

        var otpRecord = await otpQuery
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otpRecord == null)
            return Results.Ok(new AuthResponse(false, "No pending OTP found. Please request a new one."));

        // Check expiry
        if (otpRecord.ExpiresAt < DateTime.UtcNow)
        {
            otpRecord.IsUsed = true;
            await db.SaveChangesAsync();
            return Results.Ok(new AuthResponse(false, "OTP has expired. Please request a new one."));
        }

        // Check attempt limit (max 5)
        if (otpRecord.AttemptCount >= 5)
        {
            otpRecord.IsUsed = true;
            auditService.Log(
                otpRecord.Patient!.HospitalId, null,
                "Patient OTP locked after 5 failed attempts",
                "security", "critical",
                $"Mobile: {mobile}, PatientId: {otpRecord.PatientId}");
            await db.SaveChangesAsync();
            return Results.Ok(new AuthResponse(false, "Too many failed attempts. Please request a new OTP."));
        }

        // Validate OTP
        if (otpRecord.OtpCode != request.OtpCode.Trim())
        {
            otpRecord.AttemptCount++;
            otpRecord.LastAttemptAt = DateTime.UtcNow;
            var remaining = 5 - otpRecord.AttemptCount;
            auditService.Log(
                otpRecord.Patient!.HospitalId, null,
                $"Invalid patient OTP attempt ({otpRecord.AttemptCount}/5)",
                "security", "warning",
                $"Mobile: {mobile}, PatientId: {otpRecord.PatientId}");
            await db.SaveChangesAsync();
            return Results.Ok(new AuthResponse(false, $"Invalid OTP. {remaining} attempt(s) remaining."));
        }

        // OTP is valid
        otpRecord.IsUsed = true;
        otpRecord.LastAttemptAt = DateTime.UtcNow;

        var patient = otpRecord.Patient!;
        patient.LastLogin = DateTime.UtcNow;
        patient.IsVerified = true;

        // Generate patient JWT
        var accessToken = jwtService.GeneratePatientAccessToken(
            patient.Id, patient.HospitalId, patient.FullName);
        var refreshToken = jwtService.GenerateRefreshToken();

        auditService.Log(
            patient.HospitalId, null,
            "Patient login successful",
            "security", "info",
            $"PatientId: {patient.Id}, Mobile: {mobile}");

        await db.SaveChangesAsync();

        logger.LogInformation("Patient {PatientId} logged in successfully", patient.Id);

        return Results.Ok(new AuthResponse(
            true, "Login successful.",
            accessToken, refreshToken,
            new UserInfo(
                patient.Id, patient.FullName, patient.MobileNumber,
                "patient", ["patient"],
                patient.HospitalId, patient.Hospital.Name,
                "patient")
        ));
    }

    private static async Task<IResult> VerifyOtpForStaff(
        string mobile,
        VerifyOtpRequest request,
        NalamDbContext db,
        JwtService jwtService,
        AuditService auditService,
        ILogger<Program> logger)
    {
        // Find the latest unused OTP linked to a staff user
        var otpQuery = db.OtpVerifications
            .IgnoreQueryFilters()
            .Include(o => o.User).ThenInclude(u => u!.Hospital)
            .Where(o => o.MobileNumber == mobile && !o.IsUsed && o.UserId != null);

        if (request.HospitalId.HasValue)
            otpQuery = otpQuery.Where(o => o.User!.HospitalId == request.HospitalId.Value);

        var otpRecord = await otpQuery
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otpRecord == null)
            return Results.Ok(new AuthResponse(false, "No pending OTP found. Please request a new one."));

        // Check expiry
        if (otpRecord.ExpiresAt < DateTime.UtcNow)
        {
            otpRecord.IsUsed = true;
            await db.SaveChangesAsync();
            return Results.Ok(new AuthResponse(false, "OTP has expired. Please request a new one."));
        }

        // Read max login attempts from hospital settings (default 5)
        var maxAttempts = 5;
        var maxAttemptsSetting = await db.HospitalSettings
            .IgnoreQueryFilters()
            .Where(s => s.HospitalId == otpRecord.User!.HospitalId && s.Key == "max_login_attempts")
            .Select(s => s.Value)
            .FirstOrDefaultAsync();
        if (int.TryParse(maxAttemptsSetting, out var parsed) && parsed > 0)
            maxAttempts = parsed;

        // Check attempt limit
        if (otpRecord.AttemptCount >= maxAttempts)
        {
            otpRecord.IsUsed = true;
            auditService.Log(
                otpRecord.User!.HospitalId, otpRecord.UserId,
                $"OTP locked after {maxAttempts} failed attempts",
                "security", "critical",
                $"Mobile: {mobile}");
            await db.SaveChangesAsync();
            return Results.Ok(new AuthResponse(false, "Too many failed attempts. Please request a new OTP."));
        }

        // Validate OTP
        if (otpRecord.OtpCode != request.OtpCode.Trim())
        {
            otpRecord.AttemptCount++;
            otpRecord.LastAttemptAt = DateTime.UtcNow;
            var remaining = maxAttempts - otpRecord.AttemptCount;
            auditService.Log(
                otpRecord.User!.HospitalId, otpRecord.UserId,
                $"Invalid OTP attempt ({otpRecord.AttemptCount}/{maxAttempts})",
                "security", "warning",
                $"Mobile: {mobile}");
            await db.SaveChangesAsync();
            return Results.Ok(new AuthResponse(false, $"Invalid OTP. {remaining} attempt(s) remaining."));
        }

        // OTP is valid — mark as used
        otpRecord.IsUsed = true;
        otpRecord.LastAttemptAt = DateTime.UtcNow;

        var user = otpRecord.User!;
        user.LastLogin = DateTime.UtcNow;
        user.IsVerified = true;

        // Load all active roles from user_roles table
        var userRoles = await db.UserRoles
            .IgnoreQueryFilters()
            .Where(ur => ur.UserId == user.Id && ur.IsActive)
            .Select(ur => ur.Role)
            .ToListAsync();

        // Fallback: if user_roles is empty (e.g., legacy user), use the User.Role field
        if (userRoles.Count == 0)
            userRoles = [user.Role];

        // The JWT carries a single role. Use the primary (User.Role) as default selection.
        var selectedRole = userRoles.Contains(user.Role) ? user.Role : userRoles[0];

        // Generate JWT with the selected role
        var accessToken = jwtService.GenerateAccessToken(
            user.Id, selectedRole, user.HospitalId, user.FullName);
        var refreshToken = jwtService.GenerateRefreshToken();

        auditService.Log(
            user.HospitalId, user.Id,
            "Login successful",
            "security", "info",
            $"Role: {selectedRole}, AllRoles: [{string.Join(", ", userRoles)}]");

        await db.SaveChangesAsync();

        logger.LogInformation("User {UserId} logged in with roles [{Roles}]", user.Id, string.Join(", ", userRoles));

        return Results.Ok(new AuthResponse(
            true, "Login successful.",
            accessToken, refreshToken,
            new UserInfo(
                user.Id, user.FullName, user.MobileNumber,
                selectedRole, userRoles,
                user.HospitalId, user.Hospital.Name,
                "staff")
        ));
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /api/auth/patient-register
    //  Creates a new patient in the patients table (not users).
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> PatientRegister(
        PatientRegisterRequest request,
        NalamDbContext db,
        OtpService otpService,
        IServiceScopeFactory scopeFactory,
        ILogger<Program> logger)
    {
        if (string.IsNullOrWhiteSpace(request.MobileNumber))
            return Results.BadRequest(new AuthResponse(false, "Mobile number is required."));
        if (string.IsNullOrWhiteSpace(request.FullName))
            return Results.BadRequest(new AuthResponse(false, "Full name is required."));

        var mobile = NormalizeMobile(request.MobileNumber);

        // Verify hospital exists and is active
        var hospital = await db.Hospitals
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(h => h.Id == request.HospitalId && h.Status == "active");

        if (hospital == null)
            return Results.BadRequest(new AuthResponse(false, "Hospital not found or inactive."));

        // Check if patient already exists in this hospital
        var existingPatient = await db.Patients
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.MobileNumber == mobile && p.HospitalId == request.HospitalId);

        if (existingPatient != null)
            return Results.Conflict(new AuthResponse(false, "Mobile number already registered. Please use Login."));

        // Create patient record
        var patient = new Patient
        {
            HospitalId = request.HospitalId,
            FullName = request.FullName.Trim(),
            MobileNumber = mobile,
            Status = "active",
            IsVerified = false
        };

        db.Patients.Add(patient);
        await db.SaveChangesAsync();

        // Generate and send OTP
        var otpCode = otpService.GenerateOtp();
        var otpRecord = new OtpVerification
        {
            PatientId = patient.Id,
            UserId = null,
            MobileNumber = mobile,
            OtpCode = otpCode,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            AttemptCount = 0
        };

        db.OtpVerifications.Add(otpRecord);
        await db.SaveChangesAsync();

        // Fire and Forget: Send OTP via Pay4SMS in background
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var bgOtpService = scope.ServiceProvider.GetRequiredService<OtpService>();
                await bgOtpService.SendOtpAsync(mobile, otpCode);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background OTP send failed for Patient Registration {Mobile}", mobile);
            }
        });

        logger.LogInformation("Patient registered: {Mobile} for hospital {HospitalId}. SMS dispatch queued.", mobile, request.HospitalId);

        return Results.Ok(new AuthResponse(true, "Registration successful. OTP sent."));
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /api/auth/switch-role
    //  Staff-only: switch between roles the user holds.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> SwitchRole(
        SwitchRoleRequest request,
        NalamDbContext db,
        JwtService jwtService,
        AuditService auditService,
        HttpContext ctx,
        ILogger<Program> logger)
    {
        if (string.IsNullOrWhiteSpace(request.Role))
            return Results.BadRequest(new { success = false, message = "Role is required." });

        var userIdClaim = ctx.User.FindFirst("sub")?.Value;
        var hospitalIdClaim = ctx.User.FindFirst("hospitalId")?.Value;

        if (!Guid.TryParse(userIdClaim, out var userId) || !Guid.TryParse(hospitalIdClaim, out var hospitalId))
            return Results.Unauthorized();

        var requestedRole = request.Role.ToLower();

        // Verify the user has this role in user_roles
        var hasRole = await db.UserRoles
            .IgnoreQueryFilters()
            .AnyAsync(ur => ur.UserId == userId && ur.Role == requestedRole && ur.IsActive);

        if (!hasRole)
            return Results.BadRequest(new { success = false, message = "You do not have this role assigned." });

        // Load user for full name
        var user = await db.Users
            .IgnoreQueryFilters()
            .Include(u => u.Hospital)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return Results.NotFound(new { success = false, message = "User not found." });

        // Load all roles for the response
        var allRoles = await db.UserRoles
            .IgnoreQueryFilters()
            .Where(ur => ur.UserId == userId && ur.IsActive)
            .Select(ur => ur.Role)
            .ToListAsync();

        // Generate new JWT with the selected role
        var newToken = jwtService.GenerateAccessToken(userId, requestedRole, hospitalId, user.FullName);
        var newRefreshToken = jwtService.GenerateRefreshToken();

        var previousRole = ctx.User.FindFirst("role")?.Value ?? "unknown";

        await auditService.LogAsync(
            hospitalId, userId,
            $"Role switched: {previousRole} → {requestedRole}",
            "security", "info");

        logger.LogInformation("User {UserId} switched role from {OldRole} to {NewRole}", userId, previousRole, requestedRole);

        return Results.Ok(new AuthResponse(
            true, "Role switched successfully.",
            newToken, newRefreshToken,
            new UserInfo(
                user.Id, user.FullName, user.MobileNumber,
                requestedRole, allRoles,
                user.HospitalId, user.Hospital.Name,
                "staff")
        ));
    }
}
