using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.Entities;

namespace NalamApi.Endpoints;

/// <summary>
/// Internal hospital messaging between staff (doctors, nurses, admins, pharmacists, receptionists).
/// All endpoints require authentication. Hospital isolation via global query filter.
/// </summary>
public static class MessageEndpoints
{
    public static void MapMessageEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/messages")
            .WithTags("Messages")
            .RequireAuthorization("StaffAccess");

        group.MapGet("/threads",   GetThreads);
        group.MapGet("/thread/{recipientId:guid}", GetThread);
        group.MapPost("/send",     SendMessage);
        group.MapPut("/thread/{recipientId:guid}/read", MarkThreadRead);
    }

    private static Guid GetUserId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("sub")!.Value);

    private static string GetInitials(string name) =>
        string.Join("", name.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Take(2).Select(w => w[0])).ToUpper();

    // ═══════════════════════════════════════════════════════════
    //  GET /api/messages/threads
    //  Returns all conversation threads for the current user,
    //  sorted by most recent message. Each thread shows the
    //  other party's info, last message, and unread count.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetThreads(NalamDbContext db, HttpContext ctx)
    {
        var userId = GetUserId(ctx);

        // All messages where user is sender or recipient
        var messages = await db.Messages.AsNoTracking()
            .Include(m => m.Sender)
            .Include(m => m.Recipient)
            .Where(m => m.SenderId == userId || m.RecipientId == userId)
            .OrderByDescending(m => m.CreatedAt)
            .ToListAsync();

        // Group by the "other" person
        var threads = messages
            .GroupBy(m => m.SenderId == userId ? m.RecipientId : m.SenderId)
            .Select(g =>
            {
                var latest   = g.First();
                var other    = latest.SenderId == userId ? latest.Recipient : latest.Sender;
                var unread   = g.Count(m => m.RecipientId == userId && !m.IsRead);
                return new
                {
                    userId     = other.Id,
                    name       = other.FullName,
                    initials   = GetInitials(other.FullName),
                    role       = other.Role,
                    department = other.Department,
                    lastMessage = latest.Body.Length > 80 ? latest.Body[..80] + "…" : latest.Body,
                    lastMessageAt = latest.CreatedAt.ToString("o"),
                    isSentByMe  = latest.SenderId == userId,
                    unreadCount = unread,
                };
            })
            .OrderByDescending(t => t.lastMessageAt)
            .ToList();

        // Also include hospital staff who have no messages yet (so user can start new threads)
        var contactedIds = threads.Select(t => t.userId).ToHashSet();
        var allStaff = await db.Users.AsNoTracking()
            .Where(u => u.Id != userId && u.Status == "active")
            .Select(u => new { u.Id, u.FullName, u.Role, u.Department })
            .ToListAsync();

        var newContacts = allStaff
            .Where(u => !contactedIds.Contains(u.Id))
            .Select(u => new
            {
                userId      = u.Id,
                name        = u.FullName,
                initials    = GetInitials(u.FullName),
                role        = u.Role,
                department  = u.Department,
                lastMessage = (string?)null,
                lastMessageAt = (string?)null,
                isSentByMe  = false,
                unreadCount = 0,
            })
            .OrderBy(u => u.name)
            .ToList<object>();

        return Results.Ok(new
        {
            threads,
            contacts = newContacts,
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/messages/thread/{recipientId}
    //  Returns full message history between current user and
    //  the specified user. Marks unread messages as read.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetThread(
        Guid recipientId,
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);

        // Get the other user's info
        var other = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == recipientId);

        if (other == null)
            return Results.NotFound(new { error = "User not found." });

        var messages = await db.Messages.AsNoTracking()
            .Where(m => (m.SenderId == userId && m.RecipientId == recipientId) ||
                        (m.SenderId == recipientId && m.RecipientId == userId))
            .OrderBy(m => m.CreatedAt)
            .Select(m => new
            {
                id         = m.Id,
                body       = m.Body,
                isSentByMe = m.SenderId == userId,
                isRead     = m.IsRead,
                createdAt  = m.CreatedAt.ToString("o"),
            })
            .ToListAsync();

        // Mark unread messages from the other person as read
        var unread = await db.Messages
            .Where(m => m.SenderId == recipientId && m.RecipientId == userId && !m.IsRead)
            .ToListAsync();

        if (unread.Count > 0)
        {
            unread.ForEach(m => m.IsRead = true);
            await db.SaveChangesAsync();
        }

        return Results.Ok(new
        {
            recipient = new
            {
                id       = other.Id,
                name     = other.FullName,
                initials = GetInitials(other.FullName),
                role     = other.Role,
                department = other.Department,
            },
            messages,
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /api/messages/send
    //  Sends a message to another staff member.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> SendMessage(
        SendMessageRequest req,
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId     = GetUserId(ctx);
        var hospitalId = Guid.Parse(ctx.User.FindFirst("hospitalId")!.Value);

        if (req.RecipientId == userId)
            return Results.BadRequest(new { error = "Cannot send a message to yourself." });

        if (string.IsNullOrWhiteSpace(req.Body) || req.Body.Trim().Length > 2000)
            return Results.BadRequest(new { error = "Message body must be 1–2000 characters." });

        var recipient = await db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == req.RecipientId);

        if (recipient == null)
            return Results.NotFound(new { error = "Recipient not found." });

        var message = new HospitalMessage
        {
            HospitalId  = hospitalId,
            SenderId    = userId,
            RecipientId = req.RecipientId,
            Body        = req.Body.Trim(),
        };

        db.Messages.Add(message);
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            id        = message.Id,
            body      = message.Body,
            isSentByMe = true,
            isRead    = false,
            createdAt = message.CreatedAt.ToString("o"),
        });
    }

    // ═══════════════════════════════════════════════════════════
    //  PUT /api/messages/thread/{recipientId}/read
    //  Marks all messages from a specific sender as read.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> MarkThreadRead(
        Guid recipientId,
        NalamDbContext db,
        HttpContext ctx)
    {
        var userId = GetUserId(ctx);

        var unread = await db.Messages
            .Where(m => m.SenderId == recipientId && m.RecipientId == userId && !m.IsRead)
            .ToListAsync();

        if (unread.Count > 0)
        {
            unread.ForEach(m => m.IsRead = true);
            await db.SaveChangesAsync();
        }

        return Results.Ok(new { markedRead = unread.Count });
    }
}

public record SendMessageRequest(Guid RecipientId, string Body);
