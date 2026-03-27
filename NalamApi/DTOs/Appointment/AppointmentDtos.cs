namespace NalamApi.DTOs.Appointment;

// ── Doctor Listing (for patient browsing) ──────────────────

public record DoctorListItem(
    Guid DoctorProfileId,
    Guid UserId,
    string FullName,
    string Initials,
    string Specialty,
    string? Department,
    int ExperienceYears,
    decimal ConsultationFee,
    bool AvailableForVideo,
    bool AvailableForInPerson,
    string? Languages,
    decimal? Rating,
    int ReviewCount,
    string? ProfilePhotoUrl,
    bool IsAcceptingAppointments
);

// ── Doctor Availability ────────────────────────────────────

public record AvailableDateResponse(
    DateOnly Date,
    string DayName,
    int AvailableSlots
);

public record AvailableSlotResponse(
    string StartTime,
    string EndTime,
    bool IsAvailable,
    int BookedCount,
    int MaxCapacity
);

public record SlotGroupResponse(
    string Period,
    string Icon,
    string Color,
    List<AvailableSlotResponse> Slots
);

public record DoctorAvailabilityResponse(
    Guid DoctorProfileId,
    string DoctorName,
    List<AvailableDateResponse> Dates,
    List<SlotGroupResponse> SlotGroups
);

// ── Booking ────────────────────────────────────────────────

public record CreateAppointmentRequest(
    Guid DoctorProfileId,
    string ScheduleDate,      // "2026-03-24"
    string StartTime,         // "10:00"
    string ConsultationType,  // "video" or "in-person"
    string? PaymentMethod,
    string? CouponCode,
    string? Notes
);

public record AppointmentResponse(
    Guid Id,
    string BookingReference,
    string DoctorName,
    string DoctorInitials,
    string Specialty,
    string ScheduleDate,
    string StartTime,
    string EndTime,
    string ConsultationType,
    string Status,
    decimal ConsultationFee,
    decimal TaxAmount,
    decimal PlatformFee,
    decimal DiscountAmount,
    decimal TotalAmount,
    string? PaymentMethod,
    string PaymentStatus,
    string? CouponCode,
    string? Location,
    decimal? DoctorRating,
    int? DoctorExperience,
    string? CancelReason,
    DateTime CreatedAt,
    string? PatientName = null,
    string? PatientInitials = null,
    Guid? PatientId = null,
    Guid? DoctorProfileId = null
);

// ── Update / Cancel ────────────────────────────────────────

public record UpdateAppointmentRequest(
    string? ScheduleDate,
    string? StartTime,
    string? ConsultationType
);

public record CancelAppointmentRequest(
    string? Reason
);

// ── List ───────────────────────────────────────────────────

public record AppointmentListResponse(
    int Total,
    int Page,
    int PageSize,
    List<AppointmentResponse> Appointments
);
