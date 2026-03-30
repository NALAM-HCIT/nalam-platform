import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Image, Switch, Modal, Animated, RefreshControl, Dimensions, TextInput, ActivityIndicator } from 'react-native';
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
} from '@/services/patientDashboardService';
import { scheduleWaterReminders, configureNotificationHandler } from '@/services/waterReminders';
import {
  Bell, Check, Droplets, Pill, CalendarPlus, Package, FileText,
  BriefcaseMedical, Sun, Moon, Sunrise, Sunset, Heart, Activity,
  Apple, Dumbbell, X, Clock, AlertTriangle, Flame, TrendingUp,
  Zap, ChevronRight, Sparkles, Wind, Gauge, Footprints,
  CircleAlert, SkipForward, Timer, Lightbulb, Award, Watch, Info,
  Smile, Frown, Meh, ThumbsUp, HeartPulse, Thermometer,
  CloudLightning, Star, ArrowUpRight, ArrowDownRight, ArrowRight, Plus
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

// ─── Motivational Messages ───
const motivationalMessages = [
  { threshold: 0.9, message: 'You are crushing it! Excellent care routine.', emoji: '🚀' },
  { threshold: 0.7, message: 'Great progress today, almost there!', emoji: '🌟' },
  { threshold: 0.4, message: 'Keep up the momentum, you got this.', emoji: '💪' },
  { threshold: 0.1, message: 'Every healthy choice counts today.', emoji: '🌱' },
  { threshold: 0.0, message: 'Let\'s start fresh! One step at a time.', emoji: '🌞' },
];

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
          strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </View>
  );
}

