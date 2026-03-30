using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

/// <summary>
/// A custom care task created by the patient themselves.
/// One row per task; is_active = false means soft-deleted.
/// </summary>
[Table("patient_custom_tasks")]
public class PatientCustomTask
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Required]
    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [Required, MaxLength(200)]
    [Column("title")]
    public string Title { get; set; } = string.Empty;

    // medicine | physio | diet | vitals | hydration
    [Required, MaxLength(20)]
    [Column("category")]
    public string Category { get; set; } = "vitals";

    // morning | afternoon | evening
    [Required, MaxLength(20)]
    [Column("time_of_day")]
    public string TimeOfDay { get; set; } = "morning";

    [MaxLength(500)]
    [Column("notes")]
    public string? Notes { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("PatientId")]
    public Patient Patient { get; set; } = null!;
}
