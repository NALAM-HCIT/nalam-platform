using Microsoft.EntityFrameworkCore;
using NalamApi.Data;

namespace NalamApi.Middleware;

/// <summary>
/// Defense Layer 2: Tenant Middleware.
/// Injects the authenticated user's hospital_id into the PostgreSQL session
/// variable 'app.current_hospital_id'. This enables PostgreSQL Row-Level
/// Security (RLS) policies to enforce tenant isolation at the database level.
/// </summary>
public class TenantMiddleware
{
    private readonly RequestDelegate _next;

    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, NalamDbContext db)
    {
        var hospitalId = context.User?.FindFirst("hospitalId")?.Value;

        if (!string.IsNullOrEmpty(hospitalId) && Guid.TryParse(hospitalId, out _))
        {
            // Set PostgreSQL session variable for RLS policies
            // SET doesn't support parameterized queries in PG, so we validate the GUID format above
            await db.Database.ExecuteSqlRawAsync(
                $"SET app.current_hospital_id = '{hospitalId}'");
        }

        await _next(context);
    }
}
