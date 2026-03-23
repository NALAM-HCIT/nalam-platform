import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Shadows, Colors } from '@/constants/theme';
import {
  Search, Clock, Calendar, User, Video,
  CheckCircle, XCircle, ChevronRight,
} from 'lucide-react-native';
import {
  getUpcomingAppointments, getPastAppointments,
  changeAppointmentStatus, DoctorAppointment,
} from '@/services/doctorService';

/* ───── Helpers ───── */

function formatTime(t: string): string {
  const [hh, mm] = t.split(':');
  const h = parseInt(hh, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mm} ${ampm}`;
}

function formatDate(d: string): string {
  const date = new Date(d + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  confirmed: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', label: 'CONFIRMED' },
  pending:   { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706', label: 'PENDING' },
  completed: { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', label: 'COMPLETED' },
  cancelled: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: 'CANCELLED' },
  no_show:   { bg: '#FFF7ED', border: '#FED7AA', text: '#EA580C', label: 'NO SHOW' },
};

const TABS = ['Upcoming', 'Past'] as const;
type Tab = typeof TABS[number];

/* ───── Appointment Card ───── */

const AppointmentCard = React.memo(function AppointmentCard({
  item, onStatusChange,
}: {
  item: DoctorAppointment;
  onStatusChange: (id: string, status: string) => void;
}) {
  const isVideo = item.consultationType === 'video';
  const style = STATUS_STYLES[item.status] || STATUS_STYLES.confirmed;
  const isPast = item.status === 'completed' || item.status === 'cancelled' || item.status === 'no_show';

  const handlePress = () => {
    Alert.alert(
      item.patientName || 'Patient',
      `Booking: ${item.bookingReference}\nDate: ${formatDate(item.scheduleDate)}\nTime: ${formatTime(item.startTime)} – ${formatTime(item.endTime)}\nType: ${isVideo ? 'Video Consultation' : 'In-Person Visit'}\nStatus: ${item.status}\nFee: ₹${item.consultationFee}`,
      [{ text: 'Close' }],
    );
  };

  return (
    <Pressable
      onPress={handlePress}
      className="rounded-2xl p-4 border mb-3 active:opacity-80"
      style={[{ backgroundColor: style.bg, borderColor: style.border }, Shadows.card]}
    >
      {/* Top row */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-11 h-11 rounded-xl bg-white items-center justify-center">
            <Text className="font-bold text-sm" style={{ color: style.text }}>
              {item.patientInitials || '??'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-[15px] text-midnight">{item.patientName || 'Patient'}</Text>
            <Text className="text-[11px] font-medium text-slate-400 mt-0.5">
              {item.bookingReference}
            </Text>
          </View>
        </View>
        <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: style.text }}>
          {isVideo ? <Video size={16} color="#FFF" /> : <User size={16} color="#FFF" />}
        </View>
      </View>

      {/* Date + time row */}
      <View className="flex-row items-center justify-between mt-3 pt-3 border-t" style={{ borderTopColor: style.border }}>
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1.5">
            <Calendar size={12} color={style.text} />
            <Text className="text-xs font-semibold" style={{ color: style.text }}>
              {formatDate(item.scheduleDate)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Clock size={12} color={style.text} />
            <Text className="text-xs font-semibold" style={{ color: style.text }}>
              {formatTime(item.startTime)} – {formatTime(item.endTime)}
            </Text>
          </View>
        </View>
        <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: style.text + '15' }}>
          <Text className="text-[9px] font-bold" style={{ color: style.text }}>{style.label}</Text>
        </View>
      </View>

      {/* Action buttons for active appointments */}
      {!isPast && (
        <View className="flex-row gap-2 mt-3">
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
      )}
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function PatientsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('Upcoming');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcoming, setUpcoming] = useState<DoctorAppointment[]>([]);
  const [past, setPast] = useState<DoctorAppointment[]>([]);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [pastTotal, setPastTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [upRes, pastRes] = await Promise.all([
        getUpcomingAppointments(),
        getPastAppointments(),
      ]);
      setUpcoming(upRes.appointments);
      setUpcomingTotal(upRes.total);
      setPast(pastRes.appointments);
      setPastTotal(pastRes.total);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleStatusChange = useCallback(
    (id: string, newStatus: string) => {
      const labels: Record<string, string> = { completed: 'Complete', no_show: 'No Show' };
      Alert.alert(
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
                Alert.alert('Error', err.response?.data?.error || 'Failed to update status.');
              }
            },
          },
        ],
      );
    },
    [fetchData],
  );

  const appointments = activeTab === 'Upcoming' ? upcoming : past;
  const total = activeTab === 'Upcoming' ? upcomingTotal : pastTotal;

  const filtered = useMemo(() => {
    if (!search.trim()) return appointments;
    const q = search.toLowerCase();
    return appointments.filter(
      (a) =>
        (a.patientName || '').toLowerCase().includes(q) ||
        a.bookingReference.toLowerCase().includes(q),
    );
  }, [appointments, search]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="bg-primary/10 pt-6 pb-6 px-6 border-b border-primary/10">
        <Text className="text-xl font-bold text-midnight tracking-tight mb-1">Appointments</Text>
        <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-5">
          Manage your schedule
        </Text>

        {/* Search */}
        <View className="relative">
          <View className="absolute left-4 top-0 bottom-0 justify-center z-10">
            <Search size={18} color="#94A3B8" />
          </View>
          <TextInput
            className="w-full bg-white rounded-2xl py-3.5 pl-12 pr-4 text-sm text-midnight"
            style={Shadows.card}
            placeholder="Search patient name or booking ref..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row px-6 pt-4 pb-2 gap-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === 'Upcoming' ? upcomingTotal : pastTotal;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={
                isActive
                  ? 'flex-1 py-2.5 rounded-xl bg-primary items-center'
                  : 'flex-1 py-2.5 rounded-xl bg-white border border-slate-100 items-center'
              }
              style={isActive ? Shadows.focus : Shadows.card}
            >
              <Text
                className={
                  isActive
                    ? 'text-sm font-bold text-white'
                    : 'text-sm font-medium text-slate-500'
                }
              >
                {tab} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="text-slate-400 text-sm mt-4">Loading appointments...</Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <Calendar size={40} color="#CBD5E1" />
              <Text className="text-slate-500 font-semibold text-base mt-3">
                {search ? 'No matching appointments' : `No ${activeTab.toLowerCase()} appointments`}
              </Text>
              <Text className="text-slate-400 text-xs mt-1">
                {search ? 'Try a different search term' : 'Pull down to refresh'}
              </Text>
            </View>
          ) : (
            filtered.map((item) => (
              <AppointmentCard
                key={item.id}
                item={item}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
