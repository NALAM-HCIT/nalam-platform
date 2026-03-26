import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { receptionistService, ReceptionDashboardStats, QueuePatient } from '@/services/receptionistService';
import { Shadows } from '@/constants/theme';
import {
  Bell, LogIn, UserCheck, Clock, Stethoscope, Building2,
  UserPlus, QrCode, AlertTriangle, CalendarPlus, ChevronRight, X,
} from 'lucide-react-native';

const initialStats = [
  { label: 'Arrivals', value: '42', icon: LogIn, color: '#1A73E8', breakdown: 'Morning: 28\nAfternoon: 14\nNew patients: 8\nReturning: 34' },
  { label: 'Checked-In', value: '15', icon: UserCheck, color: '#22C55E', breakdown: 'In consultation: 9\nAwaiting vitals: 3\nIn lab: 2\nCompleted: 1' },
  { label: 'Waiting', value: '08', icon: Clock, color: '#F59E0B', breakdown: 'Less than 10 min: 3\n10-20 min: 3\n20-30 min: 1\nOver 30 min: 1' },
  { label: 'Active Docs', value: '12', icon: Stethoscope, color: '#8B5CF6', showDot: true, breakdown: 'General Medicine: 4\nPediatrics: 2\nOrthopedics: 2\nDermatology: 2\nCardiology: 1\nENT: 1' },
];

const quickActions = [
  { icon: UserPlus, label: 'New Reg', color: '#1A73E8', bg: '#FFFFFF' },
  { icon: QrCode, label: 'Instant\nCheck-in', color: '#1A73E8', bg: '#FFFFFF' },
  { icon: AlertTriangle, label: 'Emergency', color: '#DC2626', bg: '#FEF2F230' },
  { icon: CalendarPlus, label: 'Schedule', color: '#1A73E8', bg: '#FFFFFF' },
];

const initialAppointments = [
  { id: '1', initials: 'RK', name: 'Rahul Kapoor', doctor: 'Dr. S. Sharma', time: '09:30 AM', type: 'Video', typeColor: '#1A73E8', bgColor: '#DBEAFE', phone: '+91 98765 43210', age: 34, reason: 'Follow-up cardiology consultation' },
  { id: '2', initials: 'AM', name: 'Anjali Mishra', doctor: 'Dr. P. Reddy', time: '10:15 AM', type: 'In-Person', typeColor: '#64748B', bgColor: '#F1F5F9', phone: '+91 98765 43211', age: 28, reason: 'Skin rash evaluation' },
  { id: '3', initials: 'VD', name: 'Vikram Das', doctor: 'Dr. S. Sharma', time: '11:00 AM', type: 'Video', typeColor: '#1A73E8', bgColor: '#DBEAFE', phone: '+91 98765 43212', age: 45, reason: 'Blood pressure review' },
  { id: '4', initials: 'SL', name: 'Sanya Luthra', doctor: 'Dr. R. Verma', time: '11:30 AM', type: 'In-Person', typeColor: '#64748B', bgColor: '#F1F5F9', phone: '+91 98765 43213', age: 31, reason: 'Annual physical exam' },
];

const notificationsData = [
  { id: '1', title: 'New Patient Arrival', message: 'Rahul Kapoor has arrived for 09:30 AM appointment', time: '2 min ago', unread: true },
  { id: '2', title: 'Appointment Reminder', message: 'Anjali Mishra appointment in 15 minutes', time: '5 min ago', unread: true },
  { id: '3', title: 'Doctor Available', message: 'Dr. S. Sharma is now available in Room 3', time: '10 min ago', unread: false },
  { id: '4', title: 'Emergency Alert', message: 'Emergency patient registered - Priority 1', time: '15 min ago', unread: false },
  { id: '5', title: 'Check-in Complete', message: 'Vikram Das has completed check-in', time: '20 min ago', unread: false },
];

