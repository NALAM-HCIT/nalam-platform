using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("appointments")]
public class Appointment
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

    [Required]
    [Column("doctor_profile_id")]
    public Guid DoctorProfileId { get; set; }

    [Column("schedule_date")]
    public DateOnly ScheduleDate { get; set; }

    [Column("start_time")]
    public TimeOnly StartTime { get; set; }

    [Column("end_time")]
    public TimeOnly EndTime { get; set; }

    [Required, MaxLength(20)]
    [Column("consultation_type")]
    public string ConsultationType { get; set; } = "video"; // video, in-person

    [Required, MaxLength(20)]
    [Column("status")]
    public string Status { get; set; } = "pending"; // pending, confirmed, arrived, in_consultation, completed, cancelled, no_show

    [Column("consultation_fee")]
    public decimal ConsultationFee { get; set; }

    [Column("tax_amount")]
    public decimal TaxAmount { get; set; }

    [Column("platform_fee")]
    public decimal PlatformFee { get; set; }

    [Column("discount_amount")]
    public decimal DiscountAmount { get; set; }

    [Column("total_amount")]
    public decimal TotalAmount { get; set; }

    [MaxLength(50)]
    [Column("coupon_code")]
    public string? CouponCode { get; set; }

    [MaxLength(30)]
    [Column("payment_method")]
    public string? PaymentMethod { get; set; }

    [Required, MaxLength(20)]
    [Column("payment_status")]
    public string PaymentStatus { get; set; } = "pending"; // pending, paid, refunded

    [Required, MaxLength(50)]
    [Column("booking_reference")]
    public string BookingReference { get; set; } = string.Empty;

    [MaxLength(200)]
    [Column("cancel_reason")]
    public string? CancelReason { get; set; }

    [Column("cancelled_at")]
    public DateTime? CancelledAt { get; set; }

    [Column("cancelled_by")]
    public Guid? CancelledBy { get; set; }

    [MaxLength(500)]
    [Column("notes")]
    public string? Notes { get; set; }

    /// <summary>
    /// Tracks prescription dispensing: null (no prescription), pending, dispensed, rejected.
    /// Set to "pending" when doctor completes consultation with prescription notes.
    /// </summary>
    [MaxLength(20)]
    [Column("prescription_status")]
    public string? PrescriptionStatus { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("PatientId")]
    public Patient Patient { get; set; } = null!;

    [ForeignKey("DoctorProfileId")]
    public DoctorProfile DoctorProfile { get; set; } = null!;
}
