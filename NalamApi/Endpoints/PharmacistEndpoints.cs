using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.Entities;
using NalamApi.Services;

namespace NalamApi.Endpoints;

/// <summary>
/// Pharmacist endpoints: Dashboard stats, prescription queue from completed appointments,
/// dispense/reject actions. Uses StaffAccess authorization.
/// </summary>
public static class PharmacistEndpoints
{
    public static void MapPharmacistEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/pharmacy")
            .WithTags("Pharmacist")
            .RequireAuthorization("StaffAccess");

        group.MapGet("/dashboard", GetDashboard);
        group.MapGet("/prescriptions", GetPrescriptions);
        group.MapPatch("/prescriptions/{appointmentId}/dispense", DispensePrescription);
        group.MapPatch("/prescriptions/{appointmentId}/reject", RejectPrescription);
    }

    private static Guid GetHospitalId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("hospitalId")!.Value);

    private static Guid GetUserId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("sub")!.Value);

    private static string GetInitials(string fullName) =>
        string.Join("", fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Take(2).Select(w => w[0])).ToUpper();

    // ═══════════════════════════════════════════════════════════
    //  GET /api/pharmacy/dashboard
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetDashboard(
        NalamDbContext db,
        HttpContext ctx)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // All appointments that have prescription data (notes != null AND prescription_status is set)
        var prescriptions = await db.Appointments
            .Where(a => a.ScheduleDate == today && a.PrescriptionStatus != null)
            .ToListAsync();

        var pendingRx = prescriptions.Count(a => a.PrescriptionStatus == "pending");
        var dispensedRx = prescriptions.Count(a => a.PrescriptionStatus == "dispensed");
        var rejectedRx = prescriptions.Count(a => a.PrescriptionStatus == "rejected");
        var totalToday = prescriptions.Count;

        return Results.Ok(new
        {
            date = today.ToString("yyyy-MM-dd"),
            stats = new
            {
                pending = pendingRx,
                dispensed = dispensedRx,
                rejected = rejectedRx,
                total = totalToday
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/pharmacy/prescriptions
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetPrescriptions(
        NalamDbContext db,
        HttpContext ctx,
        string? status = null,
        string? search = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var query = db.Appointments
            .Include(a => a.Patient)
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .Where(a => a.ScheduleDate == today && a.PrescriptionStatus != null)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(a => a.PrescriptionStatus == status.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(a =>
                (a.Patient != null && a.Patient.FullName.ToLower().Contains(q)) ||
                (a.DoctorProfile.User != null && a.DoctorProfile.User.FullName.ToLower().Contains(q)) ||
                a.BookingReference.ToLower().Contains(q));
        }

        var prescriptions = await query
            .OrderByDescending(a => a.UpdatedAt)
            .Select(a => new
            {
                id = a.Id,
                bookingReference = a.BookingReference,
                patientName = a.Patient.FullName,
                patientInitials = GetInitials(a.Patient.FullName),
                patientMobile = a.Patient.MobileNumber,
                doctorName = a.DoctorProfile.User.FullName,
                doctorSpecialty = a.DoctorProfile.Specialty,
                time = a.StartTime.ToString("hh:mm tt"),
                consultationType = a.ConsultationType,
                prescriptionNotes = a.Notes,
                prescriptionStatus = a.PrescriptionStatus,
                appointmentStatus = a.Status,
                updatedAt = a.UpdatedAt
            })
            .ToListAsync();

        return Results.Ok(prescriptions);
    }

    // ═══════════════════════════════════════════════════════════
    //  PATCH /api/pharmacy/prescriptions/{appointmentId}/dispense
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> DispensePrescription(
        Guid appointmentId,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);

        var appointment = await db.Appointments
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (appointment == null)
            return Results.NotFound(new { error = "Appointment not found." });

        if (appointment.PrescriptionStatus != "pending")
            return Results.BadRequest(new { error = $"Cannot dispense — current status is '{appointment.PrescriptionStatus}'." });

        appointment.PrescriptionStatus = "dispensed";
        appointment.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await auditService.LogAsync(
            hospitalId, GetUserId(ctx),
            $"Dispensed prescription for {appointment.Patient?.FullName ?? "patient"}",
            "pharmacy", "info",
            $"Appointment: {appointment.BookingReference}");

        return Results.Ok(new { message = "Prescription dispensed successfully.", appointmentId, prescriptionStatus = "dispensed" });
    }

    // ═══════════════════════════════════════════════════════════
    //  PATCH /api/pharmacy/prescriptions/{appointmentId}/reject
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> RejectPrescription(
        Guid appointmentId,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx,
        string? reason = null)
    {
        var hospitalId = GetHospitalId(ctx);

        var appointment = await db.Appointments
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (appointment == null)
            return Results.NotFound(new { error = "Appointment not found." });

        if (appointment.PrescriptionStatus != "pending")
            return Results.BadRequest(new { error = $"Cannot reject — current status is '{appointment.PrescriptionStatus}'." });

        appointment.PrescriptionStatus = "rejected";
        appointment.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await auditService.LogAsync(
            hospitalId, GetUserId(ctx),
            $"Rejected prescription for {appointment.Patient?.FullName ?? "patient"}",
            "pharmacy", "warning",
            $"Appointment: {appointment.BookingReference}, Reason: {reason ?? "Not specified"}");

        return Results.Ok(new { message = "Prescription rejected.", appointmentId, prescriptionStatus = "rejected" });
    }
}
