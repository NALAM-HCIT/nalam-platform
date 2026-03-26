namespace NalamApi.DTOs.Auth;

public record SendOtpRequest(
    string MobileNumber,
    Guid? HospitalId = null,
    string AccountType = "staff"    // "patient" or "staff"
);

public record PatientRegisterRequest(
    string MobileNumber,
    string FullName,
    Guid HospitalId
);

public record VerifyOtpRequest(
    string MobileNumber,
    string OtpCode,
    Guid? HospitalId = null,
    string AccountType = "staff"    // "patient" or "staff"
);

public record AuthResponse(
    bool Success,
    string Message,
    string? Token = null,
    string? RefreshToken = null,
    UserInfo? User = null,
    bool IsNewUser = false
);

public record UserInfo(
    Guid Id,
    string FullName,
    string MobileNumber,
    string Role,
    List<string> Roles,
    Guid HospitalId,
    string HospitalName,
    string AccountType = "staff"    // "patient" or "staff"
);

public record RefreshTokenRequest(string RefreshToken);

// ── Role Switching ──────────────────────────────────────
public record SwitchRoleRequest(string Role);
