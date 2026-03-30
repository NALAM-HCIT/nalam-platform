import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import { patientService, ConsultationItem } from '@/services/patientService';
import { uploadService } from '@/services/uploadService';
import { useAuthStore } from '@/stores/authStore';
import {
  Share2, Info, Filter, Heart, Droplets, Wind, Weight, Activity,
  TrendingUp, TrendingDown, ChevronRight, FileText, Download,
  Send, Pill, Clock, CheckCircle2, Stethoscope, Upload, Sparkles,
  Calendar, FolderOpen, Plus, Eye, AlertCircle, Video,
} from 'lucide-react-native';

/* ───── Types & Data ───── */

type TimePeriod = '7 Days' | '30 Days' | '90 Days' | '1 Year';

const TIME_PERIODS: TimePeriod[] = ['7 Days', '30 Days', '90 Days', '1 Year'];

const VITAL_METRICS = {
  bp: {
    label: 'Blood Pressure',
    icon: Heart,
    color: '#DC2626',
    latest: '120/80',
    unit: 'mmHg',
    status: 'Normal',
    statusColor: '#22C55E',
    trend: 'down' as const,
    trendLabel: '-3% this week',
    detail: {
      avg: '122/81 mmHg',
      min: '110/70 mmHg',
      max: '138/88 mmHg',
      readings: '2.1 per day',
      target: '< 130/85 mmHg (Dr. Aruna Devi)',
    },
  },
  hr: {
    label: 'Heart Rate',
    icon: Activity,
    color: '#1A73E8',
    latest: '72',
    unit: 'BPM',
    status: 'Normal',
    statusColor: '#22C55E',
    trend: 'down' as const,
    trendLabel: 'Resting avg 68',
    detail: {
      avg: '74 BPM',
      min: '58 BPM',
      max: '112 BPM',
      resting: '68 BPM',
      active: '98 BPM',
    },
  },
  sugar: {
    label: 'Blood Sugar',
    icon: Droplets,
    color: '#F59E0B',
    latest: '105',
    unit: 'mg/dL',
    status: 'Well Controlled',
    statusColor: '#22C55E',
    trend: 'down' as const,
    trendLabel: 'Fasting avg 102',
    detail: {
      fasting: '102 mg/dL (avg)',
      postMeal: '138 mg/dL (avg)',
      hba1c: '6.2% (last test)',
      target: 'Fasting < 110, Post-meal < 140',
    },
  },
  spo2: {
    label: 'SpO2',
    icon: Wind,
    color: '#8B5CF6',
    latest: '98',
    unit: '%',
    status: 'Normal',
    statusColor: '#22C55E',
    trend: 'up' as const,
    trendLabel: 'Avg 97.5%',
    detail: {
      avg: '97.5%',
      min: '95%',
      max: '99%',
      readings: '1.4 per day',
    },
  },
  weight: {
    label: 'Weight',
    icon: Weight,
    color: '#0EA5E9',
    latest: '72',
    unit: 'kg',
    status: 'BMI 24.2',
    statusColor: '#22C55E',
    trend: 'down' as const,
    trendLabel: '-0.8 kg this month',
    detail: {
      current: '72 kg',
      bmi: '24.2 (Normal)',
      monthChange: '-0.8 kg',
      target: '70 kg',
      height: '172 cm',
    },
  },
} as const;

const LAB_REPORTS = [
  {
    name: 'Complete Blood Count',
    date: 'Oct 24, 2025',
    doctor: 'Dr. Aruna Devi',
    status: 'Normal',
    statusColor: '#22C55E',
    values: 'Hemoglobin: 14.2 g/dL\nWBC: 7,200/μL\nPlatelets: 2.5 lakhs/μL\nRBC: 5.1 M/μL',
  },
  {
    name: 'Lipid Profile',
    date: 'Oct 24, 2025',
    doctor: 'Dr. Aruna Devi',
    status: 'Attention Needed',
    statusColor: '#F59E0B',
    values: 'Total Cholesterol: 218 mg/dL (High)\nLDL: 142 mg/dL (Borderline High)\nHDL: 48 mg/dL\nTriglycerides: 165 mg/dL',
  },
  {
    name: 'HbA1c',
    date: 'Sep 15, 2025',
    doctor: 'Dr. Rajesh Kumar',
    status: 'Well Controlled',
    statusColor: '#22C55E',
    values: 'HbA1c: 6.2%\nEstimated Avg Glucose: 131 mg/dL\nPrevious: 6.5% (Jun 2025)\nTarget: < 7.0%',
  },
  {
    name: 'Thyroid Panel',
    date: 'Aug 30, 2025',
    doctor: 'Dr. Shalini Singh',
    status: 'Normal',
    statusColor: '#22C55E',
    values: 'TSH: 2.8 mIU/L\nFree T4: 1.2 ng/dL\nFree T3: 3.1 pg/mL\nAll within normal range',
  },
];

