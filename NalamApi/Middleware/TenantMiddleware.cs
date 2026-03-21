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

        if (!string.IsNullOrEmpty(hospitalId))
        {
            // Set PostgreSQL session variable for RLS policies
            // Using parameterized approach to prevent SQL injection
            await db.Database.ExecuteSqlRawAsync(
                "SET app.current_hospital_id = {0}", hospitalId);
        }

        await _next(context);
    }
}
