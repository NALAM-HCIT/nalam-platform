using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.Entities;

namespace NalamApi.Endpoints;

/// <summary>
/// Patient-facing endpoints: consultation history, prescriptions, profile stats.
/// Accessible to all authenticated users (patients see their own data).
/// </summary>
public static class PatientEndpoints
{
    public static void MapPatientEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/patient")
            .WithTags("Patient")
            .RequireAuthorization();

        group.MapGet("/consultation-history", GetConsultationHistory);
        group.MapGet("/prescriptions", GetPrescriptions);
        group.MapGet("/prescriptions/{appointmentId:guid}", GetPrescriptionDetail);
        group.MapGet("/profile-stats", GetProfileStats);
    }

    private static Guid GetUserId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("sub")!.Value);

    private static string GetInitials(string fullName) =>
        string.Join("", fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Take(2).Select(w => w[0])).ToUpper();

    // ═══════════════════════════════════════════════════════════
    //  GET /api/patient/consultation-history
    //  Returns completed appointments for the logged-in patient
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetConsultationHistory(
        NalamDbContext db,
        HttpContext ctx,
        int page = 1,
        int pageSize = 20)
    {
        var userId = GetUserId(ctx);

        var query = db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .Where(a => a.PatientId == userId && a.Status == "completed")
            .OrderByDescending(a => a.ScheduleDate)
            .ThenByDescending(a => a.StartTime);

        var total = await query.CountAsync();

        var consultations = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                id = a.Id,
                bookingReference = a.BookingReference,
                doctorName = a.DoctorProfile.User.FullName,
                doctorInitials = GetInitials(a.DoctorProfile.User.FullName),
                specialty = a.DoctorProfile.Specialty,
                scheduleDate = a.ScheduleDate.ToString("yyyy-MM-dd"),
                time = a.StartTime.ToString("hh:mm tt"),
                consultationType = a.ConsultationType,
                notes = a.Notes,
                prescriptionStatus = a.PrescriptionStatus,
                hasPrescription = a.PrescriptionStatus != null
            })
            .ToListAsync();

        return Results.Ok(new { total, page, pageSize, consultations });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/patient/prescriptions
    //  Returns all appointments with prescription data for this patient
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetPrescriptions(
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);

        var prescriptions = await db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .Where(a => a.PatientId == userId && a.PrescriptionStatus != null)
            .OrderByDescending(a => a.ScheduleDate)
            .ThenByDescending(a => a.StartTime)
            .Select(a => new
            {
                id = a.Id,
                bookingReference = a.BookingReference,
                doctorName = a.DoctorProfile.User.FullName,
                doctorInitials = GetInitials(a.DoctorProfile.User.FullName),
                specialty = a.DoctorProfile.Specialty,
                scheduleDate = a.ScheduleDate.ToString("yyyy-MM-dd"),
                time = a.StartTime.ToString("hh:mm tt"),
                consultationType = a.ConsultationType,
                prescriptionNotes = a.Notes,
                prescriptionStatus = a.PrescriptionStatus
            })
            .ToListAsync();

        return Results.Ok(prescriptions);
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/patient/prescriptions/{appointmentId}
    //  Detailed prescription view for a specific appointment
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetPrescriptionDetail(
        Guid appointmentId,
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);

        var appointment = await db.Appointments.AsNoTracking()
            .Include(a => a.Patient)
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .Include(a => a.Hospital)
            .FirstOrDefaultAsync(a => a.Id == appointmentId && a.PatientId == userId);

        if (appointment == null)
            return Results.NotFound(new { error = "Prescription not found." });

        if (appointment.PrescriptionStatus == null)
            return Results.NotFound(new { error = "No prescription for this appointment." });

        return Results.Ok(new
        {
            id = appointment.Id,
            bookingReference = appointment.BookingReference,
            scheduleDate = appointment.ScheduleDate.ToString("yyyy-MM-dd"),
            time = appointment.StartTime.ToString("hh:mm tt"),
            consultationType = appointment.ConsultationType,
            prescriptionNotes = appointment.Notes,
            prescriptionStatus = appointment.PrescriptionStatus,
            doctor = new
            {
                name = appointment.DoctorProfile.User.FullName,
                specialty = appointment.DoctorProfile.Specialty,
                bio = appointment.DoctorProfile.Bio,
                languages = appointment.DoctorProfile.Languages
            },
            patient = new
            {
                name = appointment.Patient.FullName,
                mobile = appointment.Patient.MobileNumber
            },
            hospital = new
            {
                name = appointment.Hospital.Name,
                address = $"{appointment.Hospital.Address}, {appointment.Hospital.City}, {appointment.Hospital.State}"
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/patient/profile-stats
    //  Quick stats for the patient profile page
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetProfileStats(
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);

        var appointments = await db.Appointments.AsNoTracking()
            .Where(a => a.PatientId == userId)
            .ToListAsync();

        var totalVisits = appointments.Count(a => a.Status == "completed");
        var activeRx = appointments.Count(a => a.PrescriptionStatus == "pending" || a.PrescriptionStatus == "dispensed");
        var totalAppointments = appointments.Count;

        return Results.Ok(new
        {
            totalVisits,
            activeRx,
            totalAppointments
        });
    }
}
