using NalamApi.Data;
using NalamApi.Entities;

namespace NalamApi.Services;

/// <summary>
/// Centralized audit logging service. Logs all critical actions
/// with severity levels for security compliance.
/// </summary>
public class AuditService
{
    private readonly NalamDbContext _db;

    public AuditService(NalamDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Log an audit event for the specified hospital.
    /// </summary>
    public async Task LogAsync(
        Guid hospitalId,
        Guid? userId,
        string action,
        string category = "system",
        string severity = "info",
        string? details = null)
    {
        var log = new AuditLog
        {
            HospitalId = hospitalId,
            UserId = userId,
            Action = action,
            Category = category,
            Severity = severity,
            Details = details
        };

        // Bypass Global Query Filter for cross-tenant audit logging
        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync();
    }

    /// <summary>
    /// Log an audit event without saving immediately (for batching transactions).
    /// </summary>
    public void Log(
        Guid hospitalId,
        Guid? userId,
        string action,
        string category = "system",
        string severity = "info",
        string? details = null)
    {
        var log = new AuditLog
        {
            HospitalId = hospitalId,
            UserId = userId,
            Action = action,
            Category = category,
            Severity = severity,
            Details = details
        };

        _db.AuditLogs.Add(log);
    }
}
