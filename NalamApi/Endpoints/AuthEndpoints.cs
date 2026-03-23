using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.DTOs.Auth;
using NalamApi.Entities;
using NalamApi.Services;

namespace NalamApi.Endpoints;

/// <summary>
/// Authentication endpoints: OTP-only login flow.
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
    }

    /// <summary>
    /// POST /api/auth/send-otp
    /// Finds user by mobile number, generates OTP, sends via Pay4SMS.
    /// </summary>
    private static async Task<IResult> SendOtp(
        SendOtpRequest request,
        NalamDbContext db,
        OtpService otpService,
        ILogger<Program> logger)
    {
        if (string.IsNullOrWhiteSpace(request.MobileNumber))
            return Results.BadRequest(new AuthResponse(false, "Mobile number is required."));

        // Clean mobile number (remove spaces, strip +91/91 prefix → always store 10-digit)
        var mobile = NormalizeMobile(request.MobileNumber);

        // Find user by mobile — using IgnoreQueryFilters since user isn't authenticated yet
        var user = await db.Users
            .IgnoreQueryFilters()
            .Include(u => u.Hospital)
            .FirstOrDefaultAsync(u => u.MobileNumber == mobile && u.Status == "active");

        if (user == null)
        {
            // For patients: signal that they need to register first
            return Results.Ok(new AuthResponse(false, "Mobile number not registered.", IsNewUser: true));
        }

        if (user.Hospital.Status != "active")
        {
            return Results.Ok(new AuthResponse(false, "Hospital account is not active."));
        }

        // Invalidate any existing unused OTPs for this user
        var existingOtps = await db.OtpVerifications
            .IgnoreQueryFilters()
            .Where(o => o.UserId == user.Id && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var existing in existingOtps)
        {
            existing.IsUsed = true;
        }

        // Generate and store new OTP
        var otpCode = otpService.GenerateOtp();
        var otpRecord = new OtpVerification
        {
            UserId = user.Id,
            MobileNumber = mobile,
            OtpCode = otpCode,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            AttemptCount = 0
        };

        db.OtpVerifications.Add(otpRecord);
        await db.SaveChangesAsync();

        // Send OTP via Pay4SMS (or log to console in dev mode)
        var sent = await otpService.SendOtpAsync(mobile, otpCode);

        if (!sent)
        {
            return Results.Ok(new AuthResponse(false, "Failed to send OTP. Please try again."));
        }

        logger.LogInformation("OTP sent to {Mobile} for user {UserId}", mobile, user.Id);

        return Results.Ok(new AuthResponse(true, "OTP sent successfully."));
    }

    /// <summary>
    /// POST /api/auth/verify-otp
    /// Validates OTP, enforces max 5 attempts, returns JWT on success.
    /// </summary>
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

        // Find the latest unused OTP for this mobile
        var otpRecord = await db.OtpVerifications
            .IgnoreQueryFilters()
            .Include(o => o.User)
            .ThenInclude(u => u.Hospital)
            .Where(o => o.MobileNumber == mobile && !o.IsUsed)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        if (otpRecord == null)
        {
            return Results.Ok(new AuthResponse(false, "No pending OTP found. Please request a new one."));
        }

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
            await db.SaveChangesAsync();

            await auditService.LogAsync(
                otpRecord.User.HospitalId,
                otpRecord.UserId,
                "OTP locked after 5 failed attempts",
                "security", "critical",
                $"Mobile: {mobile}");

            return Results.Ok(new AuthResponse(false, "Too many failed attempts. Please request a new OTP."));
        }

        // Validate OTP
        if (otpRecord.OtpCode != request.OtpCode.Trim())
        {
            otpRecord.AttemptCount++;
            otpRecord.LastAttemptAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var remaining = 5 - otpRecord.AttemptCount;

            await auditService.LogAsync(
                otpRecord.User.HospitalId,
                otpRecord.UserId,
                $"Invalid OTP attempt ({otpRecord.AttemptCount}/5)",
                "security", "warning",
                $"Mobile: {mobile}");

            return Results.Ok(new AuthResponse(false, $"Invalid OTP. {remaining} attempt(s) remaining."));
        }

        // ✅ OTP is valid — mark as used
        otpRecord.IsUsed = true;
        otpRecord.LastAttemptAt = DateTime.UtcNow;

        var user = otpRecord.User;
        user.LastLogin = DateTime.UtcNow;
        user.IsVerified = true;
        await db.SaveChangesAsync();

        // Generate JWT
        var accessToken = jwtService.GenerateAccessToken(
            user.Id, user.Role, user.HospitalId, user.FullName);
        var refreshToken = jwtService.GenerateRefreshToken();

        // Log successful login
        await auditService.LogAsync(
            user.HospitalId, user.Id,
            "Login successful",
            "security", "info",
            $"Role: {user.Role}");

        logger.LogInformation("User {UserId} logged in successfully", user.Id);

        return Results.Ok(new AuthResponse(
            true, "Login successful.",
            accessToken, refreshToken,
            new UserInfo(
                user.Id, user.FullName, user.MobileNumber,
                user.Role, user.HospitalId, user.Hospital.Name)
        ));
    }

    /// <summary>
    /// POST /api/auth/patient-register
    /// Self-signup for patients: creates a new patient user and sends OTP in one step.
    /// Care providers (doctor/pharmacist/receptionist/admin) must be created by hospital admin.
    /// </summary>
    private static async Task<IResult> PatientRegister(
        PatientRegisterRequest request,
        NalamDbContext db,
        OtpService otpService,
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

        // Check if user already exists in this hospital
        var existingUser = await db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.MobileNumber == mobile && u.HospitalId == request.HospitalId);

        if (existingUser != null)
            return Results.Conflict(new AuthResponse(false, "Mobile number already registered. Please use Login."));

        // Create patient user
        var user = new User
        {
            HospitalId = request.HospitalId,
            FullName = request.FullName.Trim(),
            MobileNumber = mobile,
            Role = "patient",
            Status = "active",
            IsVerified = false
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        // Generate and send OTP
        var otpCode = otpService.GenerateOtp();
        var otpRecord = new OtpVerification
        {
            UserId = user.Id,
            MobileNumber = mobile,
            OtpCode = otpCode,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            AttemptCount = 0
        };

        db.OtpVerifications.Add(otpRecord);
        await db.SaveChangesAsync();

        var sent = await otpService.SendOtpAsync(mobile, otpCode);

        if (!sent)
            return Results.Ok(new AuthResponse(false, "Account created but failed to send OTP. Please try Login."));

        logger.LogInformation("Patient registered: {Mobile} for hospital {HospitalId}", mobile, request.HospitalId);

        return Results.Ok(new AuthResponse(true, "Registration successful. OTP sent."));
    }
}
