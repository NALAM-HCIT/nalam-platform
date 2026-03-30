using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("patient_mood_logs")]
public class PatientMoodLog
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

    // 1 = terrible, 2 = bad, 3 = okay, 4 = good, 5 = great
    [Required]
    [Column("mood_score")]
    public short MoodScore { get; set; }

    [Required, MaxLength(20)]
    [Column("mood_label")]
    public string MoodLabel { get; set; } = string.Empty; // terrible, bad, okay, good, great

    [MaxLength(500)]
    [Column("mood_note")]
    public string? MoodNote { get; set; }

    [Column("logged_at")]
    public DateTime LoggedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("PatientId")]
    public Patient Patient { get; set; } = null!;
}
