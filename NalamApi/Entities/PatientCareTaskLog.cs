using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

/// <summary>
/// Persists a patient's daily care-task completion status.
/// One row per (hospital, patient, log_date, task_id).
/// task_id is the stable client-side key, e.g. "rx-{apptId}-{itemId}" or "hydra-default".
/// </summary>
[Table("patient_care_task_logs")]
public class PatientCareTaskLog
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

    [Column("log_date")]
    public DateOnly LogDate { get; set; }

    [Required, MaxLength(200)]
    [Column("task_id")]
    public string TaskId { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    [Column("task_title")]
    public string TaskTitle { get; set; } = string.Empty;

    // completed | snoozed | skipped
    [Required, MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "completed";

    [Column("completed_at")]
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("PatientId")]
    public Patient Patient { get; set; } = null!;
}
