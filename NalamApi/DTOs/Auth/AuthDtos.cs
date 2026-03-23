namespace NalamApi.DTOs.Auth;

public record SendOtpRequest(string MobileNumber);

public record PatientRegisterRequest(
    string MobileNumber,
    string FullName,
    Guid HospitalId
);

public record VerifyOtpRequest(string MobileNumber, string OtpCode);

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
    Guid HospitalId,
    string HospitalName
);

public record RefreshTokenRequest(string RefreshToken);
