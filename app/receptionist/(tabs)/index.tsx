import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/stores/authStore';
import {
  receptionistService,
  ReceptionDashboardStats,
  QueuePatient,
  ReceptionNotification,
} from '@/services/receptionistService';
import { isAuthError } from '@/services/api';
import { Shadows } from '@/constants/theme';
import {
  Bell, UserCheck, Clock, Stethoscope, Building2,
  UserPlus, AlertTriangle, CalendarPlus, ChevronRight, X,
} from 'lucide-react-native';

export default function ReceptionistDashboard() {
  const userName = useAuthStore((s) => s.userName);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ReceptionDashboardStats | null>(null);
  const [appointments, setAppointments] = useState<QueuePatient[]>([]);
  const [notifications, setNotifications] = useState<ReceptionNotification[]>([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifRead, setNotifRead] = useState<Set<string>>(new Set());

  const loadDashboard = async () => {
    try {
      const [dashStats, queue, notifs] = await Promise.all([
        receptionistService.getDashboard(),
        receptionistService.getQueue(),
        receptionistService.getNotifications(),
      ]);
      setStats(dashStats);
      // Show top 5 upcoming (confirmed/pending) appointments in the dashboard list
      const upcoming = queue.filter((a) => a.status === 'confirmed' || a.status === 'pending');
      setAppointments(upcoming.slice(0, 5));
      setNotifications(notifs);
    } catch (err) {
      if (!isAuthError(err)) {
        console.error(err);
      }
    }
  };

  useFocusEffect(useCallback(() => { loadDashboard(); }, []));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, []);

  // Stats cards navigate to appointments tab with correct filter
  const currentStats = [
    { label: 'Total Appts', value: stats?.stats.total ?? 0, icon: CalendarPlus, color: '#1A73E8', filter: 'all' },
    { label: 'Waiting', value: stats?.stats.waiting ?? 0, icon: Clock, color: '#F59E0B', filter: 'arrived' },
    { label: 'In Consult', value: stats?.stats.in_consultation ?? 0, icon: Stethoscope, color: '#8B5CF6', filter: 'in_consultation' },
    { label: 'Completed', value: stats?.stats.completed ?? 0, icon: UserCheck, color: '#22C55E', filter: 'completed', showDot: true },
  ];

  const handleStatPress = (filter: string) => {
    router.push({ pathname: '/receptionist/(tabs)/appointments', params: { filter } });
  };

  const handleQuickAction = (index: number) => {
    switch (index) {
      case 0: // New Registration → Patients tab
        router.push('/receptionist/(tabs)/patients');
        break;

      case 1: // Emergency → Appointments filtered to emergency priority
        router.push({
          pathname: '/receptionist/(tabs)/appointments',
          params: { filter: 'emergency' },
        });
        break;
    }
  };

  const handleAppointmentPress = (apt: QueuePatient) => {
    CustomAlert.alert(
      apt.patientName,
      `Doctor: ${apt.doctorName}\nTime: ${apt.time}\nType: ${apt.type}\nRef: ${apt.bookingReference}`,
      [
        { text: 'Dismiss' },
        {
          text: 'Check In',
          onPress: async () => {
            try {
              await receptionistService.checkIn(apt.id);
              if (apt.type === 'in-person') {
                router.push({ pathname: '/receptionist/patient-arrival', params: { appointmentId: apt.id } });
              } else {
                await loadDashboard();
                CustomAlert.alert('Checked In', `${apt.patientName} checked in for video consultation.`);
              }
            } catch (e: any) {
              CustomAlert.alert('Error', e.response?.data?.error || 'Failed to check in patient.');
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = (notif: ReceptionNotification) => {
    setNotifRead((prev) => new Set([...prev, notif.id]));
    setNotifModalVisible(false);
    setTimeout(() => {
      router.push({
        pathname: '/receptionist/(tabs)/appointments',
        params: { filter: notif.filter || 'all' },
      });
    }, 300);
  };

  const formatNotifTime = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff} min ago`;
    const h = Math.floor(diff / 60);
    return h === 1 ? '1 hr ago' : `${h} hrs ago`;
  };

  const unreadCount = notifications.filter((n) => !notifRead.has(n.id)).length;

  const quickActions = [
    { icon: UserPlus, label: 'New Reg', color: '#1A73E8', emergency: false },
    { icon: AlertTriangle, label: 'Emergency', color: '#DC2626', emergency: true },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A73E8" />
        }
      >
        {/* Header */}
        <View className="bg-primary/10 pt-6 pb-8 px-6 rounded-b-xl border-b border-primary/10">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-primary items-center justify-center" style={Shadows.focus}>
                <Building2 size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-xl font-bold tracking-tight text-midnight">Arun Priya Hospital</Text>
                <Text className="text-xs font-medium text-slate-500">Receptionist Portal</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setNotifModalVisible(true)}
                className="w-10 h-10 rounded-full bg-white items-center justify-center border border-slate-100 active:opacity-70"
                style={Shadows.card}
              >
                <Bell size={20} color="#64748B" />
                {unreadCount > 0 && (
                  <View className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white items-center justify-center">
                    <Text className="text-white text-[8px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => router.push('/receptionist/(tabs)/profile')}
                className="w-10 h-10 rounded-full border-2 border-primary/20 bg-slate-200 items-center justify-center active:opacity-70"
              >
                <Text className="text-primary font-bold text-sm">{(userName || 'R')[0].toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-2">
            <Text className="text-sm font-light text-slate-500">Welcome Back</Text>
            <Text className="text-2xl font-extrabold tracking-tight text-midnight">Dashboard Overview</Text>
          </View>
        </View>

        {/* Stats Grid 2×2 — each navigates to appointments with filter */}
        <View className="px-6 mt-6 flex-row flex-wrap gap-3">
          {currentStats.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => handleStatPress(s.filter)}
              className="bg-white rounded-2xl p-5 active:opacity-80"
              style={[Shadows.card, { width: '48%' } as any]}
            >
              <View className="items-center gap-2">
                <s.icon size={28} color={s.color} />
                <Text className="text-2xl font-bold text-midnight">{s.value}</Text>
                <View className="flex-row items-center gap-1">
                  <Text className="text-xs text-slate-500">{s.label}</Text>
                  {s.showDot && <View className="w-2 h-2 rounded-full bg-emerald-500" />}
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Quick Actions 2×2 */}
        <View className="px-6 mt-6 flex-row flex-wrap gap-3">
          {quickActions.map((a, i) => (
            <Pressable
              key={i}
              onPress={() => handleQuickAction(i)}
              className="rounded-2xl p-4 items-center gap-2 active:opacity-80"
              style={[
                Shadows.card,
                {
                  width: '48%',
                  backgroundColor: a.emergency ? '#FEF2F2' : '#FFFFFF',
                  borderWidth: a.emergency ? 1 : 0,
                  borderColor: a.emergency ? '#FECACA' : undefined,
                } as any,
              ]}
            >
              <a.icon size={22} color={a.color} />
              <Text className="text-xs font-semibold text-midnight text-center">{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Upcoming Appointments */}
        <View className="px-6 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-midnight">Upcoming Appointments</Text>
            <Pressable
              className="flex-row items-center gap-1 active:opacity-70"
              onPress={() => router.push('/receptionist/(tabs)/appointments')}
            >
              <Text className="text-primary text-sm font-semibold">View All</Text>
              <ChevronRight size={14} color="#1A73E8" />
            </Pressable>
          </View>
          <View className="bg-white rounded-3xl overflow-hidden" style={Shadows.card}>
            {appointments.length === 0 ? (
              <View className="px-5 py-8 items-center">
                <Text className="text-slate-400 text-sm">No upcoming appointments</Text>
              </View>
            ) : (
              appointments.map((p, i) => (
                <Pressable
                  key={p.id}
                  onPress={() => handleAppointmentPress(p)}
                  className="px-5 py-4 flex-row items-center gap-3 active:bg-slate-50"
                  style={i < appointments.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : undefined}
                >
                  <View
                    className="w-11 h-11 rounded-full items-center justify-center"
                    style={{ backgroundColor: i % 2 === 0 ? '#DBEAFE' : '#E0E7FF' }}
                  >
                    <Text className="font-bold text-sm" style={{ color: i % 2 === 0 ? '#1A73E8' : '#4F46E5' }}>
                      {p.patientInitials}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="font-bold text-sm text-midnight">{p.patientName}</Text>
                      <View className="px-2.5 py-1 rounded-full bg-slate-100">
                        <Text className="text-[10px] font-bold text-slate-500">{p.type}</Text>
                      </View>
                    </View>
                    <Text className="text-slate-500 text-xs mt-1">{p.doctorName} {'\u2022'} {p.time}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Notifications Modal — real data from audit logs */}
      <Modal visible={notifModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%]">
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <View>
                <Text className="text-xl font-bold text-midnight">Notifications</Text>
                <Text className="text-xs text-slate-400 mt-0.5">Last 24 hours · tap to navigate</Text>
              </View>
              <Pressable
                onPress={() => setNotifModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70"
              >
                <X size={18} color="#64748B" />
              </Pressable>
            </View>
            {unreadCount > 0 && (
              <Pressable
                onPress={() => setNotifRead(new Set(notifications.map((n) => n.id)))}
                className="px-6 py-2"
              >
                <Text className="text-primary text-xs font-semibold text-right">Mark all as read</Text>
              </Pressable>
            )}
            <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 40 }}>
              {notifications.length === 0 ? (
                <View className="py-10 items-center">
                  <Bell size={32} color="#CBD5E1" />
                  <Text className="text-slate-400 text-sm mt-3">No activity in the last 24 hours</Text>
                </View>
              ) : (
                notifications.map((notif) => {
                  const isUnread = !notifRead.has(notif.id);
                  return (
                    <Pressable
                      key={notif.id}
                      onPress={() => handleNotificationPress(notif)}
                      className="py-4 border-b border-slate-50 active:opacity-70"
                    >
                      <View className="flex-row items-start gap-3">
                        {isUnread && <View className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                        <View className="flex-1" style={!isUnread ? { marginLeft: 20 } : undefined}>
                          <Text className={`text-sm ${isUnread ? 'font-bold' : 'font-medium'} text-midnight`}>
                            {notif.title}
                          </Text>
                          <Text className="text-xs text-slate-500 mt-0.5">{notif.message}</Text>
                          <Text className="text-[10px] text-slate-400 mt-1">{formatNotifTime(notif.time)}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
