import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Image, Switch, Modal, Animated, RefreshControl, Dimensions, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import { patientService, CarePlan, PatientNotification } from '@/services/patientService';
import {
  getTodayMood, logMood, TodayMood,
  getWaterSettings, logWaterIntake, WaterSettings,
  getTodayPhysio, TodayPhysio,
  getLatestVitals, LatestVitals,
  getHealthTips, HealthTip,
} from '@/services/patientDashboardService';
import { scheduleWaterReminders, configureNotificationHandler } from '@/services/waterReminders';
import {
  Bell, Check, Droplets, Pill, CalendarPlus, Package, FileText,
  BriefcaseMedical, Sun, Moon, Sunrise, Sunset, Heart, Activity,
  Apple, Dumbbell, X, Clock, AlertTriangle, Flame, TrendingUp,
  Zap, ChevronRight, Sparkles, Wind, Gauge, Footprints,
  CircleAlert, SkipForward, Timer, Lightbulb, Award, Watch, Info,
  Smile, Frown, Meh, ThumbsUp, HeartPulse, Thermometer,
} from 'lucide-react-native';

// ─── Types ───
type TaskCategory = 'medicine' | 'physio' | 'diet' | 'vitals' | 'hydration';
type TaskStatus = 'pending' | 'completed' | 'overdue' | 'missed' | 'snoozed';
type TimeOfDay = 'morning' | 'afternoon' | 'evening';

interface DosageSchedule {
  morning: number;
  afternoon: number;
  evening: number;
}

interface CareTask {
  id: string;
  title: string;
  subtitle?: string;
  category: TaskCategory;
  scheduledTime: string;
  timeOfDay: TimeOfDay;
  status: TaskStatus;
  dosage?: DosageSchedule;
  color: string;
  bgColor: string;
}

// ─── Category Config ───
const categoryConfig: Record<TaskCategory, { icon: any; color: string; bg: string; label: string }> = {
  medicine:  { icon: Pill,      color: '#1A73E8', bg: '#EEF4FF', label: 'Medicine' },
  physio:    { icon: Dumbbell,  color: '#8B5CF6', bg: '#F3EEFF', label: 'Physiotherapy' },
  diet:      { icon: Apple,     color: '#22C55E', bg: '#EEFBF4', label: 'Diet' },
  vitals:    { icon: Heart,     color: '#EF4444', bg: '#FEF2F2', label: 'Vitals' },
  hydration: { icon: Droplets,  color: '#0EA5E9', bg: '#F0F9FF', label: 'Hydration' },
};

const timeIcons: Record<TimeOfDay, { icon: any; label: string; color: string }> = {
  morning:   { icon: Sunrise, label: 'Morning',   color: '#F59E0B' },
  afternoon: { icon: Sun,     label: 'Afternoon',  color: '#EA580C' },
  evening:   { icon: Moon,    label: 'Evening',    color: '#6366F1' },
};

// ─── Care Plan Builder ───

function format24to12(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${suffix}`;
}

function getTimeOfDay(time: string): TimeOfDay {
  const h = parseInt(time.split(':')[0], 10);
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatApptDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function buildTasksFromCarePlan(data: CarePlan): CareTask[] {
  const tasks: CareTask[] = [];

  // Upcoming appointment → vitals task
  if (data.upcomingAppointment) {
    const appt = data.upcomingAppointment;
    const time12 = format24to12(appt.startTime);
    tasks.push({
      id: `appt-${appt.id}`,
      title: `Appointment: ${appt.doctorName.replace(/^Dr\.?\s*/i, 'Dr. ')}`,
      subtitle: `${formatApptDate(appt.scheduleDate)} at ${time12} • ${appt.specialty}`,
      category: 'vitals',
      scheduledTime: time12,
      timeOfDay: getTimeOfDay(appt.startTime),
      status: 'pending',
      color: '#EF4444',
      bgColor: '#FEF2F2',
    });
  }

  // Prescription notes → medicine tasks
  data.prescriptionNotes.forEach((rx) => {
    const shortNote = rx.notes.length > 65 ? rx.notes.substring(0, 65) + '…' : rx.notes;
    tasks.push({
      id: `rx-${rx.appointmentId}`,
      title: `Dr. ${rx.doctorName.replace(/^Dr\.?\s*/i, '')} — Instructions`,
      subtitle: shortNote,
      category: 'medicine',
      scheduledTime: '8:00 AM',
      timeOfDay: 'morning',
      status: 'pending',
      color: '#1A73E8',
      bgColor: '#EEF4FF',
    });
  });

  return tasks;
}

// ─── Health Tips — fallback used if API has no data ───
const FALLBACK_TIPS = [
  { title: 'Stay Hydrated', body: 'Drink at least 8 glasses of water daily to support kidney function and energy levels.', icon: Droplets, color: '#0EA5E9' },
  { title: 'Move Every Hour', body: 'Stand up and walk for 2–3 minutes every hour to keep your circulation active.', icon: Footprints, color: '#8B5CF6' },
  { title: 'Consistent Meals', body: 'Eating meals at the same time daily helps regulate your blood sugar levels.', icon: Apple, color: '#22C55E' },
  { title: 'Breathe Deeply', body: '5 minutes of deep breathing can lower your blood pressure by 5–10 points.', icon: Wind, color: '#38BDF8' },
  { title: 'Take Medications on Time', body: 'Taking medications at the same time daily improves their effectiveness.', icon: Clock, color: '#1A73E8' },
];

// ─── Notification Config ───
const notificationConfig: Record<string, { icon: any; color: string }> = {
  appointment:           { icon: CalendarPlus, color: '#8B5CF6' },
  prescription_ready:    { icon: Package,      color: '#059669' },
  prescription_pending:  { icon: Pill,         color: '#1A73E8' },
  consultation_summary:  { icon: FileText,     color: '#0EA5E9' },
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

// ─── Motivational Messages ───
const motivationalMessages = [
  { threshold: 1.0, message: 'Perfect day! You\'re taking amazing care of yourself.', emoji: '🌟' },
  { threshold: 0.8, message: 'Almost there! Just a few tasks left today.', emoji: '💪' },
  { threshold: 0.5, message: 'Great progress! Keep up the momentum.', emoji: '👍' },
  { threshold: 0.3, message: 'Good start! Every step counts toward better health.', emoji: '🚶' },
  { threshold: 0.0, message: 'Your health journey starts with one step. Let\'s go!', emoji: '🌱' },
];

// ─── Segmented Sweep Ring ───
// Gradient sweep + glow leading edge + dot markers at breaks
function SweepRing({ completedCount, totalCount, size = 130, strokeWidth = 8, color = '#1A73E8' }: {
  completedCount: number;
  totalCount: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = 8;
  const segLen = (circumference - totalCount * gap) / totalCount;
  const dotRadius = 4;

  // Hex to RGB for opacity control
  const hexToRgb = (hex: string) => {
    const h = hex.replace('#', '');
    return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
  };
  const rgb = hexToRgb(color);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* SVG segments */}
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {Array.from({ length: totalCount }).map((_, i) => {
          const isCompleted = i < completedCount;
          const isLeading = i === completedCount - 1 && completedCount < totalCount;
          const offset = -(i * (segLen + gap));
          // Gradient: first completed = 0.3 opacity, last = 1.0
          const segOpacity = completedCount > 1
            ? 0.3 + (i / (completedCount - 1)) * 0.7
            : 1;
          const segColor = isCompleted
            ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${segOpacity})`
            : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;

          return (
            <Circle
              key={i}
              cx={size / 2} cy={size / 2} r={radius}
              stroke={segColor}
              strokeWidth={isCompleted ? strokeWidth : strokeWidth - 3}
              fill="none"
              strokeDasharray={`${segLen} ${circumference - segLen}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              rotation={-90}
              origin={`${size / 2}, ${size / 2}`}
            />
          );
        })}
      </Svg>

      {/* Dot markers at each break point */}
      {Array.from({ length: totalCount }).map((_, i) => {
        const angle = ((i / totalCount) * 360 - 90) * (Math.PI / 180);
        const dx = radius * Math.cos(angle);
        const dy = radius * Math.sin(angle);
        const isCompleted = i < completedCount;
        const isLeading = i === completedCount - 1 && completedCount < totalCount;
        return (
          <View
            key={`dot-${i}`}
            style={{
              position: 'absolute',
              width: dotRadius * 2,
              height: dotRadius * 2,
              borderRadius: dotRadius,
              backgroundColor: isCompleted ? color : `${color}20`,
              borderWidth: 2,
              borderColor: isCompleted ? '#FFFFFF' : `${color}10`,
              transform: [{ translateX: dx }, { translateY: dy }],
              ...(isLeading ? {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 6,
                elevation: 5,
                width: dotRadius * 2.5,
                height: dotRadius * 2.5,
                borderRadius: dotRadius * 1.25,
              } : {}),
            }}
          />
        );
      })}
    </View>
  );
}

// ─── Simple Progress Ring (SVG-based) ───
function HealthRing({ progress, size = 52, strokeWidth = 5, color = '#22C55E' }: {
  progress: number; size?: number; strokeWidth?: number; color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * progress;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={`${color}18`} strokeWidth={strokeWidth} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={`${filled} ${circumference - filled}`} strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`} />
    </Svg>
  );
}

