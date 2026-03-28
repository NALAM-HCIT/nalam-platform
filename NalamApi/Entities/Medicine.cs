using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("medicines")]
public class Medicine
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Required, MaxLength(200)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(200)]
    [Column("generic_name")]
    public string? GenericName { get; set; }

    [Required, MaxLength(100)]
    [Column("category")]
    public string Category { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    [Column("dosage_form")]
    public string DosageForm { get; set; } = string.Empty;  // Tablet, Capsule, Syrup, Injection, Inhaler, Drops, Cream

    [MaxLength(50)]
    [Column("strength")]
    public string? Strength { get; set; }  // e.g. "5mg", "500mg", "10%"

    [MaxLength(200)]
    [Column("manufacturer")]
    public string? Manufacturer { get; set; }

    [Column("price")]
    public decimal Price { get; set; }

    [MaxLength(100)]
    [Column("pack_size")]
    public string? PackSize { get; set; }  // e.g. "10 tablets", "100ml bottle"

    [Column("stock_quantity")]
    public int StockQuantity { get; set; } = 0;

    [Column("requires_prescription")]
    public bool RequiresPrescription { get; set; } = true;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;
}
