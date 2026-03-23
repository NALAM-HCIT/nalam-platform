import { api } from './api';

// ─── Types ──────────────────────────────────────────

export interface PharmacyDashboardStats {
    date: string;
    stats: {
        pending: number;
        dispensed: number;
        rejected: number;
        total: number;
    };
}

export interface PrescriptionItem {
    id: string;
    bookingReference: string;
    patientName: string;
    patientInitials: string;
    patientMobile: string;
    doctorName: string;
    doctorSpecialty: string;
    time: string;
    consultationType: string;
    prescriptionNotes: string;
    prescriptionStatus: string; // pending, dispensed, rejected
    appointmentStatus: string;
    updatedAt: string;
}

// ─── Service ────────────────────────────────────────

export const pharmacistService = {
    /**
     * GET /api/pharmacy/dashboard — today's prescription stats
     */
    getDashboard: async (): Promise<PharmacyDashboardStats> => {
        const res = await api.get('/pharmacy/dashboard');
        return res.data;
    },

    /**
     * GET /api/pharmacy/prescriptions — today's prescription queue
     * @param status optional filter: pending, dispensed, rejected
     * @param search optional search by patient/doctor/reference
     */
    getPrescriptions: async (status?: string, search?: string): Promise<PrescriptionItem[]> => {
        const params: Record<string, string> = {};
        if (status) params.status = status;
        if (search) params.search = search;
        const res = await api.get('/pharmacy/prescriptions', { params });
        return res.data;
    },

    /**
     * PATCH /api/pharmacy/prescriptions/{id}/dispense — mark prescription dispensed
     */
    dispensePrescription: async (appointmentId: string): Promise<void> => {
        await api.patch(`/pharmacy/prescriptions/${appointmentId}/dispense`);
    },

    /**
     * PATCH /api/pharmacy/prescriptions/{id}/reject — reject prescription
     */
    rejectPrescription: async (appointmentId: string, reason?: string): Promise<void> => {
        await api.patch(`/pharmacy/prescriptions/${appointmentId}/reject`, null, {
            params: reason ? { reason } : undefined
        });
    },
};
