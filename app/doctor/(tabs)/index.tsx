import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows, Colors } from '@/constants/theme';
import {
  User, Video, Building2, Clock, ChevronRight,
  Calendar, CheckCircle, XCircle, Play,
} from 'lucide-react-native';
import {
  getTodayAppointments, getUpcomingAppointments,
  changeAppointmentStatus, DoctorAppointment,
} from '@/services/doctorService';

/* ───── Helpers ───── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning,';
  if (h < 17) return 'Good Afternoon,';
  return 'Good Evening,';
}

function formatTime(t: string): string {
  const [hh, mm] = t.split(':');
  const h = parseInt(hh, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mm} ${ampm}`;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  confirmed: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', label: 'CONFIRMED' },
  pending: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', label: 'PENDING' },
  completed: { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', label: 'COMPLETED' },
  cancelled: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: 'CANCELLED' },
  no_show: { bg: '#FFF7ED', border: '#FED7AA', text: '#EA580C', label: 'NO SHOW' },
};

/* ───── Sub-components ───── */

const StatCard = React.memo(function StatCard({
  label, value, color, icon: Icon,
}: {
  label: string; value: number; color: string; icon: React.ElementType;
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl p-4 border border-slate-50" style={Shadows.card}>
      <View className="flex-row items-center gap-2 mb-2">
        <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: color + '15' }}>
          <Icon size={16} color={color} />
        </View>
      </View>
      <Text className="text-2xl font-extrabold text-midnight">{value}</Text>
      <Text className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">{label}</Text>
    </View>
  );
});

