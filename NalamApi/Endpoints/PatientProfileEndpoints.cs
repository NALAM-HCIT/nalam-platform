using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.DTOs.Patient;

namespace NalamApi.Endpoints;

/// <summary>
/// Patient profile endpoints: get and update patient profile from the patients table.
/// </summary>
public static class PatientProfileEndpoints
{
    public static void MapPatientProfileEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/patient")
            .WithTags("Patient Profile")
            .RequireAuthorization();

        group.MapGet("/profile", GetProfile);
        group.MapPut("/profile", UpdateProfile);
    }

    private static Guid GetPatientId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("sub")!.Value);

    // ═══════════════════════════════════════════════════════════
    //  GET /api/patient/profile
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetProfile(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);

        var patient = await db.Patients
            .AsNoTracking()
            .Include(p => p.Hospital)
            .FirstOrDefaultAsync(p => p.Id == patientId);

        if (patient == null)
        {
            // Fallback: try IgnoreQueryFilters in case tenant filter excludes it
            patient = await db.Patients
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Include(p => p.Hospital)
                .FirstOrDefaultAsync(p => p.Id == patientId);
        }

        if (patient == null)
            return Results.NotFound(new { error = "Patient profile not found." });

        return Results.Ok(new PatientProfileResponse(
            patient.Id,
            patient.FullName,
            patient.MobileNumber,
            patient.Email,
            patient.ProfilePhotoUrl,
            patient.BloodGroup,
            patient.DateOfBirth?.ToString("yyyy-MM-dd"),
            patient.Gender,
            patient.Address,
            patient.City,
            patient.State,
            patient.Pincode,
            patient.EmergencyContactName,
            patient.EmergencyContactPhone,
            patient.EmergencyContactRelation,
            patient.InsuranceProvider,
            patient.InsurancePolicyNumber,
            patient.HospitalId,
            patient.Hospital.Name
        ));
    }

    // ═══════════════════════════════════════════════════════════
    //  PUT /api/patient/profile
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> UpdateProfile(
        UpdatePatientProfileRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);

        var patient = await db.Patients
            .Include(p => p.Hospital)
            .FirstOrDefaultAsync(p => p.Id == patientId);

        if (patient == null)
            return Results.NotFound(new { error = "Patient profile not found." });

        // Update only provided fields
        if (request.FullName != null) patient.FullName = request.FullName.Trim();
        if (request.Email != null) patient.Email = request.Email.Trim();
        if (request.BloodGroup != null) patient.BloodGroup = request.BloodGroup;
        if (request.DateOfBirth != null && DateOnly.TryParse(request.DateOfBirth, out var dob))
            patient.DateOfBirth = dob;
        if (request.Gender != null) patient.Gender = request.Gender;
        if (request.Address != null) patient.Address = request.Address;
        if (request.City != null) patient.City = request.City;
        if (request.State != null) patient.State = request.State;
        if (request.Pincode != null) patient.Pincode = request.Pincode;
        if (request.EmergencyContactName != null) patient.EmergencyContactName = request.EmergencyContactName;
        if (request.EmergencyContactPhone != null) patient.EmergencyContactPhone = request.EmergencyContactPhone;
        if (request.EmergencyContactRelation != null) patient.EmergencyContactRelation = request.EmergencyContactRelation;
        if (request.InsuranceProvider != null) patient.InsuranceProvider = request.InsuranceProvider;
        if (request.InsurancePolicyNumber != null) patient.InsurancePolicyNumber = request.InsurancePolicyNumber;

        await db.SaveChangesAsync();

        return Results.Ok(new PatientProfileResponse(
            patient.Id,
            patient.FullName,
            patient.MobileNumber,
            patient.Email,
            patient.ProfilePhotoUrl,
            patient.BloodGroup,
            patient.DateOfBirth?.ToString("yyyy-MM-dd"),
            patient.Gender,
            patient.Address,
            patient.City,
            patient.State,
            patient.Pincode,
            patient.EmergencyContactName,
            patient.EmergencyContactPhone,
            patient.EmergencyContactRelation,
            patient.InsuranceProvider,
            patient.InsurancePolicyNumber,
            patient.HospitalId,
            patient.Hospital.Name
        ));
    }
}