const MEDICATIONS = [
  {
    name: 'Amlodipine 5mg',
    adherence: 98,
    label: 'Excellent',
    labelColor: '#22C55E',
    missedDates: 'Mar 4, 2026',
    pattern: 'Morning dose: 99% on time\nAvg delay: 8 min',
  },
  {
    name: 'Metformin 500mg',
    adherence: 90,
    label: 'Good',
    labelColor: '#1A73E8',
    missedDates: 'Feb 28, Mar 2, Mar 10, 2026',
    pattern: 'Morning dose: 94%\nEvening dose: 86%\nAvg delay: 22 min',
  },
];

/* ───── Medical Records Data ───── */

const PRESCRIBED_TESTS = [
  {
    doctor: 'Dr. Aruna Devi',
    specialty: 'General Physician',
    date: 'Mar 18, 2026',
    consultationType: 'Online',
    tests: [
      { name: 'CBC (Complete Blood Count)', subtitle: 'Hematology Analysis', hasResult: false },
      { name: 'Lipid Profile', subtitle: 'Result Available', hasResult: true },
      { name: 'Chest X-Ray', subtitle: 'Radiology Dept', hasResult: false },
    ],
  },
  {
    doctor: 'Dr. Rajesh Kumar',
    specialty: 'Cardiologist',
    date: 'Mar 10, 2026',
    consultationType: 'Online',
    tests: [
      { name: 'ECG (Electrocardiogram)', subtitle: 'Cardiology Dept', hasResult: false },
      { name: '2D Echocardiogram', subtitle: 'Result Available', hasResult: true },
      { name: 'Troponin T', subtitle: 'Blood Test', hasResult: false },
    ],
  },
  {
    doctor: 'Dr. Shalini Singh',
    specialty: 'Dermatologist',
    date: 'Feb 25, 2026',
    consultationType: 'Online',
    tests: [
      { name: 'Skin Biopsy Report', subtitle: 'Result Available', hasResult: true },
      { name: 'Allergy Panel (IgE)', subtitle: 'Immunology Lab', hasResult: false },
    ],
  },
];

// RECENT_CONSULTATIONS is now loaded from the API — see liveConsultations state below

/* ───── Sub-components ───── */

const MiniBarChart = React.memo(function MiniBarChart({
  data,
  color,
  height = 40,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  const max = Math.max(...data);
  return (
    <View className="flex-row items-end gap-[2px]" style={{ height }}>
      {data.map((v, i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: Math.max(4, (v / max) * height),
            backgroundColor: color,
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
            opacity: 0.35 + (v / max) * 0.65,
          }}
        />
      ))}
    </View>
  );
});

