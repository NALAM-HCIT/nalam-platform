using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("hospital_working_hours")]
public class HospitalWorkingHour
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Column("day_of_week")]
    public int DayOfWeek { get; set; } // 0=Sunday, 6=Saturday

    [Column("start_time")]
    public TimeOnly StartTime { get; set; }

    [Column("end_time")]
    public TimeOnly EndTime { get; set; }

    [Column("is_enabled")]
    public bool IsEnabled { get; set; } = true;

    [Column("break_start")]
    public TimeOnly? BreakStart { get; set; }

    [Column("break_end")]
    public TimeOnly? BreakEnd { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;
}
