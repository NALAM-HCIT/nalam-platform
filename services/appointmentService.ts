import { api } from './api';

// ── Types ──────────────────────────────────────────────────

export interface DoctorListItem {
  doctorProfileId: string;
  userId: string;
  fullName: string;
  initials: string;
  specialty: string;
  department: string | null;
  experienceYears: number;
  consultationFee: number;
  availableForVideo: boolean;
  availableForInPerson: boolean;
  languages: string | null;
  rating: number | null;
  reviewCount: number;
  profilePhotoUrl: string | null;
  isAcceptingAppointments: boolean;
}

export interface DoctorsResponse {
  total: number;
  page: number;
  pageSize: number;
  doctors: DoctorListItem[];
}

export interface AvailableDate {
  date: string;
  dayName: string;
  availableSlots: number;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookedCount: number;
  maxCapacity: number;
}

export interface SlotGroup {
  period: string;
  icon: string;
  color: string;
  slots: AvailableSlot[];
}

export interface DoctorAvailability {
  doctorProfileId: string;
  doctorName: string;
  dates: AvailableDate[];
  slotGroups: SlotGroup[];
}

export interface AppointmentResponse {
  id: string;
  bookingReference: string;
  doctorName: string;
  doctorInitials: string;
  specialty: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  consultationType: string;
  status: string;
  consultationFee: number;
  taxAmount: number;
  platformFee: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  paymentStatus: string;
  couponCode: string | null;
  location: string | null;
  doctorRating: number | null;
  doctorExperience: number | null;
  cancelReason: string | null;
  createdAt: string;
  doctorProfileId: string | null;
}

export interface AppointmentListResponse {
  total: number;
  page: number;
  pageSize: number;
  appointments: AppointmentResponse[];
}

// ── API Calls ──────────────────────────────────────────────

export async function getDoctors(params?: {
  specialty?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<DoctorsResponse> {
  const { data } = await api.get('/appointments/doctors', { params });
  return data;
}

export async function getDoctorAvailability(
  doctorProfileId: string,
  startDate?: string,
  days?: number
): Promise<DoctorAvailability> {
  const { data } = await api.get(
    `/appointments/doctors/${doctorProfileId}/availability`,
    { params: { startDate, days } }
  );
  return data;
}

export async function createAppointment(request: {
  doctorProfileId: string;
  scheduleDate: string;
  startTime: string;
  consultationType: string;
  paymentMethod?: string;
  couponCode?: string;
  notes?: string;
}): Promise<AppointmentResponse> {
  const { data } = await api.post('/appointments', request);
  return data;
}

export async function getAppointments(params?: {
  tab?: 'upcoming' | 'past';
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<AppointmentListResponse> {
  const { data } = await api.get('/appointments', { params });
  return data;
}

export async function getAppointment(id: string): Promise<AppointmentResponse> {
  const { data } = await api.get(`/appointments/${id}`);
  return data;
}

export async function updateAppointment(
  id: string,
  request: {
    scheduleDate?: string;
    startTime?: string;
    consultationType?: string;
  }
): Promise<AppointmentResponse> {
  const { data } = await api.put(`/appointments/${id}`, request);
  return data;
}

export async function cancelAppointment(
  id: string,
  reason?: string
): Promise<AppointmentResponse> {
  const { data } = await api.patch(`/appointments/${id}/cancel`, { reason });
  return data;
}
