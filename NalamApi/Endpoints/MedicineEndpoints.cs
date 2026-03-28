using Microsoft.EntityFrameworkCore;
using NalamApi.Data;
using NalamApi.Entities;

namespace NalamApi.Endpoints;

/// <summary>
/// Medicine catalog endpoints.
/// GET  /api/medicines             — patient: list medicines (with search/category filter)
/// GET  /api/medicines/categories  — patient: list available categories
/// POST /api/medicines             — admin/staff: add a medicine
/// PUT  /api/medicines/{id}        — admin/staff: update a medicine
/// </summary>
public static class MedicineEndpoints
{
    public static void MapMedicineEndpoints(this WebApplication app)
    {
        // Read routes — accessible to all authenticated users (patients, doctors, pharmacists, etc.)
        var readGroup = app.MapGroup("/api/medicines")
            .WithTags("Medicines")
            .RequireAuthorization();

        readGroup.MapGet("", GetMedicines);
        readGroup.MapGet("/categories", GetCategories);

        // Staff routes for medicine management
        var adminGroup = app.MapGroup("/api/medicines")
            .WithTags("Medicines")
            .RequireAuthorization("StaffAccess");

        adminGroup.MapPost("", AddMedicine);
        adminGroup.MapPut("/{id:guid}", UpdateMedicine);
    }

    private static Guid GetHospitalId(HttpContext ctx) =>
        Guid.Parse(ctx.User.FindFirst("hospitalId")!.Value);

    // ═══════════════════════════════════════════════════════════
    //  GET /api/medicines
    //  List medicines scoped to the patient's hospital.
    //  Optional: ?search=metformin&category=Diabetes&page=1&pageSize=20
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetMedicines(
        NalamDbContext db,
        HttpContext ctx,
        string? search = null,
        string? category = null,
        int page = 1,
        int pageSize = 20)
    {
        var hospitalId = GetHospitalId(ctx);

        var query = db.Medicines
            .AsNoTracking()
            .Where(m => m.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(m =>
                m.Name.ToLower().Contains(s) ||
                (m.GenericName != null && m.GenericName.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(category) && category != "All")
            query = query.Where(m => m.Category == category);

        var total = await query.CountAsync();

        var items = await query
            .OrderBy(m => m.Category)
            .ThenBy(m => m.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new
            {
                m.Id,
                m.Name,
                m.GenericName,
                m.Category,
                m.DosageForm,
                m.Strength,
                m.Manufacturer,
                m.Price,
                m.PackSize,
                m.StockQuantity,
                m.RequiresPrescription,
            })
            .ToListAsync();

        return Results.Ok(new { total, page, pageSize, medicines = items });
    }

    // ═══════════════════════════════════════════════════════════
    //  GET /api/medicines/categories
    //  Distinct categories for the hospital's medicine catalog.
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> GetCategories(NalamDbContext db, HttpContext ctx)
    {
        var categories = await db.Medicines
            .AsNoTracking()
            .Where(m => m.IsActive)
            .Select(m => m.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

        return Results.Ok(categories);
    }

    // ═══════════════════════════════════════════════════════════
    //  POST /api/medicines  (staff)
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> AddMedicine(
        NalamDbContext db,
        HttpContext ctx,
        AddMedicineRequest req)
    {
        var hospitalId = GetHospitalId(ctx);

        var medicine = new Medicine
        {
            HospitalId = hospitalId,
            Name = req.Name,
            GenericName = req.GenericName,
            Category = req.Category,
            DosageForm = req.DosageForm,
            Strength = req.Strength,
            Manufacturer = req.Manufacturer,
            Price = req.Price,
            PackSize = req.PackSize,
            StockQuantity = req.StockQuantity ?? 0,
            RequiresPrescription = req.RequiresPrescription ?? true,
        };

        db.Medicines.Add(medicine);
        await db.SaveChangesAsync();

        return Results.Created($"/api/medicines/{medicine.Id}", new { medicine.Id, medicine.Name });
    }

    // ═══════════════════════════════════════════════════════════
    //  PUT /api/medicines/{id}  (staff)
    // ═══════════════════════════════════════════════════════════

    private static async Task<IResult> UpdateMedicine(
        Guid id,
        NalamDbContext db,
        HttpContext ctx,
        UpdateMedicineRequest req)
    {
        var medicine = await db.Medicines.FindAsync(id);
        if (medicine == null) return Results.NotFound(new { error = "Medicine not found." });

        if (req.Name != null) medicine.Name = req.Name;
        if (req.GenericName != null) medicine.GenericName = req.GenericName;
        if (req.Category != null) medicine.Category = req.Category;
        if (req.DosageForm != null) medicine.DosageForm = req.DosageForm;
        if (req.Strength != null) medicine.Strength = req.Strength;
        if (req.Manufacturer != null) medicine.Manufacturer = req.Manufacturer;
        if (req.Price.HasValue) medicine.Price = req.Price.Value;
        if (req.PackSize != null) medicine.PackSize = req.PackSize;
        if (req.StockQuantity.HasValue) medicine.StockQuantity = req.StockQuantity.Value;
        if (req.RequiresPrescription.HasValue) medicine.RequiresPrescription = req.RequiresPrescription.Value;
        if (req.IsActive.HasValue) medicine.IsActive = req.IsActive.Value;
        medicine.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Results.Ok(new { medicine.Id, medicine.Name, medicine.IsActive });
    }
}

// ─── Request DTOs ────────────────────────────────────────────

public record AddMedicineRequest(
    string Name,
    string? GenericName,
    string Category,
    string DosageForm,
    string? Strength,
    string? Manufacturer,
    decimal Price,
    string? PackSize,
    int? StockQuantity,
    bool? RequiresPrescription
);

public record UpdateMedicineRequest(
    string? Name,
    string? GenericName,
    string? Category,
    string? DosageForm,
    string? Strength,
    string? Manufacturer,
    decimal? Price,
    string? PackSize,
    int? StockQuantity,
    bool? RequiresPrescription,
    bool? IsActive
);
