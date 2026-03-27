using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.DTOs.Appointment;
using NalamApi.Entities;
using NalamApi.Services;

namespace NalamApi.Endpoints;

/// <summary>
/// Appointment endpoints: doctor listing, availability, booking, management.
/// Accessible to all authenticated users. Patient-specific actions check ownership.
/// </summary>
public static class AppointmentEndpoints
{
    public static void MapAppointmentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/appointments")
            .WithTags("Appointments")
            .RequireAuthorization();

        // ── Doctor Browsing ───────────────────────────────────
        group.MapGet("/doctors", GetDoctors);
        group.MapGet("/doctors/{doctorProfileId:guid}/availability", GetDoctorAvailability);

        // ── Booking CRUD ──────────────────────────────────────
        group.MapPost("/", CreateAppointment);
        group.MapGet("/", GetAppointments);
        group.MapGet("/{id:guid}", GetAppointmentById);
        group.MapPut("/{id:guid}", UpdateAppointment);
        group.MapPatch("/{id:guid}/cancel", CancelAppointment);

        // ── Staff: status change ──────────────────────────────
        group.MapPatch("/{id:guid}/status", ChangeAppointmentStatus)
            .RequireAuthorization("StaffAccess");
    }

    // ═══════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════

    private static Guid GetHospitalId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("hospitalId")!.Value);

    private static Guid GetUserId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("sub")!.Value);

    private static string GetRole(HttpContext ctx) =>
        ctx.User.FindFirst("role")?.Value ?? "";

    // IST helpers — slots are stored in local (IST) time, so we compare against IST now
    private static readonly TimeZoneInfo IstZone = GetIstZone();
    private static TimeZoneInfo GetIstZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
    }
    private static DateOnly TodayIst() =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstZone));
    private static TimeOnly NowTimeIst() =>
        TimeOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstZone));

    private static string GetInitials(string fullName) =>
        string.Join("", fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Take(2).Select(w => w[0])).ToUpper();

    private static AppointmentResponse ToResponse(Appointment a)
    {
        var doctorName = a.DoctorProfile?.User?.FullName ?? "Doctor";
        var patientName = a.Patient?.FullName;
        return new AppointmentResponse(
            a.Id,
            a.BookingReference,
            doctorName,
            GetInitials(doctorName),
            a.DoctorProfile?.Specialty ?? "",
            a.ScheduleDate.ToString("yyyy-MM-dd"),
            a.StartTime.ToString("HH:mm"),
            a.EndTime.ToString("HH:mm"),
            a.ConsultationType,
            a.Status,
            a.ConsultationFee,
            a.TaxAmount,
            a.PlatformFee,
            a.DiscountAmount,
            a.TotalAmount,
            a.PaymentMethod,
            a.PaymentStatus,
            a.CouponCode,
            a.ConsultationType == "in-person" ? "Hospital Clinic" : null,
            a.DoctorProfile?.Rating,
            a.DoctorProfile?.ExperienceYears,
            a.CancelReason,
            a.CreatedAt,
            patientName,
            patientName != null ? GetInitials(patientName) : null,
            a.PatientId
        );
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/appointments/doctors
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetDoctors(
        NalamDbContext db,
        HttpContext ctx,
        string? specialty = null,
        string? search = null,
        int page = 1,
        int pageSize = 20)
    {
        var hospitalId = GetHospitalId(ctx);
        var query = db.DoctorProfiles.AsNoTracking()
            .Include(dp => dp.User)
            .Where(dp => dp.HospitalId == hospitalId && dp.IsAcceptingAppointments && dp.User.Status == "active")
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(specialty))
            query = query.Where(dp => dp.Specialty.ToLower().Contains(specialty.ToLower()));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(dp =>
                dp.User.FullName.ToLower().Contains(q) ||
                dp.Specialty.ToLower().Contains(q) ||
                (dp.Languages != null && dp.Languages.ToLower().Contains(q)));
        }

        var total = await query.CountAsync();
        var rawDoctors = await query
            .OrderByDescending(dp => dp.Rating ?? 0)
            .ThenByDescending(dp => dp.ReviewCount)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(dp => new
            {
                dp.Id,
                dp.UserId,
                FullName = dp.User.FullName,
                dp.Specialty,
                Department = dp.User.Department,
                dp.ExperienceYears,
                dp.ConsultationFee,
                dp.AvailableForVideo,
                dp.AvailableForInPerson,
                dp.Languages,
                dp.Rating,
                dp.ReviewCount,
                ProfilePhotoUrl = dp.User.ProfilePhotoUrl,
                dp.IsAcceptingAppointments
            })
            .ToListAsync();

        // Compute initials in memory (string.Split/Substring can't be translated to SQL)
        var doctors = rawDoctors.Select(dp => new DoctorListItem(
            dp.Id,
            dp.UserId,
            dp.FullName,
            GetInitials(dp.FullName),
            dp.Specialty,
            dp.Department,
            dp.ExperienceYears,
            dp.ConsultationFee,
            dp.AvailableForVideo,
            dp.AvailableForInPerson,
            dp.Languages,
            dp.Rating,
            dp.ReviewCount,
            dp.ProfilePhotoUrl,
            dp.IsAcceptingAppointments
        )).ToList();

        return Results.Ok(new { total, page, pageSize, doctors });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/appointments/doctors/{id}/availability
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetDoctorAvailability(
        Guid doctorProfileId,
        NalamDbContext db,
        string? startDate = null,
        int days = 7)
    {
        var profile = await db.DoctorProfiles.AsNoTracking()
            .Include(dp => dp.User)
            .FirstOrDefaultAsync(dp => dp.Id == doctorProfileId);

        if (profile is null)
            return Results.NotFound(new { error = "Doctor not found." });

        var start = string.IsNullOrEmpty(startDate)
            ? TodayIst()
            : DateOnly.Parse(startDate);

        // Get doctor's weekly schedule
        var schedules = await db.DoctorSchedules.AsNoTracking()
            .Where(ds => ds.DoctorProfileId == doctorProfileId && ds.IsActive)
            .ToListAsync();

        // Get existing appointments in the date range
        var endDate = start.AddDays(days);
        var existingAppointments = await db.Appointments.AsNoTracking()
            .Where(a => a.DoctorProfileId == doctorProfileId
                && a.ScheduleDate >= start
                && a.ScheduleDate < endDate
                && a.Status != "cancelled")
            .ToListAsync();

        var dates = new List<AvailableDateResponse>();
        var allSlotGroups = new Dictionary<string, List<AvailableSlotResponse>>();

        // Initialize slot groups
        allSlotGroups["Morning"] = new List<AvailableSlotResponse>();
        allSlotGroups["Afternoon"] = new List<AvailableSlotResponse>();
        allSlotGroups["Evening"] = new List<AvailableSlotResponse>();

        DateOnly? selectedDate = null;

        for (int i = 0; i < days; i++)
        {
            var date = start.AddDays(i);
            var dayOfWeek = (int)date.DayOfWeek;

            var daySchedules = schedules.Where(s => s.DayOfWeek == dayOfWeek).ToList();

            int availableSlots = 0;
            foreach (var schedule in daySchedules)
            {
                var current = schedule.StartTime;
                while (current.AddMinutes(schedule.SlotDurationMinutes) <= schedule.EndTime)
                {
                    var slotEnd = current.AddMinutes(schedule.SlotDurationMinutes);

                    // Skip past slots for today (compare against IST, not UTC)
                    if (date == TodayIst()
                        && current < NowTimeIst())
                    {
                        current = slotEnd;
                        continue;
                    }

                    var bookedCount = existingAppointments.Count(a =>
                        a.ScheduleDate == date && a.StartTime == current);

                    if (bookedCount < schedule.MaxPatientsPerSlot) availableSlots++;
                    current = slotEnd;
                }
            }

            dates.Add(new AvailableDateResponse(
                date,
                date == TodayIst() ? "Today" : date.DayOfWeek.ToString()[..3],
                availableSlots
            ));

            // Use the first date with available slots to populate slot groups
            if (selectedDate == null && availableSlots > 0)
                selectedDate = date;
        }

        // Populate slot groups for the selected date (or first date)
        var targetDate = selectedDate ?? start;
        var targetDayOfWeek = (int)targetDate.DayOfWeek;
        var targetSchedules = schedules.Where(s => s.DayOfWeek == targetDayOfWeek).ToList();

        foreach (var schedule in targetSchedules)
        {
            var current = schedule.StartTime;
            while (current.AddMinutes(schedule.SlotDurationMinutes) <= schedule.EndTime)
            {
                var slotEnd = current.AddMinutes(schedule.SlotDurationMinutes);

                if (targetDate == TodayIst()
                    && current < NowTimeIst())
                {
                    current = slotEnd;
                    continue;
                }

                var bookedCount = existingAppointments.Count(a =>
                    a.ScheduleDate == targetDate && a.StartTime == current);
                var maxCapacity = schedule.MaxPatientsPerSlot;

                var period = current.Hour < 12 ? "Morning"
                    : current.Hour < 17 ? "Afternoon"
                    : "Evening";

                allSlotGroups[period].Add(new AvailableSlotResponse(
                    current.ToString("hh:mm tt"),
                    slotEnd.ToString("hh:mm tt"),
                    bookedCount < maxCapacity,
                    bookedCount,
                    maxCapacity
                ));

                current = slotEnd;
            }
        }

        var slotGroups = new List<SlotGroupResponse>();
        if (allSlotGroups["Morning"].Count > 0)
            slotGroups.Add(new SlotGroupResponse("Morning", "sun", "#F59E0B", allSlotGroups["Morning"]));
        if (allSlotGroups["Afternoon"].Count > 0)
            slotGroups.Add(new SlotGroupResponse("Afternoon", "cloud-sun", "#F97316", allSlotGroups["Afternoon"]));
        if (allSlotGroups["Evening"].Count > 0)
            slotGroups.Add(new SlotGroupResponse("Evening", "moon", "#8B5CF6", allSlotGroups["Evening"]));

        return Results.Ok(new DoctorAvailabilityResponse(
            profile.Id,
            profile.User.FullName,
            dates,
            slotGroups
        ));
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /api/appointments
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> CreateAppointment(
        CreateAppointmentRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var hospitalId = GetHospitalId(ctx);
        var patientId = GetUserId(ctx);

        // Validate doctor profile
        var doctorProfile = await db.DoctorProfiles
            .Include(dp => dp.User)
            .FirstOrDefaultAsync(dp => dp.Id == request.DoctorProfileId);

        if (doctorProfile is null)
            return Results.NotFound(new { error = "Doctor not found." });

        if (!doctorProfile.IsAcceptingAppointments)
            return Results.BadRequest(new { error = "This doctor is not currently accepting appointments." });

        // Validate consultation type
        var validTypes = new[] { "video", "in-person" };
        if (!validTypes.Contains(request.ConsultationType))
            return Results.BadRequest(new { error = "Consultation type must be 'video' or 'in-person'." });

        if (request.ConsultationType == "video" && !doctorProfile.AvailableForVideo)
            return Results.BadRequest(new { error = "This doctor does not offer video consultations." });
        if (request.ConsultationType == "in-person" && !doctorProfile.AvailableForInPerson)
            return Results.BadRequest(new { error = "This doctor does not offer in-person consultations." });

        // Parse date and time
        if (!DateOnly.TryParse(request.ScheduleDate, out var scheduleDate))
            return Results.BadRequest(new { error = "Invalid date format. Use yyyy-MM-dd." });
        if (!TimeOnly.TryParse(request.StartTime, out var startTime))
            return Results.BadRequest(new { error = "Invalid time format. Use HH:mm." });

        // Check the slot falls within a schedule block
        var dayOfWeek = (int)scheduleDate.DayOfWeek;
        var schedule = await db.DoctorSchedules
            .Where(ds => ds.DoctorProfileId == request.DoctorProfileId
                && ds.IsActive
                && ds.DayOfWeek == dayOfWeek
                && ds.StartTime <= startTime
                && ds.EndTime >= startTime.AddMinutes(ds.SlotDurationMinutes))
            .FirstOrDefaultAsync();

        if (schedule is null)
            return Results.BadRequest(new { error = "The selected time slot is not within the doctor's schedule." });

        // Check consultation type compatibility
        if (schedule.ConsultationType != "both" && schedule.ConsultationType != request.ConsultationType)
            return Results.BadRequest(new { error = $"This time slot only supports {schedule.ConsultationType} consultations." });

        var endTime = startTime.AddMinutes(schedule.SlotDurationMinutes);

        // Calculate pricing
        var fee = doctorProfile.ConsultationFee;
        var tax = Math.Round(fee * 0.05m, 2);
        var platformFee = 49m;
        var discount = 0m;
        string? couponCode = null;

        if (!string.IsNullOrWhiteSpace(request.CouponCode)
            && request.CouponCode.Trim().ToUpper() == "NALAM100")
        {
            discount = 100m;
            couponCode = "NALAM100";
        }

        var total = Math.Max(0, fee + tax + platformFee - discount);

        // Generate booking reference
        var year = DateTime.UtcNow.Year;
        var count = await db.Appointments
            .IgnoreQueryFilters()
            .CountAsync(a => a.HospitalId == hospitalId && a.CreatedAt.Year == year);
        var bookingRef = $"NLM-{year}-{(count + 1):D4}";

        var appointment = new Entities.Appointment
        {
            HospitalId = hospitalId,
            PatientId = patientId,
            DoctorProfileId = request.DoctorProfileId,
            ScheduleDate = scheduleDate,
            StartTime = startTime,
            EndTime = endTime,
            ConsultationType = request.ConsultationType,
            Status = "confirmed",
            ConsultationFee = fee,
            TaxAmount = tax,
            PlatformFee = platformFee,
            DiscountAmount = discount,
            TotalAmount = total,
            CouponCode = couponCode,
            PaymentMethod = request.PaymentMethod,
            PaymentStatus = "paid",
            BookingReference = bookingRef,
            Notes = request.Notes
        };

        // Wrap capacity check + insert in a transaction to prevent race conditions
        // where two concurrent requests both pass the count check.
        await using var tx = await db.Database.BeginTransactionAsync();

        var bookedCount = await db.Appointments.CountAsync(a =>
            a.DoctorProfileId == request.DoctorProfileId
            && a.ScheduleDate == scheduleDate
            && a.StartTime == startTime
            && a.Status != "cancelled");

        if (bookedCount >= schedule.MaxPatientsPerSlot)
        {
            await tx.RollbackAsync();
            return Results.Conflict(new { error = "This time slot is fully booked. Please choose another slot." });
        }

        db.Appointments.Add(appointment);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        // Reload with navigation for response
        appointment.DoctorProfile = doctorProfile;
        appointment.Patient = (await db.Patients.FindAsync(patientId))!;

        await auditService.LogAsync(
            hospitalId, patientId,
            $"Appointment booked: {bookingRef} with {doctorProfile.User.FullName}",
            "appointment", "info",
            $"Date: {scheduleDate}, Time: {startTime}, Type: {request.ConsultationType}");

        return Results.Created($"/api/appointments/{appointment.Id}", ToResponse(appointment));
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/appointments
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetAppointments(
        NalamDbContext db,
        HttpContext ctx,
        string? tab = "upcoming",
        string? status = null,
        string? date = null,
        int page = 1,
        int pageSize = 20)
    {
        var userId = GetUserId(ctx);
        var role = GetRole(ctx);

        var query = db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .Include(a => a.Patient)
            .AsQueryable();

        // Patients see only their own; doctors see appointments with them
        if (role == "patient")
            query = query.Where(a => a.PatientId == userId);
        else if (role == "doctor")
        {
            var doctorProfile = await db.DoctorProfiles.FirstOrDefaultAsync(dp => dp.UserId == userId);
            if (doctorProfile != null)
                query = query.Where(a => a.DoctorProfileId == doctorProfile.Id);
        }

        // Date filter (e.g. "today" or "2026-03-24")
        if (!string.IsNullOrWhiteSpace(date))
        {
            var filterDate = date.ToLower() == "today"
                ? TodayIst()
                : DateOnly.Parse(date);
            query = query.Where(a => a.ScheduleDate == filterDate);
        }
        else
        {
            // Tab filter (only when no specific date)
            var today = TodayIst();
            if (tab == "upcoming")
                query = query.Where(a => a.ScheduleDate >= today && a.Status != "cancelled" && a.Status != "completed" && a.Status != "no_show");
            else if (tab == "past")
                query = query.Where(a => a.ScheduleDate < today || a.Status == "cancelled" || a.Status == "completed" || a.Status == "no_show");
        }

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(a => a.Status == status.ToLower());

        var total = await query.CountAsync();
        var appointments = await query
            .OrderByDescending(a => a.ScheduleDate)
            .ThenByDescending(a => a.StartTime)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var responses = appointments.Select(ToResponse).ToList();

        return Results.Ok(new AppointmentListResponse(total, page, pageSize, responses));
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/appointments/{id}
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetAppointmentById(
        Guid id,
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var role = GetRole(ctx);

        var appointment = await db.Appointments.AsNoTracking()
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment is null)
            return Results.NotFound(new { error = "Appointment not found." });

        // Ownership check for patients
        if (role == "patient" && appointment.PatientId != userId)
            return Results.Forbid();

        return Results.Ok(ToResponse(appointment));
    }

    // ═══════════════════════════════════════════════════════════
    //  PUT /api/appointments/{id} — Reschedule
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> UpdateAppointment(
        Guid id,
        UpdateAppointmentRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var role = GetRole(ctx);

        var appointment = await db.Appointments
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment is null)
            return Results.NotFound(new { error = "Appointment not found." });

        if (role == "patient" && appointment.PatientId != userId)
            return Results.Forbid();

        if (appointment.Status != "pending" && appointment.Status != "confirmed")
            return Results.BadRequest(new { error = "Only pending or confirmed appointments can be rescheduled." });

        // Check if appointment is at least 4 hours away
        var appointmentDateTime = appointment.ScheduleDate.ToDateTime(appointment.StartTime);
        if (appointmentDateTime <= DateTime.UtcNow.AddHours(4))
            return Results.BadRequest(new { error = "Appointments can only be rescheduled at least 4 hours in advance." });

        if (!string.IsNullOrWhiteSpace(request.ScheduleDate) && !string.IsNullOrWhiteSpace(request.StartTime))
        {
            if (!DateOnly.TryParse(request.ScheduleDate, out var newDate))
                return Results.BadRequest(new { error = "Invalid date format." });
            if (!TimeOnly.TryParse(request.StartTime, out var newTime))
                return Results.BadRequest(new { error = "Invalid time format." });

            // Verify schedule exists for new slot
            var dayOfWeek = (int)newDate.DayOfWeek;
            var schedule = await db.DoctorSchedules
                .Where(ds => ds.DoctorProfileId == appointment.DoctorProfileId
                    && ds.IsActive
                    && ds.DayOfWeek == dayOfWeek
                    && ds.StartTime <= newTime
                    && ds.EndTime >= newTime.AddMinutes(ds.SlotDurationMinutes))
                .FirstOrDefaultAsync();

            if (schedule is null)
                return Results.BadRequest(new { error = "The new time slot is not within the doctor's schedule." });

            // Check capacity for new slot
            var newSlotBookedCount = await db.Appointments.CountAsync(a =>
                a.Id != id
                && a.DoctorProfileId == appointment.DoctorProfileId
                && a.ScheduleDate == newDate
                && a.StartTime == newTime
                && a.Status != "cancelled");

            if (newSlotBookedCount >= schedule.MaxPatientsPerSlot)
                return Results.Conflict(new { error = "The new time slot is fully booked." });

            appointment.ScheduleDate = newDate;
            appointment.StartTime = newTime;
            appointment.EndTime = newTime.AddMinutes(schedule.SlotDurationMinutes);
        }

        if (!string.IsNullOrWhiteSpace(request.ConsultationType))
        {
            var validTypes = new[] { "video", "in-person" };
            if (!validTypes.Contains(request.ConsultationType))
                return Results.BadRequest(new { error = "Invalid consultation type." });
            appointment.ConsultationType = request.ConsultationType;
        }

        appointment.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await auditService.LogAsync(
            GetHospitalId(ctx), userId,
            $"Appointment rescheduled: {appointment.BookingReference}",
            "appointment", "info");

        return Results.Ok(ToResponse(appointment));
    }

    // ═══════════════════════════════════════════════════════════
    //  PATCH /api/appointments/{id}/cancel
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> CancelAppointment(
        Guid id,
        CancelAppointmentRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var role = GetRole(ctx);

        var appointment = await db.Appointments
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment is null)
            return Results.NotFound(new { error = "Appointment not found." });

        if (role == "patient" && appointment.PatientId != userId)
            return Results.Forbid();

        if (appointment.Status == "cancelled")
            return Results.BadRequest(new { error = "Appointment is already cancelled." });

        if (appointment.Status == "completed")
            return Results.BadRequest(new { error = "Completed appointments cannot be cancelled." });

        appointment.Status = "cancelled";
        appointment.CancelReason = request.Reason;
        appointment.CancelledAt = DateTime.UtcNow;
        appointment.CancelledBy = userId;
        appointment.PaymentStatus = "refunded";
        appointment.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        await auditService.LogAsync(
            GetHospitalId(ctx), userId,
            $"Appointment cancelled: {appointment.BookingReference}",
            "appointment", "warning",
            $"Reason: {request.Reason ?? "Not specified"}");

        return Results.Ok(ToResponse(appointment));
    }

    // ═══════════════════════════════════════════════════════════
    //  PATCH /api/appointments/{id}/status — Staff only
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> ChangeAppointmentStatus(
        Guid id,
        ChangeAppointmentStatusRequest request,
        NalamDbContext db,
        AuditService auditService,
        HttpContext ctx)
    {
        var appointment = await db.Appointments
            .Include(a => a.DoctorProfile)
                .ThenInclude(dp => dp.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (appointment is null)
            return Results.NotFound(new { error = "Appointment not found." });

        var validStatuses = new[] { "confirmed", "arrived", "in_consultation", "completed", "no_show" };
        if (!validStatuses.Contains(request.Status))
            return Results.BadRequest(new { error = $"Invalid status. Valid: {string.Join(", ", validStatuses)}" });

        var oldStatus = appointment.Status;
        appointment.Status = request.Status;
        appointment.UpdatedAt = DateTime.UtcNow;

        // Auto-create prescription queue entry when consultation is completed with notes
        if (request.Status == "completed" && !string.IsNullOrWhiteSpace(appointment.Notes) && appointment.PrescriptionStatus == null)
        {
            appointment.PrescriptionStatus = "pending";
        }

        await db.SaveChangesAsync();

        await auditService.LogAsync(
            GetHospitalId(ctx), GetUserId(ctx),
            $"Appointment {appointment.BookingReference} status: {oldStatus} → {request.Status}",
            "appointment", "info");

        return Results.Ok(ToResponse(appointment));
    }
}

// Extra DTO for staff status change (kept here for simplicity)
public record ChangeAppointmentStatusRequest(string Status);
