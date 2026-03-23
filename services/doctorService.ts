import { api } from './api';

// ── Types ────────────────────────────────────────────────

export interface DoctorAppointment {
  id: string;
  bookingReference: string;
  doctorName: string;
  doctorInitials: string;
  specialty: string;
  scheduleDate: string;   // yyyy-MM-dd
  startTime: string;      // HH:mm
  endTime: string;        // HH:mm
  consultationType: string;
  status: string;
  consultationFee: number;
  totalAmount: number;
  paymentStatus: string;
  location: string | null;
  cancelReason: string | null;
  createdAt: string;
  patientName: string | null;
  patientInitials: string | null;
  patientId: string | null;
}

export interface AppointmentListResponse {
  total: number;
  page: number;
  pageSize: number;
  appointments: DoctorAppointment[];
}

// ── API Functions ────────────────────────────────────────

/** Get today's appointments for the logged-in doctor */
export async function getTodayAppointments(): Promise<AppointmentListResponse> {
  const res = await api.get('/appointments', {
    params: { date: 'today', pageSize: 50 },
  });
  return res.data;
}

/** Get upcoming appointments for the logged-in doctor */
export async function getUpcomingAppointments(page = 1): Promise<AppointmentListResponse> {
  const res = await api.get('/appointments', {
    params: { tab: 'upcoming', page, pageSize: 20 },
  });
  return res.data;
}

/** Get past appointments for the logged-in doctor */
export async function getPastAppointments(page = 1): Promise<AppointmentListResponse> {
  const res = await api.get('/appointments', {
    params: { tab: 'past', page, pageSize: 20 },
  });
  return res.data;
}

/** Change appointment status (doctor/staff only) */
export async function changeAppointmentStatus(
  appointmentId: string,
  status: string,
): Promise<DoctorAppointment> {
  const res = await api.patch(`/appointments/${appointmentId}/status`, { status });
  return res.data;
}

/** Get a single appointment by ID */
export async function getAppointmentDetail(id: string): Promise<DoctorAppointment> {
  const res = await api.get(`/appointments/${id}`);
  return res.data;
}
