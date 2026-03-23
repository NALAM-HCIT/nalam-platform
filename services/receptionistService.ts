import { api } from './api';

export interface ReceptionDashboardStats {
    date: string;
    stats: {
        total: number;
        waiting: number;
        in_consultation: number;
        completed: number;
        upcoming: number;
    };
}

export interface QueuePatient {
    id: string;
    bookingReference: string;
    patientName: string;
    patientInitials: string;
    patientMobile: string;
    doctorName: string;
    time: string;
    type: string;
    status: string;
    paymentStatus: string;
}

export interface PatientSearchResult {
    id: string;
    fullName: string;
    mobileNumber: string;
    initials: string;
}

export const receptionistService = {
    getDashboard: async (): Promise<ReceptionDashboardStats> => {
        const response = await api.get('/reception/dashboard');
        return response.data;
    },

    getQueue: async (status?: string, search?: string): Promise<QueuePatient[]> => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (search) params.append('search', search);

        const response = await api.get(`/reception/queue?${params.toString()}`);
        return response.data;
    },

    searchPatients: async (query?: string): Promise<PatientSearchResult[]> => {
        const params = new URLSearchParams();
        if (query) params.append('query', query);

        const response = await api.get(`/reception/patients?${params.toString()}`);
        return response.data;
    },

    registerWalkIn: async (fullName: string, mobileNumber: string): Promise<PatientSearchResult> => {
        const response = await api.post('/reception/patients', { fullName, mobileNumber });
        return response.data;
    },

    checkInPatient: async (appointmentId: string): Promise<void> => {
        await api.patch(`/appointments/${appointmentId}/status`, { status: 'arrived' });
    }
};
