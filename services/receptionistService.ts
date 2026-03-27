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

export interface AppointmentDetail {
    id: string;
    bookingReference: string;
    patientName: string;
    patientId: string;
    patientInitials: string;
    patientMobile: string;
    patientAge: number | null;
    patientGender: string | null;
    insuranceProvider: string | null;
    doctorName: string;
    doctorSpecialty: string;
    scheduledTime: string;
    consultationType: string;
    notes: string | null;
    status: string;
    paymentStatus: string;
}

export interface ReceptionistProfile {
    id: string;
    fullName: string;
    mobileNumber: string;
    email: string | null;
    department: string;
    employeeId: string;
    joinDate: string;
}

export interface ReceptionistStats {
    registeredToday: number;
    appointmentsToday: number;
    walkInsToday: number;
    pendingCheckIns: number;
}

export interface DoctorItem {
    id: string;
    name: string;
    specialty: string;
    consultationFee: number;
    availableForInPerson: boolean;
    availableForVideo: boolean;
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

    getAppointmentDetail: async (id: string): Promise<AppointmentDetail> => {
        const response = await api.get(`/reception/appointments/${id}`);
        return response.data;
    },

    checkIn: async (id: string): Promise<void> => {
        await api.patch(`/reception/appointments/${id}/checkin`);
    },

    sendToDoctor: async (id: string): Promise<void> => {
        await api.patch(`/reception/appointments/${id}/in-consultation`);
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

    getProfile: async (): Promise<ReceptionistProfile> => {
        const response = await api.get('/reception/profile');
        return response.data;
    },

    updateProfile: async (data: { email?: string; department?: string }): Promise<void> => {
        await api.patch('/reception/profile', data);
    },

    getStats: async (): Promise<ReceptionistStats> => {
        const response = await api.get('/reception/stats');
        return response.data;
    },

    getDoctors: async (): Promise<DoctorItem[]> => {
        const response = await api.get('/reception/doctors');
        return response.data;
    },

    bookAppointment: async (data: {
        patientId: string;
        doctorProfileId: string;
        scheduleDate: string;
        startTime: string;
        consultationType?: string;
        notes?: string;
    }): Promise<{ bookingReference: string }> => {
        const response = await api.post('/reception/book-appointment', data);
        return response.data;
    },
};
