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
        group.MapGet("/appointments/{id:guid}", GetAppointmentDetail);
        group.MapPatch("/appointments/{id:guid}/checkin", CheckInPatient);
        group.MapPatch("/appointments/{id:guid}/in-consultation", SendToDoctor);
        group.MapGet("/patients", SearchPatients);
        group.MapPost("/patients", CreatePatient);
        group.MapGet("/profile", GetProfile);
        group.MapPatch("/profile", UpdateProfile);
        group.MapGet("/stats", GetStats);
        group.MapGet("/doctors", GetDoctors);
        group.MapPost("/book-appointment", BookAppointment);
        group.MapGet("/notifications", GetNotifications);
    }

    private static Guid GetHospitalId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("hospitalId")!.Value);

    private static Guid GetUserId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("sub")!.Value);

    // IST helpers — hospital is in IST (UTC+5:30); date boundaries must use local time
    private static readonly TimeZoneInfo IstZone = GetIstZone();
    private static TimeZoneInfo GetIstZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
    }
    private static DateOnly TodayIst() =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstZone));

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
        var today = TodayIst();

        // Fetch all of today's non-cancelled appointments for this hospital
        var todayAppointments = await db.Appointments.AsNoTracking()
            .Where(a => a.HospitalId == hospitalId && a.ScheduleDate == today && a.Status != "cancelled")
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
        string? priority = null,
        string? search = null)
    {
        var today = TodayIst();
        var hospitalId = GetHospitalId(ctx);

        var query = db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .Include(a => a.Patient)
            .Where(a => a.HospitalId == hospitalId && a.ScheduleDate == today && a.Status != "cancelled")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(a => a.Status == status.ToLower());

        if (!string.IsNullOrWhiteSpace(priority))
            query = query.Where(a => a.Priority == priority.ToLower());

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(a =>
                (a.Patient != null && a.Patient.FullName.ToLower().Contains(q)) ||
                (a.Patient != null && a.Patient.MobileNumber.Contains(q)) ||
                a.BookingReference.ToLower().Contains(q));
        }

        // Emergency first (0), then by time
        // Note: TimeOnly.ToString() cannot be translated to SQL — select raw TimeOnly and format in memory
        var rawQueue = await query
            .OrderBy(a => a.Priority == "emergency" ? 0 : 1)
            .ThenBy(a => a.StartTime)
            .Select(a => new
            {
                id = a.Id,
                bookingReference = a.BookingReference,
                patientName = a.Patient != null ? a.Patient.FullName : "",
                patientMobile = a.Patient != null ? a.Patient.MobileNumber : "",
                doctorName = a.DoctorProfile != null && a.DoctorProfile.User != null
                    ? a.DoctorProfile.User.FullName : "",
                startTime = a.StartTime,
                type = a.ConsultationType,
                status = a.Status,
                paymentStatus = a.PaymentStatus,
                priority = a.Priority,
            })
            .ToListAsync();

        var queue = rawQueue.Select(a => new
        {
            a.id,
            a.bookingReference,
            a.patientName,
            patientInitials = GetInitials(a.patientName),
            a.patientMobile,
            a.doctorName,
            time = a.startTime.ToString("HH:mm"),
            a.type,
            a.status,
            a.paymentStatus,
            a.priority,
        }).ToList();

        return Results.Ok(queue);
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/reception/appointments/{id} — Detail for Patient Arrival screen
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetAppointmentDetail(
        Guid id, NalamDbContext db, HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);
        var apt = await db.Appointments.AsNoTracking()
            .Include(a => a.Patient)
            .Include(a => a.DoctorProfile).ThenInclude(dp => dp.User)
            .FirstOrDefaultAsync(a => a.Id == id && a.HospitalId == hospitalId);

        if (apt == null) return Results.NotFound();

        int? age = null;
        if (apt.Patient.DateOfBirth.HasValue)
        {
            var dob = apt.Patient.DateOfBirth.Value;
            var today = TodayIst();
            age = today.Year - dob.Year;
            if (dob > today.AddYears(-age.Value)) age--;
        }

        return Results.Ok(new
        {
            id = apt.Id,
            bookingReference = apt.BookingReference,
            patientName = apt.Patient.FullName,
            patientId = apt.Patient.Id,
            patientInitials = GetInitials(apt.Patient.FullName),
            patientMobile = apt.Patient.MobileNumber,
            patientAge = age,
            patientGender = apt.Patient.Gender,
            insuranceProvider = apt.Patient.InsuranceProvider,
            doctorName = apt.DoctorProfile.User.FullName,
            doctorSpecialty = apt.DoctorProfile.Specialty,
            scheduledTime = apt.StartTime.ToString("hh\\:mm tt"),
            consultationType = apt.ConsultationType,
            notes = apt.Notes,
            status = apt.Status,
            paymentStatus = apt.PaymentStatus,
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  PATCH /api/reception/appointments/{id}/checkin
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> CheckInPatient(
        Guid id, NalamDbContext db, HttpContext ctx, AuditService auditService)
    {
        var hospitalId = GetHospitalId(ctx);
        var apt = await db.Appointments
            .FirstOrDefaultAsync(a => a.Id == id && a.HospitalId == hospitalId);

        if (apt == null) return Results.NotFound();
        if (apt.Status != "pending" && apt.Status != "confirmed")
            return Results.BadRequest(new { error = $"Cannot check in an appointment with status '{apt.Status}'." });

        apt.Status = "arrived";
        apt.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await auditService.LogAsync(hospitalId, GetUserId(ctx),
            $"Patient checked in for appointment {apt.BookingReference}", "appointment", "info");

        return Results.Ok(new { status = "arrived" });
    }

    // ═══════════════════════════════════════════════════════════
    //  PATCH /api/reception/appointments/{id}/in-consultation
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> SendToDoctor(
        Guid id, NalamDbContext db, HttpContext ctx, AuditService auditService)
    {
        var hospitalId = GetHospitalId(ctx);
        var apt = await db.Appointments
            .FirstOrDefaultAsync(a => a.Id == id && a.HospitalId == hospitalId);

        if (apt == null) return Results.NotFound();
        if (apt.Status != "arrived")
            return Results.BadRequest(new { error = "Patient must be checked in (arrived) before sending to doctor." });

        apt.Status = "in_consultation";
        apt.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await auditService.LogAsync(hospitalId, GetUserId(ctx),
            $"Patient sent to doctor for appointment {apt.BookingReference}", "appointment", "info");

        return Results.Ok(new { status = "in_consultation" });
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

        var dbQuery = db.Patients.AsNoTracking()
            .Where(p => p.HospitalId == hospitalId && p.Status == "active")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var q = query.ToLower();
            dbQuery = dbQuery.Where(p =>
                p.FullName.ToLower().Contains(q) ||
                p.MobileNumber.Contains(q));
        }

        var rawPatients = await dbQuery
            .OrderBy(p => p.FullName)
            .Take(50)
            .Select(p => new
            {
                id = p.Id,
                fullName = p.FullName,
                mobileNumber = p.MobileNumber
            })
            .ToListAsync();

        // Compute initials in memory (string.Split/Substring can't be translated to SQL)
        var patients = rawPatients.Select(p => new
        {
            p.id,
            p.fullName,
            p.mobileNumber,
            initials = GetInitials(p.fullName)
        }).ToList();

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

        // Check if patient already exists in patients table
        var existingPatient = await db.Patients
            .FirstOrDefaultAsync(p => p.HospitalId == hospitalId && p.MobileNumber == mobile);

        if (existingPatient != null)
            return Results.Conflict(new
            {
                error = "This mobile number is already registered for this hospital.",
                existingPatient = new
                {
                    id = existingPatient.Id,
                    fullName = existingPatient.FullName,
                    mobileNumber = existingPatient.MobileNumber,
                    initials = GetInitials(existingPatient.FullName)
                }
            });

        var patient = new Patient
        {
            HospitalId = hospitalId,
            FullName = request.FullName.Trim(),
            MobileNumber = mobile,
            Status = "active",
            IsVerified = false
        };

        db.Patients.Add(patient);
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
    // ═══════════════════════════════════════════════════════════
    //  GET /api/reception/profile
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
            department = user.Department ?? "Front Office",
            employeeId = user.EmployeeId ?? "N/A",
            joinDate = user.CreatedAt.ToString("MMM dd, yyyy"),
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  PATCH /api/reception/profile
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> UpdateProfile(
        UpdateReceptionistProfileRequest request, NalamDbContext db, HttpContext ctx)
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
    //  GET /api/reception/stats
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetStats(NalamDbContext db, HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);
        var today = TodayIst();
        var todayUtc = DateTime.UtcNow.Date;

        var registeredToday = await db.Patients.AsNoTracking()
            .Where(p => p.HospitalId == hospitalId && p.CreatedAt >= todayUtc)
            .CountAsync();

        var appointmentsToday = await db.Appointments.AsNoTracking()
            .Where(a => a.HospitalId == hospitalId && a.ScheduleDate == today && a.Status != "cancelled")
            .CountAsync();

        var pendingCheckIns = await db.Appointments.AsNoTracking()
            .Where(a => a.HospitalId == hospitalId && a.ScheduleDate == today
                        && (a.Status == "pending" || a.Status == "confirmed"))
            .CountAsync();

        return Results.Ok(new
        {
            registeredToday,
            appointmentsToday,
            walkInsToday = registeredToday,
            pendingCheckIns,
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/reception/doctors
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetDoctors(NalamDbContext db, HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);

        var rawDoctors = await db.DoctorProfiles.AsNoTracking()
            .Include(dp => dp.User)
            .Where(dp => dp.HospitalId == hospitalId
                        && dp.IsAcceptingAppointments
                        && dp.User.Status == "active")
            .Select(dp => new
            {
                id = dp.Id,
                name = dp.User.FullName,
                specialty = dp.Specialty,
                consultationFee = dp.ConsultationFee,
                availableForInPerson = dp.AvailableForInPerson,
                availableForVideo = dp.AvailableForVideo,
            })
            .ToListAsync();

        return Results.Ok(rawDoctors);
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /api/reception/book-appointment
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> BookAppointment(
        BookAppointmentRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);

        if (!DateOnly.TryParse(request.ScheduleDate, out var scheduleDate))
            return Results.BadRequest(new { error = "Invalid date format. Use yyyy-MM-dd." });

        if (!TimeOnly.TryParse(request.StartTime, out var startTime))
            return Results.BadRequest(new { error = "Invalid time format. Use HH:mm." });

        var patient = await db.Patients.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.PatientId && p.HospitalId == hospitalId);
        if (patient == null) return Results.BadRequest(new { error = "Patient not found." });

        var doctor = await db.DoctorProfiles.AsNoTracking()
            .FirstOrDefaultAsync(dp => dp.Id == request.DoctorProfileId && dp.HospitalId == hospitalId);
        if (doctor == null) return Results.BadRequest(new { error = "Doctor not found." });

        var endTime = startTime.AddMinutes(30);
        var bookingRef = $"REC-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}";

        var priority = (request.Priority?.ToLower() == "emergency") ? "emergency" : "normal";
        var appointment = new Appointment
        {
            HospitalId = hospitalId,
            PatientId = request.PatientId,
            DoctorProfileId = request.DoctorProfileId,
            ScheduleDate = scheduleDate,
            StartTime = startTime,
            EndTime = endTime,
            ConsultationType = request.ConsultationType ?? "in-person",
            Status = "confirmed",
            ConsultationFee = doctor.ConsultationFee,
            PaymentStatus = "pending",
            PaymentMethod = "counter",
            BookingReference = bookingRef,
            Notes = request.Notes,
            Priority = priority,
        };

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync();

        await auditService.LogAsync(hospitalId, GetUserId(ctx),
            $"Appointment booked by receptionist: {bookingRef} for {patient.FullName}",
            "appointment", "info");

        return Results.Created($"/api/reception/appointments/{appointment.Id}", new
        {
            id = appointment.Id,
            bookingReference = bookingRef,
            patientName = patient.FullName,
            scheduleDate = scheduleDate.ToString("yyyy-MM-dd"),
            startTime = startTime.ToString("HH:mm"),
            status = "confirmed",
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/reception/notifications
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetNotifications(NalamDbContext db, HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);
        var since = DateTime.UtcNow.AddHours(-24);

        var logs = await db.AuditLogs.AsNoTracking()
            .Where(l => l.HospitalId == hospitalId
                     && l.CreatedAt >= since
                     && (l.Category == "appointment" || l.Category == "reception"))
            .OrderByDescending(l => l.CreatedAt)
            .Take(30)
            .Select(l => new { l.Id, l.Action, l.Category, l.CreatedAt })
            .ToListAsync();

        var notifications = logs.Select(l => new
        {
            id = l.Id,
            title = MapNotifTitle(l.Action),
            message = l.Action,
            category = l.Category,
            filter = MapNotifFilter(l.Action),
            time = l.CreatedAt,
        });

        return Results.Ok(notifications);
    }

    private static string MapNotifTitle(string action) =>
        action.StartsWith("Patient checked in") ? "Patient Arrived" :
        action.StartsWith("Patient sent to doctor") ? "Sent to Doctor" :
        action.StartsWith("Appointment booked by receptionist") ? "New Booking" :
        action.StartsWith("Registered walk-in") ? "Walk-in Registered" :
        "Appointment Update";

    private static string MapNotifFilter(string action) =>
        action.StartsWith("Patient checked in") ? "arrived" :
        action.StartsWith("Patient sent to doctor") ? "in_consultation" :
        "all";
}

public record ReceptionistCreatePatientRequest(string FullName, string MobileNumber);
public record UpdateReceptionistProfileRequest(string? Email, string? Department);
public record BookAppointmentRequest(
    Guid PatientId,
    Guid DoctorProfileId,
    string ScheduleDate,
    string StartTime,
    string? ConsultationType,
    string? Notes,
    string? Priority  // "normal" or "emergency"
);
