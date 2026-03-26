namespace NalamApi.DTOs.Patient;

public record PatientProfileResponse(
    Guid Id,
    string FullName,
    string MobileNumber,
    string? Email,
    string? ProfilePhotoUrl,
    string? BloodGroup,
    string? DateOfBirth,       // "yyyy-MM-dd" or null
    string? Gender,
    string? Address,
    string? City,
    string? State,
    string? Pincode,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? EmergencyContactRelation,
    string? InsuranceProvider,
    string? InsurancePolicyNumber,
    Guid HospitalId,
    string HospitalName
);

public record UpdatePatientProfileRequest(
    string? FullName = null,
    string? Email = null,
    string? BloodGroup = null,
    string? DateOfBirth = null,     // "yyyy-MM-dd"
    string? Gender = null,
    string? Address = null,
    string? City = null,
    string? State = null,
    string? Pincode = null,
    string? EmergencyContactName = null,
    string? EmergencyContactPhone = null,
    string? EmergencyContactRelation = null,
    string? InsuranceProvider = null,
    string? InsurancePolicyNumber = null
);
