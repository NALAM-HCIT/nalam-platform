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
        qualification: string | null;
        mciRegistration: string | null;
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
    hospitalName: string | null;
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

    /**
     * PUT /api/doctor-portal/my-profile — update doctor's own profile
     */
    updateMyProfile: async (payload: UpdateDoctorProfilePayload): Promise<void> => {
        await api.put('/doctor-portal/my-profile', payload);
    },
};

export interface UpdateDoctorProfilePayload {
    fullName?: string;
    email?: string;
    department?: string;
    specialty?: string;
    experienceYears?: number;
    bio?: string;
    languages?: string;
    qualification?: string;
    mciRegistration?: string;
}

// ─── Medicine Catalog ────────────────────────────────────────

export interface MedicineCatalogItem {
    id: string;
    name: string;
    genericName: string | null;
    category: string;
    dosageForm: string;
    strength: string | null;
    manufacturer: string | null;
    price: number;
    packSize: string | null;
    stockQuantity: number;
    requiresPrescription: boolean;
}

// ─── Prescription Items ────────────────────────────────────────

export interface PrescriptionItem {
    id: string;
    medicineId: string | null;
    medicineName: string;
    dosageInstructions: string | null;
    quantity: number;
    createdAt: string;
}

export interface AddPrescriptionItemPayload {
    medicineId?: string | null;
    medicineName: string;
    dosageInstructions?: string;
    quantity: number;
}

export interface FinalizeConsultationPayload {
    chiefComplaint?: string;
    observations?: string;
    diagnosis?: string;
    items?: AddPrescriptionItemPayload[];
}

// ─── Additional service methods ─────────────────────────────

export const medicineService = {
    /**
     * GET /api/medicines?search=&category=&page=&pageSize=
     * Accessible to all authenticated users (patients, doctors, pharmacists).
     */
    search: async (params?: {
        search?: string;
        category?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{ total: number; page: number; pageSize: number; medicines: MedicineCatalogItem[] }> => {
        const res = await api.get('/medicines', { params });
        return res.data;
    },
};

export const prescriptionItemService = {
    /**
     * GET /api/doctor-portal/prescriptions/{appointmentId}/items
     */
    getItems: async (appointmentId: string): Promise<PrescriptionItem[]> => {
        const res = await api.get(`/doctor-portal/prescriptions/${appointmentId}/items`);
        return res.data;
    },

    /**
     * POST /api/doctor-portal/prescriptions/{appointmentId}/items
     */
    addItem: async (appointmentId: string, payload: AddPrescriptionItemPayload): Promise<PrescriptionItem> => {
        const res = await api.post(`/doctor-portal/prescriptions/${appointmentId}/items`, payload);
        return res.data;
    },

    /**
     * DELETE /api/doctor-portal/prescriptions/{appointmentId}/items/{itemId}
     */
    deleteItem: async (appointmentId: string, itemId: string): Promise<void> => {
        await api.delete(`/doctor-portal/prescriptions/${appointmentId}/items/${itemId}`);
    },

    /**
     * POST /api/appointments/{id}/finalize
     * Finalize consultation: saves notes + creates prescription items in one shot.
     */
    finalize: async (appointmentId: string, payload: FinalizeConsultationPayload): Promise<{
        id: string;
        status: string;
        prescriptionStatus: string | null;
        notes: string | null;
    }> => {
        const res = await api.post(`/appointments/${appointmentId}/finalize`, payload);
        return res.data;
    },
};
