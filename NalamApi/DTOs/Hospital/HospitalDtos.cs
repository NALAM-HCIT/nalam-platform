namespace NalamApi.DTOs.Hospital;

public record RegisterHospitalRequest(
    string Name,
    string? LicenseNo,
    string? Address,
    string? City,
    string? State,
    string Phone,
    string? Email,
    string AdminMobile,
    string AdminName
);

public record RegisterHospitalResponse(
    bool Success,
    string Message,
    Guid? HospitalId = null
);
