using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.DTOs.Appointment;
using NalamApi.Entities;
using NalamApi.Services;

namespace NalamApi.Endpoints;

/// <summary>
/// Receptionist endpoints: Daily dashboard stats, live patient queue, check-in actions.
/// Reserved for users with StaffAccess (admin, receptionist, pharmacist).
/// </summary>
public static class ReceptionistEndpoints
{
    public static void MapReceptionistEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/reception")
            .WithTags("Receptionist")
            .RequireAuthorization("StaffAccess");

        group.MapGet("/dashboard", GetDailyDashboard);
        group.MapGet("/queue", GetTodayQueue);
        group.MapGet("/patients", SearchPatients);
        group.MapPost("/patients", CreatePatient);
    }

    private static Guid GetHospitalId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("hospitalId")!.Value);

    private static Guid GetUserId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("sub")!.Value);

    private static string GetInitials(string fullName) =>
        string.Join("", fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Take(2).Select(w => w[0])).ToUpper();

    // ═══════════════════════════════════════════════════════════
    //  GET /api/reception/dashboard
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetDailyDashboard(
        NalamDbContext db,
        HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Fetch all of today's non-cancelled appointments for this hospital
        var todayAppointments = await db.Appointments.AsNoTracking()
            .Where(a => a.ScheduleDate == today && a.Status != "cancelled")
            .ToListAsync();

        var totalAppointments = todayAppointments.Count;
        var waitingCount = todayAppointments.Count(a => a.Status == "arrived");
        var inConsultationCount = todayAppointments.Count(a => a.Status == "in_consultation");
        var completedCount = todayAppointments.Count(a => a.Status == "completed");
        
        // Count pending/confirmed that haven't arrived yet
        var pendingCount = todayAppointments.Count(a => a.Status == "pending" || a.Status == "confirmed");

        return Results.Ok(new 
        {
            date = today.ToString("yyyy-MM-dd"),
            stats = new 
            {
                total = totalAppointments,
                waiting = waitingCount,
                in_consultation = inConsultationCount,
                completed = completedCount,
                upcoming = pendingCount
            }
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/reception/queue
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetTodayQueue(
        NalamDbContext db,
        HttpContext ctx,
        string? status = null,
        string? search = null)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var query = db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .Include(a => a.Patient)
            .Where(a => a.ScheduleDate == today && a.Status != "cancelled")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(a => a.Status == status.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(a => 
                (a.Patient != null && a.Patient.FullName.ToLower().Contains(q)) ||
                (a.Patient != null && a.Patient.MobileNumber.Contains(q)) ||
                a.BookingReference.ToLower().Contains(q));
        }

        var queue = await query
            .OrderBy(a => a.StartTime)
            .Select(a => new 
            {
                id = a.Id,
                bookingReference = a.BookingReference,
                patientName = a.Patient.FullName,
                patientInitials = GetInitials(a.Patient.FullName),
                patientMobile = a.Patient.MobileNumber,
                doctorName = a.DoctorProfile.User.FullName,
                time = a.StartTime.ToString("HH:mm"),
                type = a.ConsultationType,
                status = a.Status,
                paymentStatus = a.PaymentStatus
            })
            .ToListAsync();

        return Results.Ok(queue);
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/reception/patients — Search
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> SearchPatients(
        NalamDbContext db,
        HttpContext ctx,
        string? query = null)
    {
        var hospitalId = GetHospitalId(ctx);

        var dbQuery = db.Users.AsNoTracking()
            .Where(u => u.HospitalId == hospitalId && u.Role == "patient" && u.Status == "active")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.ToLower();
            dbQuery = dbQuery.Where(u => 
                u.FullName.ToLower().Contains(q) || 
                u.MobileNumber.Contains(q));
        }

        var patients = await dbQuery
            .OrderBy(u => u.FullName)
            .Take(50)
            .Select(u => new 
            {
                id = u.Id,
                fullName = u.FullName,
                mobileNumber = u.MobileNumber,
                initials = GetInitials(u.FullName)
            })
            .ToListAsync();

        return Results.Ok(patients);
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /api/reception/patients — Walk-in Registration
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> CreatePatient(
        ReceptionistCreatePatientRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.MobileNumber))
            return Results.BadRequest(new { error = "FullName and MobileNumber are required." });

        var hospitalId = GetHospitalId(ctx);
        var mobile = request.MobileNumber.Trim().Replace(" ", "");

        // Check if patient already exists
        var existingPatient = await db.Users
            .FirstOrDefaultAsync(u => u.HospitalId == hospitalId && u.MobileNumber == mobile);

        if (existingPatient != null)
        {
            if (existingPatient.Role != "patient")
                return Results.Conflict(new { error = "This mobile number belongs to a staff member." });
            
            return Results.Conflict(new { error = "Patient already exists. Use the search function." });
        }

        var patient = new User
        {
            HospitalId = hospitalId,
            FullName = request.FullName.Trim(),
            MobileNumber = mobile,
            Role = "patient",
            Status = "active",
            IsVerified = false
        };

        db.Users.Add(patient);
        await db.SaveChangesAsync();

        await auditService.LogAsync(
            hospitalId, GetUserId(ctx),
            $"Registered walk-in patient: {patient.FullName}",
            "reception", "info",
            $"Mobile: {mobile}");

        return Results.Created($"/api/reception/patients/{patient.Id}", new 
        {
            id = patient.Id,
            fullName = patient.FullName,
            mobileNumber = patient.MobileNumber,
            initials = GetInitials(patient.FullName)
        });
    }
}

public record ReceptionistCreatePatientRequest(string FullName, string MobileNumber);