const StatusBadge = React.memo(function StatusBadge({
  text,
  color,
}: {
  text: string;
  color: string;
}) {
  return (
    <View style={{ backgroundColor: color + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{text}</Text>
    </View>
  );
});

const ProgressBar = React.memo(function ProgressBar({
  percent,
  color,
}: {
  percent: number;
  color: string;
}) {
  return (
    <View className="h-2 rounded-full bg-slate-100 overflow-hidden" style={{ flex: 1 }}>
      <View style={{ width: `${percent}%`, height: '100%', backgroundColor: color, borderRadius: 999 }} />
    </View>
  );
});

const VitalCard = React.memo(function VitalCard({
  metricKey,
  metric,
  bars,
  onPress,
}: {
  metricKey: string;
  metric: typeof VITAL_METRICS[keyof typeof VITAL_METRICS];
  bars: number[];
  onPress: (key: string) => void;
}) {
  const Icon = metric.icon;
  const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
  return (
    <Pressable
      onPress={() => onPress(metricKey)}
      className="mx-6 mb-3 bg-white rounded-2xl p-4 active:opacity-80"
      style={Shadows.card}
    >
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center gap-3">
          <View style={{ backgroundColor: metric.color + '14' }} className="w-10 h-10 rounded-xl items-center justify-center">
            <Icon size={20} color={metric.color} />
          </View>
          <View>
            <Text className="text-sm font-semibold text-midnight">{metric.label}</Text>
            <View className="flex-row items-center gap-1.5 mt-0.5">
              <TrendIcon size={12} color={metric.trend === 'down' ? '#22C55E' : '#F59E0B'} />
              <Text className="text-xs text-slate-400">{metric.trendLabel}</Text>
            </View>
          </View>
        </View>
        <View className="items-end">
          <View className="flex-row items-baseline gap-1">
            <Text className="text-xl font-bold text-midnight">{metric.latest}</Text>
            <Text className="text-xs text-slate-400">{metric.unit}</Text>
          </View>
          <StatusBadge text={metric.status} color={metric.statusColor} />
        </View>
      </View>
      <MiniBarChart data={bars} color={metric.color} height={36} />
    </Pressable>
  );
});

const LabReportCard = React.memo(function LabReportCard({
  report,
  onDetail,
  onViewPdf,
}: {
  report: typeof LAB_REPORTS[0];
  onDetail: () => void;
  onViewPdf: () => void;
}) {
  return (
    <Pressable
      onPress={onDetail}
      className="mx-6 mb-3 bg-white rounded-2xl p-4 active:opacity-80"
      style={Shadows.card}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-row items-center gap-3 flex-1 mr-3">
          <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
            <FileText size={20} color={Colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-midnight">{report.name}</Text>
            <Text className="text-xs text-slate-400 mt-0.5">{report.date} • {report.doctor}</Text>
          </View>
        </View>
        <StatusBadge text={report.status} color={report.statusColor} />
      </View>
      <View className="flex-row items-center justify-between mt-2 pt-3" style={{ borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
        <Pressable onPress={onViewPdf} className="flex-row items-center gap-1.5">
          <FileText size={14} color={Colors.primary} />
          <Text className="text-xs font-semibold text-primary">View Result</Text>
        </Pressable>
        <ChevronRight size={16} color="#CBD5E1" />
      </View>
    </Pressable>
  );
});

const PrescribedTestCard = React.memo(function PrescribedTestCard({
  rx,
  onUpload,
  onView,
}: {
  rx: typeof PRESCRIBED_TESTS[0];
  onUpload: (name: string) => void;
  onView: (name: string) => void;
}) {
  const pendingCount = rx.tests.filter((t) => !t.hasResult).length;
  const completedCount = rx.tests.filter((t) => t.hasResult).length;
  const progress = Math.round((completedCount / rx.tests.length) * 100);

  return (
    <View className="mx-6 mb-4 bg-white rounded-[20px] overflow-hidden" style={Shadows.card}>
      {/* Doctor Header */}
      <View className="bg-slate-50/80 px-4 pt-4 pb-3">
        <View className="flex-row items-start gap-3">
          <View className="w-11 h-11 rounded-2xl bg-primary/10 items-center justify-center">
            <Stethoscope size={20} color={Colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-sm text-midnight">{rx.doctor}</Text>
            <Text className="text-[11px] text-slate-400 mt-0.5">{rx.specialty}</Text>
          </View>
          {pendingCount > 0 ? (
            <View className="bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex-row items-center gap-1">
              <AlertCircle size={10} color="#D97706" />
              <Text className="text-amber-600 text-[10px] font-bold">{pendingCount} Pending</Text>
            </View>
          ) : (
            <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-row items-center gap-1">
              <CheckCircle2 size={10} color="#059669" />
              <Text className="text-emerald-600 text-[10px] font-bold">All Done</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-2 mt-2.5 ml-[56px]">
          <View className="flex-row items-center gap-1">
            <Video size={10} color="#94A3B8" />
            <Text className="text-[10px] text-slate-400 font-medium">{rx.consultationType}</Text>
          </View>
          <View className="w-1 h-1 rounded-full bg-slate-300" />
          <View className="flex-row items-center gap-1">
            <Calendar size={10} color="#94A3B8" />
            <Text className="text-[10px] text-slate-400 font-medium">{rx.date}</Text>
          </View>
        </View>
        {/* Progress bar */}
        <View className="flex-row items-center gap-2.5 mt-3 ml-[56px]">
          <View className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: progress === 100 ? '#059669' : Colors.primary }}
            />
          </View>
          <Text className="text-[10px] text-slate-400 font-semibold">{completedCount}/{rx.tests.length}</Text>
        </View>
      </View>

      {/* Tests List */}
      <View className="px-4 py-1">
        {rx.tests.map((test, idx) => (
          <View
            key={idx}
            className="flex-row items-center justify-between py-3.5"
            style={idx < rx.tests.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : undefined}
          >
            <View className="flex-row items-center gap-3 flex-1 mr-3">
              <View className={`w-7 h-7 rounded-lg items-center justify-center ${test.hasResult ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                {test.hasResult ? (
                  <CheckCircle2 size={14} color="#059669" />
                ) : (
                  <Clock size={14} color="#94A3B8" />
                )}
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-[13px] text-midnight">{test.name}</Text>
                {test.hasResult ? (
                  <View className="flex-row items-center gap-1.5 mt-0.5">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <Text className="text-[11px] text-emerald-600 font-medium">{test.subtitle}</Text>
                  </View>
                ) : (
                  <Text className="text-[11px] text-slate-400 mt-0.5">{test.subtitle}</Text>
                )}
              </View>
            </View>
            {test.hasResult ? (
              <Pressable
                onPress={() => onView(test.name)}
                className="flex-row items-center gap-1.5 border border-primary/20 px-4 py-2 rounded-full active:opacity-70"
              >
                <Eye size={12} color={Colors.primary} />
                <Text className="text-primary text-[11px] font-bold">View</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => onUpload(test.name)}
                className="flex-row items-center gap-1.5 bg-primary px-4 py-2 rounded-full active:opacity-80"
              >
                <Upload size={12} color="#FFFFFF" />
                <Text className="text-white text-[11px] font-bold">Upload</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </View>
  );
});

const MedicationCard = React.memo(function MedicationCard({
  med,
  onPress,
}: {
  med: typeof MEDICATIONS[0];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mx-6 mb-3 bg-white rounded-2xl p-4 active:opacity-80"
      style={Shadows.card}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-3">
          <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
            <Pill size={20} color={Colors.primary} />
          </View>
          <View>
            <Text className="text-sm font-semibold text-midnight">{med.name}</Text>
            <StatusBadge text={med.label} color={med.labelColor} />
          </View>
        </View>
        <Text className="text-xl font-bold text-midnight">{med.adherence}%</Text>
      </View>
      <ProgressBar percent={med.adherence} color={med.labelColor} />
    </Pressable>
  );
});

/* ───── Utility ───── */

const generateBars = (count: number, min: number, max: number) =>
  Array.from({ length: count }, () => Math.round(min + Math.random() * (max - min)));

/* ───── Main Screen ───── */

export default function HealthScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const [period, setPeriod] = useState<TimePeriod>('30 Days');
  const [recordsTab, setRecordsTab] = useState<'prescribed' | 'uploads'>('prescribed');
  const [liveConsultations, setLiveConsultations] = useState<ConsultationItem[]>([]);
  const [docUploading, setDocUploading] = useState(false);
  const [myUploads, setMyUploads] = useState<{ name: string; url: string; date: string }[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);

  const loadMyUploads = useCallback(async () => {
    if (!userId) return;
    setUploadsLoading(true);
    try {
      const files = await uploadService.listFiles(`medical-documents/${userId}`);
      setMyUploads(files.map(f => ({
        name: decodeURIComponent(f.name.replace(/^\d+\./, '').replace(/-/g, ' ')),
        url: f.url,
        date: new Date(parseInt(f.name.split('.')[0]) || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      })));
    } catch {
      // silently fail — uploads may be empty
    } finally {
      setUploadsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    patientService.getConsultationHistory(1, 10)
      .then((res) => setLiveConsultations(res.consultations))
      .catch((err) => console.error('Failed to load consultations:', err));
    loadMyUploads();
  }, [loadMyUploads]);

  const barCount = useMemo(
    () => (period === '7 Days' ? 7 : period === '30 Days' ? 15 : period === '90 Days' ? 20 : 24),
    [period],
  );

  // Memoize bar data so it doesn't regenerate on every render
  const vitalBars = useMemo(
    () => Object.keys(VITAL_METRICS).reduce<Record<string, number[]>>((acc, key) => {
      acc[key] = generateBars(barCount, 30, 100);
      return acc;
    }, {}),
    [barCount],
  );

  // Pending tests summary
  const testsSummary = useMemo(() => {
    let totalPending = 0;
    let totalCompleted = 0;
    PRESCRIBED_TESTS.forEach((rx) => {
      rx.tests.forEach((t) => {
        if (t.hasResult) totalCompleted++;
        else totalPending++;
      });
    });
    return { totalPending, totalCompleted, total: totalPending + totalCompleted };
  }, []);

  const vitalEntries = useMemo(() => Object.entries(VITAL_METRICS), []);

  /* ── Callbacks ── */

  const showVitalDetail = useCallback((key: string) => {
    const m = VITAL_METRICS[key as keyof typeof VITAL_METRICS];
    const lines = Object.entries(m.detail).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`);
    CustomAlert.alert(`${m.label} Details`, lines.join('\n'), [{ text: 'OK' }]);
  }, []);

  const showLabDetail = useCallback((report: typeof LAB_REPORTS[0]) => {
    CustomAlert.alert(report.name, `Date: ${report.date}\nDoctor: ${report.doctor}\nStatus: ${report.status}\n\n${report.values}`, [{ text: 'OK' }]);
  }, []);

  const showLabPdf = useCallback((report: typeof LAB_REPORTS[0]) => {
    CustomAlert.alert('View Result', `Opening ${report.name} report (PDF viewer).\n\nDate: ${report.date}\nOrdered by: ${report.doctor}`, [{ text: 'OK' }]);
  }, []);

  const handleDownload = useCallback(() => {
    CustomAlert.alert('Generating Report', 'Generating your comprehensive health report...', [
      {
        text: 'OK',
        onPress: () =>
          setTimeout(() => {
            CustomAlert.alert(
              'Report Downloaded',
              'Report downloaded successfully.\n\nIncludes:\n• Vitals summary\n• Lab reports\n• Medication adherence\n• Care plan progress',
              [{ text: 'OK' }],
            );
          }, 600),
      },
    ]);
  }, []);

  const handleShare = useCallback(() => {
    CustomAlert.alert('Share Health Report', 'Choose an option:', [
      { text: 'Share with Dr. Aruna Devi', onPress: () => CustomAlert.alert('Shared', 'Report sent to Dr. Aruna Devi securely.') },
      { text: 'Share with Family', onPress: () => CustomAlert.alert('Shared', 'Report shared with your family members.') },
      { text: 'Export as PDF', onPress: () => CustomAlert.alert('Exported', 'PDF exported to your device.') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const showMedDetail = useCallback((med: typeof MEDICATIONS[0]) => {
    CustomAlert.alert(
      med.name,
      `Adherence: ${med.adherence}% (${med.label})\n\nMissed dates: ${med.missedDates}\n\n${med.pattern}`,
      [{ text: 'OK' }],
    );
  }, []);

  const pickAndUploadDocument = useCallback(async (source: 'camera' | 'gallery', label: string) => {
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
      await uploadService.uploadMedicalDocument(
        userId ?? 'guest',
        result.assets[0].uri,
        `${label.replace(/\s+/g, '-').toLowerCase()}.jpg`,
      );
      CustomAlert.alert('Uploaded', `${label} uploaded successfully to your health records.`);
      loadMyUploads();
    } catch (err: any) {
      const msg = err?.message ?? err?.error_description ?? JSON.stringify(err);
      console.error('Document upload error:', msg);
      CustomAlert.alert('Upload Failed', msg || 'Could not upload document.');
    } finally {
      setDocUploading(false);
    }
  }, [userId, loadMyUploads]);

  const handleUploadResult = useCallback((testName: string) => {
    CustomAlert.alert(
      `Upload: ${testName}`,
      'Choose a source',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: () => pickAndUploadDocument('camera', testName) },
        { text: 'Choose from Gallery', onPress: () => pickAndUploadDocument('gallery', testName) },
      ],
    );
  }, [pickAndUploadDocument]);

  const handleViewResult = useCallback((testName: string) => {
    CustomAlert.alert(
      testName,
      'This report is stored in your Supabase health records.',
      [
        { text: 'OK' },
        { text: 'Share with Doctor', onPress: () => CustomAlert.alert('Shared', `${testName} report shared with your doctor.`) },
      ],
    );
  }, []);

  const handleUploadNew = useCallback(() => {
    CustomAlert.alert(
      'Upload Document',
      'What type of document?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Lab Report', onPress: () => pickAndUploadDocument('gallery', 'Lab Report') },
        { text: 'Prescription', onPress: () => pickAndUploadDocument('gallery', 'Prescription') },
        { text: 'Other', onPress: () => pickAndUploadDocument('gallery', 'Medical Document') },
      ],
    );
  }, [pickAndUploadDocument]);

  const handleConsultationTap = useCallback((item: ConsultationItem) => {
    CustomAlert.alert(
      item.doctorName,
      `Specialty: ${item.specialty}\nDate: ${item.scheduleDate}\nTime: ${item.time}\n\n${item.notes ? `Notes: ${item.notes}` : 'No notes recorded.'}`,
      [
        { text: 'OK' },
        ...(item.hasPrescription ? [{
          text: 'View Prescription',
          onPress: () => router.push({ pathname: '/patient/digital-prescription' as any, params: { appointmentId: item.id } }),
        }] : []),
        { text: 'Book Follow-up', onPress: () => router.push('/patient/consultation-type') },
      ] as any[],
    );
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
          <Text className="text-3xl font-extrabold tracking-tight text-midnight">Health</Text>
          <Pressable
            onPress={handleShare}
            className="w-10 h-10 rounded-full bg-white items-center justify-center"
            style={Shadows.card}
          >
            <Share2 size={18} color={Colors.primary} />
          </Pressable>
        </View>

        {/* ── Pending Tests Alert Banner ── */}
        {testsSummary.totalPending > 0 && (
          <Pressable
            onPress={() => setRecordsTab('prescribed')}
            className="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center gap-3 active:opacity-80"
          >
            <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center">
              <AlertCircle size={20} color="#D97706" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-amber-800">
                {testsSummary.totalPending} Test{testsSummary.totalPending > 1 ? 's' : ''} Pending Upload
              </Text>
              <Text className="text-[11px] text-amber-600 mt-0.5">
                {testsSummary.totalCompleted} of {testsSummary.total} results uploaded
              </Text>
            </View>
            <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center">
              <Text className="text-amber-700 font-extrabold text-sm">
                {Math.round((testsSummary.totalCompleted / testsSummary.total) * 100)}%
              </Text>
            </View>
          </Pressable>
        )}

        {/* ── Time Period Selector ── */}
        <View className="px-6 mb-5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {TIME_PERIODS.map((p) => {
              const active = p === period;
              return (
                <Pressable
                  key={p}
                  onPress={() => setPeriod(p)}
                  className={`px-5 py-2 rounded-full ${active ? 'bg-primary' : 'bg-white'}`}
                  style={!active ? Shadows.card : undefined}
                >
                  <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-500'}`}>{p}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Vitals Trends ── */}
        <View className="px-6 mb-2">
          <View className="flex-row items-center gap-2 mb-4">
            <Text className="text-lg font-semibold tracking-tight text-midnight">Vitals Trends</Text>
            <Pressable onPress={() => CustomAlert.alert('Vitals Trends', 'Charts show your recorded vitals over the selected time period. Tap any card for detailed statistics.')}>
              <Info size={16} color="#94A3B8" />
            </Pressable>
          </View>
        </View>

        {vitalEntries.map(([key, m]) => (
          <VitalCard
            key={key}
            metricKey={key}
            metric={m}
            bars={vitalBars[key]}
            onPress={showVitalDetail}
          />
        ))}

        {/* ── Lab Reports ── */}
        <View className="px-6 mt-4 mb-2">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold tracking-tight text-midnight">Lab Reports</Text>
            <Pressable onPress={() => CustomAlert.alert('Filter', 'Filter by date, doctor, or status.')}>
              <Filter size={18} color="#94A3B8" />
            </Pressable>
          </View>
        </View>

        {LAB_REPORTS.map((report, idx) => (
          <LabReportCard
            key={idx}
            report={report}
            onDetail={() => showLabDetail(report)}
            onViewPdf={() => showLabPdf(report)}
          />
        ))}

        {/* ── Medical Records ── */}
        <View className="px-6 mt-4 mb-2">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <FolderOpen size={18} color="#0B1B3D" />
              <Text className="text-lg font-semibold tracking-tight text-midnight">Medical Records</Text>
            </View>
            <Pressable onPress={handleUploadNew} disabled={docUploading} className="flex-row items-center gap-1 px-3 py-1.5 bg-primary/10 rounded-full active:opacity-70">
              {docUploading
                ? <ActivityIndicator size={12} color={Colors.primary} />
                : <Plus size={12} color={Colors.primary} />}
              <Text className="text-[11px] font-bold text-primary">{docUploading ? 'Uploading…' : 'Upload'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Segmented Control */}
        <View className="flex-row mx-6 p-1.5 bg-slate-100/60 rounded-full mb-4">
          <Pressable
            onPress={() => setRecordsTab('prescribed')}
            className={`flex-1 py-2.5 rounded-full items-center ${recordsTab === 'prescribed' ? 'bg-white' : ''}`}
            style={recordsTab === 'prescribed' ? Shadows.card : undefined}
          >
            <View className="flex-row items-center gap-1.5">
              <Text className={`text-xs font-semibold ${recordsTab === 'prescribed' ? 'text-primary' : 'text-slate-400'}`}>
                Doctor Prescribed
              </Text>
              {testsSummary.totalPending > 0 && recordsTab !== 'prescribed' && (
                <View className="w-5 h-5 rounded-full bg-amber-500 items-center justify-center">
                  <Text className="text-white text-[9px] font-bold">{testsSummary.totalPending}</Text>
                </View>
              )}
            </View>
          </Pressable>
          <Pressable
            onPress={() => setRecordsTab('uploads')}
            className={`flex-1 py-2.5 rounded-full items-center ${recordsTab === 'uploads' ? 'bg-white' : ''}`}
            style={recordsTab === 'uploads' ? Shadows.card : undefined}
          >
            <Text className={`text-xs font-semibold ${recordsTab === 'uploads' ? 'text-primary' : 'text-slate-400'}`}>
              My Uploads
            </Text>
          </Pressable>
        </View>

        {recordsTab === 'prescribed' ? (
          <>
            {/* Prescribed Tests from Online Consultations */}
            {PRESCRIBED_TESTS.map((rx, rxIdx) => (
              <PrescribedTestCard
                key={rxIdx}
                rx={rx}
                onUpload={handleUploadResult}
                onView={handleViewResult}
              />
            ))}

            {/* Recent Consultation History */}
            <View className="px-6 mb-2">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-sm font-semibold text-midnight">Recent Consultations</Text>
                <Pressable onPress={() => router.push('/patient/(tabs)/bookings' as any)}>
                  <Text className="text-xs font-semibold text-primary">View All</Text>
                </Pressable>
              </View>
            </View>

            {liveConsultations.length === 0 ? (
              <View className="mx-6 mb-4 bg-white rounded-2xl p-6 items-center" style={Shadows.card}>
                <Stethoscope size={28} color="#CBD5E1" />
                <Text className="text-slate-400 text-xs mt-2">No completed consultations yet</Text>
              </View>
            ) : (
              <View className="mx-6 mb-4 bg-white rounded-2xl overflow-hidden" style={Shadows.card}>
                {liveConsultations.slice(0, 5).map((item, idx) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleConsultationTap(item)}
                    className="px-4 py-3.5 flex-row items-center gap-3 active:bg-slate-50"
                    style={idx < Math.min(liveConsultations.length, 5) - 1 ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : undefined}
                  >
                    <View className="w-9 h-9 rounded-xl items-center justify-center bg-primary/10">
                      <Stethoscope size={16} color={Colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-xs text-midnight">{item.doctorName}</Text>
                      <Text className="text-[11px] text-slate-400">{item.specialty} - {item.scheduleDate}</Text>
                    </View>
                    {item.hasPrescription && (
                      <View className="px-2 py-0.5 rounded-full bg-emerald-50 mr-1">
                        <Text className="text-[9px] font-bold text-emerald-600">Rx</Text>
                      </View>
                    )}
                    <ChevronRight size={14} color="#CBD5E1" />
                  </Pressable>
                ))}
              </View>
            )}

            {/* Annual Checkup Reminder */}
            <View className="mx-6 mb-4">
              <Pressable
                onPress={() => {
                  CustomAlert.alert('Annual Checkup', 'You haven\'t had a complete body checkup in 12 months.\n\nRecommended tests:\n- Complete Blood Count\n- Comprehensive Metabolic Panel\n- Lipid Panel\n- Thyroid Function\n- HbA1c\n- Chest X-Ray\n- ECG', [
                    { text: 'Later' },
                    { text: 'Book Now', onPress: () => router.push('/patient/consultation-type') },
                  ]);
                }}
                className="bg-primary rounded-2xl p-5 active:opacity-90"
              >
                <Text className="font-bold text-base text-white mb-1">Annual Checkup Due</Text>
                <Text className="text-blue-100 text-xs font-light mb-3">
                  You haven't had a complete checkup in 12 months. Schedule now for early detection.
                </Text>
                <View className="bg-white px-5 py-2.5 rounded-full self-start">
                  <Text className="text-primary text-xs font-bold">Book Appointment</Text>
                </View>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            {/* My Uploads */}
            {uploadsLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator color="#1A73E8" />
                <Text className="text-xs text-slate-400 mt-2">Loading your documents…</Text>
              </View>
            ) : myUploads.length === 0 ? (
              <View className="mx-6 mb-4 bg-white rounded-2xl p-6 items-center border border-dashed border-slate-200">
                <FolderOpen size={28} color="#CBD5E1" />
                <Text className="text-sm font-bold text-slate-400 mt-2">No documents yet</Text>
                <Text className="text-[11px] text-slate-400 mt-1 text-center">Upload lab reports, prescriptions, or other documents</Text>
              </View>
            ) : myUploads.map((upload, idx) => (
              <Pressable
                key={idx}
                onPress={() => CustomAlert.alert(upload.name, `Uploaded: ${upload.date}`, [
                  { text: 'Close' },
                  {
                    text: 'Delete', style: 'destructive',
                    onPress: () => CustomAlert.alert('Delete Document', `Remove "${upload.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete', style: 'destructive',
                        onPress: async () => {
                          try {
                            const path = `medical-documents/${userId}/${upload.url.split('/').pop()}`;
                            await uploadService.deleteFile(path);
                            setMyUploads(prev => prev.filter((_, i) => i !== idx));
                          } catch {
                            CustomAlert.alert('Error', 'Could not delete document.');
                          }
                        },
                      },
                    ]),
                  },
                ])}
                className="mx-6 mb-3 bg-white rounded-2xl p-4 active:opacity-80"
                style={Shadows.card}
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
                    <FileText size={18} color="#64748B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-midnight" numberOfLines={1}>{upload.name}</Text>
                    <Text className="text-[11px] text-slate-400 mt-0.5">{upload.date}</Text>
                  </View>
                  <ChevronRight size={14} color="#CBD5E1" />
                </View>
              </Pressable>
            ))}

            {/* Upload New Button */}
            <Pressable
              onPress={handleUploadNew}
              className="mx-6 mb-4 bg-white rounded-2xl p-4 items-center border border-dashed border-slate-200 active:opacity-70"
            >
              <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mb-2">
                <Upload size={18} color={Colors.primary} />
              </View>
              <Text className="text-xs font-bold text-primary">Upload New Document</Text>
              <Text className="text-[10px] text-slate-400 mt-0.5">PDF, JPG, PNG up to 10 MB</Text>
            </Pressable>
          </>
        )}

        {/* ── Medication Adherence ── */}
        <View className="px-6 mt-4 mb-2">
          <View className="flex-row items-center gap-2 mb-4">
            <Text className="text-lg font-semibold tracking-tight text-midnight">Medication Adherence</Text>
            <Pressable onPress={() => CustomAlert.alert('Medication Adherence', 'Shows how consistently you take your prescribed medications. Tap a medication for details.')}>
              <Info size={16} color="#94A3B8" />
            </Pressable>
          </View>
        </View>

        {/* Overall adherence */}
        <Pressable
          onPress={() => CustomAlert.alert('Overall Adherence', 'Your overall medication adherence is 93% for the past 30 days.\n\nThis is calculated across all active prescriptions. Keep it up!')}
          className="mx-6 mb-3 bg-white rounded-2xl p-4 active:opacity-80"
          style={Shadows.card}
        >
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
                <CheckCircle2 size={20} color="#22C55E" />
              </View>
              <View>
                <Text className="text-sm font-semibold text-midnight">Overall Adherence</Text>
                <Text className="text-xs text-slate-400">Past {period.toLowerCase()}</Text>
              </View>
            </View>
            <Text className="text-2xl font-bold text-emerald-600">93%</Text>
          </View>
          <ProgressBar percent={93} color="#22C55E" />
        </Pressable>

        {/* Per-medication */}
        {MEDICATIONS.map((med, idx) => (
          <MedicationCard key={idx} med={med} onPress={() => showMedDetail(med)} />
        ))}

        {/* ── Health Report Download / Share ── */}
        <View className="px-6 mt-4 mb-6">
          <Pressable
            onPress={handleDownload}
            className="bg-primary rounded-2xl p-5 active:opacity-90"
            style={Shadows.card}
          >
            <View className="flex-row items-center gap-3 mb-3">
              <View className="w-10 h-10 rounded-xl bg-white/20 items-center justify-center">
                <FileText size={20} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-white">Health Report</Text>
                <Text className="text-xs text-blue-100 mt-0.5">Download or share your complete health report</Text>
              </View>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleDownload}
                className="flex-1 flex-row items-center justify-center gap-2 bg-white rounded-xl py-3"
              >
                <Download size={16} color={Colors.primary} />
                <Text className="text-sm font-bold text-primary">Download PDF</Text>
              </Pressable>
              <Pressable
                onPress={handleShare}
                className="flex-1 flex-row items-center justify-center gap-2 bg-white/20 rounded-xl py-3 border border-white/30"
              >
                <Send size={16} color="#FFFFFF" />
                <Text className="text-sm font-bold text-white">Share with Doctor</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