// ─── Vital Gauge (SVG) ───
function VitalGauge({ value, unit, label, color, progress, onPress }: {
  value: string; unit: string; label: string; color: string; progress: number; onPress?: () => void;
}) {
  const size = 68;
  const sw = 5;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * progress;
  return (
    <Pressable onPress={onPress} className="items-center flex-1 active:opacity-70">
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={`${color}18`} strokeWidth={sw} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none"
            strokeDasharray={`${filled} ${circ - filled}`} strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`} />
        </Svg>
        <View className="items-center">
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#0B1B3D' }}>{value}</Text>
          <Text style={{ fontSize: 7, color, fontWeight: '700', marginTop: -2 }}>{unit}</Text>
        </View>
      </View>
      <Text className="text-[10px] text-slate-500 mt-1 font-medium">{label}</Text>
    </Pressable>
  );
}

// ─── Dosage Badge ───
function DosageBadge({ dosage }: { dosage: DosageSchedule }) {
  const slots = [
    { count: dosage.morning, icon: Sunrise, label: 'Morn', color: '#F59E0B' },
    { count: dosage.afternoon, icon: Sun, label: 'Aft', color: '#EA580C' },
    { count: dosage.evening, icon: Moon, label: 'Eve', color: '#6366F1' },
  ].filter(s => s.count > 0);

  return (
    <View className="flex-row items-center gap-1 mt-1.5">
      {slots.map((slot, i) => {
        const Icon = slot.icon;
        return (
          <View key={i} className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${slot.color}12` }}>
            <Icon size={9} color={slot.color} />
            <Text style={{ fontSize: 9, fontWeight: '700', color: slot.color }}>{slot.count}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Dashboard ───
