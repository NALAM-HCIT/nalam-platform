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
    public static void MapAuthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Authentication")
            .RequireRateLimiting("otp");

        group.MapPost("/send-otp", SendOtp);
        group.MapPost("/verify-otp", VerifyOtp);
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

        // Clean mobile number (remove spaces, ensure format)
        var mobile = request.MobileNumber.Trim().Replace(" ", "");

        // Find user by mobile — using IgnoreQueryFilters since user isn't authenticated yet
        var user = await db.Users
            .IgnoreQueryFilters()
            .Include(u => u.Hospital)
            .FirstOrDefaultAsync(u => u.MobileNumber == mobile && u.Status == "active");

        if (user == null)
        {
            return Results.Ok(new AuthResponse(false, "Mobile number not registered. Contact your hospital administrator."));
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

        var mobile = request.MobileNumber.Trim().Replace(" ", "");

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
}
