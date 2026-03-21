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

        modelBuilder.Entity<HospitalSetting>()
            .HasIndex(s => new { s.HospitalId, s.Key })
            .IsUnique()
            .HasDatabaseName("ix_settings_hospital_key");

        // ── Global Query Filters (Defense Layer 3) ──────────────────
        // These ensure application-level tenant isolation.
        // Only applied when _currentHospitalId is set (authenticated requests).
        if (_currentHospitalId.HasValue)
        {
            var tenantId = _currentHospitalId.Value;

            modelBuilder.Entity<User>()
                .HasQueryFilter(u => u.HospitalId == tenantId);

            modelBuilder.Entity<Department>()
                .HasQueryFilter(d => d.HospitalId == tenantId);

            modelBuilder.Entity<HospitalSetting>()
                .HasQueryFilter(s => s.HospitalId == tenantId);

            modelBuilder.Entity<AuditLog>()
                .HasQueryFilter(a => a.HospitalId == tenantId);
        }

        // ── Relationships ───────────────────────────────────────────
        modelBuilder.Entity<User>()
            .HasOne(u => u.Hospital)
            .WithMany(h => h.Users)
            .HasForeignKey(u => u.HospitalId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OtpVerification>()
            .HasOne(o => o.User)
            .WithMany(u => u.OtpVerifications)
            .HasForeignKey(o => o.UserId)
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
    }
}
