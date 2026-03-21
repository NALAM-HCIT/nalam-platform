namespace NalamApi.DTOs.Admin;

// ── User Management ──────────────────────────────────────

public record CreateUserRequest(
    string FullName,
    string MobileNumber,
    string? Email,
    string Role,        // doctor, pharmacist, receptionist
    string? Department,
    string? EmployeeId
);

public record UpdateUserRequest(
    string? FullName,
    string? Email,
    string? Department,
    string? EmployeeId
);

public record ChangeRoleRequest(string Role);

public record ChangeStatusRequest(string Status); // active, inactive

public record UserResponse(
    Guid Id,
    string FullName,
    string MobileNumber,
    string? Email,
    string Role,
    string? Department,
    string? EmployeeId,
    string? ProfilePhotoUrl,
    string Status,
    bool IsVerified,
    DateTime CreatedAt,
    DateTime? LastLogin
);

// ── Dashboard ────────────────────────────────────────────

public record DashboardResponse(
    int TotalUsers,
    int ActiveUsers,
    int InactiveUsers,
    int Doctors,
    int Pharmacists,
    int Receptionists,
    int TotalDepartments,
    List<ActivityResponse> RecentActivity
);

// ── Activity / Audit Log ─────────────────────────────────

public record ActivityResponse(
    Guid Id,
    string Action,
    string? UserName,
    string Category,
    string Severity,
    string? Details,
    DateTime CreatedAt
);

// ── Settings ─────────────────────────────────────────────

public record SettingDto(string Key, string? Value);

public record UpdateSettingsRequest(List<SettingDto> Settings);

public record SettingsResponse(
    Guid HospitalId,
    string HospitalName,
    List<SettingDto> Settings
);

// ── Profile ──────────────────────────────────────────────

public record UpdateProfileRequest(
    string? FullName,
    string? Email,
    string? ProfilePhotoUrl
);

public record ProfileResponse(
    Guid Id,
    string FullName,
    string MobileNumber,
    string? Email,
    string Role,
    string? Department,
    string? EmployeeId,
    string? ProfilePhotoUrl,
    Guid HospitalId,
    string HospitalName,
    DateTime CreatedAt,
    DateTime? LastLogin
);
