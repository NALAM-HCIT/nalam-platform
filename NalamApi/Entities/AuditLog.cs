using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("audit_logs")]
public class AuditLog
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Column("user_id")]
    public Guid? UserId { get; set; }

    [Required, MaxLength(200)]
    [Column("action")]
    public string Action { get; set; } = string.Empty;

    [Required, MaxLength(30)]
    [Column("category")]
    public string Category { get; set; } = "system"; // user, security, system

    [Required, MaxLength(20)]
    [Column("severity")]
    public string Severity { get; set; } = "info"; // info, warning, critical

    [Column("details")]
    public string? Details { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("UserId")]
    public User? User { get; set; }
}
