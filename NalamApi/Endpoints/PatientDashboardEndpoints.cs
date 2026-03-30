using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.Entities;

namespace NalamApi.Endpoints;

/// <summary>
/// Patient Dashboard endpoints: mood, water intake, physiotherapy, vitals, health tips.
/// All endpoints are scoped to the authenticated patient's own record and hospital.
/// Authorization: PatientOnly (role == "patient", sub == patient.Id)
/// </summary>
public static class PatientDashboardEndpoints
{
    public static void MapPatientDashboardEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/patient")
            .WithTags("Patient Dashboard")
            .RequireAuthorization("PatientOnly");

        // ── Mood ──────────────────────────────────────────────
        group.MapPost("/mood",          LogMood);
        group.MapGet("/mood/today",     GetTodayMood);

        // ── Water Intake ──────────────────────────────────────
        group.MapGet("/water/settings",        GetWaterSettings);
        group.MapPut("/water/settings",        UpdateWaterSettings);
        group.MapPost("/water/log",            LogWaterIntake);
        group.MapDelete("/water/log/{id:guid}", DeleteWaterLog);

        // ── Physiotherapy ─────────────────────────────────────
        group.MapPost("/physio",        LogPhysio);
        group.MapGet("/physio/today",   GetTodayPhysio);
        group.MapGet("/physio/report",  GetPhysioReport);

        // ── Vitals ────────────────────────────────────────────
        group.MapPost("/vitals",         LogVitals);
        group.MapGet("/vitals/latest",   GetLatestVitals);
        group.MapGet("/vitals/trend",    GetVitalsTrend);