export default function ReceptionistDashboard() {
  const userName = useAuthStore((s) => s.userName);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<ReceptionDashboardStats | null>(null);
  const [appointments, setAppointments] = useState<QueuePatient[]>([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [allApptModalVisible, setAllApptModalVisible] = useState(false);
  const [notifications, setNotifications] = useState(notificationsData);

  const loadDashboard = async () => {
    try {
      const [dashStats, queue] = await Promise.all([
        receptionistService.getDashboard(),
        receptionistService.getQueue()
      ]);
      setStats(dashStats);
      setAppointments(queue.slice(0, 5)); // Dashboard shows top 5
    } catch (err) {
      console.error(err);
      CustomAlert.alert('Error', 'Failed to load dashboard data.');
    }
  };

  React.useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, []);

  const handleStatPress = (stat: typeof initialStats[0]) => {
    CustomAlert.alert(`${stat.label} Breakdown`, stat.breakdown);
  };

  const handleQuickAction = (index: number) => {
    switch (index) {
      case 0: // New Registration
        CustomAlert.alert(
          'Quick Patient Registration',
          'Enter patient details to register:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Register Walk-in',
              onPress: () => {
                CustomAlert.alert(
                  'Patient Type',
                  'Select registration type:',
                  [
                    { text: 'New Patient', onPress: () => CustomAlert.alert('Success', 'New patient registration initiated.\n\nPatient ID: NP-2026-0043\nPlease collect patient details at the desk.') },
                    { text: 'Returning Patient', onPress: () => CustomAlert.alert('Returning Patient', 'Please enter the Patient ID or search by name in the Patients tab.') },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              },
            },
            {
              text: 'Pre-registered',
              onPress: () => CustomAlert.alert('Pre-registered', 'Search for pre-registered patients by name or appointment ID in the Appointments tab.'),
            },
          ]
        );
        break;
      case 1: // Instant Check-in
        CustomAlert.alert(
          'Instant Check-in',
          'Scan QR code or enter Patient ID to check in:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Scan QR Code',
              onPress: () => CustomAlert.alert('QR Scanner', 'Camera would open for QR scanning.\n\nPatient scans their appointment QR code for instant check-in.'),
            },
            {
              text: 'Enter Patient ID',
              onPress: () => CustomAlert.alert('Manual Check-in', 'Patient ID entry field would appear.\n\nEnter the patient ID (e.g., NP-2026-0043) to proceed with check-in.'),
            },
          ]
        );
        break;
      case 2: // Emergency
        CustomAlert.alert(
          'Emergency Registration',
          'Register an emergency patient with priority flag:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Priority 1 (Critical)',
              style: 'destructive',
              onPress: () => CustomAlert.alert('Emergency Registered', 'Priority 1 emergency patient registered.\n\nEmergency ID: EM-2026-0012\nAll available doctors have been notified.\nEmergency room has been prepared.'),
            },
            {
              text: 'Priority 2 (Urgent)',
              onPress: () => CustomAlert.alert('Urgent Case Registered', 'Priority 2 urgent patient registered.\n\nEmergency ID: EM-2026-0013\nOn-call doctor has been notified.'),
            },
          ]
        );
        break;
      case 3: // Schedule
        CustomAlert.alert(
          "Today's Schedule Summary",
          'Morning (9AM-12PM):\n' +
          '  18 appointments | 4 doctors\n\n' +
          'Afternoon (12PM-4PM):\n' +
          '  14 appointments | 3 doctors\n\n' +
          'Evening (4PM-7PM):\n' +
          '  10 appointments | 3 doctors\n\n' +
          'Total: 42 appointments\n' +
          'Available slots: 6',
          [
            { text: 'OK' },
            { text: 'View in Bookings', onPress: () => router.push('/receptionist/(tabs)/appointments') },
          ]
        );
        break;
    }
  };

  const currentStats = [
    { label: 'Total Appts', value: stats?.stats.total ?? 0, icon: CalendarPlus, color: '#1A73E8', breakdown: 'All appointments for today' },
    { label: 'Waiting', value: stats?.stats.waiting ?? 0, icon: Clock, color: '#F59E0B', breakdown: 'Checked-in and waiting for doctor' },
    { label: 'In Consult', value: stats?.stats.in_consultation ?? 0, icon: Stethoscope, color: '#8B5CF6', breakdown: 'Currently with doctor' },
    { label: 'Completed', value: stats?.stats.completed ?? 0, icon: UserCheck, color: '#22C55E', showDot: true, breakdown: 'Consultation finished' },
  ];

  const handleAppointmentPress = (apt: QueuePatient) => {
    CustomAlert.alert(
      apt.patientName,
      `Doctor: ${apt.doctorName}\nTime: ${apt.time}\nType: ${apt.type}\nStatus: ${apt.status}\nPhone: ${apt.patientMobile}`,
      [
        { text: 'Dismiss' },
        {
          text: 'Check In',
          onPress: async () => {
            if (apt.type === 'in-person') {
              router.push({ pathname: '/receptionist/patient-arrival', params: { appointmentId: apt.id } });
            } else {
              try {
                await receptionistService.checkInPatient(apt.id);
                loadDashboard();
                CustomAlert.alert('Checked In', `${apt.patientName} has been checked in successfully.\n\nAssigned to: ${apt.doctorName}`);
              } catch (e) {
                CustomAlert.alert('Error', 'Failed to check-in patient');
              }
            }
          },
        },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            CustomAlert.alert(
              'Cancel Appointment',
              `Are you sure you want to cancel ${apt.patientName}'s appointment?`,
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Cancel API Not Ready',
                  style: 'destructive',
                  onPress: () => {
                    CustomAlert.alert('Info', 'Use the Appointments tab to access full cancel actions.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleNotificationPress = (notif: typeof notificationsData[0]) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n))
    );
    if (notif.title === 'New Patient Arrival' || notif.title === 'Check-in Complete') {
      setNotifModalVisible(false);
      setTimeout(() => router.push('/receptionist/patient-arrival'), 300);
    } else {
      CustomAlert.alert(notif.title, `${notif.message}\n\n${notif.time}`);
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

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
                    <Text className="text-white text-[8px] font-bold">{unreadCount}</Text>
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
            <Text className="text-2xl font-extrabold tracking-tight text-midnight">
              Dashboard Overview
            </Text>
          </View>
        </View>

        {/* Stats Grid 2x2 */}
        <View className="px-6 flex-row flex-wrap gap-3">
          {currentStats.map((s, i) => (
            <Pressable
              key={i}
              onPress={() => handleStatPress(s as any)}
              className="bg-white rounded-2xl p-5 active:opacity-80"
              style={[Shadows.card, { width: '48%' } as any]}
            >
              <View className="items-center gap-2">
                <s.icon size={28} color={s.color} />
                <Text className="text-2xl font-bold text-midnight">{s.value}</Text>
                <View className="flex-row items-center gap-1">
                  <Text className="text-xs text-slate-500">{s.label}</Text>
                  {s.showDot && (
                    <View className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Quick Actions 2x2 */}
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
                  backgroundColor: i === 2 ? '#FEF2F2' : '#FFFFFF',
                  borderWidth: i === 2 ? 1 : 0,
                  borderColor: i === 2 ? '#FECACA' : undefined,
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
            <Text className="text-lg font-bold text-midnight">
              Upcoming Appointments
            </Text>
            <Pressable className="flex-row items-center gap-1 active:opacity-70" onPress={() => setAllApptModalVisible(true)}>
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

      {/* Notifications Modal */}
      <Modal visible={notifModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%]">
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <Text className="text-xl font-bold text-midnight">Notifications</Text>
              <Pressable onPress={() => setNotifModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70">
                <X size={18} color="#64748B" />
              </Pressable>
            </View>
            {unreadCount > 0 && (
              <Pressable
                onPress={() => {
                  setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
                  CustomAlert.alert('Done', 'All notifications marked as read.');
                }}
                className="px-6 py-2"
              >
                <Text className="text-primary text-xs font-semibold text-right">Mark all as read</Text>
              </Pressable>
            )}
            <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 40 }}>
              {notifications.map((notif) => (
                <Pressable
                  key={notif.id}
                  onPress={() => handleNotificationPress(notif)}
                  className="py-4 border-b border-slate-50 active:opacity-70"
                >
                  <View className="flex-row items-start gap-3">
                    {notif.unread && <View className="w-2 h-2 rounded-full bg-primary mt-1.5" />}
                    <View className="flex-1" style={!notif.unread ? { marginLeft: 20 } : undefined}>
                      <Text className={`text-sm ${notif.unread ? 'font-bold' : 'font-medium'} text-midnight`}>{notif.title}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{notif.message}</Text>
                      <Text className="text-[10px] text-slate-400 mt-1">{notif.time}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* All Appointments Modal */}
      <Modal visible={allApptModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[85%]">
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <Text className="text-xl font-bold text-midnight">All Appointments</Text>
              <Pressable onPress={() => setAllApptModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70">
                <X size={18} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 40 }}>
              {appointments.map((p, i) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    setAllApptModalVisible(false);
                    setTimeout(() => handleAppointmentPress(p), 300);
                  }}
                  className="py-4 flex-row items-center gap-3 active:opacity-70 border-b border-slate-50"
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
                    <Text className="font-bold text-sm text-midnight">{p.patientName}</Text>
                    <Text className="text-slate-500 text-xs mt-0.5">{p.doctorName} {'\u2022'} {p.time}</Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-full bg-slate-100">
                    <Text className="text-[10px] font-bold text-slate-500">{p.type}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
