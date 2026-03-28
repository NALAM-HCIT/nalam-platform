using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("prescription_items")]
public class PrescriptionItem
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("appointment_id")]
    public Guid AppointmentId { get; set; }

    /// <summary>
    /// FK to medicines table. Nullable so a doctor can add a custom medicine not in catalog.
    /// </summary>
    [Column("medicine_id")]
    public Guid? MedicineId { get; set; }

    /// <summary>
    /// Denormalized for history preservation if the medicine is later removed.
    /// </summary>
    [Required, MaxLength(200)]
    [Column("medicine_name")]
    public string MedicineName { get; set; } = string.Empty;

    /// <summary>
    /// e.g. "500mg twice daily after meals for 5 days"
    /// </summary>
    [MaxLength(500)]
    [Column("dosage_instructions")]
    public string? DosageInstructions { get; set; }

    [Column("quantity")]
    public int Quantity { get; set; } = 1;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("AppointmentId")]
    public Appointment Appointment { get; set; } = null!;

    [ForeignKey("MedicineId")]
    public Medicine? Medicine { get; set; }
}
