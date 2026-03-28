using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NalamApi.Entities;

[Table("hospital_messages")]
public class HospitalMessage
{
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [Column("hospital_id")]
    public Guid HospitalId { get; set; }

    [Required]
    [Column("sender_id")]
    public Guid SenderId { get; set; }

    [Required]
    [Column("recipient_id")]
    public Guid RecipientId { get; set; }

    [Required, MaxLength(2000)]
    [Column("body")]
    public string Body { get; set; } = string.Empty;

    [Column("is_read")]
    public bool IsRead { get; set; } = false;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("HospitalId")]
    public Hospital Hospital { get; set; } = null!;

    [ForeignKey("SenderId")]
    public User Sender { get; set; } = null!;

    [ForeignKey("RecipientId")]
    public User Recipient { get; set; } = null!;
}