export default function PatientDashboard() {
  const router = useRouter();
  const userName = useAuthStore((s) => s.userName);
  const [shareLive, setShareLive] = useState(true);
  const [watchConnected, setWatchConnected] = useState(false);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // ── Live dashboard state ──
  const [todayMoodData, setTodayMoodData]   = useState<TodayMood | null>(null);
  const [waterData, setWaterData]           = useState<WaterSettings | null>(null);
  const [physioToday, setPhysioToday]       = useState<TodayPhysio | null>(null);
  const [latestVitals, setLatestVitals]     = useState<LatestVitals | null>(null);
  const [apiTips, setApiTips]               = useState<HealthTip[]>([]);
  const [waterLogLoading, setWaterLogLoading] = useState(false);

  const loadCarePlan = useCallback(() => {
    patientService.getCarePlan()
      .then((data) => setTasks(buildTasksFromCarePlan(data)))
      .catch(() => { /* silently fall back to empty; defaults already in builder */ });
  }, []);

  const loadNotifications = useCallback(() => {
    patientService.getNotifications()
      .then((data) => setNotifications(data))
      .catch(() => {});
  }, []);

  const loadDashboard = useCallback(() => {
    getTodayMood().then(setTodayMoodData).catch(() => {});
    getWaterSettings().then(setWaterData).catch(() => {});
    getTodayPhysio().then(setPhysioToday).catch(() => {});
    getLatestVitals().then(setLatestVitals).catch(() => {});
    getHealthTips(undefined, 5).then(setApiTips).catch(() => {});
  }, []);

  useEffect(() => {
    configureNotificationHandler();
    loadCarePlan();
    loadNotifications();
    loadDashboard();
  }, [loadCarePlan, loadNotifications, loadDashboard]);
  const [showNudge, setShowNudge] = useState(true);
  const [activeCategory, setActiveCategory] = useState<TaskCategory | null>(null);
  const taskScrollRef = useRef<ScrollView>(null);
  const tipIndex = useState(Math.floor(Math.random() * FALLBACK_TIPS.length))[0];
  const [streak] = useState(7);
  const [mood, setMood] = useState<string | null>(null);

  // Sync mood widget with today's API data.
  // API stores labels as 'bad'/'terrible' but UI keys are 'unwell'/'pain' — reverse-map.
  useEffect(() => {
    if (todayMoodData?.mood_label) {
      const labelToKey: Record<string, string> = {
        great: 'great', good: 'good', okay: 'okay', bad: 'unwell', terrible: 'pain',
      };
      setMood(labelToKey[todayMoodData.mood_label] ?? todayMoodData.mood_label);
    }
  }, [todayMoodData]);

  // ─── Computed Stats ───
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t => t.status === 'overdue').length;
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const unreadCount = notifications.filter(n => !n.read).length;

  // Get next upcoming task
  const nextTask = tasks.find(t => t.status === 'pending' || t.status === 'overdue');

  // Motivational message
  const motivMsg = motivationalMessages.find(m => progress >= m.threshold) || motivationalMessages[motivationalMessages.length - 1];

  // ─── Handlers ───
  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed' as TaskStatus } : t));
  };

  const handleOverdueAction = (task: CareTask) => {
    CustomAlert.alert(
      'Overdue Task',
      `"${task.title}" was due at ${task.scheduledTime}.\n\nWhat would you like to do?`,
      [
        {
          text: 'Log Late Dose',
          onPress: () => {
            handleCompleteTask(task.id);
            CustomAlert.alert('Logged', `${task.title} has been logged as taken late. Your doctor will see this in your adherence report.`);
          },
        },
        {
          text: 'Skip This Dose',
          style: 'destructive',
          onPress: () => {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'missed' as TaskStatus } : t));
            CustomAlert.alert('Skipped', `${task.title} has been marked as skipped. Remember: don't double your next dose.`);
          },
        },
        {
          text: 'Snooze 1 Hour',
          onPress: () => {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'snoozed' as TaskStatus } : t));
            CustomAlert.alert('Snoozed', `We'll remind you about ${task.title} in 1 hour.`);
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleTaskPress = (task: CareTask) => {
    if (task.status === 'completed') {
      CustomAlert.alert('Completed', `${task.title} was completed successfully.${task.dosage ? '\n\nNext dose: ' + (task.timeOfDay === 'morning' ? 'Evening' : 'Tomorrow Morning') : ''}`);
      return;
    }
    if (task.status === 'missed') {
      CustomAlert.alert('Missed', `${task.title} was skipped. This has been noted in your adherence log.`);
      return;
    }
    if (task.status === 'overdue') {
      handleOverdueAction(task);
      return;
    }
    if (task.category === 'vitals') {
      CustomAlert.alert(
        'Log Vitals',
        `Ready to log your ${task.title.replace('Log ', '')}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enter Reading',
            onPress: () => {
              CustomAlert.alert(
                'Enter Reading',
                task.title.includes('Blood Pressure')
                  ? 'Enter your BP reading:\n\nSystolic: ___  Diastolic: ___\n\n(This would open a numeric input form in production)'
                  : task.title.includes('Blood Sugar')
                    ? 'Enter your glucose reading:\n\nValue: ___ mg/dL\n\n(This would open a numeric input form in production)'
                    : 'Enter your reading:\n\n(This would open the appropriate input form)',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Save 120/80',
                    onPress: () => {
                      handleCompleteTask(task.id);
                      CustomAlert.alert('Saved!', `Your ${task.title.replace('Log ', '')} reading has been recorded and synced with your doctor's dashboard.\n\nReading: ${task.title.includes('Blood Pressure') ? '120/80 mmHg' : '105 mg/dL'}\nTime: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
                    },
                  },
                ]
              );
            },
          },
        ]
      );
      return;
    }
    if (task.category === 'hydration') {
      CustomAlert.alert(
        'Water Intake',
        'Log a glass of water?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '+1 Glass',
            onPress: () => {
              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, subtitle: '6 of 8 glasses done' } : t));
              CustomAlert.alert('Logged!', 'Great job staying hydrated! 6 of 8 glasses done.');
            },
          },
          {
            text: '+2 Glasses',
            onPress: () => {
              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, subtitle: '7 of 8 glasses done' } : t));
              CustomAlert.alert('Logged!', 'Almost there! 7 of 8 glasses done.');
            },
          },
        ]
      );
      return;
    }
    // Medicine or physio/diet pending
    CustomAlert.alert(
      task.title,
      `${task.subtitle || ''}\n\nScheduled: ${task.scheduledTime}${task.dosage ? '\n\nToday\'s schedule:\n' + formatDosageText(task.dosage) : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: task.category === 'medicine' ? 'Mark as Taken' : 'Mark Complete',
          onPress: () => handleCompleteTask(task.id),
        },
      ]
    );
  };

  const formatDosageText = (d: DosageSchedule): string => {
    const parts = [];
    if (d.morning) parts.push(`☀️ Morning: ${d.morning} tablet${d.morning > 1 ? 's' : ''}`);
    if (d.afternoon) parts.push(`🌤 Afternoon: ${d.afternoon} tablet${d.afternoon > 1 ? 's' : ''}`);
    if (d.evening) parts.push(`🌙 Evening: ${d.evening} tablet${d.evening > 1 ? 's' : ''}`);
    return parts.join('\n');
  };

  const handleConnectWatch = () => {
    CustomAlert.alert(
      'Connect Your Watch',
      'Pair your smartwatch to unlock Heart Rate and SpO2 monitoring.\n\nSupported devices:\n- Apple Watch (Series 4+)\n- Samsung Galaxy Watch\n- Fitbit Sense / Versa 3+\n- Garmin Venu / Forerunner\n- Any Bluetooth LE health device',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Bluetooth Settings',
          onPress: () => CustomAlert.alert('Bluetooth', 'Opening Bluetooth settings...\n\n(In production, this would open system Bluetooth pairing.)'),
        },
        {
          text: 'Simulate Pairing',
          onPress: () => {
            setWatchConnected(true);
            CustomAlert.alert('Watch Connected!', 'Your smartwatch has been paired successfully.\n\nHeart Rate and SpO2 are now being monitored in real-time.\n\nDevice: Apple Watch Series 9\nBattery: 82%');
          },
        },
      ]
    );
  };

  const handleTapToPair = (vital: string) => {
    CustomAlert.alert(
      `${vital} Unavailable`,
      `${vital} requires a connected smartwatch to measure.\n\nYour watch appears to be disconnected or out of range.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect Watch', onPress: handleConnectWatch },
      ]
    );
  };

  const handleVitalTap = (vital: string) => {
    const details: Record<string, string> = {
      'Heart Rate': 'Current: 72 BPM\nResting avg: 68 BPM\nRange today: 62-85 BPM\n\nStatus: Normal\nLast synced: 2 min ago',
      'SpO2': 'Current: 98%\nAvg today: 97.5%\nLowest today: 96%\n\nStatus: Normal (95-100%)\nLast synced: 2 min ago',
      'Activity': 'Steps today: 6,400 / 10,000\nDistance: 4.2 km\nCalories: 280 kcal\nActive mins: 42\n\nGoal progress: 64%',
    };
    CustomAlert.alert(vital, details[vital] || '', [
      { text: 'OK' },
      { text: 'View Trends', onPress: () => router.push('/patient/(tabs)/records' as any) },
    ]);
  };

  const handleStepNudge = () => {
    CustomAlert.alert(
      'Step Goal Nudge',
      'You\'re 3,600 steps away from your daily goal of 10,000 steps.\n\nTip: A 20-minute evening walk can help you reach your goal and also improves post-dinner blood sugar levels.',
      [
        { text: 'Dismiss', onPress: () => setShowNudge(false) },
        { text: 'Start Walk Timer', onPress: () => {
          CustomAlert.alert('Walk Timer', 'Timer started for 20 minutes.\n\nWe\'ll notify you when time is up. Enjoy your walk!');
          setShowNudge(false);
        }},
      ]
    );
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.allSettled([
      patientService.getCarePlan().then((data) => setTasks(buildTasksFromCarePlan(data))),
      patientService.getNotifications().then((data) => setNotifications(data)),
      getTodayMood().then(setTodayMoodData),
      getWaterSettings().then(setWaterData),
      getTodayPhysio().then(setPhysioToday),
      getLatestVitals().then(setLatestVitals),
      getHealthTips(undefined, 5).then(setApiTips),
    ]).finally(() => setRefreshing(false));
  }, []);

  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  // Use live API tips when available, fall back to local list
  const activeTips = apiTips.length > 0
    ? apiTips.map(t => ({ title: t.title, body: t.body, icon: Lightbulb, color: '#1A73E8' }))
    : FALLBACK_TIPS;
  const currentTip = activeTips[tipIndex % activeTips.length];
  const TipIcon = currentTip.icon;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1A73E8" />}
      >
        {/* ── Header ── */}
        <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
          <View className="flex-row items-center gap-3">
            <Image
              source={require('../../../assets/logo_arunpriya.png')}
              style={{ width: 48, height: 48 }}
              resizeMode="contain"
            />
            <View>
              <Text className="text-[13px] font-bold text-midnight leading-[18px]">
                Arun Priya{'\n'}Multispeciality{'\n'}Hospital
              </Text>
              <Text className="text-[10px] font-bold tracking-[2px] uppercase" style={{ color: '#1A73E8' }}>
                Patient Portal
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable
              onPress={() => setShowNotifications(true)}
              className="w-11 h-11 rounded-full bg-white items-center justify-center active:opacity-70"
              style={Shadows.card}
            >
              <Bell size={20} color="#475569" />
              {unreadCount > 0 && (
                <View className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full items-center justify-center border-2 border-white">
                  <Text className="text-white text-[9px] font-bold">{unreadCount}</Text>
                </View>
              )}
            </Pressable>
            <Pressable
              onPress={() => router.push('/patient/(tabs)/profile' as any)}
              className="w-11 h-11 rounded-full items-center justify-center active:opacity-70"
              style={{ backgroundColor: '#F4C5A8' }}
            >
              <Text className="text-sm font-bold text-white">
                {(userName || 'DM').slice(0, 2).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Greeting + Streak + Motivation ── */}
        <View className="px-5 pt-2 pb-2">
          <Text className="text-slate-400 text-xs font-light">Welcome back,</Text>
          <View className="flex-row items-center justify-between mt-0.5">
            <Text className="text-[24px] font-extrabold text-midnight tracking-tight leading-7">
              {userName || 'David Miller'}
            </Text>
            <Pressable
              onPress={() => CustomAlert.alert('Adherence Streak', `You've completed your care plan for ${streak} consecutive days!\n\nCurrent streak: ${streak} days\nBest streak: 14 days\nTotal adherent days: 42/50\n\nKeep it up! Consistent care leads to better outcomes.`)}
              className="flex-row items-center gap-1 px-2.5 py-1 rounded-full active:opacity-70"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <Flame size={12} color="#F59E0B" />
              <Text className="text-[11px] font-extrabold" style={{ color: '#D97706' }}>{streak}d</Text>
            </Pressable>
          </View>
          <Text className="text-slate-400 text-[11px] font-medium mt-1">{motivMsg.emoji} {motivMsg.message}</Text>
        </View>

        {/* ── How Are You Feeling? ── */}
        <View className="px-5 mb-3">
          <View className="bg-white rounded-2xl px-4 py-3" style={Shadows.card}>
            <Text className="text-[11px] font-bold text-midnight mb-2">
              {mood ? 'You\'re feeling' : 'How are you feeling today?'}
            </Text>
            <View className="flex-row justify-between">
              {([
                { key: 'great', label: 'Great', icon: ThumbsUp, color: '#22C55E' },
                { key: 'good', label: 'Good', icon: Smile, color: '#1A73E8' },
                { key: 'okay', label: 'Okay', icon: Meh, color: '#F59E0B' },
                { key: 'unwell', label: 'Unwell', icon: Frown, color: '#EF4444' },
                { key: 'pain', label: 'In Pain', icon: HeartPulse, color: '#DC2626' },
              ] as const).map(m => {
                const Icon = m.icon;
                const isSelected = mood === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={async () => {
                      setMood(m.key);
                      // Map UI key to API score
                      const scoreMap: Record<string, number> = { great: 5, good: 4, okay: 3, unwell: 2, pain: 1 };
                      const labelMap: Record<string, string> = { great: 'great', good: 'good', okay: 'okay', unwell: 'bad', pain: 'terrible' };
                      try {
                        const saved = await logMood({ mood_score: scoreMap[m.key] ?? 3, mood_label: labelMap[m.key] ?? 'okay' });
                        setTodayMoodData(saved);  // update state immediately so refresh doesn't reset it
                      } catch { /* non-blocking */ }
                      if (m.key === 'unwell' || m.key === 'pain') {
                        CustomAlert.alert(
                          'We\'re sorry to hear that',
                          `Your care team has been notified that you're feeling ${m.label.toLowerCase()} today.\n\nWould you like to talk to someone?`,
                          [
                            { text: 'I\'m Okay', style: 'cancel' },
                            { text: 'Call Doctor', onPress: () => CustomAlert.alert('Calling...', 'Connecting you with Dr. Aruna Devi...') },
                          ]
                        );
                      } else {
                        CustomAlert.alert('Logged!', `Feeling ${m.label.toLowerCase()} — noted! Your doctor can see your daily check-ins.`);
                      }
                    }}
                    className="items-center active:opacity-70"
                  >
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center mb-0.5"
                      style={{
                        backgroundColor: isSelected ? m.color : `${m.color}10`,
                        borderWidth: isSelected ? 0 : 1.5,
                        borderColor: isSelected ? 'transparent' : `${m.color}25`,
                        ...(isSelected ? {
                          shadowColor: m.color,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                          elevation: 4,
                        } : {}),
                      }}
                    >
                      <Icon size={15} color={isSelected ? '#FFFFFF' : m.color} />
                    </View>
                    <Text style={{
                      fontSize: 8,
                      fontWeight: isSelected ? '800' : '600',
                      color: isSelected ? m.color : '#94A3B8',
                    }}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Care Plan ── */}
        <View className="px-5 mb-3">
          <View className="bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[15px] font-extrabold text-midnight">Today's Care Plan</Text>
              <Pressable onPress={() => router.push('/patient/care-schedule')} className="active:opacity-60">
                <Text className="text-[11px] font-bold tracking-[2px] uppercase" style={{ color: '#1A73E8' }}>
                  View Schedule
                </Text>
              </Pressable>
            </View>

            {/* Interactive Care Tracker */}
            {(() => {
              const overdueTask = tasks.find(t => t.status === 'overdue');
              const nextPending = tasks.find(t => t.status === 'pending');
              const actionTask = overdueTask || nextPending;
              const allDone = completedTasks === totalTasks;
              const NextIcon = actionTask ? categoryConfig[actionTask.category].icon : Check;
              const nextColor = overdueTask ? '#F59E0B' : actionTask ? categoryConfig[actionTask.category].color : '#22C55E';

              return (
                <View className="items-center mb-3">
                  {/* Ring + Center CTA */}
                  <Pressable
                    onPress={() => actionTask ? handleTaskPress(actionTask) : CustomAlert.alert('All Done!', 'You\'ve completed every task on your care plan today. Amazing work! Your doctor can see your 100% adherence.')}
                    className="items-center justify-center active:scale-95"
                    style={{ width: 110, height: 110 }}
                  >
                    <SweepRing
                      completedCount={completedTasks}
                      totalCount={totalTasks}
                      size={110}
                      strokeWidth={7}
                      color="#1A73E8"
                    />
                    {/* Center: count + next action */}
                    <View className="absolute items-center">
                      {allDone ? (
                        <>
                          <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: '#22C55E15' }}>
                            <Check size={22} color="#22C55E" />
                          </View>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: '#22C55E', letterSpacing: 1, marginTop: 2 }}>ALL DONE</Text>
                        </>
                      ) : (
                        <>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: '#0B1B3D' }}>
                            {completedTasks}<Text style={{ fontSize: 11, fontWeight: '600', color: '#94A3B8' }}>/{totalTasks}</Text>
                          </Text>
                          <Text style={{ fontSize: 8, fontWeight: '700', color: overdueTask ? '#F59E0B' : '#94A3B8', letterSpacing: 0.5, marginTop: 1 }}>
                            {overdueTask ? 'OVERDUE' : 'TASKS DONE'}
                          </Text>
                        </>
                      )}
                    </View>
                  </Pressable>

                  {/* Next task label */}
                  {actionTask && (
                    <Pressable
                      onPress={() => handleTaskPress(actionTask)}
                      className="flex-row items-center gap-2 mt-3 px-4 py-2 rounded-full active:opacity-70"
                      style={{ backgroundColor: `${nextColor}10`, borderWidth: 1, borderColor: `${nextColor}25` }}
                    >
                      {overdueTask && <AlertTriangle size={11} color="#F59E0B" />}
                      <Text style={{ fontSize: 11, fontWeight: '700', color: nextColor }} numberOfLines={1}>
                        {actionTask.title}
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: `${nextColor}90` }}>
                        · {actionTask.scheduledTime}
                      </Text>
                    </Pressable>
                  )}

                  {/* Category chips — tappable to filter & scroll */}
                  <View className="w-full mt-3">
                    <View className="flex-row flex-wrap gap-2">
                      {(['medicine', 'physio', 'diet', 'vitals', 'hydration'] as TaskCategory[]).map(cat => {
                        const catTasks = tasks.filter(t => t.category === cat);
                        if (catTasks.length === 0) return null;
                        const catDone = catTasks.filter(t => t.status === 'completed').length;
                        const config = categoryConfig[cat];
                        const CatIcon = config.icon;
                        const allCatDone = catDone === catTasks.length;
                        const isActive = activeCategory === cat;
                        return (
                          <Pressable
                            key={cat}
                            onPress={() => {
                              // Toggle filter
                              const newCat = isActive ? null : cat;
                              setActiveCategory(newCat);
                              // Scroll to first task of this category
                              if (newCat && taskScrollRef.current) {
                                const visibleTasks = tasks.filter(t => t.status !== 'missed');
                                const idx = visibleTasks.findIndex(t => t.category === newCat);
                                if (idx >= 0) {
                                  taskScrollRef.current.scrollTo({ x: idx * 212, animated: true });
                                }
                              } else if (!newCat && taskScrollRef.current) {
                                taskScrollRef.current.scrollTo({ x: 0, animated: true });
                              }
                            }}
                            className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full active:opacity-70"
                            style={{
                              backgroundColor: isActive ? config.color : allCatDone ? `${config.color}12` : '#F8FAFC',
                              borderWidth: 1,
                              borderColor: isActive ? config.color : allCatDone ? `${config.color}30` : '#F1F5F9',
                            }}
                          >
                            <CatIcon size={10} color={isActive ? '#FFFFFF' : allCatDone ? config.color : '#94A3B8'} />
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isActive ? '#FFFFFF' : allCatDone ? config.color : '#94A3B8' }}>
                              {catDone}/{catTasks.length}
                            </Text>
                            {allCatDone && <Check size={9} color={isActive ? '#FFFFFF' : config.color} />}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* Task Cards - Horizontal Scroll */}
            <ScrollView ref={taskScrollRef} horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              {tasks.filter(t => t.status !== 'missed').filter(t => !activeCategory || t.category === activeCategory).map((task) => {
                const catConfig = categoryConfig[task.category];
                const CatIcon = catConfig.icon;
                const isCompleted = task.status === 'completed';
                const isOverdue = task.status === 'overdue';
                const isSnoozed = task.status === 'snoozed';
                const TimeIcon = timeIcons[task.timeOfDay].icon;

                return (
                  <Pressable
                    key={task.id}
                    onPress={() => handleTaskPress(task)}
                    className="mr-3 ml-1 active:opacity-80"
                    style={{ width: 200 }}
                  >
                    <View
                      className="rounded-2xl p-3.5"
                      style={[
                        Shadows.card,
                        {
                          backgroundColor: isOverdue ? '#FFF7ED' : isCompleted ? '#F8FAFC' : '#FFFFFF',
                          borderLeftWidth: 4,
                          borderLeftColor: isOverdue ? '#F59E0B' : isCompleted ? '#CBD5E1' : catConfig.color,
                          borderWidth: isOverdue ? 1 : 0,
                          borderColor: isOverdue ? '#FED7AA' : 'transparent',
                        },
                      ]}
                    >
                      {/* Top Row: Category + Time */}
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${catConfig.color}12` }}>
                          <CatIcon size={9} color={catConfig.color} />
                          <Text style={{ fontSize: 9, fontWeight: '700', color: catConfig.color }}>{catConfig.label}</Text>
                        </View>
                        {isOverdue && (
                          <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 rounded-full">
                            <AlertTriangle size={8} color="#F59E0B" />
                            <Text style={{ fontSize: 8, fontWeight: '700', color: '#D97706' }}>OVERDUE</Text>
                          </View>
                        )}
                        {isSnoozed && (
                          <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 bg-purple-100 rounded-full">
                            <Timer size={8} color="#8B5CF6" />
                            <Text style={{ fontSize: 8, fontWeight: '700', color: '#7C3AED' }}>SNOOZED</Text>
                          </View>
                        )}
                      </View>

                      {/* Title */}
                      <Text
                        className="text-sm font-bold mb-0.5"
                        style={{ color: isCompleted ? '#94A3B8' : '#0B1B3D', textDecorationLine: isCompleted ? 'line-through' : 'none' }}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>

                      {/* Subtitle */}
                      {task.subtitle && (
                        <Text className="text-[10px] mb-1.5" style={{ color: isCompleted ? '#CBD5E1' : '#94A3B8' }} numberOfLines={1}>
                          {task.subtitle}
                        </Text>
                      )}

                      {/* Dosage visual (sun/moon icons) */}
                      {task.dosage && <DosageBadge dosage={task.dosage} />}

                      {/* Bottom: Time + Status */}
                      <View className="flex-row items-center justify-between mt-2">
                        <View className="flex-row items-center gap-1">
                          <TimeIcon size={10} color={isCompleted ? '#CBD5E1' : timeIcons[task.timeOfDay].color} />
                          <Text style={{ fontSize: 10, color: isOverdue ? '#D97706' : isCompleted ? '#CBD5E1' : '#94A3B8', fontWeight: '600' }}>
                            {task.scheduledTime}
                          </Text>
                        </View>
                        {/* Status indicator */}
                        <View
                          className="w-6 h-6 rounded-full items-center justify-center"
                          style={{
                            backgroundColor: isCompleted ? '#22C55E' : isOverdue ? '#FEF3C7' : '#F1F5F9',
                            borderWidth: isCompleted ? 0 : 1.5,
                            borderColor: isOverdue ? '#F59E0B' : '#E2E8F0',
                          }}
                        >
                          {isCompleted ? (
                            <Check size={12} color="#FFFFFF" />
                          ) : isOverdue ? (
                            <AlertTriangle size={10} color="#F59E0B" />
                          ) : (
                            <View className="w-2 h-2 rounded-full bg-slate-300" />
                          )}
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* ── Water Intake ── */}
        <View className="px-5 mb-3">
          <View className="bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: '#F0F9FF' }}>
                  <Droplets size={16} color="#0EA5E9" />
                </View>
                <Text className="font-extrabold text-midnight text-[13px]">Water Intake</Text>
              </View>
              <Pressable
                onPress={() => router.push('/patient/care-schedule' as any)}
                className="active:opacity-60"
              >
                <Text className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: '#0EA5E9' }}>Settings</Text>
              </Pressable>
            </View>

            {/* Progress bar */}
            {(() => {
              const total = waterData?.today_total_ml ?? 0;
              const goal  = waterData?.daily_goal_ml  ?? 2000;
              const pct   = waterData?.progress_pct   ?? 0;
              return (
                <>
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-xs text-slate-500">{total} ml consumed</Text>
                    <Text className="text-xs font-bold text-midnight">{pct}% of {goal} ml</Text>
                  </View>
                  <View className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <View
                      className="h-3 rounded-full"
                      style={{ width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? '#22C55E' : '#0EA5E9' }}
                    />
                  </View>
                </>
              );
            })()}

            {/* Quick-log buttons */}
            <View className="flex-row gap-2">
              {[200, 300, 500].map(ml => (
                <Pressable
                  key={ml}
                  disabled={waterLogLoading}
                  onPress={async () => {
                    setWaterLogLoading(true);
                    try {
                      const result = await logWaterIntake(ml);
                      setWaterData(prev => prev
                        ? { ...prev, today_total_ml: result.today_total_ml, progress_pct: result.progress_pct }
                        : prev
                      );
                    } catch {
                      CustomAlert.alert('Error', 'Could not log water intake. Please try again.');
                    } finally {
                      setWaterLogLoading(false);
                    }
                  }}
                  className="flex-1 py-2 rounded-xl items-center active:opacity-70"
                  style={{ backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD' }}
                >
                  {waterLogLoading ? (
                    <ActivityIndicator size="small" color="#0EA5E9" />
                  ) : (
                    <Text className="text-xs font-bold" style={{ color: '#0EA5E9' }}>+{ml} ml</Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* ── Physiotherapy ── */}
        <View className="px-5 mb-3">
          <View className="bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-xl items-center justify-center" style={{ backgroundColor: '#F3EEFF' }}>
                  <Dumbbell size={16} color="#8B5CF6" />
                </View>
                <Text className="font-extrabold text-midnight text-[13px]">Physiotherapy</Text>
              </View>
              <Pressable
                onPress={() => router.push('/patient/physio-report' as any)}
                className="active:opacity-60"
              >
                <Text className="text-[10px] font-bold tracking-[1.5px] uppercase" style={{ color: '#8B5CF6' }}>View Report</Text>
              </Pressable>
            </View>

            {physioToday && physioToday.total_sessions > 0 ? (
              <View className="flex-row items-center gap-4 mb-3">
                <View className="items-center flex-1 bg-slate-50 rounded-xl py-2">
                  <Text className="text-xl font-extrabold text-midnight">{physioToday.total_sessions}</Text>
                  <Text className="text-[10px] text-slate-400">Session{physioToday.total_sessions !== 1 ? 's' : ''}</Text>
                </View>
                <View className="items-center flex-1 bg-slate-50 rounded-xl py-2">
                  <Text className="text-xl font-extrabold text-midnight">{physioToday.total_min}</Text>
                  <Text className="text-[10px] text-slate-400">Minutes</Text>
                </View>
              </View>
            ) : (
              <Text className="text-xs text-slate-400 mb-3">No sessions logged today yet.</Text>
            )}

            <Pressable
              onPress={() => CustomAlert.alert(
                'Log Physiotherapy',
                'What activity did you perform?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log Activity', onPress: () => router.push('/patient/physio-report' as any) },
                ]
              )}
              className="flex-row items-center justify-center gap-2 py-2.5 rounded-xl active:opacity-70"
              style={{ backgroundColor: '#F3EEFF', borderWidth: 1, borderColor: '#DDD6FE' }}
            >
              <Dumbbell size={14} color="#8B5CF6" />
              <Text className="text-xs font-bold" style={{ color: '#8B5CF6' }}>Log Activity</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Daily Health Tip ── */}
        <View className="px-5 mb-3">
          <Pressable
            onPress={() => CustomAlert.alert(
              currentTip.title,
              currentTip.body,
              [
                { text: 'OK' },
                { text: 'More Tips', onPress: () => CustomAlert.alert('Health Tips', activeTips.map((t, i) => `${i + 1}. ${t.title}\n${t.body}`).join('\n\n')) },
              ]
            )}
            className="bg-white rounded-xl px-3.5 py-3 flex-row items-center gap-2.5 active:opacity-80"
            style={Shadows.card}
          >
            <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: `${currentTip.color}15` }}>
              <TipIcon size={14} color={currentTip.color} />
            </View>
            <View className="flex-1">
              <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Health Tip</Text>
              <Text className="text-xs font-bold text-midnight mb-0.5" numberOfLines={1}>{currentTip.title}</Text>
              <Text className="text-[11px] text-slate-500 font-medium leading-[14px]" numberOfLines={2}>{currentTip.body}</Text>
            </View>
            <ChevronRight size={12} color="#CBD5E1" />
          </Pressable>
        </View>

        {/* ── Vitals ── */}
        <View className="px-5 mb-3">
          <View className="bg-white rounded-2xl p-4" style={Shadows.card}>
            {/* Vitals Header */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[15px] font-extrabold text-midnight">My Vitals</Text>
              <Pressable
                onPress={() => router.push('/patient/log-vitals' as any)}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full active:opacity-70"
                style={{ backgroundColor: '#EEF4FF' }}
              >
                <HeartPulse size={12} color="#1A73E8" />
                <Text className="text-[11px] font-bold" style={{ color: '#1A73E8' }}>+ Log</Text>
              </Pressable>
            </View>

            {latestVitals ? (
              <>
                {/* Live indicator + timestamp */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full bg-emerald-500" />
                    <Text className="text-[10px] font-bold tracking-[2px] text-emerald-500 uppercase">Live Data</Text>
                  </View>
                  <Text className="text-[10px] text-slate-400">
                    {new Date(latestVitals.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>

                {/* Vitals grid */}
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {latestVitals.bp && (
                    <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl" style={{ backgroundColor: '#FEF2F2' }}>
                      <Activity size={13} color="#EF4444" />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0B1B3D' }}>{latestVitals.bp}</Text>
                        <Text style={{ fontSize: 8, color: '#EF4444', fontWeight: '700' }}>mmHg · BP</Text>
                      </View>
                    </View>
                  )}
                  {latestVitals.heart_rate && (
                    <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl" style={{ backgroundColor: '#EEF4FF' }}>
                      <Heart size={13} color="#1A73E8" />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0B1B3D' }}>{latestVitals.heart_rate}</Text>
                        <Text style={{ fontSize: 8, color: '#1A73E8', fontWeight: '700' }}>BPM · HR</Text>
                      </View>
                    </View>
                  )}
                  {latestVitals.spo2 && (
                    <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl" style={{ backgroundColor: '#F0F9FF' }}>
                      <Wind size={13} color="#38BDF8" />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0B1B3D' }}>{latestVitals.spo2}%</Text>
                        <Text style={{ fontSize: 8, color: '#38BDF8', fontWeight: '700' }}>SpO₂</Text>
                      </View>
                    </View>
                  )}
                  {latestVitals.temperature_c && (
                    <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl" style={{ backgroundColor: '#FFFBEB' }}>
                      <Thermometer size={13} color="#F59E0B" />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0B1B3D' }}>{Number(latestVitals.temperature_c).toFixed(1)}°C</Text>
                        <Text style={{ fontSize: 8, color: '#F59E0B', fontWeight: '700' }}>Temp</Text>
                      </View>
                    </View>
                  )}
                  {latestVitals.weight_kg && (
                    <View className="flex-row items-center gap-1.5 px-3 py-2 rounded-xl" style={{ backgroundColor: '#EEFBF4' }}>
                      <Gauge size={13} color="#22C55E" />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#0B1B3D' }}>{Number(latestVitals.weight_kg).toFixed(1)} kg</Text>
                        <Text style={{ fontSize: 8, color: '#22C55E', fontWeight: '700' }}>Weight</Text>
                      </View>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View className="items-center py-5">
                <HeartPulse size={32} color="#E2E8F0" />
                <Text className="text-slate-400 text-sm mt-2 font-medium">No vitals recorded yet</Text>
                <Text className="text-slate-300 text-xs mt-1">Tap "+ Log" to record your first reading</Text>
              </View>
            )}

            {/* View 30-Day Trends */}
            <Pressable
              onPress={() => router.push('/patient/vitals-trend' as any)}
              className="mt-2 flex-row items-center justify-center gap-1.5 active:opacity-60"
            >
              <TrendingUp size={12} color="#1A73E8" />
              <Text className="text-[11px] font-bold" style={{ color: '#1A73E8' }}>View 30-Day Trends</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Weekly Adherence ── */}
        <View className="px-5 mb-3">
          <Pressable
            onPress={() => CustomAlert.alert(
              'Weekly Adherence',
              'This Week\'s Performance:\n\nMon: 10/10 tasks (100%)\nTue: 9/10 tasks (90%)\nWed: 10/10 tasks (100%)\nThu: 8/10 tasks (80%)\nFri: 10/10 tasks (100%)\nSat: 9/10 tasks (90%)\nSun (today): ' + completedTasks + '/' + totalTasks + ' tasks (' + Math.round(progress * 100) + '%)\n\nWeekly average: 93%\n\nYour doctor sees this report. Great consistency!',
              [{ text: 'OK' }, { text: 'Share with Family', onPress: () => CustomAlert.alert('Shared', 'Your weekly health report has been shared with your emergency contacts.') }]
            )}
            className="bg-white rounded-2xl px-4 py-3 flex-row items-center gap-3 active:opacity-80"
            style={Shadows.card}
          >
            <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <HealthRing progress={0.93} size={48} strokeWidth={4} color="#22C55E" />
              <Text className="absolute text-[11px] font-extrabold text-midnight">93%</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-midnight">Weekly Adherence</Text>
              <Text className="text-[10px] text-slate-400 mt-0.5">You're in the top 15% of patients this week</Text>
            </View>
            <View className="flex-row items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full">
              <Award size={12} color="#22C55E" />
              <Text className="text-[10px] font-bold text-emerald-600">Excellent</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Quick Actions ── */}
        <View className="px-5">
          <Text className="text-[15px] font-extrabold text-midnight mb-3">Quick Actions</Text>
          <View className="flex-row flex-wrap gap-2.5">
            {([
              { label: 'Book\nAppointment', icon: CalendarPlus, color: '#1A73E8', bg: '#EEF4FF', route: '/patient/consultation-type' },
              { label: 'Order\nMedicines', icon: Package, color: '#7C3AED', bg: '#F0EEFF', route: '/patient/(tabs)/pharmacy' },
              { label: 'Health\nDashboard', icon: FileText, color: '#059669', bg: '#EEFBF4', route: '/patient/(tabs)/records' },
              { label: 'Visit\nPharmacy', icon: BriefcaseMedical, color: '#D97706', bg: '#FFFBEB', route: '/patient/(tabs)/pharmacy' },
            ] as const).map((item, idx) => {
              const QIcon = item.icon;
              return (
                <Pressable
                  key={idx}
                  onPress={() => router.push(item.route as any)}
                  className="bg-white rounded-xl p-4 items-center gap-2 active:opacity-80"
                  style={[Shadows.card, { width: '47%' }]}
                >
                  <View className="w-11 h-11 rounded-xl items-center justify-center" style={{ backgroundColor: item.bg }}>
                    <QIcon size={22} color={item.color} />
                  </View>
                  <Text className="text-[11px] font-semibold text-midnight text-center">{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* ── SOS Floating Button ── */}
      <Pressable
        onPress={() => router.push('/patient/sos-emergency')}
        className="absolute bottom-24 right-5 w-16 h-16 rounded-full items-center justify-center active:opacity-80"
        style={{
          backgroundColor: '#EF4444',
          shadowColor: '#EF4444',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 12,
        }}
      >
        <Text className="text-white font-extrabold text-sm tracking-wider">SOS</Text>
      </Pressable>

      {/* ── Notification Modal ── */}
      <Modal visible={showNotifications} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[75%]" style={Shadows.presence}>
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <View>
                <Text className="text-xl font-extrabold text-midnight">Notifications</Text>
                {unreadCount > 0 && (
                  <Text className="text-xs text-slate-400 mt-0.5">{unreadCount} unread</Text>
                )}
              </View>
              <View className="flex-row items-center gap-3">
                {unreadCount > 0 && (
                  <Pressable onPress={markAllRead} className="active:opacity-60">
                    <Text className="text-xs font-bold text-primary">Mark All Read</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => setShowNotifications(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
                >
                  <X size={18} color="#64748B" />
                </Pressable>
              </View>
            </View>
            <ScrollView className="px-6 py-4">
              {notifications.length === 0 && (
                <View className="items-center py-10">
                  <Bell size={32} color="#CBD5E1" />
                  <Text className="text-slate-400 text-sm mt-3">No notifications yet</Text>
                </View>
              )}
              {notifications.map((n) => {
                const cfg = notificationConfig[n.type] ?? { icon: Bell, color: '#64748B' };
                const NIcon = cfg.icon;
                return (
                  <Pressable
                    key={n.id}
                    onPress={() => {
                      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
                      CustomAlert.alert(n.title, n.body);
                    }}
                    className="flex-row items-start gap-3 py-3 active:opacity-70"
                    style={{ borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
                  >
                    {!n.read && <View className="w-2 h-2 rounded-full bg-primary mt-2" />}
                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${cfg.color}15` }}>
                      <NIcon size={18} color={cfg.color} />
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm ${n.read ? 'text-slate-500 font-medium' : 'text-midnight font-bold'}`}>{n.title}</Text>
                      <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={2}>{n.body}</Text>
                      <Text className="text-[10px] text-slate-300 mt-1">{formatRelativeTime(n.timestamp)}</Text>
                    </View>
                  </Pressable>
                );
              })}
              <View className="h-8" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
