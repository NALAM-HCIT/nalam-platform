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
        group.MapGet("/care-plan", GetCarePlan);
        group.MapGet("/notifications", GetNotifications);
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

        var rawConsultations = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new
            {
                id = a.Id,
                bookingReference = a.BookingReference,
                doctorName = a.DoctorProfile.User.FullName,
                specialty = a.DoctorProfile.Specialty,
                scheduleDate = a.ScheduleDate.ToString("yyyy-MM-dd"),
                time = a.StartTime.ToString("hh:mm tt"),
                consultationType = a.ConsultationType,
                notes = a.Notes,
                prescriptionStatus = a.PrescriptionStatus,
                hasPrescription = a.PrescriptionStatus != null
            })
            .ToListAsync();

        // Compute initials in memory (string.Split/Substring can't be translated to SQL)
        var consultations = rawConsultations.Select(a => new
        {
            a.id,
            a.bookingReference,
            a.doctorName,
            doctorInitials = GetInitials(a.doctorName),
            a.specialty,
            a.scheduleDate,
            a.time,
            a.consultationType,
            a.notes,
            a.prescriptionStatus,
            a.hasPrescription
        }).ToList();

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

        var rawPrescriptions = await db.Appointments.AsNoTracking()
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
                specialty = a.DoctorProfile.Specialty,
                scheduleDate = a.ScheduleDate.ToString("yyyy-MM-dd"),
                time = a.StartTime.ToString("hh:mm tt"),
                consultationType = a.ConsultationType,
                prescriptionNotes = a.Notes,
                prescriptionStatus = a.PrescriptionStatus
            })
            .ToListAsync();

        // Compute initials in memory (string.Split/Substring can't be translated to SQL)
        var prescriptions = rawPrescriptions.Select(a => new
        {
            a.id,
            a.bookingReference,
            a.doctorName,
            doctorInitials = GetInitials(a.doctorName),
            a.specialty,
            a.scheduleDate,
            a.time,
            a.consultationType,
            a.prescriptionNotes,
            a.prescriptionStatus
        }).ToList();

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

    // ═══════════════════════════════════════════════════════════
    //  GET /api/patient/care-plan
    //  Returns today's care plan: upcoming appointment + recent
    //  prescription notes + active Rx count.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetCarePlan(
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var sixtyDaysAgo = today.AddDays(-60);

        // Next upcoming confirmed/pending appointment
        var upcoming = await db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile).ThenInclude(dp => dp.User)
            .Where(a => a.PatientId == userId &&
                        (a.Status == "confirmed" || a.Status == "pending") &&
                        a.ScheduleDate >= today)
            .OrderBy(a => a.ScheduleDate).ThenBy(a => a.StartTime)
            .FirstOrDefaultAsync();

        // Last 3 completed appointments with prescription notes
        var rxNotes = await db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile).ThenInclude(dp => dp.User)
            .Where(a => a.PatientId == userId &&
                        a.Status == "completed" &&
                        a.Notes != null && a.Notes.Length > 0)
            .OrderByDescending(a => a.ScheduleDate)
            .Take(3)
            .Select(a => new
            {
                appointmentId = a.Id,
                date = a.ScheduleDate.ToString("yyyy-MM-dd"),
                doctorName = a.DoctorProfile.User.FullName,
                specialty = a.DoctorProfile.Specialty,
                notes = a.Notes,
            })
            .ToListAsync();

        // Count dispensed prescriptions in last 60 days
        var activePrescriptionCount = await db.Appointments.AsNoTracking()
            .Where(a => a.PatientId == userId &&
                        a.Status == "completed" &&
                        a.PrescriptionStatus == "dispensed" &&
                        a.ScheduleDate >= sixtyDaysAgo)
            .CountAsync();

        return Results.Ok(new
        {
            upcomingAppointment = upcoming != null ? new
            {
                id = upcoming.Id,
                doctorName = upcoming.DoctorProfile.User.FullName,
                specialty = upcoming.DoctorProfile.Specialty,
                scheduleDate = upcoming.ScheduleDate.ToString("yyyy-MM-dd"),
                startTime = upcoming.StartTime.ToString("HH:mm"),
                consultationType = upcoming.ConsultationType,
            } : null,
            prescriptionNotes = rxNotes,
            activePrescriptionCount,
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/patient/notifications
    //  Derives notifications from existing appointment/prescription
    //  data — no separate notifications table needed.
    // ═══════════════════════════════════════════════════════════

    private record NotificationDto(string Id, string Type, string Title, string Body, string Timestamp, bool Read);

    private static async Task<IResult> GetNotifications(
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var in48h = today.AddDays(2);
        var sevenDaysAgo = today.AddDays(-7);
        var threeDaysAgo = today.AddDays(-3);

        var notifications = new List<NotificationDto>();

        // 1. Upcoming appointments within 48 hours → "Appointment Reminder"
        var upcoming = await db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile).ThenInclude(dp => dp.User)
            .Where(a => a.PatientId == userId &&
                        (a.Status == "confirmed" || a.Status == "pending") &&
                        a.ScheduleDate >= today && a.ScheduleDate <= in48h)
            .OrderBy(a => a.ScheduleDate).ThenBy(a => a.StartTime)
            .ToListAsync();

        foreach (var appt in upcoming)
        {
            var dateLabel = appt.ScheduleDate == today ? "today" : "tomorrow";
            notifications.Add(new NotificationDto(
                Id: $"appt-{appt.Id}",
                Type: "appointment",
                Title: "Appointment Reminder",
                Body: $"Dr. {appt.DoctorProfile.User.FullName} — {dateLabel} at {appt.StartTime:hh:mm tt}",
                Timestamp: now.ToString("o"),
                Read: false
            ));
        }

        // 2. Prescriptions dispensed in last 7 days → "Prescription Ready"
        var dispensed = await db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile).ThenInclude(dp => dp.User)
            .Where(a => a.PatientId == userId &&
                        a.PrescriptionStatus == "dispensed" &&
                        a.ScheduleDate >= sevenDaysAgo)
            .OrderByDescending(a => a.ScheduleDate)
            .ToListAsync();

        foreach (var appt in dispensed)
        {
            notifications.Add(new NotificationDto(
                Id: $"rx-ready-{appt.Id}",
                Type: "prescription_ready",
                Title: "Prescription Ready",
                Body: $"Your prescription from Dr. {appt.DoctorProfile.User.FullName} has been dispensed.",
                Timestamp: appt.ScheduleDate.ToDateTime(TimeOnly.MinValue).ToString("o"),
                Read: true
            ));
        }

        // 3. Pending prescriptions → "Prescription Waiting"
        var pending = await db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile).ThenInclude(dp => dp.User)
            .Where(a => a.PatientId == userId && a.PrescriptionStatus == "pending")
            .OrderByDescending(a => a.ScheduleDate)
            .ToListAsync();

        foreach (var appt in pending)
        {
            notifications.Add(new NotificationDto(
                Id: $"rx-pending-{appt.Id}",
                Type: "prescription_pending",
                Title: "Prescription Waiting",
                Body: $"Your prescription from Dr. {appt.DoctorProfile.User.FullName} is at the pharmacy.",
                Timestamp: appt.ScheduleDate.ToDateTime(TimeOnly.MinValue).ToString("o"),
                Read: false
            ));
        }

        // 4. Completed appointments within 3 days with notes → "Consultation Summary"
        var recent = await db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile).ThenInclude(dp => dp.User)
            .Where(a => a.PatientId == userId &&
                        a.Status == "completed" &&
                        a.Notes != null && a.Notes.Length > 0 &&
                        a.ScheduleDate >= threeDaysAgo)
            .OrderByDescending(a => a.ScheduleDate)
            .ToListAsync();

        foreach (var appt in recent)
        {
            notifications.Add(new NotificationDto(
                Id: $"summary-{appt.Id}",
                Type: "consultation_summary",
                Title: "Consultation Summary Available",
                Body: $"Notes from Dr. {appt.DoctorProfile.User.FullName} on {appt.ScheduleDate:MMM d} are ready.",
                Timestamp: appt.ScheduleDate.ToDateTime(TimeOnly.MinValue).ToString("o"),
                Read: true
            ));
        }

        // Sort: unread first, then by timestamp descending
        var sorted = notifications
            .OrderBy(n => n.Read)
            .ThenByDescending(n => n.Timestamp)
            .Select(n => new { id = n.Id, type = n.Type, title = n.Title, body = n.Body, timestamp = n.Timestamp, read = n.Read })
            .ToList();

        return Results.Ok(sorted);
    }
}
