import { CustomAlert } from '@nalam/shared/components/CustomAlert';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Platform, PermissionsAndroid, Linking, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { patientService, ConsultationItem } from '@/services/patientService';
import { uploadService } from '@nalam/shared/services/uploadService';
import { getDocuments, saveDocument, deleteDocument, PatientDocument as ApiDocument, logVitals, logVitalsBatch, getLatestVitals, LogVitalsRequest, LatestVitals } from '@/services/patientDashboardService';
import { useAuthStore } from '@nalam/shared/stores/authStore';
import {
  Upload, Share2, Heart, Droplets, Wind, Activity,
  FileText, ChevronRight, Pill, CheckCircle2, Stethoscope,
  FolderOpen, Plus, AlertTriangle, Bluetooth, BluetoothOff, Battery, Zap,
} from 'lucide-react-native';
import * as JCV from '@/modules/jcvitals/src';

const ACCENT = { hi: '#4C7BFF', lo: '#1E3AD6' };
const INK = '#0F1C3D';
const MUTED = '#8894B3';
const CARD_BORDER = '#EEF1F7';
const SURFACE = '#F6F8FC';
const SHADOW_CARD = { shadowColor: '#0F1C3D', shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 };

const PRESCRIPTIONS = [
  { id: 'p1', med: 'Telma 40 mg', gen: 'Telmisartan', dose: '1 tablet · morning', days: 30, by: 'Dr. Anjali Mehra', on: '18 Apr', active: true, left: 22 },
  { id: 'p2', med: 'Ecosprin 75 mg', gen: 'Aspirin', dose: '1 tablet · after dinner', days: 90, by: 'Dr. Anjali Mehra', on: '18 Apr', active: true, left: 22 },
  { id: 'p3', med: 'Momate cream', gen: 'Mometasone', dose: 'Apply twice daily', days: 14, by: 'Dr. Rohit Sharma', on: '02 Mar', active: false, left: 0 },
];

const LAB_REPORTS = [
  { id: 'r1', name: 'Lipid Profile', lab: 'Thyrocare', date: '15 Apr 2026', bad: true },
  { id: 'r2', name: 'Complete Blood Count', lab: 'Metropolis', date: '15 Apr 2026', bad: false },
  { id: 'r3', name: 'ECG Report', lab: 'Lilavati Hospital', date: '18 Apr 2026', bad: false },
  { id: 'r4', name: 'Thyroid Panel', lab: 'Dr Lal PathLabs', date: '20 Dec 2025', bad: false },
];


const ALLERGIES = [
  { n: 'Penicillin', sev: 'Severe',   since: '2018', c: '#FEE2E2', fg: '#B91C1C' },
  { n: 'Peanuts',    sev: 'Moderate', since: '2015', c: '#FEF3C7', fg: '#92400E' },
  { n: 'Dust mites', sev: 'Mild',     since: '2020', c: '#DBEAFE', fg: '#1E40AF' },
];

const CONDITIONS = [
  { n: 'Hypertension', dx: 'Dec 2024', status: 'Managed' },
  { n: 'Mild eczema',  dx: 'Mar 2026', status: 'Active' },
];

const TABS = [
  { k: 'timeline',  n: 'Timeline' },
  { k: 'rx',        n: 'Prescriptions' },
  { k: 'reports',   n: 'Reports' },
  { k: 'vitals',    n: 'Vitals' },
  { k: 'allergies', n: 'Conditions' },
];


