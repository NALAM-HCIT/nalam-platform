import { api } from './api';

// ─── Types ──────────────────────────────────────────

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

export interface PrescriptionDetail {
    id: string;
    bookingReference: string;
    scheduleDate: string;
    time: string;
    consultationType: string;
    prescriptionNotes: string | null;
    prescriptionStatus: string;
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
};
