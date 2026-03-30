import { api } from './api';

// ─── Types ──────────────────────────────────────────

export interface PatientProfile {
    id: string;
    fullName: string;
    mobileNumber: string;
    email: string | null;
    profilePhotoUrl: string | null;
    bloodGroup: string | null;
    dateOfBirth: string | null;   // "YYYY-MM-DD"
    gender: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelation: string | null;
    insuranceProvider: string | null;
    insurancePolicyNumber: string | null;
    hospitalId: string;
    hospitalName: string;
}

export interface UpdatePatientProfileRequest {
    fullName?: string;
    email?: string;
    profilePhotoUrl?: string;
    bloodGroup?: string;
    dateOfBirth?: string;   // "YYYY-MM-DD"
    gender?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
}

export interface ConsultationItem {
    id: string;
    bookingReference: string;
    doctorName: string;
    doctorInitials: string;
    specialty: string;
    scheduleDate: string;
    time: string;
    consultationType: string;
    notes: string | null;
    prescriptionStatus: string | null;
    hasPrescription: boolean;
}

export interface ConsultationHistoryResponse {
    total: number;
    page: number;
    pageSize: number;
    consultations: ConsultationItem[];
}

export interface PatientPrescription {
    id: string;
    bookingReference: string;
    doctorName: string;
    doctorInitials: string;
    specialty: string;
    scheduleDate: string;
    time: string;
    consultationType: string;
    prescriptionNotes: string | null;
    prescriptionStatus: string;
}

export interface PrescriptionLineItem {
    id: string;
    medicineName: string;
    dosageInstructions: string | null;
    quantity: number;
}

export interface PrescriptionDetail {
    id: string;
    bookingReference: string;
    scheduleDate: string;
    time: string;
    consultationType: string;
    prescriptionNotes: string | null;
    prescriptionStatus: string;
    prescriptionItems: PrescriptionLineItem[];
    doctor: {
        name: string;
        specialty: string;
        bio: string | null;
        languages: string | null;
    };
    patient: {
        name: string;
        mobile: string;
    };
    hospital: {
        name: string;
        address: string;
    };
}

export interface ProfileStats {
    totalVisits: number;
    activeRx: number;
    totalAppointments: number;
}

export interface PatientNotification {
    id: string;
    type: 'appointment' | 'prescription_ready' | 'prescription_pending' | 'consultation_summary';
    title: string;
    body: string;
    timestamp: string;  // ISO 8601
    read: boolean;
}

export interface CarePlan {
    upcomingAppointment: {
        id: string;
        doctorName: string;
        specialty: string;
        scheduleDate: string;   // "YYYY-MM-DD"
        startTime: string;      // "HH:mm"
        consultationType: string;
    } | null;
    prescriptionNotes: {
        appointmentId: string;
        date: string;
        doctorName: string;
        specialty: string;
        notes: string;
    }[];
    activePrescriptionCount: number;
}

// ─── Service ────────────────────────────────────────

export const patientService = {
    /**
     * GET /api/patient/consultation-history — paginated completed consultations
     */
    getConsultationHistory: async (page = 1, pageSize = 20): Promise<ConsultationHistoryResponse> => {
        const res = await api.get('/patient/consultation-history', {
            params: { page, pageSize },
        });
        return res.data;
    },

    /**
     * GET /api/patient/prescriptions — all prescriptions for this patient
     */
    getPrescriptions: async (): Promise<PatientPrescription[]> => {
        const res = await api.get('/patient/prescriptions');
        return res.data;
    },

    /**
     * GET /api/patient/prescriptions/{appointmentId} — detailed prescription view
     */
    getPrescriptionDetail: async (appointmentId: string): Promise<PrescriptionDetail> => {
        const res = await api.get(`/patient/prescriptions/${appointmentId}`);
        return res.data;
    },

    /**
     * GET /api/patient/profile-stats — quick stats for profile page
     */
    getProfileStats: async (): Promise<ProfileStats> => {
        const res = await api.get('/patient/profile-stats');
        return res.data;
    },

    /**
     * GET /api/patient/profile — full patient profile
     */
    getProfile: async (): Promise<PatientProfile> => {
        const res = await api.get('/patient/profile');
        return res.data;
    },

    /**
     * PUT /api/patient/profile — update patient profile (partial updates supported)
     */
    updateProfile: async (data: UpdatePatientProfileRequest): Promise<PatientProfile> => {
        const res = await api.put('/patient/profile', data);
        return res.data;
    },

    /**
     * GET /api/patient/care-plan — today's care plan (upcoming appt + recent Rx notes)
     */
    getCarePlan: async (): Promise<CarePlan> => {
        const res = await api.get('/patient/care-plan');
        return res.data;
    },

    /**
     * GET /api/patient/notifications — derived notifications from appointments/prescriptions
     */
    getNotifications: async (): Promise<PatientNotification[]> => {
        const res = await api.get('/patient/notifications');
        return res.data;
    },
};
