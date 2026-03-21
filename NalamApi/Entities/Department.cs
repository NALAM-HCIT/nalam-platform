using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("departments")]
public class Department
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Required, MaxLength(100)]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;
}
