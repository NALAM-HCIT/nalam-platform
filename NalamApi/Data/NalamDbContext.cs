using Microsoft.EntityFrameworkCore;
using NalamApi.Entities;

namespace NalamApi.Data;

public class NalamDbContext : DbContext
{
    private readonly Guid? _currentHospitalId;

    public NalamDbContext(DbContextOptions<NalamDbContext> options) : base(options) { }

    public NalamDbContext(DbContextOptions<NalamDbContext> options, IHttpContextAccessor httpContextAccessor)
        : base(options)
    {
        var hospitalClaim = httpContextAccessor.HttpContext?.User?.FindFirst("hospitalId")?.Value;
        if (Guid.TryParse(hospitalClaim, out var hospitalId))
        {
            _currentHospitalId = hospitalId;
        }
    }

    public DbSet<Hospital> Hospitals => Set<Hospital>();
    public DbSet<User> Users => Set<User>();
    public DbSet<OtpVerification> OtpVerifications => Set<OtpVerification>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<HospitalSetting> HospitalSettings => Set<HospitalSetting>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<DoctorProfile> DoctorProfiles => Set<DoctorProfile>();
    public DbSet<DoctorSchedule> DoctorSchedules => Set<DoctorSchedule>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<HospitalWorkingHour> HospitalWorkingHours => Set<HospitalWorkingHour>();
    public DbSet<HospitalIntegration> HospitalIntegrations => Set<HospitalIntegration>();
    public DbSet<AuditLogHistory> AuditLogHistory => Set<AuditLogHistory>();
    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<HospitalMessage> Messages => Set<HospitalMessage>();
    public DbSet<PrescriptionItem> PrescriptionItems => Set<PrescriptionItem>();

    // ── Patient Dashboard ───────────────────────────────────────
    public DbSet<PatientCareTaskLog> PatientCareTaskLogs => Set<PatientCareTaskLog>();
    public DbSet<PatientMoodLog> PatientMoodLogs => Set<PatientMoodLog>();
    public DbSet<PatientWaterSetting> PatientWaterSettings => Set<PatientWaterSetting>();
    public DbSet<PatientWaterLog> PatientWaterLogs => Set<PatientWaterLog>();
    public DbSet<PatientPhysioLog> PatientPhysioLogs => Set<PatientPhysioLog>();
    public DbSet<PatientVital> PatientVitals => Set<PatientVital>();
    public DbSet<HealthTip> HealthTips => Set<HealthTip>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Unique Constraints ──────────────────────────────────────
        modelBuilder.Entity<User>()
            .HasIndex(u => new { u.HospitalId, u.MobileNumber })
            .IsUnique()
            .HasDatabaseName("ix_users_hospital_mobile");

        modelBuilder.Entity<User>()
            .HasIndex(u => new { u.HospitalId, u.EmployeeId })
            .IsUnique()
            .HasFilter("employee_id IS NOT NULL")
            .HasDatabaseName("ix_users_hospital_employee");

        modelBuilder.Entity<Patient>()
            .HasIndex(p => new { p.HospitalId, p.MobileNumber })
            .IsUnique()
            .HasDatabaseName("ix_patients_hospital_mobile");

        modelBuilder.Entity<HospitalSetting>()
            .HasIndex(s => new { s.HospitalId, s.Key })
            .IsUnique()
            .HasDatabaseName("ix_settings_hospital_key");