const AppointmentCard = React.memo(function AppointmentCard({
  item, onPress, onStatusChange, onStartConsultation,
}: {
  item: DoctorAppointment;
  onPress: () => void;
  onStatusChange: (id: string, status: string) => void;
  onStartConsultation: (id: string) => void;
}) {
  const isVideo = item.consultationType === 'video';
  const style = STATUS_STYLES[item.status] || STATUS_STYLES.confirmed;
  const isPast = item.status === 'completed' || item.status === 'cancelled' || item.status === 'no_show';

  return (
    <Pressable
      onPress={onPress}
      className="rounded-[20px] p-4 border mb-4 active:opacity-80"
      style={[{ backgroundColor: style.bg, borderColor: style.border }, Shadows.card]}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-11 h-11 rounded-xl bg-white items-center justify-center">
            <Text className="font-bold text-sm" style={{ color: style.text }}>
              {item.patientInitials || '??'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-[15px] text-midnight">{item.patientName || 'Patient'}</Text>
            <Text className="text-xs font-medium mt-0.5" style={{ color: style.text }}>
              {isVideo ? 'Video Consultation' : 'In-Person Visit'}
            </Text>
          </View>
        </View>
        <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: style.text }}>
          {isVideo ? <Video size={16} color="#FFF" /> : <User size={16} color="#FFF" />}
        </View>
      </View>

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t" style={{ borderTopColor: style.border }}>
        <View className="flex-row items-center gap-1.5">
          <Clock size={13} color={style.text} />
          <Text className="text-xs font-semibold" style={{ color: style.text }}>
            {formatTime(item.startTime)} - {formatTime(item.endTime)}
          </Text>
        </View>
        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: style.text + '15' }}>
          <Text className="text-[9px] font-bold" style={{ color: style.text }}>{style.label}</Text>
        </View>
      </View>

      {!isPast && (
        <View className="gap-2 mt-3">
          <Pressable
            onPress={() => onStartConsultation(item.id)}
            className="flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary"
          >
            <Play size={14} color="#FFF" />
            <Text className="text-white text-xs font-bold">Start Consultation</Text>
          </Pressable>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => onStatusChange(item.id, 'completed')}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500"
            >
              <CheckCircle size={14} color="#FFF" />
              <Text className="text-white text-xs font-bold">Complete</Text>
            </Pressable>
            <Pressable
              onPress={() => onStatusChange(item.id, 'no_show')}
              className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500"
            >
              <XCircle size={14} color="#FFF" />
              <Text className="text-white text-xs font-bold">No Show</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function DoctorDashboard() {
  const router = useRouter();
  const userName = useAuthStore((s) => s.userName);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayAppointments, setTodayAppointments] = useState<DoctorAppointment[]>([]);
  const [upcomingTotal, setUpcomingTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [todayRes, upcomingRes] = await Promise.all([
        getTodayAppointments(),
        getUpcomingAppointments(),
      ]);
      setTodayAppointments(todayRes.appointments);
      setUpcomingTotal(upcomingRes.total);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const stats = useMemo(() => {
    const total = todayAppointments.length;
    const completed = todayAppointments.filter((a) => a.status === 'completed').length;
    const remaining = todayAppointments.filter(
      (a) => a.status === 'confirmed' || a.status === 'pending'
    ).length;
    const video = todayAppointments.filter(
      (a) => a.consultationType === 'video' && a.status !== 'cancelled'
    ).length;
    return { total, completed, remaining, video };
  }, [todayAppointments]);

  const activeAppointments = useMemo(
    () =>
      todayAppointments
        .filter((a) => a.status !== 'cancelled')
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [todayAppointments]
  );

  const handleStatusChange = useCallback(
    (id: string, newStatus: string) => {
      const labels: Record<string, string> = { completed: 'Complete', no_show: 'No Show' };
      CustomAlert.alert(
        `Mark as ${labels[newStatus]}?`,
        'This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                await changeAppointmentStatus(id, newStatus);
                await fetchData();
              } catch (err: any) {
                CustomAlert.alert('Error', err.response?.data?.error || 'Failed to update status.');
              }
            },
          },
        ]
      );
    },
    [fetchData]
  );

  const handleAppointmentPress = useCallback((item: DoctorAppointment) => {
    CustomAlert.alert(
      item.patientName || 'Patient',
      `Booking: ${item.bookingReference}\nTime: ${formatTime(item.startTime)} - ${formatTime(item.endTime)}\nType: ${item.consultationType === 'video' ? 'Video Consultation' : 'In-Person Visit'}\nStatus: ${item.status}\nFee: \u20B9${item.consultationFee}`,
      [{ text: 'Close' }]
    );
  }, []);

  const handleStartConsultation = useCallback((appointmentId: string) => {
    router.push({ pathname: '/doctor/active-consultation', params: { id: appointmentId } });
  }, [router]);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="text-slate-400 text-sm mt-4">Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {/* Header */}
          <View className="px-6 pt-4 pb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-3">
                <View className="w-11 h-11 rounded-xl bg-primary items-center justify-center" style={Shadows.focus}>
                  <Building2 size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text className="text-lg font-bold tracking-tight text-midnight">Arun Priya Hospital</Text>
                  <Text className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Doctor Portal</Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.push('/doctor/(tabs)/profile')}
                className="w-10 h-10 rounded-full border-2 border-primary/20 bg-primary/10 items-center justify-center"
              >
                <Text className="text-primary font-bold text-sm">{(userName || 'D')[0].toUpperCase()}</Text>
              </Pressable>
            </View>

            <Text className="text-sm font-medium text-slate-400">{getGreeting()}</Text>
            <Text className="text-2xl font-extrabold tracking-tight text-midnight">{userName || 'Doctor'}</Text>
            <Text className="text-xs text-slate-400 mt-1">{todayStr}</Text>
          </View>

          {/* Stats Row */}
          <View className="px-6 mb-5">
            <View className="flex-row gap-3">
              <StatCard label="Total Today" value={stats.total} color={Colors.primary} icon={Calendar} />
              <StatCard label="Completed" value={stats.completed} color="#16A34A" icon={CheckCircle} />
              <StatCard label="Remaining" value={stats.remaining} color="#F59E0B" icon={Clock} />
            </View>
          </View>

          {/* Upcoming count banner */}
          {upcomingTotal > 0 && (
            <Pressable
              onPress={() => router.push('/doctor/(tabs)/patients' as any)}
              className="mx-6 mb-5 bg-primary rounded-2xl p-4 flex-row items-center justify-between active:opacity-80"
              style={Shadows.focus}
            >
              <View>
                <Text className="text-white/70 text-[10px] font-bold uppercase tracking-widest">
                  Upcoming Appointments
                </Text>
                <Text className="text-white text-2xl font-extrabold mt-0.5">{upcomingTotal}</Text>
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-white/80 text-xs font-semibold">View All</Text>
                <ChevronRight size={14} color="#FFFFFF" />
              </View>
            </Pressable>
          )}

          {/* Today's Schedule */}
          <View className="px-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-midnight">Today's Schedule</Text>
              <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10">
                <Video size={12} color={Colors.primary} />
                <Text className="text-[10px] font-bold text-primary">{stats.video} video</Text>
              </View>
            </View>

            {activeAppointments.length === 0 ? (
              <View className="items-center py-12 bg-white rounded-2xl" style={Shadows.card}>
                <Calendar size={40} color="#CBD5E1" />
                <Text className="text-slate-500 font-semibold text-base mt-3">No Appointments Today</Text>
                <Text className="text-slate-400 text-xs mt-1">Enjoy your free time!</Text>
              </View>
            ) : (
              activeAppointments.map((item) => (
                <AppointmentCard
                  key={item.id}
                  item={item}
                  onPress={() => handleAppointmentPress(item)}
                  onStatusChange={handleStatusChange}
                  onStartConsultation={handleStartConsultation}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
