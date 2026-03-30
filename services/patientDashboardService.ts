import { api } from './api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TodayMood {
  id: string;
  log_date: string;
  mood_score: number;
  mood_label: string;
  mood_note: string | null;
  logged_at: string;
}

export interface WaterEntry {
  id: string;
  amount_ml: number;
  logged_at: string;
}

export interface WaterSettings {
  daily_goal_ml: number;
  reminder_enabled: boolean;
  reminder_interval_h: number;
  reminder_start_time: string;
  reminder_end_time: string;
  today_total_ml: number;
  progress_pct: number;
  today_entries: WaterEntry[];
}

export interface UpdateWaterSettingsRequest {
  daily_goal_ml?: number;
  reminder_enabled?: boolean;
  reminder_interval_h?: number;
  reminder_start_time?: string;
  reminder_end_time?: string;
}

export interface WaterLogResult {
  today_total_ml: number;
  goal_ml: number;
  progress_pct: number;
}

export interface PhysioSession {
  id: string;
  activity_name: string;
  duration_min: number;
  sets: number | null;
  reps: number | null;
  pain_level: number | null;
  notes: string | null;
  performed_at: string;
}

export interface TodayPhysio {
  log_date: string;
  total_sessions: number;
  total_min: number;
  sessions: PhysioSession[];
}

export interface LogPhysioRequest {
  activity_name: string;
  duration_min: number;
  sets?: number;
  reps?: number;
  pain_level?: number;
  notes?: string;
}

export interface PhysioActivitySummary {
  activity_name: string;
  sessions: number;
  total_min: number;
}

export interface PhysioDaySummary {
  log_date: string;
  sessions: number;
  total_min: number;
  avg_pain: number | null;
}

export interface PhysioReport {
  period: { from: string; to: string };
  total_sessions: number;
  total_duration_min: number;
  avg_pain_level: number | null;
  days_active: number;
  by_activity: PhysioActivitySummary[];
  daily_summary: PhysioDaySummary[];
}

export interface LatestVitals {
  id: string;
  recorded_at: string;
  log_date: string;
  bp: string | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  temperature_c: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  blood_glucose: number | null;
  source: string;
}

export interface VitalsTrendPoint {
  log_date: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  heart_rate: number | null;
  temperature_c: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  weight_kg: number | null;
  blood_glucose: number | null;
}

export interface VitalsTrendResponse {
  period_days: number;
  data_points: number;
  data: VitalsTrendPoint[];
}

export interface LogVitalsRequest {
  bp_systolic?: number;
  bp_diastolic?: number;
  heart_rate?: number;
  temperature_c?: number;
  spo2?: number;
  respiratory_rate?: number;
  weight_kg?: number;
  height_cm?: number;
  blood_glucose?: number;
}

export interface HealthTip {
  id: string;
  title: string;
  body: string;
  category: string;
  icon_name: string | null;
  is_global: boolean;
}

export interface CareTaskLog {
  task_id: string;
  task_title: string;
  status: 'completed' | 'snoozed' | 'skipped';
  completed_at: string;
}

export interface TodayCareTasksResponse {
  log_date: string;
  tasks: CareTaskLog[];
}

export interface CustomTask {
  id: string;
  title: string;
  category: string;
  time_of_day: string;
  notes: string | null;
  created_at: string;
}

export interface CreateCustomTaskRequest {
  title: string;
  category: string;
  time_of_day: string;
  notes?: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────

// ── Care Tasks ───────────────────────────────────────────────────────────────

export async function getTodayCareTasks(): Promise<CareTaskLog[]> {
  const res = await api.get('/patient/care-tasks/today');
  return res.data.tasks ?? [];
}

export async function logCareTaskComplete(
  task_id: string,
  task_title: string,
  status: 'completed' | 'snoozed' | 'skipped' = 'completed',
): Promise<void> {
  await api.post('/patient/care-tasks/complete', { task_id, task_title, status });
}

// ── Custom Tasks ─────────────────────────────────────────────────────────────

export async function getCustomTasks(): Promise<CustomTask[]> {
  const res = await api.get('/patient/custom-tasks');
  return res.data.tasks ?? [];
}

export async function createCustomTask(data: CreateCustomTaskRequest): Promise<CustomTask> {
  const res = await api.post('/patient/custom-tasks', data);
  return res.data;
}

export async function deleteCustomTask(id: string): Promise<void> {
  await api.delete(`/patient/custom-tasks/${id}`);
}

// ── Mood ────────────────────────────────────────────────────────────────────

export async function logMood(data: {
  mood_score: number;
  mood_label: string;
  mood_note?: string;
}): Promise<TodayMood> {
  const res = await api.post('/patient/mood', data);
  return res.data;
}

/**
 * Returns null if the patient hasn't logged a mood today (204 No Content).
 * Note: Axios resolves on all 2xx — check res.status directly instead of catch.
 */
export async function getTodayMood(): Promise<TodayMood | null> {
  const res = await api.get('/patient/mood/today');
  if (res.status === 204 || !res.data) return null;
  return res.data;
}

// ── Water ────────────────────────────────────────────────────────────────────

export async function getWaterSettings(): Promise<WaterSettings> {
  const res = await api.get('/patient/water/settings');
  return res.data;
}

export async function updateWaterSettings(data: UpdateWaterSettingsRequest): Promise<void> {
  await api.put('/patient/water/settings', data);
}

export async function logWaterIntake(amount_ml: number): Promise<WaterLogResult> {
  const res = await api.post('/patient/water/log', { amount_ml });
  return res.data;
}

export async function deleteWaterLog(id: string): Promise<WaterLogResult> {
  const res = await api.delete(`/patient/water/log/${id}`);
  return res.data;
}

// ── Physio ───────────────────────────────────────────────────────────────────

export async function logPhysio(data: LogPhysioRequest): Promise<PhysioSession> {
  const res = await api.post('/patient/physio', data);
  return res.data;
}

export async function getTodayPhysio(): Promise<TodayPhysio> {
  const res = await api.get('/patient/physio/today');
  return res.data;
}

export async function getPhysioReport(from: string, to: string): Promise<PhysioReport> {
  const res = await api.get(`/patient/physio/report?from=${from}&to=${to}`);
  return res.data;
}

// ── Vitals ───────────────────────────────────────────────────────────────────

export async function logVitals(data: LogVitalsRequest): Promise<{ id: string; recorded_at: string }> {
  const res = await api.post('/patient/vitals', data);
  return res.data;
}

/**
 * Returns null if no vitals have been recorded yet (204 No Content).
 * Note: Axios resolves on all 2xx — check res.status directly instead of catch.
 */
export async function getLatestVitals(): Promise<LatestVitals | null> {
  const res = await api.get('/patient/vitals/latest');
  if (res.status === 204 || !res.data) return null;
  return res.data;
}

export async function getVitalsTrend(): Promise<VitalsTrendResponse> {
  const res = await api.get('/patient/vitals/trend');
  return res.data;
}

// ── Health Tips ──────────────────────────────────────────────────────────────

export async function getHealthTips(category?: string, limit = 5): Promise<HealthTip[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (category) params.append('category', category);
  const res = await api.get(`/patient/health-tips?${params.toString()}`);
  return res.data.tips ?? [];
}