        // ── Global Query Filters (Defense Layer 3) ──────────────────
        // IMPORTANT: Reference _currentHospitalId field directly (not a local copy).
        // EF Core caches the model but parameterizes DbContext field references,
        // so each DbContext instance evaluates its own _currentHospitalId value.
        // When _currentHospitalId is null (unauthenticated), the filter passes all rows.
        modelBuilder.Entity<User>()
            .HasQueryFilter(u => !_currentHospitalId.HasValue || u.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<Department>()
            .HasQueryFilter(d => !_currentHospitalId.HasValue || d.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<HospitalSetting>()
            .HasQueryFilter(s => !_currentHospitalId.HasValue || s.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<AuditLog>()
            .HasQueryFilter(a => !_currentHospitalId.HasValue || a.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<DoctorProfile>()
            .HasQueryFilter(dp => !_currentHospitalId.HasValue || dp.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<DoctorSchedule>()
            .HasQueryFilter(ds => !_currentHospitalId.HasValue || ds.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<Appointment>()
            .HasQueryFilter(ap => !_currentHospitalId.HasValue || ap.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<Patient>()
            .HasQueryFilter(p => !_currentHospitalId.HasValue || p.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<HospitalWorkingHour>()
            .HasQueryFilter(wh => !_currentHospitalId.HasValue || wh.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<HospitalIntegration>()
            .HasQueryFilter(hi => !_currentHospitalId.HasValue || hi.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<AuditLogHistory>()
            .HasQueryFilter(a => !_currentHospitalId.HasValue || a.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<Medicine>()
            .HasQueryFilter(m => !_currentHospitalId.HasValue || m.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<HospitalMessage>()
            .HasQueryFilter(msg => !_currentHospitalId.HasValue || msg.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<PatientCareTaskLog>()
            .HasQueryFilter(ct => !_currentHospitalId.HasValue || ct.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<PatientMoodLog>()
            .HasQueryFilter(m => !_currentHospitalId.HasValue || m.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<PatientWaterSetting>()
            .HasQueryFilter(ws => !_currentHospitalId.HasValue || ws.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<PatientWaterLog>()
            .HasQueryFilter(wl => !_currentHospitalId.HasValue || wl.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<PatientPhysioLog>()
            .HasQueryFilter(pl => !_currentHospitalId.HasValue || pl.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<PatientVital>()
            .HasQueryFilter(v => !_currentHospitalId.HasValue || v.HospitalId == _currentHospitalId.Value);

        // HealthTip: show hospital-specific tips AND global tips (hospital_id IS NULL)
        modelBuilder.Entity<HealthTip>()
            .HasQueryFilter(ht => !_currentHospitalId.HasValue
                                  || ht.HospitalId == null
                                  || ht.HospitalId == _currentHospitalId.Value);

        modelBuilder.Entity<AuditLogHistory>()
            .HasIndex(a => new { a.HospitalId, a.CreatedAt })
            .HasDatabaseName("ix_audit_log_history_hospital_date");

        // ── UserRole: unique (user_id, role) ─────────────────────────
        modelBuilder.Entity<UserRole>()
            .HasIndex(ur => new { ur.UserId, ur.Role })
            .IsUnique()
            .HasDatabaseName("ix_user_roles_user_role");

        // ── Relationships ───────────────────────────────────────────
        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.User)
            .WithMany(u => u.UserRoles)
            .HasForeignKey(ur => ur.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>()
            .HasOne(u => u.Hospital)
            .WithMany(h => h.Users)
            .HasForeignKey(u => u.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OtpVerification>()
            .HasOne(o => o.User)
            .WithMany(u => u.OtpVerifications)
            .HasForeignKey(o => o.UserId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Department>()
            .HasOne(d => d.Hospital)
            .WithMany(h => h.Departments)
            .HasForeignKey(d => d.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HospitalSetting>()
            .HasOne(s => s.Hospital)
            .WithMany(h => h.Settings)
            .HasForeignKey(s => s.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.Hospital)
            .WithMany(h => h.AuditLogs)
            .HasForeignKey(a => a.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AuditLog>()
            .HasOne(a => a.User)
            .WithMany(u => u.AuditLogs)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // ── DoctorProfile ─────────────────────────────────────────
        modelBuilder.Entity<DoctorProfile>()
            .HasOne(dp => dp.Hospital)
            .WithMany(h => h.DoctorProfiles)
            .HasForeignKey(dp => dp.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DoctorProfile>()
            .HasOne(dp => dp.User)
            .WithOne(u => u.DoctorProfile)
            .HasForeignKey<DoctorProfile>(dp => dp.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DoctorProfile>()
            .HasIndex(dp => new { dp.HospitalId, dp.UserId })
            .IsUnique()
            .HasDatabaseName("ix_doctor_profiles_hospital_user");

        // ── DoctorSchedule ────────────────────────────────────────
        modelBuilder.Entity<DoctorSchedule>()
            .HasOne(ds => ds.Hospital)
            .WithMany(h => h.DoctorSchedules)
            .HasForeignKey(ds => ds.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DoctorSchedule>()
            .HasOne(ds => ds.DoctorProfile)
            .WithMany(dp => dp.Schedules)
            .HasForeignKey(ds => ds.DoctorProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Appointment ───────────────────────────────────────────
        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Hospital)
            .WithMany(h => h.Appointments)
            .HasForeignKey(a => a.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.Patient)
            .WithMany(p => p.Appointments)
            .HasForeignKey(a => a.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Appointment>()
            .HasOne(a => a.DoctorProfile)
            .WithMany(dp => dp.Appointments)
            .HasForeignKey(a => a.DoctorProfileId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Patient ──────────────────────────────────────────
        modelBuilder.Entity<Patient>()
            .HasOne(p => p.Hospital)
            .WithMany(h => h.Patients)
            .HasForeignKey(p => p.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OtpVerification>()
            .HasOne(o => o.Patient)
            .WithMany(p => p.OtpVerifications)
            .HasForeignKey(o => o.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        // Prevent double-booking (unique slot per doctor per date, excluding cancelled)
        modelBuilder.Entity<Appointment>()
            .HasIndex(a => new { a.HospitalId, a.DoctorProfileId, a.ScheduleDate, a.StartTime })
            .HasFilter("status != 'cancelled'")
            .IsUnique()
            .HasDatabaseName("ix_appointments_no_double_booking");

        modelBuilder.Entity<Appointment>()
            .HasIndex(a => a.BookingReference)
            .IsUnique()
            .HasDatabaseName("ix_appointments_booking_reference");

        // ── HospitalWorkingHour ─────────────────────────────────
        modelBuilder.Entity<HospitalWorkingHour>()
            .HasIndex(wh => new { wh.HospitalId, wh.DayOfWeek })
            .IsUnique()
            .HasDatabaseName("ix_working_hours_hospital_day");

        modelBuilder.Entity<HospitalWorkingHour>()
            .HasOne(wh => wh.Hospital)
            .WithMany(h => h.WorkingHours)
            .HasForeignKey(wh => wh.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── HospitalIntegration ─────────────────────────────────
        modelBuilder.Entity<HospitalIntegration>()
            .HasIndex(hi => new { hi.HospitalId, hi.Name })
            .IsUnique()
            .HasDatabaseName("ix_integrations_hospital_name");

        modelBuilder.Entity<HospitalIntegration>()
            .HasOne(hi => hi.Hospital)
            .WithMany(h => h.Integrations)
            .HasForeignKey(hi => hi.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Medicine ──────────────────────────────────────────
        modelBuilder.Entity<Medicine>()
            .HasOne(m => m.Hospital)
            .WithMany(h => h.Medicines)
            .HasForeignKey(m => m.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── HospitalMessage ───────────────────────────────────
        modelBuilder.Entity<HospitalMessage>()
            .HasOne(msg => msg.Hospital)
            .WithMany(h => h.Messages)
            .HasForeignKey(msg => msg.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HospitalMessage>()
            .HasOne(msg => msg.Sender)
            .WithMany()
            .HasForeignKey(msg => msg.SenderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<HospitalMessage>()
            .HasOne(msg => msg.Recipient)
            .WithMany()
            .HasForeignKey(msg => msg.RecipientId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<HospitalMessage>()
            .HasIndex(msg => new { msg.HospitalId, msg.SenderId, msg.RecipientId, msg.CreatedAt })
            .HasDatabaseName("ix_messages_hospital_thread_time");

        // ── PrescriptionItem ──────────────────────────────────
        modelBuilder.Entity<PrescriptionItem>()
            .HasOne(pi => pi.Appointment)
            .WithMany(a => a.PrescriptionItems)
            .HasForeignKey(pi => pi.AppointmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PrescriptionItem>()
            .HasOne(pi => pi.Medicine)
            .WithMany()
            .HasForeignKey(pi => pi.MedicineId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<PrescriptionItem>()
            .HasIndex(pi => pi.AppointmentId)
            .HasDatabaseName("ix_prescription_items_appointment");

        // ── PatientCareTaskLog ────────────────────────────────────
        modelBuilder.Entity<PatientCareTaskLog>()
            .HasOne(ct => ct.Hospital)
            .WithMany()
            .HasForeignKey(ct => ct.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientCareTaskLog>()
            .HasOne(ct => ct.Patient)
            .WithMany()
            .HasForeignKey(ct => ct.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientCareTaskLog>()
            .HasIndex(ct => new { ct.HospitalId, ct.PatientId, ct.LogDate, ct.TaskId })
            .IsUnique()
            .HasDatabaseName("uq_care_task_patient_day");

        modelBuilder.Entity<PatientCareTaskLog>()
            .HasIndex(ct => new { ct.HospitalId, ct.PatientId, ct.LogDate })
            .HasDatabaseName("ix_care_task_patient_date");

        // ── PatientMoodLog ────────────────────────────────────────
        modelBuilder.Entity<PatientMoodLog>()
            .HasOne(m => m.Hospital)
            .WithMany()
            .HasForeignKey(m => m.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientMoodLog>()
            .HasOne(m => m.Patient)
            .WithMany(p => p.MoodLogs)
            .HasForeignKey(m => m.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientMoodLog>()
            .HasIndex(m => new { m.HospitalId, m.PatientId, m.LogDate })
            .IsUnique()
            .HasDatabaseName("uq_mood_patient_day");

        modelBuilder.Entity<PatientMoodLog>()
            .HasIndex(m => new { m.HospitalId, m.PatientId, m.LogDate })
            .HasDatabaseName("ix_mood_patient_date");

        // ── PatientWaterSetting ───────────────────────────────────
        modelBuilder.Entity<PatientWaterSetting>()
            .HasOne(ws => ws.Hospital)
            .WithMany()
            .HasForeignKey(ws => ws.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientWaterSetting>()
            .HasOne(ws => ws.Patient)
            .WithOne(p => p.WaterSetting)
            .HasForeignKey<PatientWaterSetting>(ws => ws.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientWaterSetting>()
            .HasIndex(ws => new { ws.HospitalId, ws.PatientId })
            .IsUnique()
            .HasDatabaseName("uq_water_settings_patient");

        // ── PatientWaterLog ───────────────────────────────────────
        modelBuilder.Entity<PatientWaterLog>()
            .HasOne(wl => wl.Hospital)
            .WithMany()
            .HasForeignKey(wl => wl.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientWaterLog>()
            .HasOne(wl => wl.Patient)
            .WithMany(p => p.WaterLogs)
            .HasForeignKey(wl => wl.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientWaterLog>()
            .HasIndex(wl => new { wl.HospitalId, wl.PatientId, wl.LogDate })
            .HasDatabaseName("ix_water_logs_patient_date");

        // ── PatientPhysioLog ──────────────────────────────────────
        modelBuilder.Entity<PatientPhysioLog>()
            .HasOne(pl => pl.Hospital)
            .WithMany()
            .HasForeignKey(pl => pl.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientPhysioLog>()
            .HasOne(pl => pl.Patient)
            .WithMany(p => p.PhysioLogs)
            .HasForeignKey(pl => pl.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientPhysioLog>()
            .HasIndex(pl => new { pl.HospitalId, pl.PatientId, pl.LogDate })
            .HasDatabaseName("ix_physio_patient_date");

        // ── PatientVital ──────────────────────────────────────────
        modelBuilder.Entity<PatientVital>()
            .HasOne(v => v.Hospital)
            .WithMany()
            .HasForeignKey(v => v.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientVital>()
            .HasOne(v => v.Patient)
            .WithMany(p => p.Vitals)
            .HasForeignKey(v => v.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PatientVital>()
            .HasOne(v => v.RecordedBy)
            .WithMany()
            .HasForeignKey(v => v.RecordedById)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<PatientVital>()
            .HasIndex(v => new { v.HospitalId, v.PatientId, v.LogDate, v.RecordedAt })
            .HasDatabaseName("ix_vitals_patient_date");

        // ── HealthTip ─────────────────────────────────────────────
        modelBuilder.Entity<HealthTip>()
            .HasOne(ht => ht.Hospital)
            .WithMany()
            .HasForeignKey(ht => ht.HospitalId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HealthTip>()
            .HasIndex(ht => new { ht.HospitalId, ht.IsActive, ht.Category })
            .HasDatabaseName("ix_health_tips_active");
    }
}
