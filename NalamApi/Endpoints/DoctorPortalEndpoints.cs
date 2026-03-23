using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.Entities;

namespace NalamApi.Endpoints;

/// <summary>
/// Doctor portal endpoints: staff directory, own profile/stats, patient summary.
/// Accessible to authenticated doctors.
/// </summary>
public static class DoctorPortalEndpoints
{
    public static void MapDoctorPortalEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/doctor-portal")
            .WithTags("DoctorPortal")
            .RequireAuthorization();

        group.MapGet("/directory", GetDirectory);
        group.MapGet("/my-profile", GetMyProfile);
        group.MapGet("/patient-summary/{patientId:guid}", GetPatientSummary);
    }

    private static Guid GetUserId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("sub")!.Value);

    private static string GetInitials(string fullName) =>
        string.Join("", fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Take(2).Select(w => w[0])).ToUpper();

    // ═══════════════════════════════════════════════════════════
    //  GET /api/doctor-portal/directory
    //  Hospital staff grouped by role
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetDirectory(
        NalamDbContext db,
        HttpContext ctx,
        string? search = null)
    {
        var userId = GetUserId(ctx);

        // Get the caller's hospital
        var caller = await db.Users.FindAsync(userId);
        if (caller == null) return Results.Unauthorized();

        var query = db.Users
            .Where(u => u.HospitalId == caller.HospitalId && u.Status == "active");

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(q) ||
                u.Role.ToLower().Contains(q) ||
                (u.Department != null && u.Department.ToLower().Contains(q)));
        }

        var users = await query
            .OrderBy(u => u.Role)
            .ThenBy(u => u.FullName)
            .Select(u => new
            {
                id = u.Id,
                name = u.FullName,
                initials = GetInitials(u.FullName),
                role = u.Role,
                department = u.Department,
                phone = u.MobileNumber,
                email = u.Email
            })
            .ToListAsync();

        // Group by role
        var grouped = users
            .GroupBy(u => u.role)
            .Select(g => new
            {
                role = g.Key,
                memberCount = g.Count(),
                members = g.ToList()
            })
            .OrderBy(g => g.role)
            .ToList();

        return Results.Ok(grouped);
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/doctor-portal/my-profile
    //  Doctor's own profile with appointment stats
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetMyProfile(
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);

        var user = await db.Users.FindAsync(userId);
        if (user == null) return Results.NotFound(new { error = "User not found." });

        // Try to find doctor profile
        var doctorProfile = await db.DoctorProfiles
            .FirstOrDefaultAsync(dp => dp.UserId == userId);

        // Get appointment stats
        var appointments = doctorProfile != null
            ? await db.Appointments
                .Where(a => a.DoctorProfileId == doctorProfile.Id)
                .ToListAsync()
            : new List<Appointment>();

        var totalConsults = appointments.Count(a => a.Status == "completed");
        var totalAppointments = appointments.Count;
        var activePatients = appointments
            .Where(a => a.Status == "completed")
            .Select(a => a.PatientId)
            .Distinct()
            .Count();

        return Results.Ok(new
        {
            user = new
            {
                id = user.Id,
                name = user.FullName,
                initials = GetInitials(user.FullName),
                phone = user.MobileNumber,
                email = user.Email,
                role = user.Role,
                department = user.Department,
                employeeId = user.EmployeeId
            },
            doctorProfile = doctorProfile != null ? new
            {
                specialty = doctorProfile.Specialty,
                experienceYears = doctorProfile.ExperienceYears,
                consultationFee = doctorProfile.ConsultationFee,
                rating = doctorProfile.Rating,
                reviewCount = doctorProfile.ReviewCount,
                bio = doctorProfile.Bio,
                languages = doctorProfile.Languages,
                availableForVideo = doctorProfile.AvailableForVideo,
                availableForInPerson = doctorProfile.AvailableForInPerson
            } : null,
            stats = new
            {
                totalConsults,
                totalAppointments,
                activePatients,
                rating = doctorProfile?.Rating ?? 0m,
                reviewCount = doctorProfile?.ReviewCount ?? 0
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/doctor-portal/patient-summary/{patientId}
    //  Patient summary for the doctor's view
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetPatientSummary(
        Guid patientId,
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);

        var patient = await db.Users.FindAsync(patientId);
        if (patient == null)
            return Results.NotFound(new { error = "Patient not found." });

        // Get the doctor's profile to filter appointments
        var doctorProfile = await db.DoctorProfiles
            .FirstOrDefaultAsync(dp => dp.UserId == userId);

        // Get past appointments for this patient (with this doctor if doctor profile exists)
        var appointmentsQuery = db.Appointments
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .Where(a => a.PatientId == patientId);

        if (doctorProfile != null)
        {
            appointmentsQuery = appointmentsQuery
                .Where(a => a.DoctorProfileId == doctorProfile.Id);
        }

        var pastAppointments = await appointmentsQuery
            .OrderByDescending(a => a.ScheduleDate)
            .ThenByDescending(a => a.StartTime)
            .Take(10)
            .Select(a => new
            {
                id = a.Id,
                scheduleDate = a.ScheduleDate.ToString("yyyy-MM-dd"),
                time = a.StartTime.ToString("hh:mm tt"),
                consultationType = a.ConsultationType,
                status = a.Status,
                notes = a.Notes,
                prescriptionStatus = a.PrescriptionStatus,
                doctorName = a.DoctorProfile.User.FullName,
                specialty = a.DoctorProfile.Specialty
            })
            .ToListAsync();

        return Results.Ok(new
        {
            patient = new
            {
                id = patient.Id,
                name = patient.FullName,
                initials = GetInitials(patient.FullName),
                phone = patient.MobileNumber,
                email = patient.Email,
                role = patient.Role
            },
            totalVisits = pastAppointments.Count(a => a.status == "completed"),
            recentAppointments = pastAppointments
        });
    }
}
