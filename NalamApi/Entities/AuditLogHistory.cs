using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("audit_log_history")]
public class AuditLogHistory
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; }

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
    public string Category { get; set; } = "system";

    [Required, MaxLength(20)]
    [Column("severity")]
    public string Severity { get; set; } = "info";

    [Column("details")]
    public string? Details { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("archived_at")]
    public DateTime ArchivedAt { get; set; } = DateTime.UtcNow;
}
