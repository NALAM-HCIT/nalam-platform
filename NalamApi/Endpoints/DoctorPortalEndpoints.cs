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
        group.MapPut("/my-profile", UpdateMyProfile).RequireAuthorization("DoctorOnly");
        group.MapGet("/patient-summary/{patientId:guid}", GetPatientSummary);

        // Doctor's own availability schedule management
        group.MapGet("/my-schedule", GetMySchedule).RequireAuthorization("DoctorOnly");
        group.MapPost("/my-schedule", AddSchedule).RequireAuthorization("DoctorOnly");
        group.MapPut("/my-schedule/{id:guid}", UpdateSchedule).RequireAuthorization("DoctorOnly");
        group.MapDelete("/my-schedule/{id:guid}", DeleteSchedule).RequireAuthorization("DoctorOnly");

        // Prescription items — read by any staff, write by doctors only
        group.MapGet("/prescriptions/{appointmentId:guid}/items", GetPrescriptionItems).RequireAuthorization("StaffAccess");
        group.MapPost("/prescriptions/{appointmentId:guid}/items", AddPrescriptionItem).RequireAuthorization("DoctorOnly");
        group.MapDelete("/prescriptions/{appointmentId:guid}/items/{itemId:guid}", DeletePrescriptionItem).RequireAuthorization("DoctorOnly");
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

        var query = db.Users.AsNoTracking()
            .Where(u => u.HospitalId == caller.HospitalId && u.Status == "active");

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(q) ||
                u.Role.ToLower().Contains(q) ||
                (u.Department != null && u.Department.ToLower().Contains(q)));
        }

        var rawUsers = await query
            .OrderBy(u => u.Role)
            .ThenBy(u => u.FullName)
            .Select(u => new
            {
                id = u.Id,
                name = u.FullName,
                role = u.Role,
                department = u.Department,
                phone = u.MobileNumber,
                email = u.Email
            })
            .ToListAsync();

        // Compute initials in memory (string.Split/Substring can't be translated to SQL)
        var users = rawUsers.Select(u => new
        {
            u.id,
            u.name,
            initials = GetInitials(u.name),
            u.role,
            u.department,
            u.phone,
            u.email
        }).ToList();

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

        var user = await db.Users
            .Include(u => u.Hospital)
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return Results.NotFound(new { error = "User not found." });

        // Try to find doctor profile
        var doctorProfile = await db.DoctorProfiles.AsNoTracking()
            .FirstOrDefaultAsync(dp => dp.UserId == userId);

        // Get appointment stats
        var appointments = doctorProfile != null
            ? await db.Appointments.AsNoTracking()
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
            hospitalName = user.Hospital?.Name,
            doctorProfile = doctorProfile != null ? new
            {
                specialty = doctorProfile.Specialty,
                experienceYears = doctorProfile.ExperienceYears,
                consultationFee = doctorProfile.ConsultationFee,
                rating = doctorProfile.Rating,
                reviewCount = doctorProfile.ReviewCount,
                bio = doctorProfile.Bio,
                languages = doctorProfile.Languages,
                qualification = doctorProfile.Qualification,
                mciRegistration = doctorProfile.MciRegistration,
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
    //  PUT /api/doctor-portal/my-profile
    //  Update doctor's own profile fields
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> UpdateMyProfile(
        UpdateDoctorProfileRequest req,
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);

        var user = await db.Users.FindAsync(userId);
        if (user == null) return Results.NotFound(new { error = "User not found." });

        // Update user fields
        if (!string.IsNullOrWhiteSpace(req.FullName)) user.FullName = req.FullName.Trim();
        if (req.Email != null) user.Email = string.IsNullOrWhiteSpace(req.Email) ? null : req.Email.Trim();
        if (req.Department != null) user.Department = string.IsNullOrWhiteSpace(req.Department) ? null : req.Department.Trim();

        // Update doctor profile fields
        var dp = await db.DoctorProfiles.FirstOrDefaultAsync(d => d.UserId == userId);
        if (dp != null)
        {
            if (!string.IsNullOrWhiteSpace(req.Specialty)) dp.Specialty = req.Specialty.Trim();
            if (req.ExperienceYears.HasValue) dp.ExperienceYears = req.ExperienceYears.Value;
            if (req.Bio != null) dp.Bio = string.IsNullOrWhiteSpace(req.Bio) ? null : req.Bio.Trim();
            if (req.Languages != null) dp.Languages = string.IsNullOrWhiteSpace(req.Languages) ? null : req.Languages.Trim();
            if (req.Qualification != null) dp.Qualification = string.IsNullOrWhiteSpace(req.Qualification) ? null : req.Qualification.Trim();
            if (req.MciRegistration != null) dp.MciRegistration = string.IsNullOrWhiteSpace(req.MciRegistration) ? null : req.MciRegistration.Trim();
        }

        await db.SaveChangesAsync();

        return Results.Ok(new { success = true, name = user.FullName });
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

        var patient = await db.Patients.FindAsync(patientId);
        if (patient == null)
            return Results.NotFound(new { error = "Patient not found." });

        // Get the doctor's profile to filter appointments
        var doctorProfile = await db.DoctorProfiles
            .FirstOrDefaultAsync(dp => dp.UserId == userId);

        // Get past appointments for this patient (with this doctor if doctor profile exists)
        var appointmentsQuery = db.Appointments.AsNoTracking()
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
                role = "patient"
            },
            totalVisits = pastAppointments.Count(a => a.status == "completed"),
            recentAppointments = pastAppointments
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/doctor-portal/my-schedule
    //  Returns the doctor's active weekly schedule blocks
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetMySchedule(NalamDbContext db, HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var doctorProfile = await db.DoctorProfiles.AsNoTracking()
            .FirstOrDefaultAsync(dp => dp.UserId == userId);
        if (doctorProfile == null)
            return Results.NotFound(new { error = "Doctor profile not found." });

        var schedules = await db.DoctorSchedules.AsNoTracking()
            .Where(ds => ds.DoctorProfileId == doctorProfile.Id && ds.IsActive)
            .OrderBy(ds => ds.DayOfWeek)
            .ThenBy(ds => ds.StartTime)
            .ToListAsync();

        return Results.Ok(schedules.Select(s => new
        {
            id = s.Id,
            dayOfWeek = s.DayOfWeek,
            startTime = s.StartTime.ToString("HH:mm"),
            endTime = s.EndTime.ToString("HH:mm"),
            slotDurationMinutes = s.SlotDurationMinutes,
            consultationType = s.ConsultationType,
            maxPatientsPerSlot = s.MaxPatientsPerSlot,
        }));
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /api/doctor-portal/my-schedule
    //  Add a new schedule block
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> AddSchedule(
        AddScheduleRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var doctorProfile = await db.DoctorProfiles
            .FirstOrDefaultAsync(dp => dp.UserId == userId);
        if (doctorProfile == null)
            return Results.NotFound(new { error = "Doctor profile not found." });

        if (request.DayOfWeek < 0 || request.DayOfWeek > 6)
            return Results.BadRequest(new { error = "dayOfWeek must be 0 (Sunday) to 6 (Saturday)." });

        if (!TimeOnly.TryParse(request.StartTime, out var startTime))
            return Results.BadRequest(new { error = "Invalid startTime format. Use HH:mm." });
        if (!TimeOnly.TryParse(request.EndTime, out var endTime))
            return Results.BadRequest(new { error = "Invalid endTime format. Use HH:mm." });
        if (endTime <= startTime)
            return Results.BadRequest(new { error = "endTime must be after startTime." });

        var validTypes = new[] { "video", "in-person", "both" };
        if (!validTypes.Contains(request.ConsultationType))
            return Results.BadRequest(new { error = "consultationType must be 'video', 'in-person', or 'both'." });

        var schedule = new DoctorSchedule
        {
            HospitalId = doctorProfile.HospitalId,
            DoctorProfileId = doctorProfile.Id,
            DayOfWeek = request.DayOfWeek,
            StartTime = startTime,
            EndTime = endTime,
            SlotDurationMinutes = request.SlotDurationMinutes > 0 ? request.SlotDurationMinutes : 30,
            ConsultationType = request.ConsultationType,
            MaxPatientsPerSlot = request.MaxPatientsPerSlot > 0 ? request.MaxPatientsPerSlot : 3,
            IsActive = true,
        };

        db.DoctorSchedules.Add(schedule);
        await db.SaveChangesAsync();

        return Results.Created($"/api/doctor-portal/my-schedule/{schedule.Id}", new
        {
            id = schedule.Id,
            dayOfWeek = schedule.DayOfWeek,
            startTime = schedule.StartTime.ToString("HH:mm"),
            endTime = schedule.EndTime.ToString("HH:mm"),
            slotDurationMinutes = schedule.SlotDurationMinutes,
            consultationType = schedule.ConsultationType,
            maxPatientsPerSlot = schedule.MaxPatientsPerSlot,
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  PUT /api/doctor-portal/my-schedule/{id}
    //  Update an existing schedule block
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> UpdateSchedule(
        Guid id,
        UpdateScheduleRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var doctorProfile = await db.DoctorProfiles
            .FirstOrDefaultAsync(dp => dp.UserId == userId);
        if (doctorProfile == null)
            return Results.NotFound(new { error = "Doctor profile not found." });

        var schedule = await db.DoctorSchedules
            .FirstOrDefaultAsync(ds => ds.Id == id && ds.DoctorProfileId == doctorProfile.Id);
        if (schedule == null)
            return Results.NotFound(new { error = "Schedule not found." });

        if (request.StartTime != null)
        {
            if (!TimeOnly.TryParse(request.StartTime, out var startTime))
                return Results.BadRequest(new { error = "Invalid startTime." });
            schedule.StartTime = startTime;
        }
        if (request.EndTime != null)
        {
            if (!TimeOnly.TryParse(request.EndTime, out var endTime))
                return Results.BadRequest(new { error = "Invalid endTime." });
            schedule.EndTime = endTime;
        }
        if (schedule.EndTime <= schedule.StartTime)
            return Results.BadRequest(new { error = "endTime must be after startTime." });

        if (request.SlotDurationMinutes.HasValue && request.SlotDurationMinutes.Value > 0)
            schedule.SlotDurationMinutes = request.SlotDurationMinutes.Value;

        if (request.ConsultationType != null)
        {
            var validTypes = new[] { "video", "in-person", "both" };
            if (!validTypes.Contains(request.ConsultationType))
                return Results.BadRequest(new { error = "Invalid consultationType." });
            schedule.ConsultationType = request.ConsultationType;
        }

        if (request.MaxPatientsPerSlot.HasValue && request.MaxPatientsPerSlot.Value > 0)
            schedule.MaxPatientsPerSlot = request.MaxPatientsPerSlot.Value;

        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            id = schedule.Id,
            dayOfWeek = schedule.DayOfWeek,
            startTime = schedule.StartTime.ToString("HH:mm"),
            endTime = schedule.EndTime.ToString("HH:mm"),
            slotDurationMinutes = schedule.SlotDurationMinutes,
            consultationType = schedule.ConsultationType,
            maxPatientsPerSlot = schedule.MaxPatientsPerSlot,
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  DELETE /api/doctor-portal/my-schedule/{id}
    //  Soft-delete a schedule block (IsActive = false)
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> DeleteSchedule(
        Guid id,
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);
        var doctorProfile = await db.DoctorProfiles
            .FirstOrDefaultAsync(dp => dp.UserId == userId);
        if (doctorProfile == null)
            return Results.NotFound(new { error = "Doctor profile not found." });

        var schedule = await db.DoctorSchedules
            .FirstOrDefaultAsync(ds => ds.Id == id && ds.DoctorProfileId == doctorProfile.Id);
        if (schedule == null)
            return Results.NotFound(new { error = "Schedule not found." });

        schedule.IsActive = false;
        await db.SaveChangesAsync();

        return Results.Ok(new { success = true });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/doctor-portal/prescriptions/{appointmentId}/items
    //  List structured prescription items for an appointment.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetPrescriptionItems(
        Guid appointmentId,
        NalamDbContext db)
    {
        var items = await db.PrescriptionItems.AsNoTracking()
            .Where(pi => pi.AppointmentId == appointmentId)
            .OrderBy(pi => pi.CreatedAt)
            .Select(pi => new
            {
                id                 = pi.Id,
                medicineId         = pi.MedicineId,
                medicineName       = pi.MedicineName,
                dosageInstructions = pi.DosageInstructions,
                quantity           = pi.Quantity,
                createdAt          = pi.CreatedAt.ToString("o"),
            })
            .ToListAsync();

        return Results.Ok(items);
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /api/doctor-portal/prescriptions/{appointmentId}/items
    //  Add a single prescription item to an appointment.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> AddPrescriptionItem(
        Guid appointmentId,
        AddPrescriptionItemRequest req,
        NalamDbContext db)
    {
        if (string.IsNullOrWhiteSpace(req.MedicineName))
            return Results.BadRequest(new { error = "medicineName is required." });

        var appointment = await db.Appointments.FindAsync(appointmentId);
        if (appointment is null)
            return Results.NotFound(new { error = "Appointment not found." });

        var item = new PrescriptionItem
        {
            AppointmentId      = appointmentId,
            MedicineId         = req.MedicineId,
            MedicineName       = req.MedicineName.Trim(),
            DosageInstructions = req.DosageInstructions?.Trim(),
            Quantity           = req.Quantity > 0 ? req.Quantity : 1,
        };

        db.PrescriptionItems.Add(item);

        // Ensure prescription queue entry exists
        if (appointment.PrescriptionStatus == null)
        {
            appointment.PrescriptionStatus = "pending";
            appointment.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            id                 = item.Id,
            medicineId         = item.MedicineId,
            medicineName       = item.MedicineName,
            dosageInstructions = item.DosageInstructions,
            quantity           = item.Quantity,
            createdAt          = item.CreatedAt.ToString("o"),
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  DELETE /api/doctor-portal/prescriptions/{appointmentId}/items/{itemId}
    //  Remove a prescription item.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> DeletePrescriptionItem(
        Guid appointmentId,
        Guid itemId,
        NalamDbContext db)
    {
        var item = await db.PrescriptionItems
            .FirstOrDefaultAsync(pi => pi.Id == itemId && pi.AppointmentId == appointmentId);

        if (item is null)
            return Results.NotFound(new { error = "Prescription item not found." });

        db.PrescriptionItems.Remove(item);
        await db.SaveChangesAsync();

        return Results.Ok(new { success = true });
    }
}

// ── Request records for schedule management ─────────────────────────────────

public record AddScheduleRequest(
    int DayOfWeek,
    string StartTime,
    string EndTime,
    int SlotDurationMinutes,
    string ConsultationType,
    int MaxPatientsPerSlot
);

public record UpdateScheduleRequest(
    string? StartTime,
    string? EndTime,
    int? SlotDurationMinutes,
    string? ConsultationType,
    int? MaxPatientsPerSlot
);

public record UpdateDoctorProfileRequest(
    string? FullName,
    string? Email,
    string? Department,
    string? Specialty,
    int? ExperienceYears,
    string? Bio,
    string? Languages,
    string? Qualification,
    string? MciRegistration
);

public record AddPrescriptionItemRequest(
    Guid? MedicineId,
    string MedicineName,
    string? DosageInstructions,
    int Quantity
);
