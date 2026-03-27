using Microsoft.EntityFrameworkCore;
using NalamApi.Data;

namespace NalamApi.Services;

/// <summary>
/// Background service that archives audit logs older than today into audit_log_history.
/// Runs daily at 2:00 AM UTC.
/// </summary>
public class AuditArchivingService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditArchivingService> _logger;

    public AuditArchivingService(IServiceScopeFactory scopeFactory, ILogger<AuditArchivingService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Run once on startup to clear any backlog
        await ArchiveOldLogsAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            var now = DateTime.UtcNow;
            var nextRun = now.Date.AddDays(1).AddHours(2); // 2 AM UTC tomorrow
            var delay = nextRun - now;

            _logger.LogInformation("Audit archiving next run at {NextRun} (in {Delay})", nextRun, delay);
            await Task.Delay(delay, stoppingToken);
            await ArchiveOldLogsAsync(stoppingToken);
        }
    }

    private async Task ArchiveOldLogsAsync(CancellationToken ct)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<NalamDbContext>();

            var todayUtc = DateTime.UtcNow.Date;

            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            try
            {
                // Copy old logs to history (ON CONFLICT DO NOTHING for idempotency)
                var copied = await db.Database.ExecuteSqlAsync(
                    $@"INSERT INTO audit_log_history (id, hospital_id, user_id, action, category, severity, details, created_at, archived_at)
                       SELECT id, hospital_id, user_id, action, category, severity, details, created_at, now()
                       FROM audit_logs
                       WHERE created_at < {todayUtc}
                       ON CONFLICT (id) DO NOTHING", ct);

                // Delete archived logs from main table
                var deleted = await db.Database.ExecuteSqlAsync(
                    $"DELETE FROM audit_logs WHERE created_at < {todayUtc}", ct);

                await transaction.CommitAsync(ct);
                _logger.LogInformation("Audit archiving complete: {Copied} copied, {Deleted} deleted", copied, deleted);
            }
            catch
            {
                await transaction.RollbackAsync(ct);
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to archive audit logs");
        }
    }
}
