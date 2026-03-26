namespace NalamApi.DTOs.Admin;

// ── User Management ──────────────────────────────────────

public record CreateUserRequest(
    string FullName,
    string MobileNumber,
    string? Email,
    string Role,              // primary role: doctor, pharmacist, receptionist, admin
    List<string>? Roles,      // optional additional roles (if null, defaults to [Role])
    string? Department,
    string? EmployeeId,
    // Doctor-specific fields (used when Role="doctor" or Roles contains "doctor")
    string? Specialty,
    int? ExperienceYears,
    decimal? ConsultationFee,
    string? Languages,
    string? Bio
);

public record UpdateUserRequest(
    string? FullName,
    string? Email,
    string? Department,
    string? EmployeeId
);

public record ChangeRoleRequest(List<string> Roles);

public record ChangeStatusRequest(string Status); // active, inactive

public record UserResponse(
    Guid Id,
    string FullName,
    string MobileNumber,
    string? Email,
    string Role,
    List<string> Roles,
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

// ── Doctor Profile Management ────────────────────────────

public record CreateDoctorProfileRequest(
    Guid UserId,
    string Specialty,
    int ExperienceYears,
    decimal ConsultationFee,
    bool AvailableForVideo,
    bool AvailableForInPerson,
    string? Languages,
    string? Bio
);

public record UpdateDoctorProfileRequest(
    string? Specialty,
    int? ExperienceYears,
    decimal? ConsultationFee,
    bool? AvailableForVideo,
    bool? AvailableForInPerson,
    string? Languages,
    string? Bio,
    bool? IsAcceptingAppointments
);

public record DoctorProfileResponse(
    Guid Id,
    Guid UserId,
    string DoctorName,
    string Specialty,
    int ExperienceYears,
    decimal ConsultationFee,
    bool AvailableForVideo,
    bool AvailableForInPerson,
    string? Languages,
    decimal? Rating,
    int ReviewCount,
    string? Bio,
    bool IsAcceptingAppointments,
    DateTime CreatedAt,
    List<DoctorScheduleResponse> Schedules
);

// ── Doctor Schedule Management ───────────────────────────

public record CreateDoctorScheduleRequest(
    Guid DoctorProfileId,
    int DayOfWeek,        // 0=Sunday, 6=Saturday
    string StartTime,     // "09:00"
    string EndTime,       // "12:00"
    int SlotDurationMinutes,  // 30
    string ConsultationType   // "video", "in-person", "both"
);

public record DoctorScheduleResponse(
    Guid Id,
    int DayOfWeek,
    string StartTime,
    string EndTime,
    int SlotDurationMinutes,
    string ConsultationType,
    bool IsActive
);

// ── Profile ──────────────────────────────────────────────

public record UpdateProfileRequest(
    string? FullName,
    string? Email,
    string? ProfilePhotoUrl,
    string? Department
);

public record ProfileResponse(
    Guid Id,
    string FullName,
    string MobileNumber,
    string? Email,
    string Role,
    List<string> Roles,
    string? Department,
    string? EmployeeId,
    string? ProfilePhotoUrl,
    Guid HospitalId,
    string HospitalName,
    DateTime CreatedAt,
    DateTime? LastLogin
);

// ── Hospital Information (direct table) ─────────────────
public record HospitalInfoResponse(
    Guid Id, string Name, string? LicenseNo, string? Address,
    string? City, string? State, string Phone, string? Email,
    string? LogoUrl, string Status);

public record UpdateHospitalInfoRequest(
    string? Name = null, string? Address = null, string? City = null,
    string? State = null, string? Phone = null, string? Email = null,
    string? LogoUrl = null, string? LicenseNo = null);

// ── Working Hours ───────────────────────────────────────
public record WorkingHourDto(
    int DayOfWeek, string StartTime, string EndTime,
    bool IsEnabled, string? BreakStart, string? BreakEnd);

public record UpdateWorkingHoursRequest(List<WorkingHourDto> Hours);

// ── Hospital Integrations ───────────────────────────────
public record IntegrationResponse(
    Guid Id, string Name, string Type, bool IsConnected,
    string? ConfigJson, DateTime? LastSyncedAt, string Status);

public record UpdateIntegrationRequest(bool IsConnected);
