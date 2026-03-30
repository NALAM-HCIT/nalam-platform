using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

/// <summary>
/// Paired wearable device (Apple Watch, Fitbit, etc.) for live health data sync.
/// </summary>
[Table("patient_wearable_devices")]
public class PatientWearableDevice
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

    [Required, MaxLength(50)]
    [Column("device_type")]
    public string DeviceType { get; set; } = "apple_watch"; // apple_watch, fitbit, garmin, etc.

    [MaxLength(200)]
    [Column("device_name")]
    public string? DeviceName { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;

    [Column("last_synced_at")]
    public DateTime? LastSyncedAt { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("PatientId")]
    public Patient Patient { get; set; } = null!;
}

/// <summary>
/// Live vitals synced from wearable device.
/// </summary>
[Table("wearable_vitals")]
public class WearableVital
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("patient_id")]
    public Guid PatientId { get; set; }

    [Required]
    [Column("device_id")]
    public Guid DeviceId { get; set; }

    [Column("heart_rate")]
    public int? HeartRate { get; set; }

    [Column("spo2")]
    public int? Spo2 { get; set; }

    [Column("recorded_at")]
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("PatientId")]
    public Patient Patient { get; set; } = null!;

    [ForeignKey("DeviceId")]
    public PatientWearableDevice Device { get; set; } = null!;
}
