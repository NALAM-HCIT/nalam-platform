using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("hospital_integrations")]
public class HospitalIntegration
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

    [Required, MaxLength(50)]
    [Column("type")]
    public string Type { get; set; } = string.Empty; // health_network, lab, pharmacy, insurance, sms

    [Column("is_connected")]
    public bool IsConnected { get; set; } = false;

    [Column("config_json")]
    public string? ConfigJson { get; set; }

    [Column("last_synced_at")]
    public DateTime? LastSyncedAt { get; set; }

    [Required, MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "disconnected"; // connected, disconnected, error

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;
}
