using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("health_tips")]
public class HealthTip
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    // NULL = global tip visible to all hospitals; set = hospital-specific tip
    [Column("hospital_id")]
    public Guid? HospitalId { get; set; }

    [Required, MaxLength(200)]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    [Required]
    [Column("body")]
    public string Body { get; set; } = string.Empty;

    // nutrition, exercise, mental, general, seasonal
    [Required, MaxLength(50)]
    [Column("category")]
    public string Category { get; set; } = "general";

    // Ionicons icon name for the mobile UI (e.g. "water-outline", "walk-outline")
    [MaxLength(50)]
    [Column("icon_name")]
    public string? IconName { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("valid_from")]
    public DateOnly? ValidFrom { get; set; }

    [Column("valid_until")]
    public DateOnly? ValidUntil { get; set; }

    [Column("sort_order")]
    public int SortOrder { get; set; } = 0;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation (nullable because global tips have no hospital)
    [ForeignKey("HospitalId")]
    public Hospital? Hospital { get; set; }
}
