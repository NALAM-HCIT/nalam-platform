namespace NalamApi.DTOs.Auth;

public record SendOtpRequest(string MobileNumber);

public record VerifyOtpRequest(string MobileNumber, string OtpCode);

public record AuthResponse(
    bool Success,
    string Message,
    string? Token = null,
    string? RefreshToken = null,
    UserInfo? User = null
);

public record UserInfo(
    Guid Id,
    string FullName,
    string MobileNumber,
    string Role,
    Guid HospitalId,
    string HospitalName
);

public record RefreshTokenRequest(string RefreshToken);
