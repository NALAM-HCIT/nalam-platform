import { api } from './api';

// ─── Types ──────────────────────────────────────────

export interface DirectoryMember {
    id: string;
    name: string;
    initials: string;
    role: string;
    department: string | null;
    phone: string;
    email: string | null;
}

export interface DirectoryGroup {
    role: string;
    memberCount: number;
    members: DirectoryMember[];
}

export interface DoctorMyProfile {
    user: {
        id: string;
        name: string;
        initials: string;
        phone: string;
        email: string | null;
        role: string;
        department: string | null;
        employeeId: string | null;
    };
    doctorProfile: {
        specialty: string;
        experienceYears: number;
        consultationFee: number;
        rating: number | null;
        reviewCount: number;
        bio: string | null;
        languages: string | null;
        availableForVideo: boolean;
        availableForInPerson: boolean;
    } | null;
    stats: {
        totalConsults: number;
        totalAppointments: number;
        activePatients: number;
        rating: number;
        reviewCount: number;
    };
}

export interface PatientAppointment {
    id: string;
    scheduleDate: string;
    time: string;
    consultationType: string;
    status: string;
    notes: string | null;
    prescriptionStatus: string | null;
    doctorName: string;
    specialty: string;
}

export interface PatientSummary {
    patient: {
        id: string;
        name: string;
        initials: string;
        phone: string;
        email: string | null;
        role: string;
    };
    totalVisits: number;
    recentAppointments: PatientAppointment[];
}

export interface DoctorScheduleItem {
    id: string;
    dayOfWeek: number;        // 0=Sun … 6=Sat
    startTime: string;        // "HH:mm"
    endTime: string;          // "HH:mm"
    slotDurationMinutes: number;
    consultationType: 'video' | 'in-person' | 'both';
    maxPatientsPerSlot: number;
}

export interface AddSchedulePayload {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    consultationType: string;
    maxPatientsPerSlot: number;
}

export interface UpdateSchedulePayload {
    startTime?: string;
    endTime?: string;
    slotDurationMinutes?: number;
    consultationType?: string;
    maxPatientsPerSlot?: number;
}

// ─── Service ────────────────────────────────────────

export const doctorPortalService = {
    /**
     * GET /api/doctor-portal/directory — hospital staff grouped by role
     */
    getDirectory: async (search?: string): Promise<DirectoryGroup[]> => {
        const res = await api.get('/doctor-portal/directory', {
            params: search ? { search } : {},
        });
        return res.data;
    },

    /**
     * GET /api/doctor-portal/my-profile — doctor's own profile + stats
     */
    getMyProfile: async (): Promise<DoctorMyProfile> => {
        const res = await api.get('/doctor-portal/my-profile');
        return res.data;
    },

    /**
     * GET /api/doctor-portal/patient-summary/{patientId} — patient summary
     */
    getPatientSummary: async (patientId: string): Promise<PatientSummary> => {
        const res = await api.get(`/doctor-portal/patient-summary/${patientId}`);
        return res.data;
    },

    /**
     * GET /api/doctor-portal/my-schedule — doctor's active weekly schedule
     */
    getMySchedule: async (): Promise<DoctorScheduleItem[]> => {
        const res = await api.get('/doctor-portal/my-schedule');
        return res.data;
    },

    /**
     * POST /api/doctor-portal/my-schedule — add a schedule block
     */
    addSchedule: async (payload: AddSchedulePayload): Promise<DoctorScheduleItem> => {
        const res = await api.post('/doctor-portal/my-schedule', payload);
        return res.data;
    },

    /**
     * PUT /api/doctor-portal/my-schedule/{id} — update a schedule block
     */
    updateSchedule: async (id: string, payload: UpdateSchedulePayload): Promise<DoctorScheduleItem> => {
        const res = await api.put(`/doctor-portal/my-schedule/${id}`, payload);
        return res.data;
    },

    /**
     * DELETE /api/doctor-portal/my-schedule/{id} — soft-delete a schedule block
     */
    deleteSchedule: async (id: string): Promise<void> => {
        await api.delete(`/doctor-portal/my-schedule/${id}`);
    },
};
