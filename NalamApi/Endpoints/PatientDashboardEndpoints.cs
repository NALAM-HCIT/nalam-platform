using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.DTOs.Patient;
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

        // ── Care Tasks ────────────────────────────────────────
        group.MapPost("/care-tasks/complete", LogCareTask);
        group.MapGet("/care-tasks/today",     GetTodayCareTasks);

        // ── Step Count ────────────────────────────────────────
        group.MapPost("/steps",       LogSteps);
        group.MapGet("/steps/today",  GetTodaySteps);

        // ── Custom Tasks ──────────────────────────────────────
        group.MapPost("/custom-tasks",           CreateCustomTask);
        group.MapGet("/custom-tasks",            GetCustomTasks);
        group.MapDelete("/custom-tasks/{id:guid}", DeleteCustomTask);

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
        group.MapPost("/vitals/batch",   LogVitalsBatch);
        group.MapGet("/vitals/latest",   GetLatestVitals);
        group.MapGet("/vitals/trend",    GetVitalsTrend);

        // ── Health Tips ───────────────────────────────────────
        group.MapGet("/health-tips",    GetHealthTips);

        // ── Wearable Devices ──────────────────────────────────
        group.MapGet("/wearables/status",      GetWearableStatus);
        group.MapPost("/wearables/request",    RequestWearablePairing);
        group.MapGet("/wearables/vitals",      GetWearableVitals);
        group.MapPost("/wearables/disconnect", DisconnectWearable);

        // ── Patient Documents ─────────────────────────────────────
        group.MapGet("/documents",              GetDocuments);
        group.MapPost("/documents",             SaveDocument);
        group.MapDelete("/documents/{id:guid}", DeleteDocument);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>Patient sub claim == patients.id</summary>
    private static Guid GetPatientId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("sub")!.Value);

    private static Guid GetHospitalId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("hospitalId")!.Value);

    private static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow);

    // ═══════════════════════════════════════════════════════════
    //  CARE TASK LOGS
    // ═══════════════════════════════════════════════════════════

    // POST /api/patient/care-tasks/complete
    // Upserts the completion status for a single care task for today.
    // task_id is the stable client-side key (e.g. "rx-{apptId}-{itemId}" or "hydra-default").
    private record LogCareTaskRequest(
        [property: JsonPropertyName("task_id")]    string TaskId,
        [property: JsonPropertyName("task_title")] string TaskTitle,
        [property: JsonPropertyName("status")]     string Status);  // completed | snoozed | skipped

    private static async Task<IResult> LogCareTask(
        LogCareTaskRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        if (string.IsNullOrWhiteSpace(request.TaskId) || request.TaskId.Length > 200)
            return Results.BadRequest(new { error = "task_id is required (max 200 chars)." });

        var validStatuses = new[] { "completed", "snoozed", "skipped" };
        var status = request.Status?.ToLower();
        if (string.IsNullOrWhiteSpace(status) || !validStatuses.Contains(status))
            return Results.BadRequest(new { error = "status must be: completed, snoozed, or skipped." });

        var patientId  = GetPatientId(ctx);
        var hospitalId = GetHospitalId(ctx);
        var today      = Today();

        var existing = await db.PatientCareTaskLogs
            .FirstOrDefaultAsync(ct => ct.PatientId == patientId && ct.LogDate == today && ct.TaskId == request.TaskId);

        if (existing != null)
        {
            existing.Status      = status;
            existing.TaskTitle   = request.TaskTitle?.Trim() ?? existing.TaskTitle;
            existing.CompletedAt = DateTime.UtcNow;
        }
        else
        {
            db.PatientCareTaskLogs.Add(new PatientCareTaskLog
            {
                HospitalId  = hospitalId,
                PatientId   = patientId,
                LogDate     = today,
                TaskId      = request.TaskId.Trim(),
                TaskTitle   = request.TaskTitle?.Trim() ?? string.Empty,
                Status      = status,
                CompletedAt = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync();
        return Results.Ok(new { task_id = request.TaskId, status, log_date = today.ToString("yyyy-MM-dd") });
    }

    // GET /api/patient/care-tasks/today
    // Returns all task log entries for today so the UI can restore completion state.
    private static async Task<IResult> GetTodayCareTasks(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);
        var today     = Today();

        var logs = await db.PatientCareTaskLogs
            .AsNoTracking()
            .Where(ct => ct.PatientId == patientId && ct.LogDate == today)
            .Select(ct => new
            {
                task_id      = ct.TaskId,
                task_title   = ct.TaskTitle,
                status       = ct.Status,
                completed_at = ct.CompletedAt,
            })
            .ToListAsync();

        return Results.Ok(new { log_date = today.ToString("yyyy-MM-dd"), tasks = logs });
    }

    // ═══════════════════════════════════════════════════════════
    //  STEP COUNT
    // ═══════════════════════════════════════════════════════════

    private record LogStepsRequest(
        [property: JsonPropertyName("step_count")] int StepCount,
        [property: JsonPropertyName("goal_steps")] int? GoalSteps);

    // POST /api/patient/steps — upsert today's step count
    private static async Task<IResult> LogSteps(
        LogStepsRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        if (request.StepCount < 0 || request.StepCount > 100000)
            return Results.BadRequest(new { error = "step_count must be 0–100,000." });

        var patientId  = GetPatientId(ctx);
        var hospitalId = GetHospitalId(ctx);
        var today      = Today();

        var existing = await db.PatientStepLogs
            .FirstOrDefaultAsync(sl => sl.PatientId == patientId && sl.LogDate == today);

        int goal = request.GoalSteps is > 0 and <= 100000 ? request.GoalSteps.Value : 10000;

        if (existing != null)
        {
            existing.StepCount = request.StepCount;
            if (request.GoalSteps.HasValue) existing.GoalSteps = goal;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            db.PatientStepLogs.Add(new PatientStepLog
            {
                HospitalId = hospitalId,
                PatientId  = patientId,
                LogDate    = today,
                StepCount  = request.StepCount,
                GoalSteps  = goal,
                UpdatedAt  = DateTime.UtcNow,
            });
        }

        await db.SaveChangesAsync();
        var updatedGoal = existing?.GoalSteps ?? goal;
        return Results.Ok(new
        {
            log_date     = today.ToString("yyyy-MM-dd"),
            step_count   = request.StepCount,
            goal_steps   = updatedGoal,
            progress_pct = (int)Math.Round((double)request.StepCount / updatedGoal * 100),
        });
    }

    // GET /api/patient/steps/today — 204 if no steps logged today
    private static async Task<IResult> GetTodaySteps(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);
        var today     = Today();

        var log = await db.PatientStepLogs
            .AsNoTracking()
            .FirstOrDefaultAsync(sl => sl.PatientId == patientId && sl.LogDate == today);

        if (log is null) return Results.NoContent();

        return Results.Ok(new
        {
            log_date     = log.LogDate.ToString("yyyy-MM-dd"),
            step_count   = log.StepCount,
            goal_steps   = log.GoalSteps,
            progress_pct = (int)Math.Round((double)log.StepCount / log.GoalSteps * 100),
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  CUSTOM TASKS  (patient-created)
    // ═══════════════════════════════════════════════════════════

    private record CreateCustomTaskRequest(
        [property: JsonPropertyName("title")]       string  Title,
        [property: JsonPropertyName("category")]    string  Category,
        [property: JsonPropertyName("time_of_day")] string  TimeOfDay,
        [property: JsonPropertyName("notes")]       string? Notes);

    private static readonly string[] ValidCategories  = ["medicine", "physio", "diet", "vitals", "hydration"];
    private static readonly string[] ValidTimesOfDay  = ["morning", "afternoon", "evening"];

    // POST /api/patient/custom-tasks
    private static async Task<IResult> CreateCustomTask(
        CreateCustomTaskRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || request.Title.Length > 200)
            return Results.BadRequest(new { error = "title is required (max 200 chars)." });

        var category   = request.Category?.ToLower();
        var timeOfDay  = request.TimeOfDay?.ToLower();

        if (string.IsNullOrWhiteSpace(category) || !ValidCategories.Contains(category))
            return Results.BadRequest(new { error = $"category must be one of: {string.Join(", ", ValidCategories)}." });

        if (string.IsNullOrWhiteSpace(timeOfDay) || !ValidTimesOfDay.Contains(timeOfDay))
            return Results.BadRequest(new { error = $"time_of_day must be one of: {string.Join(", ", ValidTimesOfDay)}." });

        var patientId  = GetPatientId(ctx);
        var hospitalId = GetHospitalId(ctx);

        var task = new PatientCustomTask
        {
            HospitalId = hospitalId,
            PatientId  = patientId,
            Title      = request.Title.Trim(),
            Category   = category,
            TimeOfDay  = timeOfDay,
            Notes      = request.Notes?.Trim(),
            IsActive   = true,
            CreatedAt  = DateTime.UtcNow,
        };

        db.PatientCustomTasks.Add(task);
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            id          = task.Id,
            title       = task.Title,
            category    = task.Category,
            time_of_day = task.TimeOfDay,
            notes       = task.Notes,
            created_at  = task.CreatedAt,
        });
    }

    // GET /api/patient/custom-tasks
    private static async Task<IResult> GetCustomTasks(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);

        var tasks = await db.PatientCustomTasks
            .AsNoTracking()
            .Where(ct => ct.PatientId == patientId && ct.IsActive)
            .OrderByDescending(ct => ct.CreatedAt)
            .Select(ct => new
            {
                id          = ct.Id,
                title       = ct.Title,
                category    = ct.Category,
                time_of_day = ct.TimeOfDay,
                notes       = ct.Notes,
                created_at  = ct.CreatedAt,
            })
            .ToListAsync();

        return Results.Ok(new { tasks });
    }

    // DELETE /api/patient/custom-tasks/{id}
    private static async Task<IResult> DeleteCustomTask(
        Guid id,
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);

        var task = await db.PatientCustomTasks
            .FirstOrDefaultAsync(ct => ct.Id == id && ct.PatientId == patientId);

        if (task is null) return Results.NotFound();

        task.IsActive = false;   // soft delete
        await db.SaveChangesAsync();
        return Results.Ok(new { id });
    }

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
        var label      = request.MoodLabel.ToLower();
        var now        = DateTime.UtcNow;

        var existing = await db.PatientMoodLogs
            .FirstOrDefaultAsync(m => m.PatientId == patientId && m.LogDate == today);

        Guid savedId;
        if (existing != null)
        {
            existing.MoodScore = request.MoodScore;
            existing.MoodLabel = label;
            existing.MoodNote  = sanitizedNote;
            existing.LoggedAt  = now;
            savedId = existing.Id;
        }
        else
        {
            var newLog = new PatientMoodLog
            {
                HospitalId = hospitalId,
                PatientId  = patientId,
                LogDate    = today,
                MoodScore  = request.MoodScore,
                MoodLabel  = label,
                MoodNote   = sanitizedNote,
                LoggedAt   = now
            };
            db.PatientMoodLogs.Add(newLog);
            savedId = newLog.Id;
        }

        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            id         = savedId,
            log_date   = today.ToString("yyyy-MM-dd"),
            mood_score = request.MoodScore,
            mood_label = label,
            mood_note  = sanitizedNote,
            logged_at  = now
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
    // recorded_at: ISO-8601 UTC timestamp; if omitted, server uses NOW().
    // source: "self" (default) | "device" (band/wearable).
    private record LogVitalsRequest(
        [property: JsonPropertyName("bp_systolic")]      short?    BpSystolic,
        [property: JsonPropertyName("bp_diastolic")]     short?    BpDiastolic,
        [property: JsonPropertyName("heart_rate")]       short?    HeartRate,
        [property: JsonPropertyName("temperature_c")]    decimal?  TemperatureC,
        [property: JsonPropertyName("spo2")]             short?    Spo2,
        [property: JsonPropertyName("respiratory_rate")] short?    RespiratoryRate,
        [property: JsonPropertyName("weight_kg")]        decimal?  WeightKg,
        [property: JsonPropertyName("height_cm")]        decimal?  HeightCm,
        [property: JsonPropertyName("blood_glucose")]    decimal?  BloodGlucose,
        [property: JsonPropertyName("ecg_data")]         string?   EcgData,
        [property: JsonPropertyName("recorded_at")]      DateTime? RecordedAt,
        [property: JsonPropertyName("source")]           string?   Source);

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
        var ts         = ResolveTimestamp(request.RecordedAt);

        var vital = new PatientVital
        {
            HospitalId      = hospitalId,
            PatientId       = patientId,
            RecordedById    = null,
            RecordedAt      = ts,
            LogDate         = DateOnly.FromDateTime(ts),
            BpSystolic      = request.BpSystolic,
            BpDiastolic     = request.BpDiastolic,
            HeartRate       = request.HeartRate,
            TemperatureC    = request.TemperatureC,
            Spo2            = request.Spo2,
            RespiratoryRate = request.RespiratoryRate,
            WeightKg        = request.WeightKg,
            HeightCm        = request.HeightCm,
            BloodGlucose    = request.BloodGlucose,
            EcgData         = request.EcgData,
            Source          = NormaliseSource(request.Source),
        };

        db.PatientVitals.Add(vital);
        try
        {
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            var inner = ex.InnerException?.Message ?? ex.Message;
            return Results.Json(new { error = $"DB save failed: {inner}" }, statusCode: 500);
        }

        return Results.Created($"/api/patient/vitals/{vital.Id}", new
        {
            id          = vital.Id,
            recorded_at = vital.RecordedAt,
            log_date    = vital.LogDate.ToString("yyyy-MM-dd")
        });
    }

    // POST /api/patient/vitals/batch
    // Saves multiple readings at once (e.g. historical sync from a wearable band).
    // Max 500 readings per call. Each reading follows the same rules as the single endpoint.
    private record LogVitalsBatchRequest(
        [property: JsonPropertyName("readings")] List<LogVitalsRequest> Readings);

    private static async Task<IResult> LogVitalsBatch(
        LogVitalsBatchRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        if (request.Readings is not { Count: > 0 })
            return Results.BadRequest(new { error = "readings array must not be empty." });

        if (request.Readings.Count > 500)
            return Results.BadRequest(new { error = "Maximum 500 readings per batch." });

        var patientId  = GetPatientId(ctx);
        var hospitalId = GetHospitalId(ctx);
        var vitals     = new List<PatientVital>(request.Readings.Count);

        foreach (var r in request.Readings)
        {
            // Skip entries with no measurements
            if (r.BpSystolic == null && r.BpDiastolic == null && r.HeartRate == null &&
                r.TemperatureC == null && r.Spo2 == null && r.RespiratoryRate == null &&
                r.WeightKg == null && r.HeightCm == null && r.BloodGlucose == null)
                continue;

            // Skip out-of-range values rather than rejecting the whole batch
            if (r.BpSystolic      is < 50   or > 250)  continue;
            if (r.BpDiastolic     is < 30   or > 150)  continue;
            if (r.HeartRate       is < 30   or > 250)  continue;
            if (r.TemperatureC    is < 34   or > 43)   continue;
            if (r.Spo2            is < 70   or > 100)  continue;
            if (r.RespiratoryRate is < 5    or > 60)   continue;
            if (r.WeightKg        is <= 0   or > 500)  continue;
            if (r.HeightCm        is <= 0   or > 300)  continue;
            if (r.BloodGlucose    is < 10   or > 2000) continue;

            var ts = ResolveTimestamp(r.RecordedAt);
            vitals.Add(new PatientVital
            {
                HospitalId      = hospitalId,
                PatientId       = patientId,
                RecordedById    = null,
                RecordedAt      = ts,
                LogDate         = DateOnly.FromDateTime(ts),
                BpSystolic      = r.BpSystolic,
                BpDiastolic     = r.BpDiastolic,
                HeartRate       = r.HeartRate,
                TemperatureC    = r.TemperatureC,
                Spo2            = r.Spo2,
                RespiratoryRate = r.RespiratoryRate,
                WeightKg        = r.WeightKg,
                HeightCm        = r.HeightCm,
                BloodGlucose    = r.BloodGlucose,
                Source          = NormaliseSource(r.Source),
            });
        }

        if (vitals.Count == 0)
            return Results.BadRequest(new { error = "No valid readings in batch." });

        db.PatientVitals.AddRange(vitals);
        await db.SaveChangesAsync();

        return Results.Ok(new { saved = vitals.Count });
    }

    // Clamps a supplied timestamp: must be in the past, not older than 1 year.
    // Converts to IST (UTC+5:30) for storage.
    private static DateTime ResolveTimestamp(DateTime? supplied)
    {
        var now = DateTime.UtcNow;
        var nowIst = now.AddHours(5.5);  // Convert UTC to IST (UTC+5:30)
        if (supplied is null) return nowIst;
        var ts = supplied.Value.ToUniversalTime();
        if (ts > now)                  return nowIst;          // no future timestamps
        if (ts < now.AddYears(-1))     return nowIst;          // ignore implausibly old data
        return ts.AddHours(5.5);  // Convert to IST
    }

    private static string NormaliseSource(string? s) =>
        s is "self" or "device" or "nurse" or "doctor" ? s : "self";

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

    // ═══════════════════════════════════════════════════════════
    //  WEARABLE DEVICES (Apple Watch, Fitbit, etc.)
    // ═══════════════════════════════════════════════════════════

    private record RequestWearablePairingRequest(
        [property: JsonPropertyName("device_type")]  string DeviceType,
        [property: JsonPropertyName("device_name")]  string? DeviceName);

    // POST /api/patient/wearables/request — initiate device pairing
    // In production, this would trigger a pairing flow with OAuth/deep link
    private static async Task<IResult> RequestWearablePairing(
        RequestWearablePairingRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        if (string.IsNullOrWhiteSpace(request.DeviceType) || request.DeviceType.Length > 50)
            return Results.BadRequest(new { error = "device_type is required (max 50 chars, e.g., 'apple_watch')." });

        var patientId  = GetPatientId(ctx);
        var hospitalId = GetHospitalId(ctx);

        // Check if device already paired (and active)
        var existing = await db.PatientWearableDevices
            .FirstOrDefaultAsync(wd => wd.PatientId == patientId && wd.DeviceType == request.DeviceType && wd.IsActive);

        if (existing != null)
            return Results.BadRequest(new { error = "Device already paired." });

        var device = new PatientWearableDevice
        {
            HospitalId = hospitalId,
            PatientId  = patientId,
            DeviceType = request.DeviceType.ToLower().Trim(),
            DeviceName = request.DeviceName?.Trim(),
            IsActive   = true,
            CreatedAt  = DateTime.UtcNow,
        };

        db.PatientWearableDevices.Add(device);
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            id           = device.Id,
            device_type  = device.DeviceType,
            device_name  = device.DeviceName,
            is_active    = device.IsActive,
            last_synced_at = device.LastSyncedAt,
            created_at   = device.CreatedAt,
        });
    }

    // GET /api/patient/wearables/status — check if device paired, last sync, etc.
    private static async Task<IResult> GetWearableStatus(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);

        var devices = await db.PatientWearableDevices
            .AsNoTracking()
            .Where(wd => wd.PatientId == patientId && wd.IsActive)
            .Select(wd => new
            {
                id            = wd.Id,
                device_type   = wd.DeviceType,
                device_name   = wd.DeviceName,
                is_active     = wd.IsActive,
                last_synced_at = wd.LastSyncedAt,
                created_at    = wd.CreatedAt,
            })
            .ToListAsync();

        if (!devices.Any()) return Results.NoContent();

        return Results.Ok(new { devices });
    }

    // GET /api/patient/wearables/vitals — get latest heart_rate + spo2 from paired device
    private static async Task<IResult> GetWearableVitals(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);

        var latest = await db.WearableVitals
            .AsNoTracking()
            .Where(wv => wv.PatientId == patientId)
            .OrderByDescending(wv => wv.RecordedAt)
            .FirstOrDefaultAsync();

        if (latest is null) return Results.NoContent();

        return Results.Ok(new
        {
            id           = latest.Id,
            device_id    = latest.DeviceId,
            heart_rate   = latest.HeartRate,
            spo2         = latest.Spo2,
            recorded_at  = latest.RecordedAt,
        });
    }

    // POST /api/patient/wearables/disconnect — deactivate device
    private static async Task<IResult> DisconnectWearable(
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);

        var device = await db.PatientWearableDevices
            .FirstOrDefaultAsync(wd => wd.PatientId == patientId && wd.IsActive);

        if (device is null)
            return Results.NotFound(new { error = "No active wearable device found." });

        device.IsActive = false;
        device.LastSyncedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return Results.Ok(new { message = "Device disconnected." });
    }

    // ── Patient Documents ─────────────────────────────────────────────────────

    // GET /api/patient/documents
    private static async Task<IResult> GetDocuments(NalamDbContext db, HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);
        var docs = await db.PatientDocuments
            .Where(d => d.PatientId == patientId)
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new {
                id          = d.Id,
                name        = d.Name,
                document_type = d.DocumentType,
                storage_url = d.StorageUrl,
                storage_path = d.StoragePath,
                uploaded_at = d.UploadedAt,
            })
            .ToListAsync();
        return Results.Ok(docs);
    }

    // POST /api/patient/documents
    private static async Task<IResult> SaveDocument(
        SaveDocumentRequest request,
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId  = GetPatientId(ctx);
        var hospitalId = GetHospitalId(ctx);

        var doc = new PatientDocument
        {
            PatientId    = patientId,
            HospitalId   = hospitalId,
            Name         = request.Name.Trim(),
            DocumentType = request.DocumentType ?? "other",
            StorageUrl   = request.StorageUrl.Trim(),
            StoragePath  = request.StoragePath?.Trim(),
        };

        db.PatientDocuments.Add(doc);
        await db.SaveChangesAsync();

        return Results.Ok(new {
            id           = doc.Id,
            name         = doc.Name,
            document_type = doc.DocumentType,
            storage_url  = doc.StorageUrl,
            storage_path = doc.StoragePath,
            uploaded_at  = doc.UploadedAt,
        });
    }

    // DELETE /api/patient/documents/{id}
    private static async Task<IResult> DeleteDocument(
        Guid id,
        NalamDbContext db,
        HttpContext ctx)
    {
        var patientId = GetPatientId(ctx);
        var doc = await db.PatientDocuments
            .FirstOrDefaultAsync(d => d.Id == id && d.PatientId == patientId);
        if (doc == null) return Results.NotFound();

        db.PatientDocuments.Remove(doc);
        await db.SaveChangesAsync();
        return Results.Ok(new { message = "Document deleted.", storage_path = doc.StoragePath });
    }

    // ═══════════════════════════════════════════════════════════
    //  BACKGROUND JOBS: VITALS AGGREGATION
    //  Run hourly and daily to aggregate raw vitals into summaries
    // ═══════════════════════════════════════════════════════════

    public static void MapVitalsAggregationJobs(this WebApplication app)
    {
        var jobGroup = app.MapGroup("/api/jobs/vitals")
            .WithTags("Background Jobs")
            .WithOpenApi();
            // Note: Add authentication middleware in production

        jobGroup.MapPost("/aggregate-hourly", AggregateHourlyVitals);
        jobGroup.MapPost("/aggregate-daily",  AggregateDailyVitals);
        jobGroup.MapPost("/cleanup-old-raw",  CleanupOldRawVitals);
    }

    // POST /api/jobs/vitals/aggregate-hourly
    // Runs every hour at :05 past. Aggregates raw vitals into hourly buckets.
    private static async Task<IResult> AggregateHourlyVitals(NalamDbContext db)
    {
        try
        {
            var result = await db.Database.ExecuteSqlRawAsync(@"
                INSERT INTO patient_vitals_hourly (hospital_id, patient_id, hr_min, hr_max, hr_avg, hr_latest, hr_count, spo2_min, spo2_max, spo2_avg, spo2_latest, spo2_count, temp_min, temp_max, temp_avg, temp_latest, temp_count, blood_glucose_min, blood_glucose_max, blood_glucose_avg, blood_glucose_count, hour_start, data_quality)
                SELECT
                    pv.hospital_id,
                    pv.patient_id,
                    MIN(pv.heart_rate) as hr_min,
                    MAX(pv.heart_rate) as hr_max,
                    ROUND(AVG(pv.heart_rate::numeric), 1) as hr_avg,
                    (array_agg(pv.heart_rate ORDER BY pv.recorded_at DESC) FILTER (WHERE pv.heart_rate IS NOT NULL))[1] as hr_latest,
                    COUNT(*) FILTER (WHERE pv.heart_rate IS NOT NULL) as hr_count,
                    MIN(pv.spo2) as spo2_min,
                    MAX(pv.spo2) as spo2_max,
                    ROUND(AVG(pv.spo2::numeric), 1) as spo2_avg,
                    (array_agg(pv.spo2 ORDER BY pv.recorded_at DESC) FILTER (WHERE pv.spo2 IS NOT NULL))[1] as spo2_latest,
                    COUNT(*) FILTER (WHERE pv.spo2 IS NOT NULL) as spo2_count,
                    MIN(pv.temperature_c) as temp_min,
                    MAX(pv.temperature_c) as temp_max,
                    ROUND(AVG(pv.temperature_c::numeric), 1) as temp_avg,
                    (array_agg(pv.temperature_c ORDER BY pv.recorded_at DESC) FILTER (WHERE pv.temperature_c IS NOT NULL))[1] as temp_latest,
                    COUNT(*) FILTER (WHERE pv.temperature_c IS NOT NULL) as temp_count,
                    MIN(pv.blood_glucose) as blood_glucose_min,
                    MAX(pv.blood_glucose) as blood_glucose_max,
                    ROUND(AVG(pv.blood_glucose::numeric), 1) as blood_glucose_avg,
                    COUNT(*) FILTER (WHERE pv.blood_glucose IS NOT NULL) as blood_glucose_count,
                    date_trunc('hour', pv.recorded_at) as hour_start,
                    CASE WHEN COUNT(*) >= 50 THEN 'complete' WHEN COUNT(*) >= 25 THEN 'partial' ELSE 'sparse' END as data_quality
                FROM patient_vitals pv
                WHERE
                    pv.recorded_at >= date_trunc('hour', now() - INTERVAL '1 hour') AND
                    pv.recorded_at < date_trunc('hour', now())
                GROUP BY pv.hospital_id, pv.patient_id, date_trunc('hour', pv.recorded_at)
                ON CONFLICT (hospital_id, patient_id, hour_start)
                DO UPDATE SET
                    hr_min = EXCLUDED.hr_min, hr_max = EXCLUDED.hr_max, hr_avg = EXCLUDED.hr_avg, hr_latest = EXCLUDED.hr_latest, hr_count = EXCLUDED.hr_count,
                    spo2_min = EXCLUDED.spo2_min, spo2_max = EXCLUDED.spo2_max, spo2_avg = EXCLUDED.spo2_avg, spo2_latest = EXCLUDED.spo2_latest, spo2_count = EXCLUDED.spo2_count,
                    temp_min = EXCLUDED.temp_min, temp_max = EXCLUDED.temp_max, temp_avg = EXCLUDED.temp_avg, temp_latest = EXCLUDED.temp_latest, temp_count = EXCLUDED.temp_count,
                    blood_glucose_min = EXCLUDED.blood_glucose_min, blood_glucose_max = EXCLUDED.blood_glucose_max, blood_glucose_avg = EXCLUDED.blood_glucose_avg, blood_glucose_count = EXCLUDED.blood_glucose_count,
                    data_quality = EXCLUDED.data_quality
            ");

            return Results.Ok(new { message = $"Hourly aggregation completed", rows = result });
        }
        catch (Exception ex)
        {
            return Results.Json(new { error = "Aggregation failed", details = ex.Message }, statusCode: 500);
        }
    }

    // POST /api/jobs/vitals/aggregate-daily
    // Runs daily at 00:15 UTC. Aggregates hourly data into daily summaries.
    private static async Task<IResult> AggregateDailyVitals(NalamDbContext db)
    {
        try
        {
            var result = await db.Database.ExecuteSqlRawAsync(@"
                INSERT INTO patient_vitals_daily (hospital_id, patient_id, hr_min, hr_max, hr_avg, hr_morning, hr_evening, spo2_min, spo2_max, spo2_avg, spo2_morning, spo2_evening, temp_min, temp_max, temp_avg, blood_glucose_min, blood_glucose_max, blood_glucose_avg, log_date, readings_count, data_quality)
                SELECT
                    pvh.hospital_id,
                    pvh.patient_id,
                    MIN(pvh.hr_min) as hr_min,
                    MAX(pvh.hr_max) as hr_max,
                    ROUND(AVG(pvh.hr_avg::numeric), 1) as hr_avg,
                    (array_agg(pvh.hr_latest ORDER BY pvh.hour_start ASC) FILTER (WHERE extract(hour from pvh.hour_start) = 8))[1] as hr_morning,
                    (array_agg(pvh.hr_latest ORDER BY pvh.hour_start DESC) FILTER (WHERE extract(hour from pvh.hour_start) = 20))[1] as hr_evening,
                    MIN(pvh.spo2_min) as spo2_min,
                    MAX(pvh.spo2_max) as spo2_max,
                    ROUND(AVG(pvh.spo2_avg::numeric), 1) as spo2_avg,
                    (array_agg(pvh.spo2_latest ORDER BY pvh.hour_start ASC) FILTER (WHERE extract(hour from pvh.hour_start) = 8))[1] as spo2_morning,
                    (array_agg(pvh.spo2_latest ORDER BY pvh.hour_start DESC) FILTER (WHERE extract(hour from pvh.hour_start) = 20))[1] as spo2_evening,
                    MIN(pvh.temp_min) as temp_min,
                    MAX(pvh.temp_max) as temp_max,
                    ROUND(AVG(pvh.temp_avg::numeric), 1) as temp_avg,
                    MIN(pvh.blood_glucose_min) as blood_glucose_min,
                    MAX(pvh.blood_glucose_max) as blood_glucose_max,
                    ROUND(AVG(pvh.blood_glucose_avg::numeric), 1) as blood_glucose_avg,
                    CURRENT_DATE - INTERVAL '1 day' as log_date,
                    SUM(pvh.hr_count + pvh.spo2_count + pvh.temp_count) as readings_count,
                    CASE WHEN SUM(pvh.hr_count) >= 800 THEN 'complete' WHEN SUM(pvh.hr_count) >= 400 THEN 'partial' ELSE 'sparse' END as data_quality
                FROM patient_vitals_hourly pvh
                WHERE DATE(pvh.hour_start) = CURRENT_DATE - INTERVAL '1 day'
                GROUP BY pvh.hospital_id, pvh.patient_id
                ON CONFLICT (hospital_id, patient_id, log_date)
                DO UPDATE SET
                    hr_min = EXCLUDED.hr_min, hr_max = EXCLUDED.hr_max, hr_avg = EXCLUDED.hr_avg,
                    spo2_min = EXCLUDED.spo2_min, spo2_max = EXCLUDED.spo2_max, spo2_avg = EXCLUDED.spo2_avg,
                    temp_min = EXCLUDED.temp_min, temp_max = EXCLUDED.temp_max, temp_avg = EXCLUDED.temp_avg,
                    blood_glucose_min = EXCLUDED.blood_glucose_min, blood_glucose_max = EXCLUDED.blood_glucose_max, blood_glucose_avg = EXCLUDED.blood_glucose_avg,
                    readings_count = EXCLUDED.readings_count, data_quality = EXCLUDED.data_quality
            ");

            return Results.Ok(new { message = "Daily aggregation completed", rows = result });
        }
        catch (Exception ex)
        {
            return Results.Json(new { error = "Aggregation failed", details = ex.Message }, statusCode: 500);
        }
    }

    // POST /api/jobs/vitals/cleanup-old-raw
    // Runs daily at 01:00 UTC. Deletes raw vitals older than 7 days.
    private static async Task<IResult> CleanupOldRawVitals(NalamDbContext db)
    {
        try
        {
            var result = await db.Database.ExecuteSqlRawAsync(@"
                DELETE FROM patient_vitals
                WHERE recorded_at < NOW() - INTERVAL '7 days'
            ");

            return Results.Ok(new { message = "Cleanup completed", rows_deleted = result });
        }
        catch (Exception ex)
        {
            return Results.Json(new { error = "Cleanup failed", details = ex.Message }, statusCode: 500);
        }
    }
}