/* ─── Timeline Tab ─── */
function TimelineTab({ consultations, loading }: { consultations: ConsultationItem[]; loading: boolean }) {
  const router = useRouter();

  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60 }}>
        <ActivityIndicator color={ACCENT.lo} />
        <Text style={{ color: MUTED, fontSize: 14, marginTop: 12 }}>Loading timeline…</Text>
      </View>
    );
  }

  if (consultations.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 64 }}>
        <Stethoscope size={48} color="#E2E8F0" />
        <Text style={{ color: MUTED, fontWeight: '600', fontSize: 16, marginTop: 16 }}>No visits yet</Text>
        <Text style={{ color: '#CBD5E1', fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}>
          Your consultation history will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 30 }}>
      {consultations.map((v, i) => (
        <View key={v.id} style={{ flexDirection: 'row', gap: 12 }}>
          {/* Timeline connector */}
          <View style={{ width: 24, alignItems: 'center', paddingTop: 6 }}>
            <View style={{ width: 12, height: 12, borderRadius: 99, backgroundColor: ACCENT.lo, borderWidth: 3, borderColor: '#fff', shadowColor: CARD_BORDER, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 0 } }} />
            {i < consultations.length - 1 && (
              <View style={{ flex: 1, width: 2, backgroundColor: '#E5E9F2', marginTop: 4 }} />
            )}
          </View>

          {/* Card */}
          <View style={{ flex: 1, paddingBottom: 18 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.2, marginBottom: 6 }}>
              {(v.scheduleDate ?? '').toUpperCase()}
            </Text>
            <View style={[{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: CARD_BORDER }, SHADOW_CARD]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <LinearGradient
                  colors={[ACCENT.hi, ACCENT.lo]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                    {(v.doctorName ?? 'D').split(' ').filter(Boolean).slice(-1)[0]?.charAt(0) ?? 'D'}
                  </Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: INK }}>{v.doctorName}</Text>
                  <Text style={{ fontSize: 11, color: MUTED }}>{v.specialty}</Text>
                </View>
              </View>
              {v.notes ? (
                <Text style={{ fontSize: 12.5, color: '#4C5775', lineHeight: 18, marginBottom: 10 }}>{v.notes}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {v.hasPrescription && (
                  <Pressable
                    onPress={() => router.push({ pathname: '/digital-prescription' as any, params: { appointmentId: v.id } })}
                    style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#EEF2FF', borderRadius: 99 }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#3730A3' }}>Prescription</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/* ─── Prescriptions (Rx) Tab ─── */
function RxTab() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>('p1');

  return (
    <View style={{ padding: 16, gap: 10 }}>
      {PRESCRIPTIONS.map(p => (
        <View key={p.id} style={[{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: CARD_BORDER, overflow: 'hidden' }, SHADOW_CARD]}>
          <Pressable onPress={() => setOpen(open === p.id ? null : p.id)} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: p.active ? '#EEF2FF' : '#F1F4FA', alignItems: 'center', justifyContent: 'center' }}>
              <Pill size={22} color={p.active ? '#3730A3' : MUTED} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '800', color: INK, flex: 1 }} numberOfLines={1}>{p.med}</Text>
                <View style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, backgroundColor: p.active ? '#DCFCE7' : '#F1F4FA' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: p.active ? '#166534' : MUTED }}>
                    {p.active ? 'Active' : 'Completed'}
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 11.5, color: '#4C5775' }}>{p.gen} · {p.dose}</Text>
              {p.active && <Text style={{ fontSize: 10.5, color: MUTED, marginTop: 3 }}>{p.left} days remaining</Text>}
            </View>
          </Pressable>

          {open === p.id && (
            <View style={{ borderTopWidth: 1, borderTopColor: SURFACE, padding: 14, backgroundColor: '#FAFBFE' }}>
              <View style={{ flexDirection: 'row', gap: 20, marginBottom: 12 }}>
                {[
                  { l: 'Duration', v: `${p.days} days` },
                  { l: 'Prescribed', v: p.on },
                ].map(x => (
                  <View key={x.l}>
                    <Text style={{ fontSize: 10, color: MUTED, fontWeight: '700', letterSpacing: 1.2 }}>{x.l.toUpperCase()}</Text>
                    <Text style={{ fontSize: 12.5, fontWeight: '700', color: INK, marginTop: 2 }}>{x.v}</Text>
                  </View>
                ))}
              </View>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 10, color: MUTED, fontWeight: '700', letterSpacing: 1.2 }}>BY</Text>
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: INK, marginTop: 2 }}>{p.by}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => router.push('/(tabs)/pharmacy' as any)}
                  style={{ flex: 1, backgroundColor: ACCENT.lo, padding: 10, borderRadius: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Reorder</Text>
                </Pressable>
                <Pressable style={{ borderWidth: 1, borderColor: '#E5E9F2', backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Share2 size={14} color={INK} strokeWidth={1.8} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: INK }}>Share</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

/* ─── Reports Tab ─── */
function ReportsTab({ myUploads, docUploading, onUpload }: {
  myUploads: ApiDocument[];
  docUploading: boolean;
  onUpload: () => void;
}) {
  return (
    <View style={{ padding: 16 }}>
      {/* Upload button */}
      <Pressable
        onPress={onUpload}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
          paddingHorizontal: 14, paddingVertical: 10,
          backgroundColor: `${ACCENT.lo}10`, borderRadius: 14,
          borderWidth: 1, borderColor: `${ACCENT.lo}25`, alignSelf: 'flex-start',
        }}
      >
        {docUploading ? <ActivityIndicator size={12} color={ACCENT.lo} /> : <Plus size={14} color={ACCENT.lo} />}
        <Text style={{ fontSize: 12, fontWeight: '700', color: ACCENT.lo }}>
          {docUploading ? 'Uploading…' : 'Upload Report'}
        </Text>
      </Pressable>

      {/* 2-column report grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {LAB_REPORTS.map(r => (
          <View key={r.id} style={{ width: '47%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: CARD_BORDER }}>
            <View style={{ aspectRatio: 4 / 5, backgroundColor: '#FAFBFE', borderBottomWidth: 1, borderBottomColor: SURFACE, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <FileText size={40} color="#C8D0E0" strokeWidth={1.4} />
              {r.bad && (
                <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 99 }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#B91C1C' }}>⚠ Attention</Text>
                </View>
              )}
              <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#B91C1C' }}>PDF</Text>
              </View>
            </View>
            <View style={{ paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: INK, lineHeight: 15 }}>{r.name}</Text>
              <Text style={{ fontSize: 10.5, color: MUTED, marginTop: 3 }}>{r.lab}</Text>
              <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{r.date}</Text>
            </View>
          </View>
        ))}

        {myUploads.map(u => (
          <View key={u.id} style={{ width: '47%', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: CARD_BORDER }}>
            <View style={{ aspectRatio: 4 / 5, backgroundColor: '#FAFBFE', borderBottomWidth: 1, borderBottomColor: SURFACE, alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={40} color="#C8D0E0" strokeWidth={1.4} />
            </View>
            <View style={{ paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: INK, lineHeight: 15 }} numberOfLines={2}>{u.name}</Text>
              <Text style={{ fontSize: 10.5, color: MUTED, marginTop: 3 }}>{u.document_type.replace('_', ' ')}</Text>
              <Text style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                {new Date(u.uploaded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {LAB_REPORTS.length === 0 && myUploads.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 60 }}>
          <FolderOpen size={48} color="#E2E8F0" />
          <Text style={{ color: MUTED, fontWeight: '600', fontSize: 16, marginTop: 16 }}>No reports yet</Text>
          <Text style={{ color: '#CBD5E1', fontSize: 13, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 }}>
            Upload lab reports, prescriptions, or other documents.
          </Text>
        </View>
      )}
    </View>
  );
}

/* ─── Vitals Tab ─── */
function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type BlePhase  = 'idle' | 'scanning' | 'connecting' | 'connected';
type SyncPhase = 'idle' | 'syncing' | 'done';
type HealthStatus = 'critical' | 'caution' | 'normal' | 'unknown';

function isJCBand(name?: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  // Match: starts with J, or contains JC/JCV/2301/352c6b/nalam/health band
  return /^j|b(jc|jcv|2301|352c6b|nalam.*band|health.*band)\b/.test(lower);
}

function getHealthStatus(vital: 'hr' | 'spo2' | 'temp', value: number | null): HealthStatus {
  if (value == null) return 'unknown';
  switch (vital) {
    case 'hr':
      if (value < 40 || value > 140) return 'critical';
      if (value < 50 || value > 120) return 'caution';
      return 'normal';
    case 'spo2':
      if (value < 90) return 'critical';
      if (value < 95) return 'caution';
      return 'normal';
    case 'temp':
      if (value < 35.5 || value > 39) return 'critical';
      if (value < 36.5 || value > 38.5) return 'caution';
      return 'normal';
    default: return 'unknown';
  }
}

function getStatusColor(status: HealthStatus): { bg: string; fg: string; dot: string } {
  switch (status) {
    case 'critical': return { bg: '#FEE2E2', fg: '#B91C1C', dot: '#DC2626' };
    case 'caution':  return { bg: '#FEF3C7', fg: '#92400E', dot: '#F59E0B' };
    case 'normal':   return { bg: '#DCFCE7', fg: '#166534', dot: '#22C55E' };
    default:         return { bg: '#F1F5F9', fg: '#64748B', dot: '#94A3B8' };
  }
}

function VitalsTab() {
  const [phase, setPhase]       = useState<BlePhase>('idle');
  const [devices, setDevices]   = useState<JCV.JCVDevice[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<JCV.JCVDevice | null>(null);
  const [liveHR,   setLiveHR]   = useState<number | null>(null);
  const [liveSpO2, setLiveSpO2] = useState<number | null>(null);
  const [liveBP,   setLiveBP]   = useState<{ sbp: number; dbp: number; hrv: number } | null>(null);
  const [liveTemp, setLiveTemp] = useState<number | null>(null);
  const [battery,  setBattery]  = useState<number | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<number | null>(null);
  const [bpMeasuring, setBpMeasuring] = useState(false);
  const [tempMeasuring, setTempMeasuring] = useState(false);
  const [latestVitals, setLatestVitals] = useState<LatestVitals | null>(null);
  const [vitalsLoading, setVitalsLoading] = useState(true);
  const [syncState, setSyncState] = useState<Record<'hr' | 'spo2' | 'temp', SyncPhase>>
    ({ hr: 'idle', spo2: 'idle', temp: 'idle' });
  const [dailyStats, setDailyStats] = useState<{ hr: number[]; spo2: number[]; temp: number[] }>
    ({ hr: [], spo2: [], temp: [] });
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [wearDetected, setWearDetected] = useState(false);
  const [signalQuality, setSignalQuality] = useState(0);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staged    = useRef<{ hr?: number; sbp?: number; dbp?: number; spo2?: number; temp?: number }>({});
  const histBuf   = useRef<{ hr: LogVitalsRequest[]; spo2: LogVitalsRequest[]; temp: LogVitalsRequest[] }>
                      ({ hr: [], spo2: [], temp: [] });
  const wearQuality = useRef({ validReadings: 0, totalReadings: 0 });

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = `[${timestamp}] ${message}`;
    setDebugLogs(prev => [...prev.slice(-49), logLine]);
    console.log(logLine);
  }, []);

  const validateReading = useCallback((value: number, type: 'hr' | 'spo2' | 'temp'): boolean => {
    // Detect wear based on signal consistency
    wearQuality.current.totalReadings++;

    // Valid ranges for each vital
    const ranges: Record<string, [number, number]> = {
      hr: [40, 180],      // Heart rate 40-180 bpm
      spo2: [80, 100],    // SpO2 80-100%
      temp: [34.0, 42.0], // Temperature 34-42°C
    };

    const [min, max] = ranges[type];
    const isValid = value >= min && value <= max;

    if (isValid) {
      wearQuality.current.validReadings++;
    }

    // Wear detection: if >70% of readings are valid, band is being worn
    const wearConfidence = wearQuality.current.totalReadings > 10
      ? (wearQuality.current.validReadings / wearQuality.current.totalReadings)
      : 0.5;

    setSignalQuality(Math.round(wearConfidence * 100));
    setWearDetected(wearConfidence > 0.7);

    if (!isValid) {
      addLog(`[WEAR] ${type.toUpperCase()} out of range: ${value}${type === 'temp' ? '°C' : ''}`);
      return false;
    }

    // Accept valid readings (wear detection is just tracking, not blocking)
    return true;
  }, [addLog]);

  const loadLatestVitals = useCallback(async () => {
    try { setLatestVitals(await getLatestVitals()); }
    catch {}
    finally { setVitalsLoading(false); }
  }, []);

  useEffect(() => { loadLatestVitals(); }, [loadLatestVitals]);

  const flush = useCallback(() => {
    // If timer already pending, don't reset it - just accumulate data
    if (saveTimer.current) return;

    saveTimer.current = setTimeout(async () => {
      const s = staged.current;
      if (!s.hr && !s.sbp && !s.spo2 && !s.temp) {
        saveTimer.current = null;
        return;
      }
      try {
        const payload = {
          heart_rate:    s.hr,
          bp_systolic:   s.sbp,
          bp_diastolic:  s.dbp,
          spo2:          s.spo2,
          temperature_c: s.temp,
          source:        'device',
        };
        addLog(`[API] Sending: HR=${s.hr} SpO2=${s.spo2} BP=${s.sbp}/${s.dbp} Temp=${s.temp}`);
        const result = await logVitals(payload);
        addLog(`[API] ✓ Saved (ID: ${result.id})`);
        setLastError(null);
        // Only clear the vitals we just saved, not all of them
        if (s.hr !== undefined) staged.current.hr = undefined;
        if (s.sbp !== undefined) staged.current.sbp = undefined;
        if (s.dbp !== undefined) staged.current.dbp = undefined;
        if (s.spo2 !== undefined) staged.current.spo2 = undefined;
        if (s.temp !== undefined) staged.current.temp = undefined;
        loadLatestVitals();
      } catch (err: any) {
        const errorMsg = err?.response?.data?.error || err?.message || String(err);
        addLog(`[ERROR] Save failed: ${errorMsg}`);
        setLastError(`API Error: ${errorMsg}`);
      }
      saveTimer.current = null;
    }, 60000);  // Auto-flush every 60 seconds (no manual sync needed)
  }, [loadLatestVitals]);

  const flushHistBuf = useCallback(async (type: 'hr' | 'spo2' | 'temp') => {
    const buf = histBuf.current[type];
    histBuf.current[type] = [];
    if (buf.length > 0) {
      console.log(`[Vitals] Syncing ${buf.length} ${type} history records...`);
      for (let i = 0; i < buf.length; i += 500) {
        try {
          const chunk = buf.slice(i, i + 500);
          const result = await logVitalsBatch(chunk);
          console.log(`[Vitals] Batch saved (${type}):`, result);
        } catch (err: any) {
          console.error(`[Vitals] Failed to sync ${type} history:`, err?.message || err);
        }
      }
      loadLatestVitals();
    }
    setSyncState(prev => ({ ...prev, [type]: 'done' }));
  }, [loadLatestVitals]);

  const parseBandDate = (date?: string): string | undefined => {
    if (!date) return undefined;
    const ts = new Date(date.replace(' ', 'T') + (date.includes('T') || date.includes(' ') ? 'Z' : ''));
    return isNaN(ts.getTime()) ? undefined : ts.toISOString();
  };

  useEffect(() => {
    if (!JCV.isAvailable) return;
    const subs = [
      JCV.addListener('JCV_DeviceFound', (d) =>
        setDevices(prev => {
          // Update existing entry with the freshest RSSI/name (later scan
          // responses often carry the real name and a real RSSI; the initial
          // bonded snapshot uses RSSI 0 which buries the band in the list).
          const idx = prev.findIndex(x => x.id === d.id);
          let next: JCV.JCVDevice[];
          if (idx >= 0) {
            next = [...prev];
            const existing = next[idx];
            next[idx] = {
              ...existing,
              // prefer a non-"Unknown" / non-empty name when one arrives
              name: (d.name && !d.name.startsWith('Unknown'))
                ? d.name
                : (existing.name || d.name),
              rssi: d.rssi ?? existing.rssi,
            };
          } else {
            next = [...prev, d];
          }
          // Always show JC bands first, then sort the rest by RSSI (closest first).
          return next.sort((a, b) => {
            const aJC = isJCBand(a.name) ? 1 : 0;
            const bJC = isJCBand(b.name) ? 1 : 0;
            if (aJC !== bJC) return bJC - aJC;
            return (b.rssi ?? -100) - (a.rssi ?? -100);
          });
        })),
      JCV.addListener('JCV_Connected', () => {
        addLog('[JCV] Band connected, starting measurements');
        setPhase('connected');
        JCV.getBattery();
      }),
      JCV.addListener('JCV_Disconnected', () => {
        setPhase('idle'); setDevices([]); setConnectedDevice(null); setBattery(null);
        setBpMeasuring(false); setTempMeasuring(false);
      }),
      JCV.addListener('JCV_HeartRate', (d) => {
        if (d.historical) {
          histBuf.current.hr.push({ heart_rate: d.value, recorded_at: parseBandDate(d.date), source: 'device' });
          return;
        }
        if (!validateReading(d.value, 'hr')) return;
        addLog(`[JCV] HR=${d.value} bpm`);
        setLiveHR(d.value); staged.current.hr = d.value; setLastSeenAt(Date.now());
        setDailyStats(prev => ({ ...prev, hr: [...prev.hr, d.value].slice(-288) }));
        flush();
      }),
      JCV.addListener('JCV_SpO2', (d) => {
        console.log('[JCV] SpO2 received:', d.value, 'historical:', d.historical);
        if (d.historical) {
          histBuf.current.spo2.push({ spo2: d.value, recorded_at: parseBandDate(d.date), source: 'device' });
          return;
        }
        if (!validateReading(d.value, 'spo2')) return;
        setLiveSpO2(d.value); staged.current.spo2 = d.value; setLastSeenAt(Date.now());
        setDailyStats(prev => ({ ...prev, spo2: [...prev.spo2, d.value].slice(-288) }));
        flush();
      }),
      JCV.addListener('JCV_BloodPressure', (d) => {
        console.log('[JCV] BloodPressure received:', d.sbp, '/', d.dbp);
        setLiveBP(d); staged.current.sbp = d.sbp; staged.current.dbp = d.dbp;
        setBpMeasuring(false); setLastSeenAt(Date.now()); flush();
      }),
      JCV.addListener('JCV_Temperature', (d) => {
        console.log('[JCV] Temperature received:', d.value, 'historical:', d.historical);
        if (d.historical) {
          histBuf.current.temp.push({ temperature_c: d.value, recorded_at: parseBandDate(d.date), source: 'device' });
          return;
        }
        if (!validateReading(d.value, 'temp')) return;
        setLiveTemp(d.value); staged.current.temp = d.value;
        setTempMeasuring(false); setLastSeenAt(Date.now());
        setDailyStats(prev => ({ ...prev, temp: [...prev.temp, d.value].slice(-288) }));
        flush();
      }),
      JCV.addListener('JCV_Battery', (d) => { setBattery(d.value); setLastSeenAt(Date.now()); }),
      JCV.addListener('JCV_SyncProgress', (d) => { if (d.done) flushHistBuf(d.type); }),
    ];
    return () => {
      subs.forEach(s => s?.remove());
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [flush, flushHistBuf, validateReading]);

  const requestBlePermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const sdk = typeof Platform.Version === 'number'
      ? Platform.Version : parseInt(Platform.Version as string, 10);
    const perms: Array<keyof typeof PermissionsAndroid.PERMISSIONS> = sdk >= 31
      ? ['BLUETOOTH_SCAN', 'BLUETOOTH_CONNECT']
      : ['ACCESS_FINE_LOCATION'];
    const results = await PermissionsAndroid.requestMultiple(
      perms.map(p => PermissionsAndroid.PERMISSIONS[p])
    );
    const statuses = Object.values(results);
    if (statuses.every(r => r === PermissionsAndroid.RESULTS.GRANTED)) return true;
    // Permanently denied → send user to Settings
    if (statuses.some(r => r === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
      CustomAlert.alert(
        'Bluetooth permission blocked',
        'Open Settings → Apps → Nalam → Permissions → Nearby devices and allow it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
    return false;
  }, []);

  // On mount: grant permissions then auto-start a BLE scan. The V8 band is NOT
  // paired in OS Bluetooth settings (the JCVitals app connects without bonding),
  // so we can't pre-load a bonded list — the only way to discover the band is
  // an active BLE scan, same as the official app does.
  useEffect(() => {
    if (!JCV.isAvailable) return;
    requestBlePermissions().then(granted => {
      if (!granted) return;
      // Show any previously-bonded device first as a hint
      JCV.getBondedDevices().then(bonded => {
        if (bonded.length > 0) setDevices(bonded);
      }).catch(() => {});
      // Then kick off a scan to discover the band live
      setPhase('scanning');
      JCV.startScan();
    });
  }, [requestBlePermissions]);

  const handleScan = async () => {
    const granted = await requestBlePermissions();
    if (!granted) return;
    setDevices([]);
    setPhase('scanning');
    JCV.startScan();
  };
  const handleCancel = () => { JCV.stopScan(); setPhase('idle'); setDevices([]); };
  const handlePick = async (dev: JCV.JCVDevice) => {
    JCV.stopScan();
    setConnectedDevice(dev);   // remember name + MAC for the connected UI
    setPhase('connecting');
    JCV.connect(dev.id);
  };
  const handleDisconnect = () => {
    // Stop any running measurements before disconnecting
    JCV.stopMeasurement(2); JCV.stopMeasurement(3);
    if (bpMeasuring) JCV.stopMeasurement(1);
    JCV.disconnect();
    setPhase('idle'); setDevices([]);
    setBpMeasuring(false); setTempMeasuring(false);
  };
  const handleTakeBP = () => {
    if (bpMeasuring) { JCV.stopMeasurement(1); setBpMeasuring(false); return; }
    setBpMeasuring(true); JCV.startMeasurement(1);
  };
  const handleTakeTemp = () => {
    if (tempMeasuring) return;
    setTempMeasuring(true); JCV.startMeasurement(4);
  };
  // Auto-start vitals streaming as soon as the band connects.
  //
  // type 2 → RealTimeStep: continuous activity stream, delivers HR + Temp.
  //   SpO2 byte in the RealTimeStep packet is 0 on this band firmware unless
  //   a discrete SpO2 measurement has recently run.
  //
  // type 3 → SetDeviceMeasurementWithType(AutoSpo2): one-shot ~50s SpO2
  //   measurement that fires MeasurementOxygenCallback then auto-cycles.
  //   Started 3 s after RealTimeStep to let the HR sensor settle first.
  //
  // Also poll battery every 60s.
  useEffect(() => {
    if (phase !== 'connected') return;
    JCV.startMeasurement(2);
    JCV.getBattery();
    const spo2Timer = setTimeout(() => JCV.startMeasurement(3), 3_000);
    const batteryPoll = setInterval(() => JCV.getBattery(), 60_000);
    return () => {
      JCV.stopMeasurement(2);
      JCV.stopMeasurement(3);
      clearTimeout(spo2Timer);
      clearInterval(batteryPoll);
    };
  }, [phase]);

  const isSyncing = Object.values(syncState).some(s => s === 'syncing');

  return (
    <View style={{ padding: 16, gap: 12 }}>

      {/* ── Band status card ── */}
      {phase === 'idle' && (
        <>
          <LinearGradient
            colors={[ACCENT.hi, ACCENT.lo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ borderRadius: 20, padding: 20 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                <Bluetooth size={24} color="#fff" strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 }}>Nalam Health Band</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>
                  {JCV.isAvailable
                    ? devices.length > 0 ? 'Tap your band below to connect' : 'Connect your band to measure vitals'
                    : 'Not available on this device'}
                </Text>
              </View>
            </View>
            {JCV.isAvailable && (
              <Pressable
                onPress={handleScan}
                style={{ marginTop: 16, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                  {devices.length > 0 ? 'Scan for more devices' : 'Scan for Band'}
                </Text>
              </Pressable>
            )}
          </LinearGradient>

          {/* Bonded / known devices shown without scanning — highlight JC bands */}
          {devices.length > 0 && (
            <View style={[{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: CARD_BORDER, gap: 8 }, SHADOW_CARD]}>
              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: MUTED, marginBottom: 2 }}>KNOWN DEVICES</Text>
              {(() => {
                const jDevices = devices.filter(d => isJCBand(d.name));
                const otherDevices = devices.filter(d => !isJCBand(d.name));
                return (
                  <>
                    {jDevices.length > 0 && (
                      <>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: ACCENT.lo, marginTop: 8, marginBottom: 4 }}>★ J DEVICES (NALAM HEALTH BAND)</Text>
                        {jDevices.map(dev => (
                          <Pressable
                            key={dev.id}
                            onPress={() => handlePick(dev)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: `${ACCENT.lo}0f`, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: ACCENT.lo }}
                          >
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${ACCENT.lo}25`, alignItems: 'center', justifyContent: 'center' }}>
                              <Bluetooth size={18} color={ACCENT.lo} strokeWidth={2} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>{dev.name}</Text>
                              <Text style={{ fontSize: 11, color: ACCENT.lo, fontWeight: '600' }}>✓ Nalam Health Band</Text>
                            </View>
                            <ChevronRight size={16} color={ACCENT.lo} strokeWidth={2} />
                          </Pressable>
                        ))}
                      </>
                    )}
                    {otherDevices.length > 0 && (
                      <>
                        {jDevices.length > 0 && <View style={{ height: 1, backgroundColor: CARD_BORDER, marginVertical: 8 }} />}
                        {jDevices.length > 0 && <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, marginVertical: 4 }}>OTHER DEVICES</Text>}
                        {otherDevices.map(dev => (
                          <Pressable
                            key={dev.id}
                            onPress={() => handlePick(dev)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SURFACE, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: CARD_BORDER }}
                          >
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${ACCENT.lo}14`, alignItems: 'center', justifyContent: 'center' }}>
                              <Bluetooth size={18} color={ACCENT.lo} strokeWidth={1.8} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>{dev.name}</Text>
                              <Text style={{ fontSize: 11, color: MUTED }}>Tap to connect</Text>
                            </View>
                            <ChevronRight size={16} color={ACCENT.lo} strokeWidth={1.8} />
                          </Pressable>
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </View>
          )}
        </>
      )}

      {phase === 'scanning' && (
        <View style={[{ backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: CARD_BORDER }, SHADOW_CARD]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator color={ACCENT.lo} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: INK }}>Scanning for band…</Text>
            </View>
            <Pressable onPress={handleCancel}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: ACCENT.lo }}>Cancel</Text>
            </Pressable>
          </View>
          {devices.length === 0 ? (
            <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center', paddingVertical: 8 }}>
              Make sure your JCV8 band is nearby, charged, and Bluetooth is on.
              Look for names starting with "JC" or "2301".
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>
                Look for your band — names starting with "J" like "JC", "2301", "JCV8", or "352C6B".
                Closest devices are listed first.
              </Text>
              {(() => {
                const jDevices = devices.filter(d => isJCBand(d.name));
                const otherDevices = devices.filter(d => !isJCBand(d.name));
                return (
                  <>
                    {jDevices.length > 0 && (
                      <>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: ACCENT.lo, marginTop: 4, marginBottom: 4 }}>★ J DEVICES (RECOMMENDED)</Text>
                        {jDevices.map(dev => (
                          <Pressable
                            key={dev.id}
                            onPress={() => handlePick(dev)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: `${ACCENT.lo}0f`, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: ACCENT.lo }}
                          >
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${ACCENT.lo}25`, alignItems: 'center', justifyContent: 'center' }}>
                              <Bluetooth size={18} color={ACCENT.lo} strokeWidth={2} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>{dev.name}</Text>
                              <Text style={{ fontSize: 11, color: ACCENT.lo, fontWeight: '600' }}>✓ Nalam Health Band</Text>
                            </View>
                            <ChevronRight size={16} color={ACCENT.lo} strokeWidth={2} />
                          </Pressable>
                        ))}
                      </>
                    )}
                    {otherDevices.length > 0 && (
                      <>
                        {jDevices.length > 0 && <View style={{ height: 1, backgroundColor: CARD_BORDER, marginVertical: 8 }} />}
                        {jDevices.length > 0 && <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED }}>OTHER DEVICES</Text>}
                        {otherDevices.map(dev => (
                          <Pressable
                            key={dev.id}
                            onPress={() => handlePick(dev)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: SURFACE, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: CARD_BORDER }}
                          >
                            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${ACCENT.lo}14`, alignItems: 'center', justifyContent: 'center' }}>
                              <Bluetooth size={18} color={ACCENT.lo} strokeWidth={1.8} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>{dev.name}</Text>
                              <Text style={{ fontSize: 11, color: MUTED }}>RSSI {dev.rssi} dBm</Text>
                            </View>
                            <ChevronRight size={16} color={ACCENT.lo} strokeWidth={1.8} />
                          </Pressable>
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </View>
          )}
        </View>
      )}

      {phase === 'connecting' && (
        <View style={[{ backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: CARD_BORDER }, SHADOW_CARD]}>
          <ActivityIndicator color={ACCENT.lo} size="large" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: INK, marginTop: 14 }}>Connecting to band…</Text>
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Keep the band close to your phone</Text>
        </View>
      )}

      {phase === 'connected' && (
        <>
          {/* ── Connected band info card ─────────────────────────────
              Shows live connection status, name, MAC, battery and data
              freshness — so the user can verify at a glance that the
              band is actually paired with this app right now.
          */}
          {(() => {
            const dataFresh = lastSeenAt != null && (Date.now() - lastSeenAt) < 30_000;
            const low  = battery != null && battery <= 20;
            const mid  = battery != null && battery <= 50 && battery > 20;
            const batFg = low ? '#B91C1C' : mid ? '#92400E' : '#16A34A';
            const batBg = low ? '#FEE2E2' : mid ? '#FEF3C7' : '#DCFCE7';
            return (
              <View style={[{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: CARD_BORDER }, SHADOW_CARD]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <Bluetooth size={20} color="#16A34A" strokeWidth={2.2} />
                    {/* pulsing green dot to confirm the link is live */}
                    <View style={{ position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#16A34A', borderWidth: 2, borderColor: '#fff' }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: INK }} numberOfLines={1}>
                      {connectedDevice?.name ?? 'Nalam Health Band'}
                    </Text>
                    <Text style={{ fontSize: 11, color: MUTED, marginTop: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                      {connectedDevice?.id ?? '—'}
                    </Text>
                  </View>
                  <Pressable
                    onPress={handleDisconnect}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: CARD_BORDER, backgroundColor: '#fff' }}
                  >
                    <BluetoothOff size={13} color={MUTED} strokeWidth={2} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED }}>Disconnect</Text>
                  </Pressable>
                </View>

                {/* Status pill row: Connected · Battery · Data freshness */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' }} />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#166534' }}>Connected</Text>
                  </View>

                  {battery == null ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <ActivityIndicator size="small" color={MUTED} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED }}>Battery…</Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: batBg, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Battery size={14} color={batFg} strokeWidth={2.2} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: batFg }}>{battery}%</Text>
                      {low && <Text style={{ fontSize: 10, fontWeight: '700', color: batFg }}>· Low</Text>}
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: dataFresh ? '#EEF2FF' : '#F1F5F9', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dataFresh ? ACCENT.lo : MUTED }} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: dataFresh ? ACCENT.lo : MUTED }}>
                      {dataFresh ? 'Live data' : 'Waiting for data…'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Hero card: Heart Rate (auto-monitored) */}
          {(() => {
            const hrStatus = getHealthStatus('hr', liveHR);
            const hrColor = getStatusColor(hrStatus);
            const avg = dailyStats.hr.length > 0 ? Math.round(dailyStats.hr.reduce((a, b) => a + b, 0) / dailyStats.hr.length) : null;
            const trend = dailyStats.hr.length >= 2
              ? dailyStats.hr[dailyStats.hr.length - 1] - dailyStats.hr[dailyStats.hr.length - 2]
              : 0;
            return (
              <LinearGradient
                colors={hrStatus === 'critical' ? ['#FEE2E2', '#FECACA'] : hrStatus === 'caution' ? ['#FEF3C7', '#FEE9A2'] : [ACCENT.hi, ACCENT.lo]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: 20, padding: 20 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Activity size={18} color={hrStatus === 'critical' ? '#B91C1C' : hrStatus === 'caution' ? '#92400E' : '#fff'} strokeWidth={2} />
                    <Text style={{ color: hrStatus === 'critical' ? '#B91C1C' : hrStatus === 'caution' ? '#92400E' : 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 }}>HEART RATE</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: hrStatus === 'critical' ? 'rgba(185, 28, 28, 0.25)' : hrStatus === 'caution' ? 'rgba(146, 64, 14, 0.25)' : 'rgba(34, 197, 94, 0.25)', borderRadius: 99 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: liveHR != null ? hrColor.dot : 'rgba(255,255,255,0.5)' }} />
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                      {liveHR != null ? (hrStatus === 'normal' ? 'Normal' : hrStatus === 'caution' ? 'Caution' : 'Alert') : 'Waiting…'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 12 }}>
                  <Text style={{ color: hrStatus === 'critical' ? '#B91C1C' : hrStatus === 'caution' ? '#92400E' : '#fff', fontSize: 56, fontWeight: '900', letterSpacing: -2, lineHeight: 60 }}>
                    {liveHR != null ? liveHR : '—'}
                  </Text>
                  <Text style={{ color: hrStatus === 'critical' ? 'rgba(185, 28, 28, 0.85)' : hrStatus === 'caution' ? 'rgba(146, 64, 14, 0.85)' : 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '700', marginBottom: 12 }}>bpm</Text>
                  {trend !== 0 && <Text style={{ color: trend > 0 ? '#B91C1C' : '#16A34A', fontSize: 18, fontWeight: '800', marginBottom: 8 }}>{trend > 0 ? '↑' : '↓'}</Text>}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: hrStatus === 'critical' ? 'rgba(185, 28, 28, 0.3)' : hrStatus === 'caution' ? 'rgba(146, 64, 14, 0.3)' : 'rgba(255,255,255,0.2)' }}>
                  <View>
                    <Text style={{ color: hrStatus === 'critical' ? 'rgba(185, 28, 28, 0.7)' : hrStatus === 'caution' ? 'rgba(146, 64, 14, 0.7)' : 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' }}>TODAY AVG</Text>
                    <Text style={{ color: hrStatus === 'critical' ? '#B91C1C' : hrStatus === 'caution' ? '#92400E' : '#fff', fontSize: 16, fontWeight: '800', marginTop: 2 }}>
                      {avg != null ? avg : '—'} <Text style={{ fontSize: 11 }}>bpm</Text>
                    </Text>
                  </View>
                  {lastSeenAt && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: hrStatus === 'critical' ? 'rgba(185, 28, 28, 0.7)' : hrStatus === 'caution' ? 'rgba(146, 64, 14, 0.7)' : 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' }}>LAST UPDATE</Text>
                      <Text style={{ color: hrStatus === 'critical' ? '#B91C1C' : hrStatus === 'caution' ? '#92400E' : '#fff', fontSize: 13, fontWeight: '800', marginTop: 2 }}>
                        {timeAgo(new Date(lastSeenAt).toISOString())}
                      </Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            );
          })()}

          {/* SpO2 + Temperature row */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(() => {
              const spo2Status = getHealthStatus('spo2', liveSpO2);
              const spo2Color = getStatusColor(spo2Status);
              const spo2Avg = dailyStats.spo2.length > 0 ? Math.round(dailyStats.spo2.reduce((a, b) => a + b, 0) / dailyStats.spo2.length) : null;
              return (
                <View style={[{ flex: 1, backgroundColor: spo2Color.bg, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: spo2Color.dot }, SHADOW_CARD]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${spo2Color.dot}20`, alignItems: 'center', justifyContent: 'center' }}>
                      <Wind size={16} color={spo2Color.dot} strokeWidth={1.8} />
                    </View>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: spo2Color.dot }} />
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: spo2Color.fg, letterSpacing: -0.5 }}>
                    {liveSpO2 != null ? liveSpO2 : '—'}
                    <Text style={{ fontSize: 14, color: spo2Color.fg, fontWeight: '700', opacity: 0.7 }}> %</Text>
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: spo2Color.fg, marginTop: 2, letterSpacing: 0.8 }}>SPO₂</Text>
                  <Text style={{ fontSize: 9, color: spo2Color.fg, marginTop: 4, opacity: 0.7 }}>
                    {spo2Status === 'normal' ? '✓ Normal' : spo2Status === 'caution' ? '⚠ Caution' : '⚠ Alert'}
                    {spo2Avg != null ? ` · Avg ${spo2Avg}%` : ''}
                  </Text>
                </View>
              );
            })()}

            {(() => {
              const tempStatus = getHealthStatus('temp', liveTemp);
              const tempColor = getStatusColor(tempStatus);
              const tempAvg = dailyStats.temp.length > 0 ? Number((dailyStats.temp.reduce((a, b) => a + b, 0) / dailyStats.temp.length).toFixed(1)) : null;
              return (
                <View style={[{ flex: 1, backgroundColor: tempColor.bg, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: tempColor.dot }, SHADOW_CARD]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${tempColor.dot}20`, alignItems: 'center', justifyContent: 'center' }}>
                      <Zap size={16} color={tempColor.dot} strokeWidth={1.8} />
                    </View>
                    {tempMeasuring && <ActivityIndicator size="small" color={tempColor.dot} />}
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: tempColor.fg, letterSpacing: -0.5 }}>
                    {liveTemp != null ? liveTemp.toFixed(1) : '—'}
                    <Text style={{ fontSize: 14, color: tempColor.fg, fontWeight: '700', opacity: 0.7 }}> °C</Text>
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: tempColor.fg, marginTop: 2, letterSpacing: 0.8 }}>TEMPERATURE</Text>
                  <Pressable
                    onPress={handleTakeTemp}
                    disabled={tempMeasuring}
                    style={{
                      marginTop: 8, paddingVertical: 6, borderRadius: 8, alignItems: 'center',
                      backgroundColor: tempMeasuring ? `${tempColor.dot}30` : `${tempColor.dot}15`,
                      borderWidth: 1, borderColor: tempColor.dot,
                    }}
                  >
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: tempColor.dot }}>
                      {tempMeasuring ? 'Reading…' : tempAvg ? `Avg ${tempAvg}°C` : 'Read Temp'}
                    </Text>
                  </Pressable>
                </View>
              );
            })()}
          </View>

          {/* Blood Pressure card with single-action button */}
          {(() => {
            const sbpStatus = liveBP ? (liveBP.sbp >= 160 || liveBP.dbp >= 100 ? 'critical' : liveBP.sbp >= 140 || liveBP.dbp >= 90 ? 'caution' : 'normal') : 'unknown';
            const bpColor = getStatusColor(sbpStatus);
            return (
              <View style={[{ backgroundColor: bpColor.bg, borderRadius: 16, padding: 14, borderWidth: 1.5, borderColor: bpColor.dot, flexDirection: 'row', alignItems: 'center', gap: 12 }, SHADOW_CARD]}>
                <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: `${bpColor.dot}20`, alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={20} color={bpColor.dot} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: bpColor.fg, letterSpacing: 0.8 }}>BLOOD PRESSURE</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: bpColor.fg, letterSpacing: -0.5, marginTop: 2 }}>
                    {liveBP ? `${liveBP.sbp}/${liveBP.dbp}` : '—'}
                    <Text style={{ fontSize: 12, color: bpColor.fg, fontWeight: '700', opacity: 0.7 }}> mmHg</Text>
                  </Text>
                  <Text style={{ fontSize: 9, color: bpColor.fg, marginTop: 4, opacity: 0.7 }}>
                    {sbpStatus === 'normal' ? '✓ Normal' : sbpStatus === 'caution' ? '⚠ Elevated' : '⚠ High'}
                  </Text>
                </View>
                <Pressable
                  onPress={handleTakeBP}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: bpMeasuring ? `${bpColor.dot}30` : bpColor.dot,
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                  }}
                >
                  {bpMeasuring && <ActivityIndicator size="small" color={bpColor.fg} />}
                  <Text style={{ fontSize: 12, fontWeight: '800', color: bpMeasuring ? bpColor.fg : '#fff' }}>
                    {bpMeasuring ? 'Measuring…' : 'Take'}
                  </Text>
                </Pressable>
              </View>
            );
          })()}

          {/* Sync progress card */}
          {Object.values(syncState).some(s => s !== 'idle') && (
            <View style={[{ backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: CARD_BORDER, gap: 10 }, SHADOW_CARD]}>
              <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: MUTED }}>SYNC PROGRESS</Text>
              {([
                { key: 'hr',   label: 'Heart Rate history',    color: ACCENT.lo  },
                { key: 'spo2', label: 'SpO₂ history',          color: '#8B5CF6'  },
                { key: 'temp', label: 'Temperature history',   color: '#EF4444'  },
              ] as const).map(({ key, label, color }) => {
                const s = syncState[key];
                return (
                  <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {s === 'syncing' && <ActivityIndicator size="small" color={color} />}
                    {s === 'done'    && <CheckCircle2 size={16} color="#16A34A" strokeWidth={2} />}
                    {s === 'idle'    && <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: CARD_BORDER }} />}
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: s === 'done' ? MUTED : INK }}>{label}</Text>
                    {s === 'done'    && <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>Saved</Text>}
                    {s === 'syncing' && <Text style={{ fontSize: 11, color: MUTED }}>Receiving…</Text>}
                  </View>
                );
              })}
            </View>
          )}

          {/* Debug Panel - Shows what's being saved to database */}
          <View style={[{ backgroundColor: lastError ? '#FEE2E2' : '#fff', borderRadius: 14, padding: 12, borderWidth: lastError ? 2 : 1, borderColor: lastError ? '#DC2626' : '#E5E7EB' }, SHADOW_CARD]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: lastError ? '#DC2626' : MUTED, letterSpacing: 1.2, marginBottom: 8 }}>
              {lastError ? '⚠ SAVE ERROR' : 'DEBUG: VITALS SYNC STATUS'}
            </Text>
            <View style={{ backgroundColor: lastError ? '#FEF2F2' : '#F9FAFB', borderRadius: 8, padding: 10, gap: 6 }}>
              {lastError && (
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#DC2626', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                  {lastError}
                </Text>
              )}
              <Text style={{ fontSize: 10, fontWeight: '600', color: INK, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                Collected: HR={dailyStats.hr.length} | SpO2={dailyStats.spo2.length} | Temp={dailyStats.temp.length}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: INK, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                Band: {connectedDevice?.name || 'Not connected'}
              </Text>
              {lastSeenAt && (
                <Text style={{ fontSize: 9, color: '#16A34A', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                  Last data: {timeAgo(new Date(lastSeenAt).toISOString())}
                </Text>
              )}
              <Text style={{ fontSize: 9, color: '#64748B', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 }}>
                Check console logs for details
              </Text>
            </View>
          </View>

          {/* Log Viewer Toggle */}
          <Pressable
            onPress={() => setShowLogs(!showLogs)}
            style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F3F4F6', borderRadius: 10, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: ACCENT.lo }}>
              {showLogs ? '▼ Hide Logs' : '▶ Show Logs'}
            </Text>
          </Pressable>

          {/* On-Screen Log Viewer */}
          {showLogs && (
            <View style={[{ backgroundColor: '#0F1C3D', borderRadius: 14, padding: 12, maxHeight: 300, borderWidth: 1, borderColor: '#1E3A5F' }, SHADOW_CARD]}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#60A5FA', letterSpacing: 1.2, marginBottom: 8 }}>LIVE CONSOLE LOGS</Text>
              <ScrollView style={{ maxHeight: 250 }}>
                {debugLogs.length === 0 ? (
                  <Text style={{ fontSize: 10, color: '#9CA3AF', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                    Waiting for logs...
                  </Text>
                ) : (
                  debugLogs.map((log, idx) => (
                    <Text
                      key={idx}
                      style={{
                        fontSize: 9,
                        color: log.includes('ERROR') ? '#F87171' : log.includes('[JCV]') ? '#34D399' : '#D1D5DB',
                        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                        marginBottom: 2,
                      }}
                    >
                      {log}
                    </Text>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {/* ── Daily Summary ── */}
      {phase === 'connected' && dailyStats.hr.length > 0 && (
        <View style={[{ backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: CARD_BORDER }, SHADOW_CARD]}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: MUTED, marginBottom: 12 }}>TODAY'S SUMMARY</Text>
          <View style={{ gap: 10 }}>
            {(() => {
              const hrMin = Math.min(...dailyStats.hr);
              const hrMax = Math.max(...dailyStats.hr);
              const hrAvg = Math.round(dailyStats.hr.reduce((a, b) => a + b, 0) / dailyStats.hr.length);
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${ACCENT.lo}14`, alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={16} color={ACCENT.lo} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 4 }}>HEART RATE</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: INK }}>
                        {hrAvg} <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>avg</Text>
                      </Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#F1F5F9', borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED }}>
                          {hrMin}–{hrMax} bpm
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                    {dailyStats.hr.length} readings
                  </Text>
                </View>
              );
            })()}
            {dailyStats.spo2.length > 0 && (() => {
              const spo2Min = Math.min(...dailyStats.spo2);
              const spo2Max = Math.max(...dailyStats.spo2);
              const spo2Avg = Math.round(dailyStats.spo2.reduce((a, b) => a + b, 0) / dailyStats.spo2.length);
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#8B5CF614', alignItems: 'center', justifyContent: 'center' }}>
                    <Wind size={16} color="#8B5CF6" strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 4 }}>SPO₂</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: INK }}>
                        {spo2Avg}<Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>%</Text>
                      </Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#F1F5F9', borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED }}>
                          {spo2Min}–{spo2Max}%
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                    {dailyStats.spo2.length} readings
                  </Text>
                </View>
              );
            })()}
            {dailyStats.temp.length > 0 && (() => {
              const tempMin = Math.min(...dailyStats.temp);
              const tempMax = Math.max(...dailyStats.temp);
              const tempAvg = Number((dailyStats.temp.reduce((a, b) => a + b, 0) / dailyStats.temp.length).toFixed(1));
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EF444414', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={16} color="#EF4444" strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 4 }}>TEMPERATURE</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: INK }}>
                        {tempAvg}<Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>°C</Text>
                      </Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#F1F5F9', borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED }}>
                          {tempMin.toFixed(1)}–{tempMax.toFixed(1)}°C
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748B' }}>
                    {dailyStats.temp.length} readings
                  </Text>
                </View>
              );
            })()}
          </View>
        </View>
      )}

      {/* ── Last Recorded ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: MUTED }}>LAST RECORDED</Text>
        {latestVitals && (
          <Text style={{ fontSize: 11, color: MUTED }}>{timeAgo(latestVitals.recorded_at)}</Text>
        )}
      </View>

      {vitalsLoading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator color={ACCENT.lo} />
        </View>
      ) : !latestVitals ? (
        <View style={[{ backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: CARD_BORDER }, SHADOW_CARD]}>
          <Activity size={32} color="#E2E8F0" strokeWidth={1.5} />
          <Text style={{ color: MUTED, fontWeight: '700', fontSize: 14, marginTop: 12 }}>No readings yet</Text>
          <Text style={{ color: '#CBD5E1', fontSize: 12, marginTop: 4, textAlign: 'center' }}>
            Connect your band and take a measurement to see readings here.
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {([
            { label: 'Heart Rate',     value: latestVitals.heart_rate     != null ? String(latestVitals.heart_rate)     : null, unit: 'bpm',  color: ACCENT.lo,  icon: Activity, vital: 'hr' as const },
            { label: 'SpO2',           value: latestVitals.spo2           != null ? String(latestVitals.spo2)           : null, unit: '%',    color: '#8B5CF6',  icon: Wind, vital: 'spo2' as const },
            { label: 'Blood Pressure', value: latestVitals.bp             != null ? latestVitals.bp                     : null, unit: 'mmHg', color: '#F59E0B',  icon: Heart, vital: 'bp' as const },
            { label: 'Temperature',    value: latestVitals.temperature_c  != null ? `${Number(latestVitals.temperature_c).toFixed(1)}` : null, unit: '°C',   color: '#EF4444',  icon: Zap, vital: 'temp' as const },
          ] as const).map(({ label, value, unit, color, icon: Icon, vital }) => {
            const status = vital === 'hr' ? getHealthStatus('hr', latestVitals.heart_rate) : vital === 'spo2' ? getHealthStatus('spo2', latestVitals.spo2) : vital === 'temp' ? getHealthStatus('temp', latestVitals.temperature_c) : 'unknown';
            const statusColor = getStatusColor(status);
            return (
              <View key={label} style={[{
                backgroundColor: statusColor.bg, borderRadius: 16, padding: 14,
                width: '47%', flexGrow: 1,
                borderWidth: 1.5, borderColor: statusColor.dot,
              }, SHADOW_CARD]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: `${statusColor.dot}20`, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} color={statusColor.dot} strokeWidth={1.8} />
                  </View>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor.dot }} />
                </View>
                <Text style={{ fontSize: value ? 22 : 18, fontWeight: '900', color: statusColor.fg, letterSpacing: -0.5 }}>
                  {value ?? '—'}
                </Text>
                <Text style={{ fontSize: 10, color: statusColor.fg, marginTop: 1, opacity: 0.7 }}>{unit}</Text>
                <Text style={{ fontSize: 9, fontWeight: '700', color: statusColor.fg, marginTop: 2, letterSpacing: 0.8 }}>
                  {label.toUpperCase()}
                </Text>
                <Text style={{ fontSize: 8, color: statusColor.fg, marginTop: 3, opacity: 0.6 }}>
                  {status === 'normal' ? '✓ Normal' : status === 'caution' ? '⚠ Caution' : '⚠ Alert'}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ─── Conditions Tab ─── */
function ConditionsTab() {
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: MUTED, marginBottom: 10 }}>ALLERGIES</Text>
      <View style={{ gap: 8, marginBottom: 20 }}>
        {ALLERGIES.map(a => (
          <View key={a.n} style={[{ backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: CARD_BORDER }, SHADOW_CARD]}>
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: a.c, alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} color={a.fg} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: INK }}>{a.n}</Text>
              <Text style={{ fontSize: 11, color: MUTED }}>Since {a.since}</Text>
            </View>
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: a.c, borderRadius: 99 }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: a.fg }}>{a.sev}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 1.6, color: MUTED, marginBottom: 10 }}>CONDITIONS</Text>
      <View style={{ gap: 8 }}>
        {CONDITIONS.map(c => (
          <View key={c.n} style={[{ backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: CARD_BORDER }, SHADOW_CARD]}>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: INK }}>{c.n}</Text>
              <Text style={{ fontSize: 11, color: MUTED }}>Diagnosed {c.dx}</Text>
            </View>
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, backgroundColor: c.status === 'Active' ? '#FEF3C7' : '#DCFCE7' }}>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: c.status === 'Active' ? '#92400E' : '#166534' }}>{c.status}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ─── Main screen ─── */
export default function HealthScreen() {
  const { userId } = useAuthStore();
  const [tab, setTab] = useState<'timeline' | 'rx' | 'reports' | 'vitals' | 'allergies'>('timeline');
  const [liveConsultations, setLiveConsultations] = useState<ConsultationItem[]>([]);
  const [consultationsLoading, setConsultationsLoading] = useState(true);
  const [myUploads, setMyUploads] = useState<ApiDocument[]>([]);
  const [docUploading, setDocUploading] = useState(false);

  const loadMyUploads = useCallback(async () => {
    try { const docs = await getDocuments(); setMyUploads(docs); }
    catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    patientService.getConsultationHistory(1, 10)
      .then(res => setLiveConsultations(res.consultations))
      .catch(() => {})
      .finally(() => setConsultationsLoading(false));
    loadMyUploads();
  }, [loadMyUploads]);

  const pickAndUpload = useCallback(async (source: 'camera' | 'gallery', label: string) => {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      CustomAlert.alert('Permission Required', `Please allow ${source === 'camera' ? 'camera' : 'photo library'} access.`);
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    setDocUploading(true);
    try {
      const fn = `${label.replace(/\s+/g, '-').toLowerCase()}.jpg`;
      const { url, path } = await uploadService.uploadMedicalDocument(userId ?? 'guest', result.assets[0].uri, fn);
      const docType = label.toLowerCase().includes('prescription') ? 'prescription' : 'lab_report';
      await saveDocument({ name: label, storage_url: url, storage_path: path, document_type: docType });
      CustomAlert.alert('Uploaded', `${label} saved to your health records.`);
      loadMyUploads();
    } catch (err: any) {
      CustomAlert.alert('Upload Failed', err?.message ?? 'Could not upload.');
    } finally { setDocUploading(false); }
  }, [userId, loadMyUploads]);

  const handleUploadNew = useCallback(() => {
    CustomAlert.alert('Upload Document', 'What type of document?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Lab Report', onPress: () => pickAndUpload('gallery', 'Lab Report') },
      { text: 'Prescription', onPress: () => pickAndUpload('gallery', 'Prescription') },
      { text: 'Other', onPress: () => pickAndUpload('gallery', 'Medical Document') },
    ]);
  }, [pickAndUpload]);

  return (
    <View style={{ flex: 1, backgroundColor: SURFACE }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: SURFACE }} />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: CARD_BORDER,
      }}>
        <Text style={{ fontSize: 20, fontWeight: '900', color: INK }}>Health Records</Text>
        <Pressable
          onPress={handleUploadNew}
          style={{ width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: CARD_BORDER, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
        >
          <Upload size={18} color={INK} strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* Tab bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: CARD_BORDER }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {TABS.map(t => (
            <Pressable
              key={t.k}
              onPress={() => setTab(t.k as typeof tab)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                backgroundColor: tab === t.k ? INK : '#fff',
                borderWidth: 1, borderColor: tab === t.k ? INK : CARD_BORDER,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === t.k ? '#fff' : '#4C5775' }}>{t.n}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Tab content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {tab === 'timeline'  && <TimelineTab consultations={liveConsultations} loading={consultationsLoading} />}
        {tab === 'rx'        && <RxTab />}
        {tab === 'reports'   && <ReportsTab myUploads={myUploads} docUploading={docUploading} onUpload={handleUploadNew} />}
        {tab === 'vitals'    && <VitalsTab />}
        {tab === 'allergies' && <ConditionsTab />}
      </ScrollView>
    </View>
  );
}