        // ── Health Tips ───────────────────────────────────────
        group.MapGet("/health-tips",    GetHealthTips);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>Patient sub claim == patients.id</summary>
    private static Guid GetPatientId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("sub")!.Value);

    private static Guid GetHospitalId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("hospitalId")!.Value);

    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow);

    // ═══════════════════════════════════════════════════════════
    //  MOOD / FEELING
    // ═══════════════════════════════════════════════════════════

    // POST /api/patient/mood
    // Logs today's feeling. If the patient already logged one today, overwrites it.
    private record LogMoodRequest(
        [property: JsonPropertyName("mood_score")] short MoodScore,
        [property: JsonPropertyName("mood_label")] string MoodLabel,
        [property: JsonPropertyName("mood_note")]  string? MoodNote);

    private static async Task<IResult> LogMood(
        LogMoodRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        if (request.MoodScore < 1 || request.MoodScore > 5)
            return Results.BadRequest(new { error = "mood_score must be between 1 and 5." });

        var validLabels = new[] { "terrible", "bad", "okay", "good", "great" };
        if (string.IsNullOrWhiteSpace(request.MoodLabel) || !validLabels.Contains(request.MoodLabel.ToLower()))
            return Results.BadRequest(new { error = $"mood_label must be one of: {string.Join(", ", validLabels)}" });

        // Sanitize free-text note — strip leading/trailing whitespace, cap length
        var sanitizedNote = request.MoodNote?.Trim();
        if (sanitizedNote?.Length > 500)
            return Results.BadRequest(new { error = "mood_note must be 500 characters or fewer." });

        var patientId  = GetPatientId(ctx);
        var hospitalId = GetHospitalId(ctx);
        var today      = Today();

        var existing = await db.PatientMoodLogs
            .FirstOrDefaultAsync(m => m.PatientId == patientId && m.LogDate == today);

        if (existing != null)
        {
            existing.MoodScore = request.MoodScore;
            existing.MoodLabel = request.MoodLabel.ToLower();
            existing.MoodNote  = sanitizedNote;
            existing.LoggedAt  = DateTime.UtcNow;
        }
        else
        {
            db.PatientMoodLogs.Add(new PatientMoodLog
            {
                HospitalId = hospitalId,
                PatientId  = patientId,
                LogDate    = today,
                MoodScore  = request.MoodScore,
                MoodLabel  = request.MoodLabel.ToLower(),
                MoodNote   = sanitizedNote,
                LoggedAt   = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            log_date   = today.ToString("yyyy-MM-dd"),
            mood_score = request.MoodScore,
            mood_label = request.MoodLabel.ToLower(),
            mood_note  = sanitizedNote,
            logged_at  = DateTime.UtcNow
        });
    }

    // GET /api/patient/mood/today
    // Returns today's mood log. 204 No Content if the patient hasn't logged one yet.
    private static async Task<IResult> GetTodayMood(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);
        var today     = Today();

        var log = await db.PatientMoodLogs
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.PatientId == patientId && m.LogDate == today);

        if (log == null)
            return Results.NoContent();

        return Results.Ok(new
        {
            id         = log.Id,
            log_date   = log.LogDate.ToString("yyyy-MM-dd"),
            mood_score = log.MoodScore,
            mood_label = log.MoodLabel,
            mood_note  = log.MoodNote,
            logged_at  = log.LoggedAt
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  WATER INTAKE
    // ═══════════════════════════════════════════════════════════

    // GET /api/patient/water/settings
    // Returns the patient's water goal + reminder config + today's intake summary.
    // Returns defaults if the patient hasn't configured settings yet.
    private static async Task<IResult> GetWaterSettings(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);
        var today     = Today();

        var settings = await db.PatientWaterSettings
            .AsNoTracking()
            .FirstOrDefaultAsync(ws => ws.PatientId == patientId);

        var todayLogs = await db.PatientWaterLogs
            .AsNoTracking()
            .Where(wl => wl.PatientId == patientId && wl.LogDate == today)
            .OrderBy(wl => wl.LoggedAt)
            .Select(wl => new
            {
                id        = wl.Id,
                amount_ml = wl.AmountMl,
                logged_at = wl.LoggedAt
            })
            .ToListAsync();

        var todayTotalMl = todayLogs.Sum(l => l.amount_ml);
        var goalMl       = settings?.DailyGoalMl ?? 2000;

        return Results.Ok(new
        {
            daily_goal_ml       = goalMl,
            reminder_enabled    = settings?.ReminderEnabled    ?? false,
            reminder_interval_h = settings?.ReminderIntervalH  ?? 2,
            reminder_start_time = (settings?.ReminderStartTime ?? new TimeOnly(8, 0)).ToString("HH:mm"),
            reminder_end_time   = (settings?.ReminderEndTime   ?? new TimeOnly(22, 0)).ToString("HH:mm"),
            today_total_ml      = todayTotalMl,
            progress_pct        = goalMl > 0 ? Math.Min(100, (int)Math.Round((double)todayTotalMl / goalMl * 100)) : 0,
            today_entries       = todayLogs
        });
    }

    // PUT /api/patient/water/settings
    // Upserts the patient's water goal and reminder preferences.
    private record UpdateWaterSettingsRequest(
        [property: JsonPropertyName("daily_goal_ml")]       int?    DailyGoalMl,
        [property: JsonPropertyName("reminder_enabled")]    bool?   ReminderEnabled,
        [property: JsonPropertyName("reminder_interval_h")] short?  ReminderIntervalH,
        [property: JsonPropertyName("reminder_start_time")] string? ReminderStartTime,
        [property: JsonPropertyName("reminder_end_time")]   string? ReminderEndTime);

    private static async Task<IResult> UpdateWaterSettings(
        UpdateWaterSettingsRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId  = GetPatientId(ctx);
        var hospitalId = GetHospitalId(ctx);

        var settings = await db.PatientWaterSettings
            .FirstOrDefaultAsync(ws => ws.PatientId == patientId);

        if (settings == null)
        {
            settings = new PatientWaterSetting
            {
                HospitalId = hospitalId,
                PatientId  = patientId
            };
            db.PatientWaterSettings.Add(settings);
        }

        if (request.DailyGoalMl.HasValue)
        {
            if (request.DailyGoalMl.Value < 100 || request.DailyGoalMl.Value > 10000)
                return Results.BadRequest(new { error = "daily_goal_ml must be between 100 and 10000 ml." });
            settings.DailyGoalMl = request.DailyGoalMl.Value;
        }

        if (request.ReminderEnabled.HasValue)
            settings.ReminderEnabled = request.ReminderEnabled.Value;

        if (request.ReminderIntervalH.HasValue)
        {
            if (request.ReminderIntervalH.Value < 1 || request.ReminderIntervalH.Value > 12)
                return Results.BadRequest(new { error = "reminder_interval_h must be between 1 and 12." });
            settings.ReminderIntervalH = request.ReminderIntervalH.Value;
        }

        if (request.ReminderStartTime != null && TimeOnly.TryParse(request.ReminderStartTime, out var startTime))
            settings.ReminderStartTime = startTime;

        if (request.ReminderEndTime != null && TimeOnly.TryParse(request.ReminderEndTime, out var endTime))
            settings.ReminderEndTime = endTime;

        settings.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            daily_goal_ml       = settings.DailyGoalMl,
            reminder_enabled    = settings.ReminderEnabled,
            reminder_interval_h = settings.ReminderIntervalH,
            reminder_start_time = settings.ReminderStartTime.ToString("HH:mm"),
            reminder_end_time   = settings.ReminderEndTime.ToString("HH:mm"),
            updated_at          = settings.UpdatedAt
        });
    }

    // POST /api/patient/water/log
    // Adds one water intake entry. Returns updated today_total_ml and progress.
    private record LogWaterRequest(
        [property: JsonPropertyName("amount_ml")] int AmountMl);

    private static async Task<IResult> LogWaterIntake(
        LogWaterRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        if (request.AmountMl <= 0 || request.AmountMl > 5000)
            return Results.BadRequest(new { error = "amount_ml must be between 1 and 5000." });

        var patientId  = GetPatientId(ctx);
        var hospitalId = GetHospitalId(ctx);
        var today      = Today();

        db.PatientWaterLogs.Add(new PatientWaterLog
        {
            HospitalId = hospitalId,
            PatientId  = patientId,
            LogDate    = today,
            AmountMl   = request.AmountMl,
            LoggedAt   = DateTime.UtcNow
        });

        await db.SaveChangesAsync();

        // Fetch updated totals
        var todayTotal = await db.PatientWaterLogs
            .Where(wl => wl.PatientId == patientId && wl.LogDate == today)
            .SumAsync(wl => wl.AmountMl);

        var goalMl = await db.PatientWaterSettings
            .Where(ws => ws.PatientId == patientId)
            .Select(ws => (int?)ws.DailyGoalMl)
            .FirstOrDefaultAsync() ?? 2000;

        return Results.Ok(new
        {
            today_total_ml = todayTotal,
            goal_ml        = goalMl,
            progress_pct   = goalMl > 0 ? Math.Min(100, (int)Math.Round((double)todayTotal / goalMl * 100)) : 0
        });
    }

    // DELETE /api/patient/water/log/{id}
    // Removes a water log entry. Only today's entries owned by this patient may be deleted
    // (prevents retroactive history manipulation and accidental multi-day erasure).
    private static async Task<IResult> DeleteWaterLog(
        Guid id,
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);
        var today     = Today();

        var log = await db.PatientWaterLogs
            .FirstOrDefaultAsync(wl => wl.Id == id && wl.PatientId == patientId);

        if (log == null)
            return Results.NotFound(new { error = "Water log entry not found." });

        // Only same-day entries may be removed — prevent retroactive history manipulation
        if (log.LogDate != today)
            return Results.BadRequest(new { error = "Only today's water log entries can be removed." });

        db.PatientWaterLogs.Remove(log);
        await db.SaveChangesAsync();

        var todayTotal = await db.PatientWaterLogs
            .Where(wl => wl.PatientId == patientId && wl.LogDate == today)
            .SumAsync(wl => wl.AmountMl);

        var goalMl = await db.PatientWaterSettings
            .Where(ws => ws.PatientId == patientId)
            .Select(ws => (int?)ws.DailyGoalMl)
            .FirstOrDefaultAsync() ?? 2000;

        return Results.Ok(new
        {
            today_total_ml = todayTotal,
            goal_ml        = goalMl,
            progress_pct   = goalMl > 0 ? Math.Min(100, (int)Math.Round((double)todayTotal / goalMl * 100)) : 0
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  PHYSIOTHERAPY
    // ═══════════════════════════════════════════════════════════

    // POST /api/patient/physio
    // Logs one physiotherapy activity session.
    private record LogPhysioRequest(
        [property: JsonPropertyName("activity_name")] string  ActivityName,
        [property: JsonPropertyName("duration_min")]  short   DurationMin,
        [property: JsonPropertyName("sets")]          short?  Sets,
        [property: JsonPropertyName("reps")]          short?  Reps,
        [property: JsonPropertyName("pain_level")]    short?  PainLevel,
        [property: JsonPropertyName("notes")]         string? Notes);

    private static async Task<IResult> LogPhysio(
        LogPhysioRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        if (string.IsNullOrWhiteSpace(request.ActivityName))
            return Results.BadRequest(new { error = "activity_name is required." });

        var activityName = request.ActivityName.Trim();
        if (activityName.Length > 200)
            return Results.BadRequest(new { error = "activity_name must be 200 characters or fewer." });

        if (request.DurationMin <= 0 || request.DurationMin > 480)
            return Results.BadRequest(new { error = "duration_min must be between 1 and 480 (8 hours)." });

        if (request.PainLevel.HasValue && (request.PainLevel.Value < 0 || request.PainLevel.Value > 10))
            return Results.BadRequest(new { error = "pain_level must be between 0 and 10." });

        var sanitizedNotes = request.Notes?.Trim();
        if (sanitizedNotes?.Length > 1000)
            return Results.BadRequest(new { error = "notes must be 1000 characters or fewer." });

        var patientId  = GetPatientId(ctx);
        var hospitalId = GetHospitalId(ctx);
        var now        = DateTime.UtcNow;

        var log = new PatientPhysioLog
        {
            HospitalId   = hospitalId,
            PatientId    = patientId,
            ActivityName = activityName,
            DurationMin  = request.DurationMin,
            Sets         = request.Sets,
            Reps         = request.Reps,
            PainLevel    = request.PainLevel,
            Notes        = sanitizedNotes,
            PerformedAt  = now,
            LogDate      = DateOnly.FromDateTime(now)
        };

        db.PatientPhysioLogs.Add(log);
        await db.SaveChangesAsync();

        return Results.Created($"/api/patient/physio/{log.Id}", new
        {
            id           = log.Id,
            activity_name = log.ActivityName,
            duration_min = log.DurationMin,
            sets         = log.Sets,
            reps         = log.Reps,
            pain_level   = log.PainLevel,
            notes        = log.Notes,
            performed_at = log.PerformedAt
        });
    }

    // GET /api/patient/physio/today
    // Returns today's physiotherapy sessions for the dashboard widget.
    private static async Task<IResult> GetTodayPhysio(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);
        var today     = Today();

        var logs = await db.PatientPhysioLogs
            .AsNoTracking()
            .Where(pl => pl.PatientId == patientId && pl.LogDate == today)
            .OrderBy(pl => pl.PerformedAt)
            .Select(pl => new
            {
                id            = pl.Id,
                activity_name = pl.ActivityName,
                duration_min  = pl.DurationMin,
                sets          = pl.Sets,
                reps          = pl.Reps,
                pain_level    = pl.PainLevel,
                notes         = pl.Notes,
                performed_at  = pl.PerformedAt
            })
            .ToListAsync();

        return Results.Ok(new
        {
            log_date       = today.ToString("yyyy-MM-dd"),
            total_sessions = logs.Count,
            total_min      = logs.Sum(l => l.duration_min),
            sessions       = logs
        });
    }

    // GET /api/patient/physio/report?from=yyyy-MM-dd&to=yyyy-MM-dd
    // Returns a historical physiotherapy report for a date range.
    // Defaults to last 30 days if no range is provided.
    private static async Task<IResult> GetPhysioReport(
        NalamDbContext db,
        HttpContext ctx,
        string? from = null,
        string? to   = null)
    {
        var patientId = GetPatientId(ctx);
        var toDate    = to   != null && DateOnly.TryParse(to,   out var parsedTo)   ? parsedTo   : Today();
        var fromDate  = from != null && DateOnly.TryParse(from, out var parsedFrom) ? parsedFrom : toDate.AddDays(-29);

        if (fromDate > toDate)
            return Results.BadRequest(new { error = "from must be before or equal to to." });

        // Cap range to 365 days to prevent unbounded scans
        if (toDate.DayNumber - fromDate.DayNumber > 365)
            fromDate = toDate.AddDays(-365);

        var logs = await db.PatientPhysioLogs
            .AsNoTracking()
            .Where(pl => pl.PatientId == patientId && pl.LogDate >= fromDate && pl.LogDate <= toDate)
            .OrderBy(pl => pl.LogDate)
            .ThenBy(pl => pl.PerformedAt)
            .ToListAsync();

        var totalSessions   = logs.Count;
        var totalMinutes    = logs.Sum(l => l.DurationMin);
        var daysActive      = logs.Select(l => l.LogDate).Distinct().Count();
        var painValues      = logs.Where(l => l.PainLevel.HasValue).Select(l => (double)l.PainLevel!.Value).ToList();
        var avgPain         = painValues.Count > 0 ? Math.Round(painValues.Average(), 1) : (double?)null;

        var byActivity = logs
            .GroupBy(l => l.ActivityName)
            .Select(g => new
            {
                activity_name = g.Key,
                sessions      = g.Count(),
                total_min     = g.Sum(l => l.DurationMin)
            })
            .OrderByDescending(x => x.sessions)
            .ToList();

        var dailySummary = logs
            .GroupBy(l => l.LogDate)
            .Select(g =>
            {
                var dayPain = g.Where(l => l.PainLevel.HasValue).Select(l => (double)l.PainLevel!.Value).ToList();
                return new
                {
                    log_date   = g.Key.ToString("yyyy-MM-dd"),
                    sessions   = g.Count(),
                    total_min  = g.Sum(l => l.DurationMin),
                    avg_pain   = dayPain.Count > 0 ? (double?)Math.Round(dayPain.Average(), 1) : null
                };
            })
            .OrderByDescending(x => x.log_date)
            .ToList();

        return Results.Ok(new
        {
            period = new
            {
                from = fromDate.ToString("yyyy-MM-dd"),
                to   = toDate.ToString("yyyy-MM-dd")
            },
            total_sessions     = totalSessions,
            total_duration_min = totalMinutes,
            avg_pain_level     = avgPain,
            days_active        = daysActive,
            by_activity        = byActivity,
            daily_summary      = dailySummary
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  VITALS
    // ═══════════════════════════════════════════════════════════

    // POST /api/patient/vitals
    // Self-reports one vitals reading. All fields optional — log what you have.
    private record LogVitalsRequest(
        [property: JsonPropertyName("bp_systolic")]      short?   BpSystolic,
        [property: JsonPropertyName("bp_diastolic")]     short?   BpDiastolic,
        [property: JsonPropertyName("heart_rate")]       short?   HeartRate,
        [property: JsonPropertyName("temperature_c")]    decimal? TemperatureC,
        [property: JsonPropertyName("spo2")]             short?   Spo2,
        [property: JsonPropertyName("respiratory_rate")] short?   RespiratoryRate,
        [property: JsonPropertyName("weight_kg")]        decimal? WeightKg,
        [property: JsonPropertyName("height_cm")]        decimal? HeightCm,
        [property: JsonPropertyName("blood_glucose")]    decimal? BloodGlucose);

    private static async Task<IResult> LogVitals(
        LogVitalsRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        // At least one vital must be provided
        if (request.BpSystolic == null && request.BpDiastolic == null &&
            request.HeartRate == null && request.TemperatureC == null &&
            request.Spo2 == null && request.RespiratoryRate == null &&
            request.WeightKg == null && request.HeightCm == null &&
            request.BloodGlucose == null)
        {
            return Results.BadRequest(new { error = "At least one vital measurement is required." });
        }

        // Plausibility guards — catch obvious data-entry errors before they corrupt the trend
        if (request.BpSystolic is < 50 or > 250)
            return Results.BadRequest(new { error = "bp_systolic must be 50–250 mmHg." });
        if (request.BpDiastolic is < 30 or > 150)
            return Results.BadRequest(new { error = "bp_diastolic must be 30–150 mmHg." });
        if (request.HeartRate is < 30 or > 250)
            return Results.BadRequest(new { error = "heart_rate must be 30–250 BPM." });
        if (request.TemperatureC is < 34 or > 43)
            return Results.BadRequest(new { error = "temperature_c must be 34–43 °C." });
        if (request.Spo2 is < 70 or > 100)
            return Results.BadRequest(new { error = "spo2 must be 70–100 %." });
        if (request.RespiratoryRate is < 5 or > 60)
            return Results.BadRequest(new { error = "respiratory_rate must be 5–60 breaths/min." });
        if (request.WeightKg is <= 0 or > 500)
            return Results.BadRequest(new { error = "weight_kg must be 0.1–500 kg." });
        if (request.HeightCm is <= 0 or > 300)
            return Results.BadRequest(new { error = "height_cm must be 1–300 cm." });
        if (request.BloodGlucose is < 10 or > 2000)
            return Results.BadRequest(new { error = "blood_glucose must be 10–2000 mg/dL." });

        var patientId  = GetPatientId(ctx);
        var hospitalId = GetHospitalId(ctx);
        var now        = DateTime.UtcNow;

        var vital = new PatientVital
        {
            HospitalId      = hospitalId,
            PatientId       = patientId,
            RecordedById    = null,  // self-reported
            RecordedAt      = now,
            LogDate         = DateOnly.FromDateTime(now),
            BpSystolic      = request.BpSystolic,
            BpDiastolic     = request.BpDiastolic,
            HeartRate       = request.HeartRate,
            TemperatureC    = request.TemperatureC,
            Spo2            = request.Spo2,
            RespiratoryRate = request.RespiratoryRate,
            WeightKg        = request.WeightKg,
            HeightCm        = request.HeightCm,
            BloodGlucose    = request.BloodGlucose,
            Source          = "self"
        };

        db.PatientVitals.Add(vital);
        await db.SaveChangesAsync();

        return Results.Created($"/api/patient/vitals/{vital.Id}", new
        {
            id          = vital.Id,
            recorded_at = vital.RecordedAt,
            log_date    = vital.LogDate.ToString("yyyy-MM-dd")
        });
    }

    // GET /api/patient/vitals/latest
    // Returns the most recent vitals reading. 204 if no vitals recorded yet.
    private static async Task<IResult> GetLatestVitals(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);

        var vital = await db.PatientVitals
            .AsNoTracking()
            .Where(v => v.PatientId == patientId)
            .OrderByDescending(v => v.RecordedAt)
            .FirstOrDefaultAsync();

        if (vital == null)
            return Results.NoContent();

        return Results.Ok(new
        {
            id              = vital.Id,
            recorded_at     = vital.RecordedAt,
            log_date        = vital.LogDate.ToString("yyyy-MM-dd"),
            bp              = vital.BpSystolic != null && vital.BpDiastolic != null
                                ? $"{vital.BpSystolic}/{vital.BpDiastolic}"
                                : null,
            bp_systolic     = vital.BpSystolic,
            bp_diastolic    = vital.BpDiastolic,
            heart_rate      = vital.HeartRate,
            temperature_c   = vital.TemperatureC,
            spo2            = vital.Spo2,
            respiratory_rate = vital.RespiratoryRate,
            weight_kg       = vital.WeightKg,
            height_cm       = vital.HeightCm,
            blood_glucose   = vital.BloodGlucose,
            source          = vital.Source
        });
    }

    // GET /api/patient/vitals/trend
    // Returns one reading per day for the last 30 days (latest reading per day).
    // Only days that have data are returned — gaps are expected and handled by the frontend.
    private static async Task<IResult> GetVitalsTrend(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId    = GetPatientId(ctx);
        var thirtyDaysAgo = Today().AddDays(-30);

        var vitals = await db.PatientVitals
            .AsNoTracking()
            .Where(v => v.PatientId == patientId && v.LogDate >= thirtyDaysAgo)
            .OrderBy(v => v.LogDate)
            .ThenByDescending(v => v.RecordedAt)
            .ToListAsync();

        // One row per day — take the latest recorded_at for each calendar day
        var trend = vitals
            .GroupBy(v => v.LogDate)
            .Select(g => g.OrderByDescending(v => v.RecordedAt).First())
            .OrderBy(v => v.LogDate)
            .Select(v => new
            {
                log_date        = v.LogDate.ToString("yyyy-MM-dd"),
                bp_systolic     = v.BpSystolic,
                bp_diastolic    = v.BpDiastolic,
                heart_rate      = v.HeartRate,
                temperature_c   = v.TemperatureC,
                spo2            = v.Spo2,
                respiratory_rate = v.RespiratoryRate,
                weight_kg       = v.WeightKg,
                blood_glucose   = v.BloodGlucose
            })
            .ToList();

        return Results.Ok(new
        {
            period_days = 30,
            data_points = trend.Count,
            data        = trend
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  HEALTH TIPS
    // ═══════════════════════════════════════════════════════════

    // GET /api/patient/health-tips?category=nutrition&limit=5
    // Returns active health tips. Hospital-specific tips shown first,
    // then global tips (hospital_id IS NULL) to fill up to the limit.
    // Tips are ordered by sort_order, rotated daily using day-of-year offset.
    private static async Task<IResult> GetHealthTips(
        NalamDbContext db,
        HttpContext ctx,
        string? category = null,
        int     limit    = 5)
    {
        if (limit < 1 || limit > 20) limit = 5;

        var hospitalId = GetHospitalId(ctx);
        var today      = DateTime.UtcNow;

        // Hospital-specific tips for this hospital
        var hospitalQuery = db.HealthTips
            .AsNoTracking()
            .Where(ht => ht.IsActive
                      && ht.HospitalId == hospitalId
                      && (ht.ValidFrom  == null || ht.ValidFrom  <= DateOnly.FromDateTime(today))
                      && (ht.ValidUntil == null || ht.ValidUntil >= DateOnly.FromDateTime(today)));

        if (category != null)
            hospitalQuery = hospitalQuery.Where(ht => ht.Category == category.ToLower());

        var hospitalTips = await hospitalQuery
            .OrderBy(ht => ht.SortOrder)
            .Take(limit)
            .ToListAsync();

        var remaining = limit - hospitalTips.Count;
        var globalTips = new List<HealthTip>();

        if (remaining > 0)
        {
            var globalQuery = db.HealthTips
                .AsNoTracking()
                .Where(ht => ht.IsActive
                          && ht.HospitalId == null
                          && (ht.ValidFrom  == null || ht.ValidFrom  <= DateOnly.FromDateTime(today))
                          && (ht.ValidUntil == null || ht.ValidUntil >= DateOnly.FromDateTime(today)));

            if (category != null)
                globalQuery = globalQuery.Where(ht => ht.Category == category.ToLower());

            var allGlobal = await globalQuery.OrderBy(ht => ht.SortOrder).ToListAsync();

            // Daily rotation: offset by day-of-year so tips cycle without an external shuffle
            var dayOffset = today.DayOfYear % (allGlobal.Count > 0 ? allGlobal.Count : 1);
            globalTips = allGlobal
                .Skip(dayOffset)
                .Concat(allGlobal.Take(dayOffset))
                .Take(remaining)
                .ToList();
        }

        var result = hospitalTips.Concat(globalTips).Select(ht => new
        {
            id        = ht.Id,
            title     = ht.Title,
            body      = ht.Body,
            category  = ht.Category,
            icon_name = ht.IconName,
            is_global = ht.HospitalId == null
        }).ToList();

        return Results.Ok(new { tips = result });
    }
}