// ─── Main Dashboard ───
export default function PatientDashboard() {
  const router = useRouter();
  const userName = useAuthStore((s) => s.userName);
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [todayMoodData, setTodayMoodData]   = useState<TodayMood | null>(null);
  const [waterData, setWaterData]           = useState<WaterSettings | null>(null);
  const [physioToday, setPhysioToday]       = useState<TodayPhysio | null>(null);
  const [latestVitals, setLatestVitals]     = useState<LatestVitals | null>(null);
  const [apiTips, setApiTips]               = useState<HealthTip[]>([]);
  const [waterLogLoading, setWaterLogLoading] = useState(false);

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
    });
  }, []);

  const loadDashboard = useCallback(() => {
    patientService.getNotifications().then(setNotifications).catch(() => {});
    getTodayMood().then(setTodayMoodData).catch(() => {});
    getWaterSettings().then(setWaterData).catch(() => {});
    getTodayPhysio().then(setPhysioToday).catch(() => {});
    getLatestVitals().then(setLatestVitals).catch(() => {});
    getHealthTips().then(setApiTips).catch(() => {});
  }, []);

  useEffect(() => {
    configureNotificationHandler();
    loadCarePlan();
    loadDashboard();
  }, [loadCarePlan, loadDashboard]);

  // Re-fetch vitals whenever the tab comes back into focus
  // (e.g. after the user saves from log-vitals screen and returns)
  useFocusEffect(useCallback(() => {
    getLatestVitals().then(setLatestVitals).catch(() => {});
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
  const motivMsg = motivationalMessages.find(m => (healthScore/100) >= m.threshold) || motivationalMessages[motivationalMessages.length - 1];

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
  // using gradient configuration instead of dynamic JS color classes
  const ptGradient = currentHour < 12 ? ['#60A5FA', '#3B82F6'] : currentHour < 17 ? ['#F59E0B', '#D97706'] : ['#4F46E5', '#312E81'];
  const greetingText = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1A73E8" />}>
        {/* ── Dynamic Header ── */}
        <LinearGradient
          colors={currentHour < 12 ? ['#eff6ff', '#dbeafe'] : currentHour < 17 ? ['#fef3c7', '#fef08a'] : ['#eef2ff', '#e0e7ff']}
          className="px-6 pt-5 pb-6 rounded-b-[32px] mb-4"
          style={Shadows.card}
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <Image source={require('../../../assets/logo_arunpriya.png')} style={{ width: 44, height: 44 }} resizeMode="contain" />
              <View>
                <Text className="text-[12px] font-bold text-midnight leading-[16px]">Arun Priya{'\n'}Hospital</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => setShowNotifications(true)} className="w-10 h-10 rounded-full bg-white/60 items-center justify-center border border-white/50 active:opacity-70">
                <Bell size={18} color="#0B1B3D" />
                {unreadCount > 0 && (
                  <View className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center border-2 border-white"><Text className="text-white text-[9px] font-bold">{unreadCount}</Text></View>
                )}
              </Pressable>
              <Pressable onPress={() => router.push('/patient/(tabs)/profile' as any)} className="w-10 h-10 rounded-full items-center justify-center active:opacity-70" style={{ backgroundColor: '#0B1B3D' }}>
                <Text className="text-sm font-bold text-white">{(userName || 'DM').slice(0, 2).toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>
          <View>
            <Text className="text-slate-600 font-semibold">{greetingText},</Text>
            <Text className="text-[28px] font-extrabold text-midnight tracking-tight leading-8">{userName || 'David Miller'}</Text>
          </View>
        </LinearGradient>

        {/* ── Health Score Hero ── */}
        <View className="px-5 mb-4 mt-2">
          <View className="bg-white rounded-[24px] p-5 flex-row items-center gap-4 border border-slate-100/60" style={Shadows.card}>
            <View style={{ width: 88, height: 88 }}>
              <SweepRing progress={healthScore / 100} size={88} strokeWidth={8} color={healthScore >= 80 ? '#22C55E' : healthScore >= 50 ? '#1A73E8' : '#F59E0B'} />
              <View className="absolute inset-0 items-center justify-center">
                <Text className="text-[22px] font-extrabold text-midnight">{healthScore}</Text>
                <Text className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-[-2px]">Score</Text>
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-base font-extrabold text-midnight mb-1">{motivMsg.message}</Text>
              <View className="flex-row items-center gap-2 mt-2">
                <View className="px-2.5 py-1 bg-blue-50 rounded-full flex-row items-center gap-1">
                  <Check size={10} color="#1A73E8" />
                  <Text className="text-[10px] font-bold text-blue-700">{completedTasks}/{totalTasks} Tasks</Text>
                </View>
                <View className="px-2.5 py-1 bg-amber-50 rounded-full flex-row items-center gap-1">
                  <Flame size={10} color="#D97706" />
                  <Text className="text-[10px] font-bold text-amber-700">7d Streak</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Animated Mood Check-in ── */}
        <View className="px-5 mb-5">
          <View className="bg-white rounded-[20px] px-4 py-3.5 border border-slate-100" style={Shadows.card}>
            <Text className="text-[12px] font-bold text-midnight mb-3">How are you feeling?</Text>
            <View className="flex-row justify-between pt-1">
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
                      className="w-[42px] h-[42px] rounded-full items-center justify-center mb-1.5"
                      style={{
                        backgroundColor: isSelected ? m.color : `${m.color}08`,
                        borderWidth: isSelected ? 0 : 1,
                        borderColor: isSelected ? 'transparent' : `${m.color}20`,
                        ...(isSelected ? { shadowColor: m.color, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 } : {}),
                      }}
                    >
                      <Icon size={18} color={isSelected ? '#FFFFFF' : m.color} />
                    </View>
                    <Text style={{ fontSize: 9, fontWeight: isSelected ? '800' : '600', color: isSelected ? m.color : '#94A3B8' }}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
        {/* ── Today's Timeline (Care Tasks) ── */}
        <View className="px-5 mb-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[16px] font-extrabold text-midnight">Today's Timeline</Text>
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
            <View className="bg-white rounded-[24px] p-5 border border-slate-100" style={Shadows.card}>
              {(['morning', 'afternoon', 'evening'] as TimeOfDay[]).map((tod, slotIndex, arr) => {
                const todTasks = tasks.filter(t => t.timeOfDay === tod);
                if (todTasks.length === 0) return null;
                const todConfig = timeIcons[tod];
                const TodIcon = todConfig.icon;
                const isLastSlot = slotIndex === arr.filter(t => tasks.some(task => task.timeOfDay === t)).length - 1;

                return (
                  <View key={tod} className="mb-2 relative">
                    {/* Time Slot Header */}
                    <View className="flex-row items-center gap-2 mb-3 z-10 bg-white self-start px-2 -ml-2">
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
                          <View key={task.id} className="flex-row mb-4 relative">
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
        <View className="px-5 mb-5">
          <View className="bg-white rounded-[24px] p-5 border border-slate-100" style={Shadows.card}>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-xl items-center justify-center bg-sky-50">
                  <Droplets size={16} color="#0EA5E9" />
                </View>
                <Text className="text-[15px] font-extrabold text-midnight">Hydration</Text>
              </View>
              <Pressable onPress={() => router.push('/patient/care-schedule' as any)} className="active:opacity-60">
                <Text className="text-[11px] font-bold tracking-[1.5px] uppercase" style={{ color: '#0EA5E9' }}>Goal: {waterData?.daily_goal_ml ?? 2000}ml</Text>
              </Pressable>
            </View>

            <View className="flex-row items-center gap-5 mt-1">
              {/* Bottle Visualization */}
              <View className="items-center">
                <View className="w-14 h-28 border-[3px] border-sky-100 rounded-t-lg rounded-b-xl overflow-hidden justify-end bg-slate-50 relative">
                  <View 
                    className="w-full bg-sky-400 absolute bottom-0 left-0 right-0" 
                    style={{ height: `${Math.min(waterData?.progress_pct ?? 0, 100)}%` }} 
                  />
                  {/* Glass highlights */}
                  <View className="absolute top-2 bottom-2 left-2 w-1.5 bg-white/40 rounded-full" />
                </View>
                <Text className="text-[10px] font-bold text-sky-500 mt-2">{waterData?.progress_pct ?? 0}%</Text>
              </View>

              <View className="flex-1 justify-center">
                <Text className="text-2xl font-black text-midnight mb-0.5">{waterData?.today_total_ml ?? 0} <Text className="text-sm font-bold text-slate-400">ml</Text></Text>
                
                {/* 100% Celebration Text */}
                {(waterData?.progress_pct ?? 0) >= 100 ? (
                  <View className="flex-row items-center gap-1 mb-3 bg-emerald-50 self-start px-2 py-1 rounded-md">
                    <Check size={12} color="#059669" />
                    <Text className="text-[10px] font-bold text-emerald-700">Goal Reached!</Text>
                  </View>
                ) : (
                  <Text className="text-xs text-slate-500 mb-3 font-medium">Keep drinking to reach your daily goal.</Text>
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
                      className="flex-1 py-2.5 rounded-xl items-center active:opacity-70 bg-sky-50 border border-sky-100"
                    >
                      {waterLogLoading ? (
                        <ActivityIndicator size="small" color="#0EA5E9" />
                      ) : (
                        <Text className="text-[11px] font-extrabold text-sky-600">+{ml}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Vitals Spotlight ── */}
        <View className="px-5 mb-5">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-[16px] font-extrabold text-midnight">My Vitals</Text>
            <View className="flex-row items-center gap-3">
              <Text className="text-[10px] font-bold text-slate-400">
                {latestVitals ? new Date(latestVitals.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
              <Pressable onPress={() => router.push('/patient/log-vitals' as any)} className="bg-primary/10 px-3 py-1.5 rounded-full flex-row items-center gap-1 active:opacity-70">
                <Plus size={12} color="#1A73E8" />
                <Text className="text-[11px] font-bold text-primary">Log New</Text>
              </Pressable>
            </View>
          </View>

          {latestVitals ? (
            <View className="bg-white rounded-[24px] p-4 border border-slate-100" style={Shadows.card}>
              <View className="flex-row flex-wrap gap-3">
                {latestVitals.bp && (
                  <View className="w-[47%] bg-rose-50 rounded-2xl p-3 border border-rose-100">
                    <View className="flex-row justify-between items-start mb-2">
                      <Activity size={14} color="#E11D48" />
                      <View className="flex-row items-center gap-0.5"><ArrowDownRight size={10} color="#059669" /><Text className="text-[9px] font-bold text-emerald-600">Normal</Text></View>
                    </View>
                    <Text className="text-lg font-black text-rose-950">{latestVitals.bp}</Text>
                    <Text className="text-[10px] font-bold text-rose-600/80 mt-0.5">Blood Pressure</Text>
                  </View>
                )}
                {latestVitals.heart_rate && (
                  <View className="w-[47%] bg-sky-50 rounded-2xl p-3 border border-sky-100">
                    <View className="flex-row justify-between items-start mb-2">
                      <Heart size={14} color="#0284C7" />
                      <View className="flex-row items-center gap-0.5 absolute right-0"><CloudLightning size={10} color="#0284C7" className="animate-pulse" /></View>
                    </View>
                    <Text className="text-lg font-black text-sky-950">{latestVitals.heart_rate} <Text className="text-[11px] font-bold text-sky-600">bpm</Text></Text>
                    <Text className="text-[10px] font-bold text-sky-600/80 mt-0.5">Heart Rate</Text>
                  </View>
                )}
                {latestVitals.spo2 && (
                  <View className="w-[47%] bg-indigo-50 rounded-2xl p-3 border border-indigo-100">
                    <Wind size={14} color="#4F46E5" className="mb-2" />
                    <Text className="text-lg font-black text-indigo-950">{latestVitals.spo2}%</Text>
                    <Text className="text-[10px] font-bold text-indigo-600/80 mt-0.5">SpO₂</Text>
                  </View>
                )}
                {latestVitals.temperature_c && (
                  <View className="w-[47%] bg-amber-50 rounded-2xl p-3 border border-amber-100">
                    <Thermometer size={14} color="#D97706" className="mb-2" />
                    <Text className="text-lg font-black text-amber-950">{Number(latestVitals.temperature_c).toFixed(1)}°C</Text>
                    <Text className="text-[10px] font-bold text-amber-600/80 mt-0.5">Temperature</Text>
                  </View>
                )}
              </View>

              <Pressable onPress={() => router.push('/patient/vitals-trend' as any)} className="mt-4 pt-4 border-t border-slate-100 flex-row justify-center items-center gap-1.5 active:opacity-60">
                <TrendingUp size={14} color="#1A73E8" />
                <Text className="text-xs font-bold text-primary">View Full Trends</Text>
              </Pressable>
            </View>
          ) : (
            <View className="bg-white rounded-[20px] p-6 items-center border border-slate-100" style={Shadows.card}>
              <View className="w-12 h-12 rounded-full bg-slate-50 items-center justify-center mb-3">
                <HeartPulse size={20} color="#94A3B8" />
              </View>
              <Text className="text-sm font-bold text-midnight mb-1">No Vitals Tracked</Text>
              <Text className="text-xs text-slate-400 text-center">Log your baseline vitals to track your health.</Text>
            </View>
          )}
        </View>
        {/* ── Smart Contextual Actions ── */}
        <View className="px-5 mb-5">
          <Text className="text-[16px] font-extrabold text-midnight mb-3">Quick Actions</Text>
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
                  className="bg-white rounded-xl p-4 items-center gap-2 active:scale-95 transition-transform"
                  style={[Shadows.card, { width: '47%' }]}
                >
                  <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: item.bg }}>
                    <QIcon size={24} color={item.color} />
                  </View>
                  <Text className="text-[11px] font-bold text-slate-600 text-center">{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ── Swipeable Health Tips ── */}
        <View className="mb-8">
          <View className="px-5 mb-3 flex-row items-center justify-between">
            <Text className="text-[16px] font-extrabold text-midnight">Daily Insights</Text>
            <View className="flex-row items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
              <Star size={10} color="#D97706" fill="#D97706" />
              <Text className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">New</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-5 pr-5">
            {(apiTips.length > 0 ? apiTips.map(t => ({ title: t.title, body: t.body, icon: Lightbulb, color: '#1A73E8' })) : FALLBACK_TIPS).map((tip, idx, arr) => {
              const TipIcon = tip.icon;
              const isLast = idx === arr.length - 1;
              return (
                <Pressable
                  key={idx}
                  onPress={() => CustomAlert.alert(tip.title, tip.body)}
                  className={`bg-white rounded-[20px] p-4 mr-3 border border-slate-100/80 ${isLast ? 'mr-10' : ''}`}
                  style={[Shadows.card, { width: width * 0.75 }]}
                >
                  <View className="flex-row items-start gap-3">
                    <View className="w-10 h-10 rounded-full items-center justify-center shrink-0" style={{ backgroundColor: `${tip.color}15` }}>
                      <TipIcon size={20} color={tip.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-midnight mb-1" numberOfLines={1}>{tip.title}</Text>
                      <Text className="text-xs text-slate-500 font-medium leading-relaxed" numberOfLines={2}>{tip.body}</Text>
                    </View>
                  </View>
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
    </SafeAreaView>
  );
}
