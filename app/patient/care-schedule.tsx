import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft, SlidersHorizontal, Check, Pill, Dumbbell, Apple,
  Heart, Droplets, Sunrise, Sun, Moon, AlertTriangle, Timer,
  ChevronRight,
} from 'lucide-react-native';
import { patientService } from '@/services/patientService';
import { getTodayCareTasks, logCareTaskComplete } from '@/services/patientDashboardService';

// ─── Types ───────────────────────────────────────────────────────────────────
type TaskCategory = 'medicine' | 'physio' | 'diet' | 'vitals' | 'hydration';
type TaskStatus = 'pending' | 'completed' | 'overdue' | 'snoozed';
type TimeOfDay = 'morning' | 'afternoon' | 'evening';
type FilterKey = 'all' | TaskCategory;

interface DosageSchedule { m: number; a: number; e: number }

interface CareTask {
  id: string;
  title: string;
  subtitle?: string;
  category: TaskCategory;
  time: string;
  timeOfDay: TimeOfDay;
  status: TaskStatus;
  dosage?: DosageSchedule;
  completedAt?: string;
}

// ─── Category Config ─────────────────────────────────────────────────────────
const categoryMeta: Record<TaskCategory, {
  icon: typeof Pill; color: string; bg: string; label: string;
}> = {
  medicine:  { icon: Pill,     color: '#1A73E8', bg: '#EEF4FF', label: 'Medicine' },
  physio:    { icon: Dumbbell, color: '#8B5CF6', bg: '#F3EEFF', label: 'Physio' },
  diet:      { icon: Apple,    color: '#22C55E', bg: '#EEFBF4', label: 'Diet' },
  vitals:    { icon: Heart,    color: '#EF4444', bg: '#FEF2F2', label: 'Vitals' },
  hydration: { icon: Droplets, color: '#0EA5E9', bg: '#F0F9FF', label: 'Hydration' },
};

const filterChips: { key: FilterKey; label: string; color: string }[] = [
  { key: 'all',       label: 'All',       color: '#1A73E8' },
  { key: 'medicine',  label: 'Medicine',  color: '#1A73E8' },
  { key: 'physio',    label: 'Physio',    color: '#8B5CF6' },
  { key: 'diet',      label: 'Diet',      color: '#22C55E' },
  { key: 'vitals',    label: 'Vitals',    color: '#EF4444' },
  { key: 'hydration', label: 'Hydration', color: '#0EA5E9' },
];

