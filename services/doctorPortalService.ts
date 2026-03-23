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
};
