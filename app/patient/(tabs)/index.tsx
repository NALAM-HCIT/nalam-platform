import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Image, Switch, Modal, RefreshControl, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { patientService, CarePlan, PatientNotification } from '@/services/patientService';
import {
  getTodayMood, logMood, TodayMood,
  getWaterSettings, logWaterIntake, WaterSettings,
  getTodayPhysio, TodayPhysio,
  getLatestVitals, LatestVitals,
  getHealthTips, HealthTip,
  getCustomTasks,
  getTodayCareTasks,
  logCareTaskComplete,
  getTodaySteps, logSteps, StepLog,
  getWearableStatus, getWearableVitals, requestWearablePairing, disconnectWearable,
  WearableDevice, WearableVitalData,
} from '@/services/patientDashboardService';
import { configureNotificationHandler } from '@/services/waterReminders';
import { Pedometer } from 'expo-sensors';
import { HospitalConfig } from '@/config/hospital';
import {
  Bell, Check, Droplets, Pill, CalendarPlus, Package, FileText,
  BriefcaseMedical, Sun, Moon, Sunrise, Heart, Activity,
  Apple, Dumbbell, X, Clock, AlertTriangle, Flame, TrendingUp,
  ChevronRight, Wind, Footprints,
  Lightbulb, Watch, Calendar, Sparkles,
  Smile, Frown, Meh, ThumbsUp, HeartPulse, Thermometer,
  CloudLightning, ArrowDownRight, Plus
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

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
  if (data.upcomingAppointment) {
    const appt = data.upcomingAppointment;
    const time12 = format24to12(appt.startTime);
    tasks.push({
      id: `appt-${appt.id}`,
      title: `Visit: ${appt.doctorName.replace(/^Dr\.?\s*/i, 'Dr. ')}`,
      subtitle: `${formatApptDate(appt.scheduleDate)} at ${time12}`,
      category: 'vitals',
      scheduledTime: time12,
      timeOfDay: getTimeOfDay(appt.startTime),
      status: 'pending',
      color: '#EF4444',
      bgColor: '#FEF2F2',
    });
  }
  data.prescriptionNotes.forEach((rx) => {
    const shortNote = rx.notes.length > 65 ? rx.notes.substring(0, 65) + '…' : rx.notes;
    tasks.push({
      id: `rx-${rx.appointmentId}`,
      title: `Dr. ${rx.doctorName.replace(/^Dr\.?\s*/i, '')} Instructions`,
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

// ─── Health Tips fallback ───
const FALLBACK_TIPS = [
  { title: 'Stay Hydrated', body: 'Drink at least 8 glasses of water daily to support kidney function and energy levels.', icon: Droplets, color: '#0EA5E9' },
  { title: 'Move Every Hour', body: 'Stand up and walk for 2–3 minutes every hour to keep your circulation active.', icon: Footprints, color: '#8B5CF6' },
  { title: 'Consistent Meals', body: 'Eating meals at the same time daily helps regulate your blood sugar levels.', icon: Apple, color: '#22C55E' },
  { title: 'Breathe Deeply', body: '5 minutes of deep breathing can lower your blood pressure by 5–10 points.', icon: Wind, color: '#38BDF8' },
  { title: 'Take Medications on Time', body: 'Taking medications at the same time daily improves their effectiveness.', icon: Clock, color: '#1A73E8' },
];

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


// ─── Segmented Sweep Ring ───
function SweepRing({ progress, size = 130, strokeWidth = 8, color = '#1A73E8' }: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * progress;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={`${color}20`} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}

// ─── Main Dashboard ───
export default function PatientDashboard() {
  const router = useRouter();
  const userName = useAuthStore((s) => s.userName);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [todayMoodData, setTodayMoodData]   = useState<TodayMood | null>(null);
  const [waterData, setWaterData]           = useState<WaterSettings | null>(null);
  const [stepData, setStepData]             = useState<StepLog | null>(null);
  const [liveSteps, setLiveSteps]           = useState(0);
  const [pedometerAvailable, setPedometerAvailable] = useState<boolean | null>(null);
  const [wearableDevice, setWearableDevice] = useState<WearableDevice | null>(null);
  const [wearableVitals, setWearableVitals] = useState<WearableVitalData | null>(null);
  const [showWearablePairing, setShowWearablePairing] = useState(false);
  const [remoteShare, setRemoteShare]       = useState(true);
  const [stepsBannerDismissed, setStepsBannerDismissed] = useState(false);
  const [, setPhysioToday]                  = useState<TodayPhysio | null>(null);
  const [latestVitals, setLatestVitals]     = useState<LatestVitals | null>(null);
  const [apiTips, setApiTips]               = useState<HealthTip[]>([]);
  const [waterLogLoading, setWaterLogLoading] = useState(false);
  const [upcomingAppointment, setUpcomingAppointment] = useState<CarePlan['upcomingAppointment']>(null);

  const loadCarePlan = useCallback(() => {
    Promise.allSettled([
      patientService.getCarePlan(),
      getCustomTasks(),
      getTodayCareTasks(),
    ]).then(([carePlanResult, customResult, logsResult]) => {
      // Restore today's saved completion statuses
      const savedStatusMap = logsResult.status === 'fulfilled'
        ? new Map(logsResult.value.map((l) => [l.task_id, l.status as TaskStatus]))
        : new Map<string, TaskStatus>();

      const baseTasks = carePlanResult.status === 'fulfilled'
        ? buildTasksFromCarePlan(carePlanResult.value).map((t) => ({
            ...t,
            status: savedStatusMap.get(t.id) ?? t.status,
          }))
        : [];

      const customTasks: CareTask[] = customResult.status === 'fulfilled'
        ? customResult.value.map((ct) => {
            const cfg = categoryConfig[ct.category as TaskCategory] ?? categoryConfig.vitals;
            const tod = ct.time_of_day as TimeOfDay;
            const taskId = `custom-${ct.id}`;
            return {
              id: taskId, title: ct.title, subtitle: ct.notes ?? undefined, category: ct.category as TaskCategory,
              scheduledTime: tod === 'afternoon' ? '1:00 PM' : tod === 'evening' ? '8:00 PM' : '8:00 AM', timeOfDay: tod,
              status: savedStatusMap.get(taskId) ?? 'pending' as TaskStatus, color: cfg.color, bgColor: cfg.bg,
            };
          })
        : [];

      setTasks([...baseTasks, ...customTasks]);
      if (carePlanResult.status === 'fulfilled') {
        setUpcomingAppointment(carePlanResult.value.upcomingAppointment);
      }
    });
  }, []);

  const loadDashboard = useCallback(() => {
    patientService.getProfile().then((p) => setProfilePhotoUrl(p.profilePhotoUrl)).catch(() => {});
    patientService.getNotifications().then(setNotifications).catch(() => {});
    getTodayMood().then(setTodayMoodData).catch(() => {});
    getWaterSettings().then(setWaterData).catch(() => {});
    getTodaySteps().then(setStepData).catch(() => {});
    getTodayPhysio().then(setPhysioToday).catch(() => {});
    getLatestVitals().then(setLatestVitals).catch(() => {});
    getHealthTips().then(setApiTips).catch(() => {});
    getWearableStatus().then((devices) => {
      if (devices && devices.length > 0) {
        setWearableDevice(devices[0]);
        getWearableVitals().then(setWearableVitals).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    configureNotificationHandler();
    loadCarePlan();
    loadDashboard();
  }, [loadCarePlan, loadDashboard]);

  // ── Live Pedometer ────────────────────────────────────────────────────────
  useEffect(() => {
    let subscription: ReturnType<typeof Pedometer.watchStepCount> | null = null;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    let baseSteps = 0;

    const setup = async () => {
      const available = await Pedometer.isAvailableAsync();
      setPedometerAvailable(available);
      if (!available) return;

      // Get today's steps from midnight → now for the initial count
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      try {
        const { steps } = await Pedometer.getStepCountAsync(start, new Date());
        baseSteps = steps;
        setLiveSteps(steps);
        logSteps(steps).then(setStepData).catch(() => {});
      } catch {
        // getStepCountAsync not supported on some Android devices — start from 0
        baseSteps = 0;
      }

      // watchStepCount gives incremental steps since subscription started
      subscription = Pedometer.watchStepCount((result) => {
        const total = baseSteps + result.steps;
        setLiveSteps(total);
        // Debounce backend save — only persist after 10 s of no new steps
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          logSteps(total).then(setStepData).catch(() => {});
        }, 10_000);
      });
    };

    setup();

    return () => {
      subscription?.remove();
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, []);

  // Re-fetch vitals + steps + wearable data whenever the tab comes back into focus
  useFocusEffect(useCallback(() => {
    getLatestVitals().then(setLatestVitals).catch(() => {});
    getTodaySteps().then(setStepData).catch(() => {});
    getWearableStatus().then((devices) => {
      if (devices && devices.length > 0) {
        setWearableDevice(devices[0]);
        getWearableVitals().then(setWearableVitals).catch(() => {});
      }
    }).catch(() => {});
  }, []));

  const [mood, setMood] = useState<string | null>(null);
  useEffect(() => {
    if (todayMoodData?.mood_label) {
      const labelToKey: Record<string, string> = { great: 'great', good: 'good', okay: 'okay', bad: 'unwell', terrible: 'pain' };
      setMood(labelToKey[todayMoodData.mood_label] ?? todayMoodData.mood_label);
    }
  }, [todayMoodData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCarePlan();
    loadDashboard();
    setTimeout(() => setRefreshing(false), 800);
  }, [loadCarePlan, loadDashboard]);

  // Computed Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const healthScore = Math.floor((progress * 40) + (waterData?.progress_pct ? Math.min(waterData.progress_pct, 100) * 0.2 : 0) + (mood ? 20 : 0) + (latestVitals ? 20 : 0));
  const unreadCount = notifications.filter(n => !n.read).length;


  const handleCompleteTask = (taskId: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (task) logCareTaskComplete(taskId, task.title, 'completed').catch(() => {});
      return prev.map((t) => t.id === taskId ? { ...t, status: 'completed' as TaskStatus } : t);
    });
  };

  const handleTaskPress = (task: CareTask) => {
    if (task.status === 'completed') {
      CustomAlert.alert('Completed', `${task.title} was completed successfully.`);
      return;
    }
    if (task.status === 'overdue') {
      CustomAlert.alert('Overdue Task', `"${task.title}" was due at ${task.scheduledTime}.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark as Taken', onPress: () => handleCompleteTask(task.id) },
      ]);
      return;
    }
    CustomAlert.alert(
      task.title,
      `${task.subtitle || ''}\n\nScheduled: ${task.scheduledTime}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: task.category === 'medicine' ? 'Mark as Taken' : 'Mark Complete',
          onPress: () => handleCompleteTask(task.id),
        },
      ]
    );
  };

  // Header dynamic colors
  const currentHour = new Date().getHours();
  const greetingText = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Appointment countdown
  const apptCountdown = (() => {
    if (!upcomingAppointment) return null;
    const apptDate = new Date(`${upcomingAppointment.scheduleDate}T${upcomingAppointment.startTime}`);
    const diffMs = apptDate.getTime() - Date.now();
    if (diffMs <= 0) return null;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 0 && diffHrs === 0) return { label: 'In less than an hour', urgency: 'now' as const };
    if (diffDays === 0) return { label: `In ${diffHrs}h`, urgency: 'today' as const };
    if (diffDays === 1) return { label: 'Tomorrow', urgency: 'soon' as const };
    return { label: `In ${diffDays} days`, urgency: 'upcoming' as const };
  })();

  // Personalized insight
  const personalInsight = (() => {
    const firstName = (userName || '').split(' ')[0];
    if (!firstName) return null;
    if (apptCountdown?.urgency === 'now') return `Your appointment is starting very soon!`;
    if (apptCountdown?.urgency === 'today') return `You have an appointment today — don't forget!`;
    if (completedTasks > 0 && completedTasks === totalTasks && totalTasks > 0) return `All ${totalTasks} tasks done today — amazing work!`;
    if (waterData && waterData.progress_pct >= 100) return `You've hit your water goal today 💧 Keep it up!`;
    if (mood === 'great' || mood === 'good') return `Glad you're feeling ${mood} today — let's make it count!`;
    if (mood === 'unwell' || mood === 'pain') return `Take it easy today. Your care team is here for you.`;
    const steps = liveSteps || stepData?.step_count || 0;
    if (steps > 8000) return `${steps.toLocaleString()} steps already — you're crushing it!`;
    if (latestVitals) return `Your last vitals look good. Stay consistent!`;
    return `Every healthy habit today builds a stronger tomorrow.`;
  })();
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1A73E8" />}>
        {/* ── Dynamic Header ── */}
        <LinearGradient
          colors={['#eff6ff', '#dbeafe']}
          className="px-5 pt-4 pb-5 rounded-b-[32px] mb-3"
          style={Shadows.card}
        >
          {/* Hospital identity row */}
          <View className="flex-row items-center justify-between mb-4">
            {/* Logo + name block */}
            <View className="flex-row items-center gap-3 flex-1 mr-3">
              <Image source={HospitalConfig.logo} style={{ width: 64, height: 64, backgroundColor: 'transparent' }} resizeMode="contain" fadeDuration={0} />
              <View className="flex-1">
                <Text className="text-[15px] font-extrabold text-midnight leading-[19px]" numberOfLines={2}>{HospitalConfig.name}</Text>
                <View className="mt-1.5 self-start flex-row items-center gap-1 px-2.5 py-[3px] rounded-full" style={{ backgroundColor: '#1A73E8' }}>
                  <View className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1 }}>PATIENT PORTAL</Text>
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setShowNotifications(true)}
                className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
                style={{ backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' }}
              >
                <Bell size={18} color="#0B1B3D" />
                {unreadCount > 0 && (
                  <View className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 rounded-full items-center justify-center border-2 border-white">
                    <Text className="text-white text-[9px] font-bold">{unreadCount}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => router.push('/patient/(tabs)/profile' as any)}
                className="w-10 h-10 rounded-full overflow-hidden items-center justify-center active:opacity-70"
                style={{ backgroundColor: '#0B1B3D' }}
              >
                {profilePhotoUrl ? (
                  <Image source={{ uri: profilePhotoUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                ) : (
                  <Text className="text-sm font-bold text-white">{(userName || 'P').slice(0, 2).toUpperCase()}</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Divider */}
          <View className="h-px bg-black/5 mb-3" />

          {/* Greeting + patient name */}
          <View>
            <Text className="text-[12px] font-semibold text-slate-500">{greetingText},</Text>
            <Text className="text-[23px] font-extrabold text-midnight tracking-tight leading-7">{userName || 'Patient'}</Text>
          </View>

          {/* ── Personalized Insight ── */}
          {personalInsight && (
            <View className="flex-row items-center gap-2 mt-3 px-3 py-2.5 rounded-2xl" style={{ backgroundColor: 'rgba(26,115,232,0.08)' }}>
              <Sparkles size={14} color="#1A73E8" />
              <Text className="text-[12px] text-primary font-semibold flex-1">{personalInsight}</Text>
            </View>
          )}

          {/* ── Upcoming Appointment Countdown ── */}
          {upcomingAppointment && apptCountdown && (
            <Pressable
              onPress={() => router.push('/patient/(tabs)/bookings' as any)}
              className="flex-row items-center gap-3 mt-2.5 px-3 py-2.5 rounded-2xl active:opacity-80"
              style={{ backgroundColor: apptCountdown.urgency === 'now' || apptCountdown.urgency === 'today' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: apptCountdown.urgency === 'now' || apptCountdown.urgency === 'today' ? 'rgba(239,68,68,0.2)' : 'rgba(226,234,255,0.8)' }}
            >
              <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: apptCountdown.urgency === 'now' || apptCountdown.urgency === 'today' ? '#FEE2E2' : '#EEF4FF' }}>
                <Calendar size={15} color={apptCountdown.urgency === 'now' || apptCountdown.urgency === 'today' ? '#EF4444' : '#1A73E8'} />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-bold text-midnight" numberOfLines={1}>
                  Dr. {upcomingAppointment.doctorName} · {upcomingAppointment.specialty}
                </Text>
                <Text className="text-[10px] text-slate-500">{upcomingAppointment.startTime} · {apptCountdown.label}</Text>
              </View>
              <ChevronRight size={14} color="#94A3B8" />
            </Pressable>
          )}

        </LinearGradient>

        {/* ── Health Stats Strip ── */}
        <View className="px-5 mb-3 flex-row gap-2">
          {/* Health Score */}
          <View className="flex-1 bg-white rounded-2xl p-2 items-center border border-slate-100" style={Shadows.card}>
            <View style={{ width: 44, height: 44 }}>
              <SweepRing progress={healthScore / 100} size={44} strokeWidth={4} color={healthScore >= 80 ? '#22C55E' : healthScore >= 50 ? '#1A73E8' : '#F59E0B'} />
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-[11px] font-extrabold text-midnight">{healthScore}</Text>
              </View>
            </View>
            <Text className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Score</Text>
          </View>
          {/* Tasks */}
          <View className="flex-1 bg-white rounded-2xl p-2 items-center border border-slate-100" style={Shadows.card}>
            <View className="w-[44px] h-[44px] rounded-full items-center justify-center" style={{ backgroundColor: '#EEF4FF' }}>
              <Text className="text-[16px] font-extrabold text-primary">{completedTasks}</Text>
            </View>
            <Text className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">of {totalTasks} Tasks</Text>
          </View>
          {/* Streak */}
          <View className="flex-1 bg-white rounded-2xl p-2 items-center border border-slate-100" style={Shadows.card}>
            <View className="w-[44px] h-[44px] rounded-full items-center justify-center" style={{ backgroundColor: '#FFF7ED' }}>
              <Flame size={20} color="#F59E0B" />
            </View>
            <Text className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">7d Streak</Text>
          </View>
          {/* Mood */}
          <View className="flex-1 bg-white rounded-2xl p-2 items-center border border-slate-100" style={Shadows.card}>
            <View className="w-[44px] h-[44px] rounded-full items-center justify-center" style={{ backgroundColor: mood ? '#F0FDF4' : '#F8FAFC' }}>
              {mood ? (() => {
                const Icon = { great: ThumbsUp, good: Smile, okay: Meh, unwell: Frown, pain: HeartPulse }[mood] ?? Smile;
                const col = { great: '#22C55E', good: '#1A73E8', okay: '#F59E0B', unwell: '#EF4444', pain: '#DC2626' }[mood] ?? '#94A3B8';
                return <Icon size={20} color={col} />;
              })() : <Smile size={20} color="#CBD5E1" />}
            </View>
            <Text className="text-[8px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : 'Mood'}</Text>
          </View>
        </View>

        {/* ── Animated Mood Check-in ── */}
        <View className="px-5 mb-3">
          <View className="bg-white rounded-[18px] px-4 py-3 border border-slate-100" style={Shadows.card}>
            <Text className="text-[11px] font-bold text-midnight mb-2">How are you feeling?</Text>
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
                      const scoreMap: Record<string, number> = { great: 5, good: 4, okay: 3, unwell: 2, pain: 1 };
                      const labelMap: Record<string, string> = { great: 'great', good: 'good', okay: 'okay', unwell: 'bad', pain: 'terrible' };
                      try {
                        const saved = await logMood({ mood_score: scoreMap[m.key] ?? 3, mood_label: labelMap[m.key] ?? 'okay' });
                        setTodayMoodData(saved);
                      } catch { }
                      if (m.key === 'unwell' || m.key === 'pain') {
                        CustomAlert.alert('We\'re sorry to hear that', `Would you like to speak with your care team?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Call Doctor' }]);
                      }
                    }}
                    className="items-center active:scale-95 transition-transform"
                  >
                    <View
                      className="w-[36px] h-[36px] rounded-full items-center justify-center mb-1"
                      style={{
                        backgroundColor: isSelected ? m.color : `${m.color}08`,
                        borderWidth: isSelected ? 0 : 1,
                        borderColor: isSelected ? 'transparent' : `${m.color}20`,
                        ...(isSelected ? { shadowColor: m.color, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 5 } : {}),
                      }}
                    >
                      <Icon size={16} color={isSelected ? '#FFFFFF' : m.color} />
                    </View>
                    <Text style={{ fontSize: 8, fontWeight: isSelected ? '800' : '600', color: isSelected ? m.color : '#94A3B8' }}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Daily Tip Carousel ── */}
        {(() => {
          const tips = apiTips.length > 0
            ? apiTips.map(t => ({ title: t.title, body: t.body, icon: Lightbulb, color: '#1A73E8' }))
            : FALLBACK_TIPS;
          const gradients: [string, string][] = [
            ['#1A73E8', '#0D47A1'],
            ['#059669', '#065F46'],
            ['#7C3AED', '#4C1D95'],
            ['#D97706', '#92400E'],
            ['#DC2626', '#7F1D1D'],
          ];
          return (
            <View className="mb-3">
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={width - 28}
                snapToAlignment="start"
                contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, gap: 12 }}
              >
                {tips.map((tip, idx) => {
                  const TipIcon = tip.icon;
                  const [g1, g2] = gradients[idx % gradients.length];
                  return (
                    <LinearGradient
                      key={idx}
                      colors={[g1, g2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: width - 40, borderRadius: 20, padding: 14, overflow: 'hidden' }}
                    >
                      {/* Decorative circle */}
                      <View style={{ position: 'absolute', right: -16, top: -16, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                      <View style={{ position: 'absolute', right: 16, bottom: -24, width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.08)' }} />

                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 }}>
                              <Text style={{ fontSize: 8, fontWeight: '800', color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase' }}>Health Tip</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff', lineHeight: 18, marginBottom: 4 }}>{tip.title}</Text>
                          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 16, fontWeight: '500' }} numberOfLines={2}>{tip.body}</Text>
                        </View>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <TipIcon size={22} color="#fff" />
                        </View>
                      </View>

                      {/* Dot indicators */}
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
                        {tips.map((_, dotIdx) => (
                          <View key={dotIdx} style={{ height: 3, borderRadius: 2, backgroundColor: dotIdx === idx ? '#fff' : 'rgba(255,255,255,0.35)', width: dotIdx === idx ? 14 : 5 }} />
                        ))}
                      </View>
                    </LinearGradient>
                  );
                })}
              </ScrollView>
            </View>
          );
        })()}

        {/* ── Today's Timeline (Care Tasks) ── */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[15px] font-extrabold text-midnight">Today's Timeline</Text>
            <Pressable onPress={() => router.push('/patient/care-schedule')} className="active:opacity-60">
              <Text className="text-[11px] font-bold tracking-[1.5px] uppercase" style={{ color: '#1A73E8' }}>View All</Text>
            </Pressable>
          </View>

          {tasks.length === 0 ? (
            <View className="bg-white rounded-[20px] p-6 items-center border border-slate-100" style={Shadows.card}>
              <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center mb-3">
                <Check size={20} color="#94A3B8" />
              </View>
              <Text className="text-sm font-bold text-midnight mb-1">All Caught Up!</Text>
              <Text className="text-xs text-slate-400 text-center">You have no pending care tasks for today.</Text>
            </View>
          ) : (
            <View className="bg-white rounded-[20px] p-4 border border-slate-100" style={Shadows.card}>
              {(['morning', 'afternoon', 'evening'] as TimeOfDay[]).map((tod, slotIndex, arr) => {
                const todTasks = tasks.filter(t => t.timeOfDay === tod);
                if (todTasks.length === 0) return null;
                const todConfig = timeIcons[tod];
                const TodIcon = todConfig.icon;
                const isLastSlot = slotIndex === arr.filter(t => tasks.some(task => task.timeOfDay === t)).length - 1;

                return (
                  <View key={tod} className="mb-2 relative">
                    {/* Time Slot Header */}
                    <View className="flex-row items-center gap-2 mb-2 z-10 bg-white self-start px-2 -ml-2">
                      <TodIcon size={14} color={todConfig.color} />
                      <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest">{todConfig.label}</Text>
                    </View>

                    {/* Timeline items container */}
                    <View className="pl-2">
                      {todTasks.map((task, idx) => {
                        const isCompleted = task.status === 'completed';
                        const isOverdue = task.status === 'overdue';
                        const catCfg = categoryConfig[task.category];
                        const CatIcon = catCfg.icon;
                        const isLastTask = idx === todTasks.length - 1;
                        
                        return (
                          <View key={task.id} className="flex-row mb-3 relative">
                            {/* Vertical Line connecting tasks */}
                            {(!isLastTask || !isLastSlot) && (
                              <View className="absolute top-8 bottom-[-24px] left-[15px] w-[2px] bg-slate-100 z-0" />
                            )}
                            
                            {/* Icon / Node */}
                            <Pressable 
                              onPress={() => handleTaskPress(task)}
                              className="w-8 h-8 rounded-full items-center justify-center z-10 mr-3 mt-1 bg-white"
                              style={{ 
                                borderWidth: 2, 
                                borderColor: isCompleted ? '#22C55E' : isOverdue ? '#F59E0B' : catCfg.color,
                                shadowColor: isOverdue ? '#F59E0B' : 'transparent',
                                shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
                              }}
                            >
                              {isCompleted ? (
                                <Check size={14} color="#22C55E" />
                              ) : isOverdue ? (
                                <AlertTriangle size={14} color="#F59E0B" />
                              ) : (
                                <CatIcon size={12} color={catCfg.color} />
                              )}
                            </Pressable>

                            {/* Task Content Card */}
                            <Pressable 
                              onPress={() => handleTaskPress(task)}
                              className="flex-1 rounded-[16px] p-3 border"
                              style={{ 
                                backgroundColor: isCompleted ? '#F8FAFC' : isOverdue ? '#FEF3C7' : '#FFFFFF',
                                borderColor: isCompleted ? '#F1F5F9' : isOverdue ? '#FDE68A' : '#F1F5F9',
                              }}
                            >
                              <View className="flex-row justify-between items-start mb-1">
                                <Text className="text-[13px] font-bold flex-1 mr-2" style={{ color: isCompleted ? '#94A3B8' : '#0B1B3D', textDecorationLine: isCompleted ? 'line-through' : 'none' }}>
                                  {task.title}
                                </Text>
                                <Text className="text-[10px] font-bold mt-0.5" style={{ color: isCompleted ? '#CBD5E1' : isOverdue ? '#D97706' : '#64748B' }}>
                                  {task.scheduledTime}
                                </Text>
                              </View>
                              {task.subtitle && (
                                <Text className="text-[11px] font-medium leading-[14px]" style={{ color: isCompleted ? '#CBD5E1' : '#64748B' }}>
                                  {task.subtitle}
                                </Text>
                              )}
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
        {/* ── Animated Water Intake ── */}
        <View className="px-5 mb-3">
          <View className="bg-white rounded-[20px] p-4 border border-slate-100" style={Shadows.card}>
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-xl items-center justify-center bg-tertiary-fixed">
                  <Droplets size={16} color="#38BDF8" />
                </View>
                <Text className="text-[15px] font-extrabold text-midnight">Hydration</Text>
              </View>
              <Pressable onPress={() => router.push('/patient/care-schedule' as any)} className="active:opacity-60">
                <Text className="text-[11px] font-bold tracking-[1.5px] uppercase text-tertiary">Goal: {waterData?.daily_goal_ml ?? 2000}ml</Text>
              </Pressable>
            </View>

            <View className="flex-row items-center gap-4">
              {/* Bottle Visualization */}
              <View className="items-center">
                <View className="w-12 h-20 border-[3px] border-tertiary-container rounded-t-lg rounded-b-xl overflow-hidden justify-end bg-surface-variant relative">
                  <View
                    className="w-full absolute bottom-0 left-0 right-0 bg-tertiary"
                    style={{ height: `${Math.min(waterData?.progress_pct ?? 0, 100)}%` }}
                  />
                  <View className="absolute top-2 bottom-2 left-2 w-1.5 bg-white/40 rounded-full" />
                </View>
                <Text className="text-[10px] font-bold text-tertiary mt-2">{waterData?.progress_pct ?? 0}%</Text>
              </View>

              <View className="flex-1 justify-center">
                <Text className="text-xl font-black text-midnight mb-0.5">{waterData?.today_total_ml ?? 0} <Text className="text-xs font-bold text-slate-400">ml</Text></Text>

                {/* 100% Celebration Text */}
                {(waterData?.progress_pct ?? 0) >= 100 ? (
                  <View className="flex-row items-center gap-1 mb-2 self-start px-2 py-1 rounded-md" style={{ backgroundColor: '#DCFCE7' }}>
                    <Check size={11} color="#16A34A" />
                    <Text className="text-[9px] font-bold text-success-700">Goal Reached!</Text>
                  </View>
                ) : (
                  <Text className="text-[11px] text-slate-500 mb-2 font-medium">Keep drinking to reach your daily goal.</Text>
                )}

                <View className="flex-row gap-2">
                  {[200, 300, 500].map(ml => (
                    <Pressable
                      key={ml}
                      disabled={waterLogLoading}
                      onPress={async () => {
                        setWaterLogLoading(true);
                        try {
                          const result = await logWaterIntake(ml);
                          setWaterData(prev => prev ? { ...prev, today_total_ml: result.today_total_ml, progress_pct: result.progress_pct } : prev);
                        } catch {
                          CustomAlert.alert('Error', 'Could not log water intake.');
                        } finally {
                          setWaterLogLoading(false);
                        }
                      }}
                      className="flex-1 py-2.5 rounded-xl items-center active:opacity-70 bg-tertiary-fixed border border-tertiary-container"
                    >
                      {waterLogLoading ? (
                        <ActivityIndicator size="small" color="#38BDF8" />
                      ) : (
                        <Text className="text-[11px] font-extrabold text-tertiary">+{ml}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Vitals + Wearable + Steps ── */}
        <View className="px-5 mb-3">
          <View className="bg-white rounded-[20px] p-4 border border-outline-variant" style={Shadows.card}>

            {/* Header row */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[15px] font-extrabold text-midnight">Vitals</Text>
              <View className="flex-row items-center gap-3">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Remote Share</Text>
                <Switch
                  value={remoteShare}
                  onValueChange={setRemoteShare}
                  trackColor={{ false: '#E2E8F0', true: '#1A73E8' }}
                  thumbColor="#fff"
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            </View>

            {/* Connect Watch button */}
            <Pressable
              onPress={() => setShowWearablePairing(true)}
              className="rounded-full py-2.5 mb-3 flex-row items-center justify-center gap-2 active:opacity-80"
              style={{ backgroundColor: wearableDevice ? '#DCFCE7' : '#FFF1F2', borderWidth: 1, borderColor: wearableDevice ? '#86EFAC' : '#FECDD3' }}
            >
              <Watch size={16} color={wearableDevice ? '#16A34A' : '#E11D48'} />
              <Text className="text-sm font-bold" style={{ color: wearableDevice ? '#16A34A' : '#E11D48' }}>
                {wearableDevice ? `Connected: ${wearableDevice.device_name ?? wearableDevice.device_type}` : 'Connect Watch for Vitals'}
              </Text>
            </Pressable>

            {/* Live syncing badge + info */}
            <View className="flex-row items-center gap-2 mb-1">
              <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22C55E' }} />
              <Text className="text-[11px] font-extrabold text-success-600 uppercase tracking-widest">Live Syncing</Text>
            </View>
            <Text className="text-[10px] text-slate-400 mb-4">
              {wearableDevice
                ? 'Watch syncing Heart Rate & SpO₂. Steps tracked via phone.'
                : 'Connect watch for Heart Rate & SpO₂. Steps tracked via phone.'}
            </Text>

            {/* Three metric rings: HR · SpO2 · Activity */}
            <View className="flex-row justify-between mb-4">
              {/* Heart Rate */}
              <View className="items-center" style={{ width: '30%' }}>
                <View style={{ position: 'relative', width: 68, height: 68 }}>
                  <Svg width={68} height={68} viewBox="0 0 80 80">
                    <Circle cx="40" cy="40" r="34" fill="none" stroke="#FEE2E2" strokeWidth="5" />
                    {wearableVitals?.heart_rate ? (
                      <Circle cx="40" cy="40" r="34" fill="none" stroke="#EF4444" strokeWidth="5"
                        strokeDasharray={`${Math.min((wearableVitals.heart_rate / 180) * 213.6, 213.6)} 213.6`}
                        strokeLinecap="round" transform="rotate(-90 40 40)" />
                    ) : null}
                  </Svg>
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                    {wearableVitals?.heart_rate ? (
                      <Text className="text-[13px] font-black text-slate-800">{wearableVitals.heart_rate}</Text>
                    ) : (
                      <Text className="text-[11px] font-bold text-slate-300">--</Text>
                    )}
                    <Text className="text-[7px] font-bold text-slate-400">BPM</Text>
                  </View>
                </View>
                <Text className="text-[10px] font-semibold text-slate-600 mt-1.5">Heart Rate</Text>
                {!wearableDevice && (
                  <Pressable onPress={() => setShowWearablePairing(true)}>
                    <Text className="text-[9px] font-bold text-primary mt-0.5">Tap to pair</Text>
                  </Pressable>
                )}
              </View>

              {/* SpO2 */}
              <View className="items-center" style={{ width: '30%' }}>
                <View style={{ position: 'relative', width: 68, height: 68 }}>
                  <Svg width={68} height={68} viewBox="0 0 80 80">
                    <Circle cx="40" cy="40" r="34" fill="none" stroke="#EDE9FE" strokeWidth="5" />
                    {wearableVitals?.spo2 ? (
                      <Circle cx="40" cy="40" r="34" fill="none" stroke="#7C3AED" strokeWidth="5"
                        strokeDasharray={`${Math.min(((wearableVitals.spo2 - 90) / 10) * 213.6, 213.6)} 213.6`}
                        strokeLinecap="round" transform="rotate(-90 40 40)" />
                    ) : null}
                  </Svg>
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                    {wearableVitals?.spo2 ? (
                      <Text className="text-[13px] font-black text-slate-800">{wearableVitals.spo2}</Text>
                    ) : (
                      <Text className="text-[11px] font-bold text-slate-300">--</Text>
                    )}
                    <Text className="text-[7px] font-bold text-slate-400">%</Text>
                  </View>
                </View>
                <Text className="text-[10px] font-semibold text-slate-600 mt-1.5">SpO₂</Text>
                {!wearableDevice && (
                  <Pressable onPress={() => setShowWearablePairing(true)}>
                    <Text className="text-[9px] font-bold text-primary mt-0.5">Tap to pair</Text>
                  </Pressable>
                )}
              </View>

              {/* Activity / Steps */}
              <View className="items-center" style={{ width: '30%' }}>
                <View style={{ position: 'relative', width: 68, height: 68 }}>
                  <Svg width={68} height={68} viewBox="0 0 80 80">
                    <Circle cx="40" cy="40" r="34" fill="none" stroke="#FEF3C7" strokeWidth="5" />
                    <Circle cx="40" cy="40" r="34" fill="none"
                      stroke={liveSteps >= (stepData?.goal_steps ?? 10000) ? '#22C55E' : '#F59E0B'}
                      strokeWidth="5"
                      strokeDasharray={`${Math.min((liveSteps / (stepData?.goal_steps ?? 10000)) * 213.6, 213.6)} 213.6`}
                      strokeLinecap="round" transform="rotate(-90 40 40)" />
                  </Svg>
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                    <Text className="text-[11px] font-black text-slate-800">
                      {liveSteps >= 1000 ? `${(liveSteps / 1000).toFixed(1)}k` : liveSteps.toString()}
                    </Text>
                    <Text className="text-[7px] font-bold text-slate-400">STEPS</Text>
                  </View>
                </View>
                <Text className="text-[10px] font-semibold text-slate-600 mt-1.5">Activity</Text>
                {pedometerAvailable && (
                  <View className="flex-row items-center gap-0.5 mt-0.5">
                    <View className="w-1.5 h-1.5 rounded-full bg-success-500" />
                    <Text className="text-[9px] font-bold text-success-600">Live</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Steps to go banner */}
            {!stepsBannerDismissed && liveSteps < (stepData?.goal_steps ?? 10000) && (
              <View className="rounded-2xl px-3 py-2.5 mb-3 flex-row items-center gap-3" style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' }}>
                <Footprints size={22} color="#F59E0B" />
                <View className="flex-1">
                  <Text className="text-sm font-extrabold text-amber-800">
                    {((stepData?.goal_steps ?? 10000) - liveSteps).toLocaleString()} steps to go!
                  </Text>
                  <Text className="text-[11px] text-amber-700 mt-0.5">
                    {liveSteps < 3000
                      ? 'A 30-min morning walk can help you get started'
                      : liveSteps < 7000
                        ? 'A 20-min evening walk can help you hit your goal'
                        : 'Almost there — a short walk will do it!'}
                  </Text>
                </View>
                <Pressable onPress={() => setStepsBannerDismissed(true)} hitSlop={8}>
                  <X size={16} color="#D97706" />
                </Pressable>
              </View>
            )}

            {liveSteps >= (stepData?.goal_steps ?? 10000) && (
              <View className="rounded-2xl px-3 py-2.5 mb-3 flex-row items-center gap-3" style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' }}>
                <Check size={18} color="#16A34A" />
                <Text className="text-sm font-extrabold text-success-700">Daily step goal achieved! 🎉</Text>
              </View>
            )}

            {/* ── Logged Vitals divider ── */}
            <View className="flex-row items-center gap-3 mb-3 mt-1">
              <View className="flex-1 h-px bg-slate-100" />
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged Vitals</Text>
              <View className="flex-1 h-px bg-slate-100" />
            </View>

            {latestVitals ? (
              <>
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {latestVitals.bp && (
                    <View className="rounded-2xl p-3 border border-rose-100" style={{ backgroundColor: '#FFF1F2', width: '47%' }}>
                      <View className="flex-row justify-between items-center mb-2">
                        <Activity size={13} color="#E11D48" />
                        <View className="flex-row items-center gap-0.5">
                          <ArrowDownRight size={9} color="#16A34A" />
                          <Text className="text-[8px] font-bold text-success-600">Normal</Text>
                        </View>
                      </View>
                      <Text className="text-[17px] font-extrabold text-rose-950">{latestVitals.bp}</Text>
                      <Text className="text-[9px] font-bold text-rose-500 mt-0.5 uppercase tracking-wide">Blood Pressure</Text>
                    </View>
                  )}
                  {latestVitals.heart_rate && (
                    <View className="rounded-2xl p-3 border border-sky-100" style={{ backgroundColor: '#F0F9FF', width: '47%' }}>
                      <View className="flex-row justify-between items-center mb-2">
                        <Heart size={13} color="#0284C7" />
                        <CloudLightning size={10} color="#0284C7" />
                      </View>
                      <Text className="text-[17px] font-extrabold text-sky-950">
                        {latestVitals.heart_rate}
                        <Text className="text-[10px] font-bold text-sky-500"> bpm</Text>
                      </Text>
                      <Text className="text-[9px] font-bold text-sky-500 mt-0.5 uppercase tracking-wide">Heart Rate</Text>
                    </View>
                  )}
                  {latestVitals.spo2 && (
                    <View className="rounded-2xl p-3 border border-indigo-100" style={{ backgroundColor: '#F5F3FF', width: '47%' }}>
                      <Wind size={13} color="#4F46E5" style={{ marginBottom: 6 }} />
                      <Text className="text-[17px] font-extrabold text-indigo-950">{latestVitals.spo2}
                        <Text className="text-[10px] font-bold text-indigo-500">%</Text>
                      </Text>
                      <Text className="text-[9px] font-bold text-indigo-500 mt-0.5 uppercase tracking-wide">SpO₂</Text>
                    </View>
                  )}
                  {latestVitals.temperature_c && (
                    <View className="rounded-2xl p-3 border border-amber-100" style={{ backgroundColor: '#FFFBEB', width: '47%' }}>
                      <Thermometer size={13} color="#D97706" style={{ marginBottom: 6 }} />
                      <Text className="text-[17px] font-extrabold text-amber-950">{Number(latestVitals.temperature_c).toFixed(1)}
                        <Text className="text-[10px] font-bold text-amber-500">°C</Text>
                      </Text>
                      <Text className="text-[9px] font-bold text-amber-500 mt-0.5 uppercase tracking-wide">Temperature</Text>
                    </View>
                  )}
                </View>
                <Text className="text-[9px] text-slate-400 text-center mb-3">
                  Recorded at {new Date(latestVitals.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </>
            ) : (
              <View className="items-center py-4 mb-4">
                <HeartPulse size={28} color="#CBD5E1" />
                <Text className="text-xs font-bold text-slate-400 mt-2">No vitals recorded yet</Text>
              </View>
            )}

            {/* Log New + View Trends row */}
            <View className="flex-row items-center gap-3 mb-1">
              <Pressable
                onPress={() => router.push('/patient/log-vitals' as any)}
                className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl active:opacity-70"
                style={{ backgroundColor: '#EEF4FF', borderWidth: 1, borderColor: '#BFDBFE' }}
              >
                <Plus size={13} color="#1A73E8" />
                <Text className="text-[12px] font-bold text-primary">Log Vitals</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/patient/vitals-trend' as any)}
                className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl active:opacity-70"
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}
              >
                <TrendingUp size={13} color="#64748B" />
                <Text className="text-[12px] font-bold text-slate-500">30-Day Trends</Text>
              </Pressable>
            </View>

            <Text className="text-[10px] text-slate-400 text-center mt-2">
              Last synced: {wearableDevice?.last_synced_at
                ? new Date(wearableDevice.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Just now'}
            </Text>

          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View className="mb-4">
          <Text className="text-[13px] font-extrabold text-midnight px-5 mb-2">Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 20, gap: 12 }}>
            {([
              { label: 'Book Appointment', icon: CalendarPlus,     color: '#1A73E8', bg: '#EEF4FF', route: '/patient/consultation-type' },
              { label: 'Order Medicines',  icon: Package,          color: '#7C3AED', bg: '#F0EEFF', route: '/patient/(tabs)/pharmacy' },
              { label: 'My Records',       icon: FileText,         color: '#059669', bg: '#EEFBF4', route: '/patient/(tabs)/records' },
              { label: 'My Bookings',      icon: BriefcaseMedical, color: '#D97706', bg: '#FFFBEB', route: '/patient/(tabs)/bookings' },
            ] as const).map((item, idx) => {
              const QIcon = item.icon;
              return (
                <Pressable
                  key={idx}
                  onPress={() => router.push(item.route as any)}
                  className="items-center active:opacity-70"
                  style={{ width: 76 }}
                >
                  <View className="w-14 h-14 rounded-2xl items-center justify-center mb-2" style={{ backgroundColor: item.bg, shadowColor: item.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }}>
                    <QIcon size={24} color={item.color} />
                  </View>
                  <Text className="text-[10px] font-bold text-slate-600 text-center leading-3">{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

      </ScrollView>

      <Pressable onPress={() => router.push('/patient/sos-emergency')} className="absolute bottom-24 right-5 w-16 h-16 rounded-full items-center justify-center active:opacity-80" style={{ backgroundColor: '#EF4444', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 12 }}>
        <Text className="text-white font-extrabold text-sm tracking-wider">SOS</Text>
      </Pressable>

      <Modal visible={showNotifications} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[75%]" style={Shadows.presence}>
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <View>
                <Text className="text-xl font-extrabold text-midnight">Notifications</Text>
                {unreadCount > 0 && <Text className="text-xs text-slate-400 mt-0.5">{unreadCount} unread</Text>}
              </View>
              <View className="flex-row items-center gap-3">
                {unreadCount > 0 && <Pressable onPress={markAllRead} className="active:opacity-60"><Text className="text-xs font-bold text-primary">Mark All Read</Text></Pressable>}
                <Pressable onPress={() => setShowNotifications(false)} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"><X size={18} color="#64748B" /></Pressable>
              </View>
            </View>
            <ScrollView className="px-6 py-4">
              {notifications.length === 0 && (
                <View className="items-center py-10"><Bell size={32} color="#CBD5E1" /><Text className="text-slate-400 text-sm mt-3">No notifications yet</Text></View>
              )}
              {notifications.map((n) => {
                const cfg = notificationConfig[n.type] ?? { icon: Bell, color: '#64748B' };
                const NIcon = cfg.icon;
                return (
                  <Pressable key={n.id} onPress={() => { setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item)); CustomAlert.alert(n.title, n.body); }} className="flex-row items-start gap-3 py-3 active:opacity-70" style={{ borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
                    {!n.read && <View className="w-2 h-2 rounded-full bg-primary mt-2" />}
                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${cfg.color}15` }}><NIcon size={18} color={cfg.color} /></View>
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

      <Modal visible={showWearablePairing} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%]" style={Shadows.presence}>
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <Text className="text-xl font-extrabold text-midnight">
                {wearableDevice ? 'Manage Watch' : 'Connect Wearable'}
              </Text>
              <Pressable onPress={() => setShowWearablePairing(false)} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200">
                <X size={18} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView className="px-6 py-6" showsVerticalScrollIndicator={false}>
              {!wearableDevice ? (
                <>
                  <Text className="text-sm text-slate-600 mb-4">
                    Pair your wearable device to get real-time heart rate, SpO₂, and other vital signs.
                  </Text>
                  <View className="space-y-3 mb-6">
                    {['apple_watch', 'fitbit', 'garmin'].map((type) => (
                      <Pressable
                        key={type}
                        onPress={async () => {
                          try {
                            const device = await requestWearablePairing({ device_type: type });
                            setWearableDevice(device as any);
                            setShowWearablePairing(false);
                            // In production, this would deep link to the device's pairing flow
                          } catch (err) {
                            CustomAlert.alert('Error', 'Failed to pair device. Please try again.');
                          }
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex-row items-center justify-between active:opacity-70"
                      >
                        <View className="flex-row items-center gap-3 flex-1">
                          <Watch size={24} color="#1A73E8" />
                          <View>
                            <Text className="text-sm font-bold text-midnight capitalize">{type.replace('_', ' ')}</Text>
                            <Text className="text-xs text-slate-500 mt-0.5">Tap to pair</Text>
                          </View>
                        </View>
                        <ChevronRight size={16} color="#94A3B8" />
                      </Pressable>
                    ))}
                  </View>
                  <Text className="text-xs text-slate-500 text-center">
                    We support Apple Watch, Fitbit, Garmin, and more wearable devices.
                  </Text>
                </>
              ) : (
                <>
                  <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                    <View className="flex-row items-center gap-2 mb-2">
                      <View className="w-2 h-2 rounded-full bg-success-500" />
                      <Text className="text-sm font-bold text-success-700">Connected</Text>
                    </View>
                    <Text className="text-sm text-slate-600">
                      <Text className="font-bold">{wearableDevice.device_name || wearableDevice.device_type}</Text> is syncing vitals in real-time.
                    </Text>
                    {wearableDevice.last_synced_at && (
                      <Text className="text-xs text-slate-500 mt-2">
                        Last synced: {new Date(wearableDevice.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={async () => {
                      try {
                        await disconnectWearable();
                        setWearableDevice(null);
                        setWearableVitals(null);
                        setShowWearablePairing(false);
                      } catch (err) {
                        CustomAlert.alert('Error', 'Failed to disconnect device. Please try again.');
                      }
                    }}
                    className="bg-red-50 border border-red-200 rounded-xl p-4 flex-row items-center justify-center gap-2 active:opacity-70"
                  >
                    <X size={16} color="#DC2626" />
                    <Text className="text-sm font-bold text-red-600">Disconnect Device</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
