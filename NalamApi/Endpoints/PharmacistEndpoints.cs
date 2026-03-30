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
        group.MapGet("/low-stock", GetLowStock);
        group.MapGet("/profile", GetProfile);
        group.MapPatch("/profile", UpdateProfile);
        group.MapGet("/stats", GetStats);
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
        var hospitalId = GetHospitalId(ctx);

        // All appointments that have prescription data (notes != null AND prescription_status is set)
        var prescriptions = await db.Appointments.AsNoTracking()
            .Where(a => a.HospitalId == hospitalId && a.ScheduleDate == today && a.PrescriptionStatus != null)
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
        var hospitalId = GetHospitalId(ctx);

        var query = db.Appointments.AsNoTracking()
            .Include(a => a.Patient)
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .Include(a => a.PrescriptionItems)
            .Where(a => a.HospitalId == hospitalId && a.ScheduleDate == today && a.PrescriptionStatus != null)
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

        var rawPrescriptions = await query
            .OrderByDescending(a => a.UpdatedAt)
            .ToListAsync();

        // Project in memory (string.Split cannot be translated to SQL; PrescriptionItems also loaded)
        var prescriptions = rawPrescriptions.Select(a => new
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
            updatedAt = a.UpdatedAt,
            prescriptionItems = a.PrescriptionItems
                .OrderBy(pi => pi.CreatedAt)
                .Select(pi => new
                {
                    id                 = pi.Id,
                    medicineId         = pi.MedicineId,
                    medicineName       = pi.MedicineName,
                    dosageInstructions = pi.DosageInstructions,
                    quantity           = pi.Quantity,
                })
                .ToList(),
        }).ToList();

        return Results.Ok(prescriptions);
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/pharmacy/low-stock
    //  Medicines with stock_quantity < 10 (active, hospital-scoped)
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetLowStock(NalamDbContext db, HttpContext ctx)
    {
        var items = await db.Medicines
            .AsNoTracking()
            .Where(m => m.IsActive && m.StockQuantity < 10)
            .OrderBy(m => m.StockQuantity)
            .Take(20)
            .Select(m => new
            {
                m.Id,
                m.Name,
                m.GenericName,
                m.Category,
                m.DosageForm,
                m.StockQuantity,
            })
            .ToListAsync();

        return Results.Ok(items);
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/pharmacy/profile
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetProfile(NalamDbContext db, HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Results.NotFound();

        return Results.Ok(new
        {
            id = user.Id,
            fullName = user.FullName,
            mobileNumber = user.MobileNumber,
            email = user.Email,
            department = user.Department ?? "Pharmacy",
            employeeId = user.EmployeeId ?? "N/A",
            joinDate = user.CreatedAt.ToString("MMM dd, yyyy"),
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  PATCH /api/pharmacy/profile
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> UpdateProfile(
        UpdatePharmacistProfileRequest request, NalamDbContext db, HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Results.NotFound();

        if (request.Email != null) user.Email = request.Email.Trim();
        if (request.Department != null) user.Department = request.Department.Trim();

        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Profile updated." });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/pharmacy/stats
    //  Today's dispensing stats + low-stock count
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetStats(NalamDbContext db, HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var prescriptions = await db.Appointments.AsNoTracking()
            .Where(a => a.HospitalId == hospitalId && a.ScheduleDate == today && a.PrescriptionStatus != null)
            .Select(a => a.PrescriptionStatus)
            .ToListAsync();

        var lowStockCount = await db.Medicines.AsNoTracking()
            .Where(m => m.IsActive && m.StockQuantity < 10)
            .CountAsync();

        return Results.Ok(new
        {
            dispensedToday = prescriptions.Count(s => s == "dispensed"),
            pendingToday   = prescriptions.Count(s => s == "pending"),
            rejectedToday  = prescriptions.Count(s => s == "rejected"),
            lowStockCount,
        });
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
            .Include(a => a.PrescriptionItems)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (appointment == null)
            return Results.NotFound(new { error = "Appointment not found." });

        if (appointment.PrescriptionStatus != "pending")
            return Results.BadRequest(new { error = $"Cannot dispense — current status is '{appointment.PrescriptionStatus}'." });

        appointment.PrescriptionStatus = "dispensed";
        appointment.UpdatedAt = DateTime.UtcNow;

        // Decrement stock for each prescribed medicine
        var medicineIds = appointment.PrescriptionItems
            .Where(pi => pi.MedicineId.HasValue)
            .Select(pi => pi.MedicineId!.Value)
            .Distinct()
            .ToList();

        if (medicineIds.Count > 0)
        {
            var medicines = await db.Medicines
                .Where(m => medicineIds.Contains(m.Id))
                .ToListAsync();

            foreach (var item in appointment.PrescriptionItems.Where(pi => pi.MedicineId.HasValue))
            {
                var med = medicines.FirstOrDefault(m => m.Id == item.MedicineId!.Value);
                if (med != null)
                    med.StockQuantity = Math.Max(0, med.StockQuantity - item.Quantity);
            }
        }

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

public record UpdatePharmacistProfileRequest(string? Email, string? Department);