const periodConfig: Record<TimeOfDay, {
  icon: typeof Sunrise; label: string; color: string; bg: string;
  timeRange: string;
}> = {
  morning:   { icon: Sunrise, label: 'Morning',   color: '#F59E0B', bg: '#FFFBEB', timeRange: '8:00 AM - 12:00 PM' },
  afternoon: { icon: Sun,     label: 'Afternoon',  color: '#EA580C', bg: '#FFF7ED', timeRange: '12:00 PM - 5:00 PM' },
  evening:   { icon: Moon,    label: 'Evening',    color: '#6366F1', bg: '#EEF2FF', timeRange: '5:00 PM - 9:00 PM' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferTimeOfDay(instructions: string | null): TimeOfDay {
  if (!instructions) return 'morning';
  const lower = instructions.toLowerCase();
  if (lower.includes('evening') || lower.includes('night') || lower.includes('bedtime') || lower.includes('dinner')) return 'evening';
  if (lower.includes('afternoon') || lower.includes('lunch') || lower.includes('noon')) return 'afternoon';
  return 'morning';
}

function timeOfDayToTime(tod: TimeOfDay): string {
  if (tod === 'afternoon') return '1:00 PM';
  if (tod === 'evening') return '8:00 PM';
  return '8:00 AM';
}

// Default task — vitals only. Water and physio have dedicated dashboard widgets.
const DEFAULT_TASKS: CareTask[] = [
  {
    id: 'vitals-default',
    title: 'Log Blood Pressure',
    subtitle: 'Systolic & Diastolic',
    category: 'vitals',
    time: '9:00 AM',
    timeOfDay: 'morning',
    status: 'pending',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildCalendarDays(today: Date): { date: Date; label: string; day: number; isToday: boolean }[] {
  const days: { date: Date; label: string; day: number; isToday: boolean }[] = [];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({ date: d, label: weekdays[d.getDay()], day: d.getDate(), isToday: i === 0 });
  }
  return days;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function CareScheduleScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const calendarDays = useMemo(() => buildCalendarDays(today), [today]);

  const [selectedDate, setSelectedDate] = useState<number>(3); // index into calendarDays, today
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [tasks, setTasks] = useState<CareTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Load prescriptions and today's saved task logs in parallel
        const [prescriptions, savedLogs] = await Promise.all([
          patientService.getPrescriptions().catch(() => []),
          getTodayCareTasks().catch(() => []),
        ]);

        const savedStatusMap = new Map(savedLogs.map((l) => [l.task_id, l.status as TaskStatus]));

        const active = prescriptions
          .filter((p) => p.prescriptionStatus !== 'cancelled')
          .slice(0, 2);

        const medicineTasks: CareTask[] = [];
        for (const rx of active) {
          try {
            const detail = await patientService.getPrescriptionDetail(rx.id);
            detail.prescriptionItems.forEach((item) => {
              const taskId = `rx-${rx.id}-${item.id}`;
              const tod = inferTimeOfDay(item.dosageInstructions);
              medicineTasks.push({
                id: taskId,
                title: item.medicineName,
                subtitle: item.dosageInstructions ?? undefined,
                category: 'medicine',
                time: timeOfDayToTime(tod),
                timeOfDay: tod,
                status: savedStatusMap.get(taskId) ?? 'pending',
              });
            });
          } catch { /* skip this prescription if detail fetch fails */ }
        }

        // Apply saved status to default tasks too
        const defaults = DEFAULT_TASKS.map((t) => ({
          ...t,
          status: savedStatusMap.get(t.id) ?? t.status,
        }));

        setTasks([...medicineTasks, ...defaults]);
      } catch {
        setTasks(DEFAULT_TASKS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Filtered tasks ──
  const filteredTasks = useMemo(() => {
    if (activeFilter === 'all') return tasks;
    return tasks.filter((t) => t.category === activeFilter);
  }, [tasks, activeFilter]);

  const groupedByPeriod = useMemo(() => {
    const groups: Record<TimeOfDay, CareTask[]> = { morning: [], afternoon: [], evening: [] };
    filteredTasks.forEach((t) => groups[t.timeOfDay].push(t));
    return groups;
  }, [filteredTasks]);

  // ── Task actions ──
  const markComplete = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (task) logCareTaskComplete(id, task.title, 'completed').catch(() => {});
      return prev.map((t) =>
        t.id === id
          ? { ...t, status: 'completed' as TaskStatus, completedAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }
          : t,
      );
    });
  }, []);

  const snoozeTask = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (task) logCareTaskComplete(id, task.title, 'snoozed').catch(() => {});
      return prev.map((t) => (t.id === id ? { ...t, status: 'snoozed' as TaskStatus } : t));
    });
  }, []);

  const skipTask = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (task) logCareTaskComplete(id, task.title, 'skipped').catch(() => {});
      return prev.map((t) => (t.id === id ? { ...t, status: 'completed' as TaskStatus, completedAt: 'Skipped' } : t));
    });
  }, []);

  const handleTaskPress = useCallback((task: CareTask) => {
    if (task.status === 'completed') {
      CustomAlert.alert('Completed', `${task.title} was completed at ${task.completedAt || 'earlier today'}.`);
      return;
    }
    if (task.status === 'snoozed') {
      CustomAlert.alert('Snoozed', `${task.title} has been snoozed by 1 hour.`, [
        { text: 'Mark Complete', onPress: () => markComplete(task.id) },
        { text: 'OK', style: 'cancel' },
      ]);
      return;
    }
    if (task.status === 'overdue') {
      CustomAlert.alert('Overdue Task', `${task.title} is overdue. What would you like to do?`, [
        { text: 'Log Late Dose', onPress: () => markComplete(task.id) },
        { text: 'Skip', style: 'destructive', onPress: () => skipTask(task.id) },
        { text: 'Snooze 1hr', onPress: () => snoozeTask(task.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    // pending
    CustomAlert.alert('Mark Complete?', `Did you complete "${task.title}"?`, [
      { text: 'Yes', onPress: () => markComplete(task.id) },
      { text: 'Not yet', style: 'cancel' },
    ]);
  }, [markComplete, snoozeTask, skipTask]);

  const handleTaskLongPress = useCallback((task: CareTask) => {
    if (task.status === 'pending' || task.status === 'overdue') {
      CustomAlert.alert('Snooze', `Snooze "${task.title}" by 1 hour?`, [
        { text: 'Snooze 1hr', onPress: () => snoozeTask(task.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [snoozeTask]);

  // ── Counts ──
  const totalForDay = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  // ── Render helpers ──
  const selectedDay = calendarDays[selectedDate];
  const dateLabel = selectedDay.isToday
    ? 'Today'
    : selectedDay.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white items-center justify-center"
          style={Shadows.card}
        >
          <ArrowLeft size={20} color="#0B1B3D" />
        </Pressable>
        <Text className="text-lg font-bold text-midnight">Care Plan Schedule</Text>
        <Pressable
          onPress={() => CustomAlert.alert('Filters', 'Advanced filters coming soon.')}
          className="w-10 h-10 rounded-full bg-white items-center justify-center"
          style={Shadows.card}
        >
          <SlidersHorizontal size={18} color="#0B1B3D" />
        </Pressable>
      </View>

      {/* ── Calendar Strip ── */}
      <View className="px-3 py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {calendarDays.map((d, idx) => {
            const isSelected = idx === selectedDate;
            return (
              <Pressable
                key={idx}
                onPress={() => setSelectedDate(idx)}
                className={`items-center justify-center w-14 h-[72px] rounded-2xl ${
                  isSelected ? 'bg-[#1A73E8]' : 'bg-white'
                }`}
                style={isSelected ? Shadows.focus : Shadows.card}
              >
                <Text className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-[#64748B]'}`}>
                  {d.label}
                </Text>
                <Text className={`text-lg font-bold mt-1 ${isSelected ? 'text-white' : 'text-midnight'}`}>
                  {d.day}
                </Text>
                {d.isToday && !isSelected && (
                  <View className="w-1.5 h-1.5 rounded-full bg-[#1A73E8] mt-1" />
                )}
                {d.isToday && isSelected && (
                  <View className="w-1.5 h-1.5 rounded-full bg-white mt-1" />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Date Label + Progress ── */}
      <View className="flex-row items-center justify-between px-5 pt-1 pb-2">
        <Text className="text-sm font-semibold text-midnight">{dateLabel}</Text>
        <View className="flex-row items-center gap-1">
          <View className="w-5 h-5 rounded-full bg-[#22C55E] items-center justify-center">
            <Check size={12} color="#fff" />
          </View>
          <Text className="text-xs font-medium text-[#64748B]">
            {completedCount}/{totalForDay} done
          </Text>
        </View>
      </View>

      {/* ── Category Filter Chips ── */}
      <View className="px-3 pb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {filterChips.map((chip) => {
            const active = activeFilter === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setActiveFilter(chip.key)}
                className={`px-4 py-2 rounded-full ${active ? '' : 'bg-white'}`}
                style={[
                  active ? { backgroundColor: chip.color } : Shadows.card,
                ]}
              >
                <Text
                  className={`text-xs font-semibold ${active ? 'text-white' : ''}`}
                  style={active ? undefined : { color: chip.color }}
                >
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Timeline ── */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1A73E8" />
        </View>
      ) : null}
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} style={loading ? { display: 'none' } : undefined}>
        {(['morning', 'afternoon', 'evening'] as TimeOfDay[]).map((period) => {
          const periodTasks = groupedByPeriod[period];
          if (periodTasks.length === 0) return null;
          const cfg = periodConfig[period];
          const PeriodIcon = cfg.icon;

          return (
            <View key={period} className="mb-5">
              {/* Period Header */}
              <View
                className="flex-row items-center px-4 py-2.5 rounded-xl mb-3"
                style={{ backgroundColor: cfg.bg }}
              >
                <PeriodIcon size={18} color={cfg.color} />
                <Text className="ml-2 text-sm font-bold" style={{ color: cfg.color }}>
                  {cfg.label}
                </Text>
                <Text className="ml-1.5 text-xs" style={{ color: cfg.color, opacity: 0.7 }}>
                  {cfg.timeRange}
                </Text>
                <View className="ml-auto bg-white/60 px-2 py-0.5 rounded-full">
                  <Text className="text-xs font-semibold" style={{ color: cfg.color }}>
                    {periodTasks.length} task{periodTasks.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Task Cards */}
              {periodTasks.map((task, tIdx) => {
                const cat = categoryMeta[task.category];
                const CatIcon = cat.icon;
                const isLast = tIdx === periodTasks.length - 1;
                const isCompleted = task.status === 'completed';
                const isOverdue = task.status === 'overdue';
                const isSnoozed = task.status === 'snoozed';
                const isPending = task.status === 'pending';

                const dotColor = isCompleted
                  ? '#22C55E'
                  : isOverdue
                  ? '#F59E0B'
                  : isSnoozed
                  ? '#8B5CF6'
                  : cat.color;

                const cardBorderColor = isOverdue
                  ? '#F59E0B'
                  : isSnoozed
                  ? '#8B5CF6'
                  : 'transparent';

                return (
                  <Pressable
                    key={task.id}
                    onPress={() => handleTaskPress(task)}
                    onLongPress={() => handleTaskLongPress(task)}
                    className="flex-row mb-0"
                  >
                    {/* Left: Time + Timeline Line */}
                    <View className="w-16 items-center pt-1">
                      <Text
                        className={`text-xs font-medium ${isCompleted ? 'text-[#94A3B8]' : 'text-midnight'}`}
                      >
                        {task.time}
                      </Text>
                      <View className="items-center mt-2 flex-1">
                        {/* Dot */}
                        <View
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: dotColor }}
                        >
                          {isCompleted && (
                            <View className="flex-1 items-center justify-center">
                              <Check size={8} color="#fff" />
                            </View>
                          )}
                        </View>
                        {/* Line */}
                        {!isLast && (
                          <View
                            className="w-0.5 flex-1 mt-1"
                            style={{ backgroundColor: dotColor, opacity: 0.25, minHeight: 40 }}
                          />
                        )}
                      </View>
                    </View>

                    {/* Right: Task Card */}
                    <View
                      className={`flex-1 rounded-xl p-3 mb-3 ${isCompleted ? 'bg-[#F8FAFC]' : 'bg-white'}`}
                      style={[
                        isCompleted ? {} : Shadows.card,
                        { borderWidth: cardBorderColor !== 'transparent' ? 1.5 : 0, borderColor: cardBorderColor },
                      ]}
                    >
                      <View className="flex-row items-start">
                        {/* Category Icon */}
                        <View
                          className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                          style={{ backgroundColor: isCompleted ? '#F1F5F9' : cat.bg }}
                        >
                          {isCompleted ? (
                            <Check size={16} color="#22C55E" />
                          ) : isOverdue ? (
                            <AlertTriangle size={16} color="#F59E0B" />
                          ) : isSnoozed ? (
                            <Timer size={16} color="#8B5CF6" />
                          ) : (
                            <CatIcon size={16} color={cat.color} />
                          )}
                        </View>

                        {/* Content */}
                        <View className="flex-1">
                          <View className="flex-row items-center justify-between">
                            <Text
                              className={`text-sm font-semibold flex-1 ${
                                isCompleted ? 'text-[#94A3B8] line-through' : 'text-midnight'
                              }`}
                              numberOfLines={1}
                            >
                              {task.title}
                            </Text>

                            {/* Status Badge */}
                            {isCompleted && (
                              <View className="bg-[#DCFCE7] px-2 py-0.5 rounded-full ml-2">
                                <Text className="text-[10px] font-bold text-[#22C55E]">DONE</Text>
                              </View>
                            )}
                            {isOverdue && (
                              <View className="bg-[#FEF3C7] px-2 py-0.5 rounded-full ml-2">
                                <Text className="text-[10px] font-bold text-[#F59E0B]">OVERDUE</Text>
                              </View>
                            )}
                            {isSnoozed && (
                              <View className="bg-[#F3E8FF] px-2 py-0.5 rounded-full ml-2">
                                <Text className="text-[10px] font-bold text-[#8B5CF6]">SNOOZED +1HR</Text>
                              </View>
                            )}
                            {isPending && (
                              <ChevronRight size={14} color="#94A3B8" />
                            )}
                          </View>

                          {/* Subtitle */}
                          {task.subtitle && (
                            <Text className={`text-xs mt-0.5 ${isCompleted ? 'text-[#CBD5E1]' : 'text-[#64748B]'}`}>
                              {task.subtitle}
                            </Text>
                          )}

                          {/* Dosage display for medicine */}
                          {task.dosage && (
                            <View className="flex-row items-center mt-1.5 gap-3">
                              {task.dosage.m > 0 && (
                                <View className="flex-row items-center gap-1">
                                  <Sunrise size={10} color={isCompleted ? '#CBD5E1' : '#F59E0B'} />
                                  <Text className={`text-[10px] font-medium ${isCompleted ? 'text-[#CBD5E1]' : 'text-[#64748B]'}`}>
                                    Morning: {task.dosage.m} tab
                                  </Text>
                                </View>
                              )}
                              {task.dosage.a > 0 && (
                                <View className="flex-row items-center gap-1">
                                  <Sun size={10} color={isCompleted ? '#CBD5E1' : '#EA580C'} />
                                  <Text className={`text-[10px] font-medium ${isCompleted ? 'text-[#CBD5E1]' : 'text-[#64748B]'}`}>
                                    Afternoon: {task.dosage.a} tab
                                  </Text>
                                </View>
                              )}
                              {task.dosage.e > 0 && (
                                <View className="flex-row items-center gap-1">
                                  <Moon size={10} color={isCompleted ? '#CBD5E1' : '#6366F1'} />
                                  <Text className={`text-[10px] font-medium ${isCompleted ? 'text-[#CBD5E1]' : 'text-[#64748B]'}`}>
                                    Evening: {task.dosage.e} tab
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}

                          {/* Completed info */}
                          {isCompleted && task.completedAt && (
                            <Text className="text-[10px] text-[#94A3B8] mt-1">
                              Completed at {task.completedAt}
                            </Text>
                          )}

                          {/* Swipe hint for actionable tasks */}
                          {(isPending || isOverdue) && (
                            <Text className="text-[9px] text-[#CBD5E1] mt-1.5 italic">
                              Hold to snooze · Tap to complete
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        {/* Empty state when filter yields nothing */}
        {filteredTasks.length === 0 && (
          <View className="items-center justify-center py-20">
            <View className="w-16 h-16 rounded-full bg-white items-center justify-center mb-4" style={Shadows.card}>
              <SlidersHorizontal size={24} color="#94A3B8" />
            </View>
            <Text className="text-sm font-semibold text-[#64748B]">No tasks in this category</Text>
            <Pressable onPress={() => setActiveFilter('all')} className="mt-3 px-4 py-2 rounded-full bg-[#1A73E8]">
              <Text className="text-xs font-semibold text-white">Show All Tasks</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
