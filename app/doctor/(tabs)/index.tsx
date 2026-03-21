import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Modal, RefreshControl, ActionSheetIOS, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import {
  Bell, FileText, AlertCircle, Mail, FlaskConical,
  User, Video, Building2, Clock, ChevronRight, Plus,
  X, Check, Calendar, Clipboard, AlertTriangle,
} from 'lucide-react-native';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning,';
  if (hour < 17) return 'Good Afternoon,';
  return 'Good Evening,';
}

const quickStats = [
  { icon: FileText, label: 'Reports', value: '08 Pending', bg: '#FFFBEB', iconBg: '#FEF3C7', color: '#D97706', textColor: '#92400E', details: 'Pending Reports:\n\n1. Sarah Jenkins - Blood Panel\n2. Robert Vance - ECG Report\n3. Elena Rodriguez - HbA1c\n4. Michael Cho - Chest X-Ray\n5. Anna Lee - MRI Results\n6. David Park - Lipid Profile\n7. Lisa Wang - CBC Report\n8. James Miller - Urinalysis' },
  { icon: AlertCircle, label: 'Urgent', value: '03 Tasks', bg: '#FFF1F2', iconBg: '#FFE4E6', color: '#E11D48', textColor: '#9F1239', details: 'Urgent Tasks:\n\n1. ICU Patient #412 - Critical vitals review\n2. Ward 3 - Post-op complication alert\n3. Emergency consult request - Dr. Thorne' },
  { icon: Mail, label: 'Messages', value: '12 New', bg: '#EEF2FF', iconBg: '#E0E7FF', color: '#4F46E5', textColor: '#3730A3', details: 'New Messages:\n\n- 5 from Nursing Staff\n- 3 from Fellow Doctors\n- 2 from Lab Department\n- 1 from Administration\n- 1 from Patient Portal' },
  { icon: FlaskConical, label: 'Lab', value: '05 Results', bg: '#F0FDFA', iconBg: '#CCFBF1', color: '#0D9488', textColor: '#134E4A', details: 'Lab Results Ready:\n\n1. PT-88210 - Complete Blood Count\n2. PT-44912 - Cardiac Enzymes\n3. PT-99302 - Glucose Tolerance\n4. PT-11204 - Sputum Culture\n5. PT-55108 - Thyroid Panel' },
];

const scheduleItems = [
  {
    time: '09:00 AM',
    status: 'IN-PROGRESS',
    statusColor: '#1A73E8',
    name: 'John Doe',
    initials: 'JD',
    subtitle: 'In-Person \u2022 Room 302',
    duration: '90 mins',
    progress: 0.65,
    cardBg: '#EFF6FF',
    borderColor: '#BFDBFE',
    accentColor: '#3B82F6',
    iconType: 'person' as const,
    dotColor: '#1A73E8',
    dotPulse: true,
    type: 'In-Person Consultation',
    reason: 'Follow-up on cardiac assessment',
  },
  {
    time: '11:00 AM',
    status: '',
    statusColor: '',
    name: 'Ward Rounds',
    initials: '',
    subtitle: 'General Ward \u2022 Block B',
    duration: '11:00 AM - 12:30 PM (90m)',
    progress: -1,
    cardBg: '#ECFDF5',
    borderColor: '#A7F3D0',
    accentColor: '#10B981',
    iconType: 'building' as const,
    dotColor: '#10B981',
    dotPulse: false,
    type: 'Ward Rounds',
    reason: '8 patients scheduled for review in General Ward',
  },
  {
    time: '02:00 PM',
    status: '',
    statusColor: '',
    name: 'Jane Smith',
    initials: 'JS',
    subtitle: 'Video Consultation',
    duration: '30 mins',
    progress: -1,
    cardBg: '#F5F3FF',
    borderColor: '#DDD6FE',
    accentColor: '#8B5CF6',
    iconType: 'video' as const,
    dotColor: '#8B5CF6',
    dotPulse: false,
    showJoinCall: true,
    type: 'Video Consultation',
    reason: 'Post-surgery follow-up, check wound healing progress',
  },
  {
    time: '04:00 PM',
    status: '',
    statusColor: '',
    name: 'Emergency Meeting',
    initials: '',
    subtitle: 'Conference Room B \u2022 60m',
    duration: '',
    progress: -1,
    cardBg: '#FFFFFF',
    borderColor: '#E2E8F0',
    accentColor: '#94A3B8',
    iconType: 'generic' as const,
    dotColor: '#94A3B8',
    dotPulse: false,
    showViewDetails: true,
    type: 'Department Meeting',
    reason: 'Emergency protocol review with department heads.\nAgenda: Updated triage procedures, staffing changes, Q1 metrics.',
  },
];

const mockNotifications = [
  { id: '1', title: 'Lab Results Ready', message: 'Blood panel for patient Sarah Jenkins (#PT-88210) is available.', time: '5 min ago', read: false },
  { id: '2', title: 'Appointment Reminder', message: 'Video consultation with Jane Smith at 2:00 PM today.', time: '30 min ago', read: false },
  { id: '3', title: 'Urgent: ICU Alert', message: 'Patient Robert Vance requires immediate cardiac review.', time: '1 hr ago', read: false },
  { id: '4', title: 'Staff Message', message: 'Nurse Chen: Patient in Ward 4 needs medication review.', time: '2 hrs ago', read: true },
  { id: '5', title: 'Schedule Update', message: 'Ward rounds rescheduled to 11:00 AM - Block B.', time: '3 hrs ago', read: true },
];

const fullSchedule = [
  { time: '08:00 AM', event: 'Morning Briefing - Nurse Station' },
  { time: '09:00 AM', event: 'John Doe - In-Person (Room 302)' },
  { time: '10:30 AM', event: 'Lab Review - Pathology Dept' },
  { time: '11:00 AM', event: 'Ward Rounds - General Ward Block B' },
  { time: '12:30 PM', event: 'Lunch Break' },
  { time: '01:00 PM', event: 'Case Discussion - Dr. Thorne' },
  { time: '02:00 PM', event: 'Jane Smith - Video Consultation' },
  { time: '03:00 PM', event: 'Documentation & Reports' },
  { time: '04:00 PM', event: 'Emergency Meeting - Conf Room B' },
  { time: '05:00 PM', event: 'End of Shift Handover' },
];

export default function DoctorDashboard() {
  const router = useRouter();
  const userName = useAuthStore((s) => s.userName);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      Alert.alert('Refreshed', 'Dashboard data has been updated.');
    }, 1500);
  }, []);

  const handleNotificationPress = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    const notif = notifications.find((n) => n.id === id);
    if (notif) {
      Alert.alert(notif.title, notif.message);
    }
  };

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleQuickStatPress = (stat: typeof quickStats[number]) => {
    Alert.alert(`${stat.label} - ${stat.value}`, stat.details);
  };

  const handleTotalPatientsPress = () => {
    Alert.alert(
      'Total Patients: 24',
      'Breakdown:\n\n- In-Person: 16 patients\n- Video Consultation: 5 patients\n- ICU: 3 patients\n\nBy Status:\n- Stable: 18\n- Observation: 4\n- Critical: 2'
    );
  };

  const handleRemainingPress = () => {
    Alert.alert(
      'Remaining: 12 Appointments',
      'Upcoming Today:\n\n- 11:00 AM - Ward Rounds (8 patients)\n- 02:00 PM - Jane Smith (Video)\n- 04:00 PM - Emergency Meeting\n- 05:00 PM - Shift Handover\n\nCompleted: 12 of 24'
    );
  };

  const handleScheduleItemPress = (item: typeof scheduleItems[number]) => {
    const buttons: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];

    if (item.iconType === 'person' || item.iconType === 'video') {
      buttons.push({
        text: 'Start Consultation',
        onPress: () => Alert.alert('Consultation Started', `Beginning consultation with ${item.name}.`),
      });
      buttons.push({
        text: 'Reschedule',
        onPress: () => Alert.alert('Reschedule', `Reschedule request sent for ${item.name}'s appointment.`),
      });
      buttons.push({
        text: 'Cancel Appointment',
        style: 'destructive',
        onPress: () => Alert.alert('Cancelled', `Appointment with ${item.name} has been cancelled. Patient will be notified.`),
      });
    }
    buttons.push({ text: 'Close', style: 'cancel' });

    Alert.alert(
      `${item.name}`,
      `Time: ${item.time}\nType: ${item.type}\n${item.duration ? `Duration: ${item.duration}\n` : ''}Details: ${item.reason}`,
      buttons
    );
  };

  const handleJoinCall = () => {
    Alert.alert(
      'Join Video Call',
      'You are about to join a video consultation with Jane Smith.\n\nEnsure your camera and microphone are ready.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Join Now', onPress: () => Alert.alert('Connecting...', 'Joining video call with Jane Smith.') },
      ]
    );
  };

  const handleViewDetails = () => {
    Alert.alert(
      'Emergency Meeting',
      'Time: 4:00 PM - 5:00 PM\nLocation: Conference Room B\nOrganizer: Dr. Aris Thorne\n\nAgenda:\n1. Updated triage procedures\n2. Staffing changes for Q2\n3. Q1 performance metrics\n4. Open discussion\n\nAttendees: 12 department heads',
      [{ text: 'OK' }]
    );
  };

  const handleFABPress = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'New Appointment', 'Quick Note', 'Emergency'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
          title: 'Quick Actions',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            Alert.alert('New Appointment', 'Opening appointment scheduler...\n\nSelect patient, date, time, and consultation type to proceed.');
          } else if (buttonIndex === 2) {
            Alert.alert('Quick Note', 'Note saved to your clinical notebook.\n\nYou can review and edit notes from the Profile tab.');
          } else if (buttonIndex === 3) {
            Alert.alert('Emergency', 'Emergency protocol initiated.\n\nNotifying on-call staff and opening emergency channel.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Confirm Emergency', style: 'destructive', onPress: () => Alert.alert('Alert Sent', 'Emergency team has been notified.') },
            ]);
          }
        }
      );
    } else {
      Alert.alert('Quick Actions', 'Choose an action:', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New Appointment',
          onPress: () => Alert.alert('New Appointment', 'Opening appointment scheduler...\n\nSelect patient, date, time, and consultation type to proceed.'),
        },
        {
          text: 'Quick Note',
          onPress: () => Alert.alert('Quick Note', 'Note saved to your clinical notebook.\n\nYou can review and edit notes from the Profile tab.'),
        },
        {
          text: 'Emergency',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Emergency', 'Emergency protocol initiated.\n\nNotifying on-call staff and opening emergency channel.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Confirm Emergency', style: 'destructive', onPress: () => Alert.alert('Alert Sent', 'Emergency team has been notified.') },
            ]),
        },
      ]);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Notifications Modal */}
      <Modal visible={notificationsVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%] pt-4">
            <View className="flex-row items-center justify-between px-6 pb-4 border-b border-slate-100">
              <Text className="text-lg font-bold text-midnight">Notifications</Text>
              <View className="flex-row items-center gap-3">
                {unreadCount > 0 && (
                  <Pressable onPress={handleMarkAllRead}>
                    <Text className="text-primary text-sm font-semibold">Mark all read</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setNotificationsVisible(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                  <X size={16} color="#64748B" />
                </Pressable>
              </View>
            </View>
            <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 40 }}>
              {notifications.length === 0 ? (
                <View className="py-12 items-center">
                  <Bell size={40} color="#CBD5E1" />
                  <Text className="text-slate-400 mt-3 text-sm">No notifications</Text>
                </View>
              ) : (
                notifications.map((notif) => (
                  <Pressable
                    key={notif.id}
                    onPress={() => handleNotificationPress(notif.id)}
                    className={`py-4 border-b border-slate-50 ${notif.read ? 'opacity-60' : ''}`}
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 mr-3">
                        <View className="flex-row items-center gap-2">
                          {!notif.read && <View className="w-2 h-2 rounded-full bg-primary" />}
                          <Text className={`font-bold text-midnight text-sm ${notif.read ? '' : ''}`}>{notif.title}</Text>
                        </View>
                        <Text className="text-slate-500 text-xs mt-1" numberOfLines={2}>{notif.message}</Text>
                        <Text className="text-slate-400 text-[10px] mt-1">{notif.time}</Text>
                      </View>
                      <Pressable
                        onPress={() => handleDismissNotification(notif.id)}
                        className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
                        hitSlop={8}
                      >
                        <X size={12} color="#94A3B8" />
                      </Pressable>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Schedule Modal */}
      <Modal visible={scheduleModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%] pt-4">
            <View className="flex-row items-center justify-between px-6 pb-4 border-b border-slate-100">
              <View>
                <Text className="text-lg font-bold text-midnight">Full Day Schedule</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Today - {new Date().toLocaleDateString()}</Text>
              </View>
              <Pressable onPress={() => setScheduleModalVisible(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                <X size={16} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 40, paddingTop: 16 }}>
              {fullSchedule.map((item, i) => (
                <Pressable
                  key={i}
                  onPress={() => Alert.alert(item.time, item.event)}
                  className="flex-row items-center gap-4 py-3 border-b border-slate-50"
                >
                  <View className="w-20">
                    <Text className="text-sm font-bold text-primary">{item.time}</Text>
                  </View>
                  <View className="w-2 h-2 rounded-full bg-primary/30" />
                  <Text className="flex-1 text-sm text-midnight font-medium">{item.event}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A73E8" />}
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
                <Text className="text-xs font-medium text-slate-500">Doctor Portal</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setNotificationsVisible(true)}
                className="w-10 h-10 rounded-full bg-white items-center justify-center border border-slate-100"
                style={Shadows.card}
              >
                <Bell size={20} color="#64748B" />
                {unreadCount > 0 && (
                  <View className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                )}
              </Pressable>
              <Pressable
                onPress={() => router.push('/doctor/(tabs)/profile')}
                className="w-10 h-10 rounded-full border-2 border-primary/20 bg-slate-200 items-center justify-center"
              >
                <Text className="text-primary font-bold text-sm">{(userName || 'D')[0].toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-2">
            <Text className="text-sm font-medium text-slate-500">{getGreeting()}</Text>
            <Text className="text-2xl font-bold tracking-tight text-midnight">
              {userName || 'Dr. Sarah'} 👋
            </Text>
          </View>
        </View>

        {/* Main Stats */}
        <View className="px-6">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-4">
              {/* Total Patients - Gradient Card */}
              <Pressable
                onPress={handleTotalPatientsPress}
                className="min-w-[140px] rounded-3xl p-4 active:opacity-80"
                style={{
                  backgroundColor: '#1A73E8',
                  ...Shadows.focus,
                }}
              >
                <Text className="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                  Total Patients
                </Text>
                <Text className="text-2xl font-bold text-white mt-1">24</Text>
              </Pressable>
              {/* Remaining - White Card */}
              <Pressable
                onPress={handleRemainingPress}
                className="min-w-[140px] bg-white rounded-3xl p-4 border border-slate-100 active:opacity-80"
                style={Shadows.card}
              >
                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Remaining
                </Text>
                <Text className="text-2xl font-bold text-midnight mt-1">12</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>

        {/* Quick Stats Grid */}
        <View className="px-6 mt-4">
          <View className="flex-row flex-wrap gap-3">
            {quickStats.map((stat, i) => (
              <Pressable
                key={i}
                onPress={() => handleQuickStatPress(stat)}
                className="rounded-2xl p-3 flex-row items-center gap-3 active:opacity-80"
                style={[
                  { backgroundColor: stat.bg, width: '48%', flexGrow: 1 },
                  Shadows.card,
                ]}
              >
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center"
                  style={{ backgroundColor: stat.iconBg }}
                >
                  <stat.icon size={16} color={stat.color} />
                </View>
                <View>
                  <Text
                    className="text-[10px] font-bold uppercase"
                    style={{ color: `${stat.textColor}99` }}
                  >
                    {stat.label}
                  </Text>
                  <Text
                    className="text-sm font-bold"
                    style={{ color: stat.textColor }}
                  >
                    {stat.value}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Schedule Section */}
        <View className="px-6 mt-8">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-lg font-bold text-midnight">Today's Schedule</Text>
            <Pressable onPress={() => setScheduleModalVisible(true)} className="flex-row items-center gap-1">
              <Text className="text-primary text-sm font-semibold">View All</Text>
              <ChevronRight size={14} color="#1A73E8" />
            </Pressable>
          </View>

          {/* Timeline */}
          <View className="relative pl-8">
            {/* Dashed timeline line */}
            <View
              className="absolute left-[12px] top-2 bottom-2 w-[2px]"
              style={{
                borderLeftWidth: 2,
                borderLeftColor: '#E2E8F0',
                borderStyle: 'dashed',
              }}
            />

            {scheduleItems.map((item, i) => (
              <View key={i} className="relative mb-8">
                {/* Timeline dot */}
                <View
                  className="absolute -left-8 mt-1.5 w-6 h-6 rounded-full items-center justify-center z-10"
                  style={{
                    backgroundColor: item.dotColor,
                    borderWidth: 4,
                    borderColor: '#F0F7FF',
                  }}
                >
                  <View className="w-2 h-2 rounded-full bg-white" />
                </View>

                {/* Time + Status row */}
                <View className="flex-row items-center justify-between mb-3">
                  <Text
                    className="text-sm font-bold"
                    style={{ color: i === 0 ? '#1A73E8' : '#94A3B8' }}
                  >
                    {item.time}
                  </Text>
                  {item.status ? (
                    <View
                      className="px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: `${item.statusColor}10`,
                        borderColor: `${item.statusColor}30`,
                      }}
                    >
                      <Text
                        className="text-[10px] font-bold"
                        style={{ color: item.statusColor }}
                      >
                        {item.status}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Appointment Card */}
                <Pressable
                  onPress={() => handleScheduleItemPress(item)}
                  className="rounded-[24px] p-4 border active:opacity-80"
                  style={[
                    {
                      backgroundColor: item.cardBg,
                      borderColor: item.borderColor,
                    },
                    Shadows.card,
                  ]}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      {/* Avatar/Icon */}
                      {item.initials ? (
                        <View
                          className="w-10 h-10 rounded-xl bg-slate-200 items-center justify-center"
                        >
                          <Text className="font-bold text-sm text-slate-500">
                            {item.initials}
                          </Text>
                        </View>
                      ) : (
                        <View
                          className="w-10 h-10 rounded-xl items-center justify-center"
                          style={{ backgroundColor: `${item.accentColor}20` }}
                        >
                          {item.iconType === 'building' ? (
                            <Building2 size={20} color={item.accentColor} />
                          ) : (
                            <Clock size={20} color={item.accentColor} />
                          )}
                        </View>
                      )}
                      <View className="flex-1">
                        <Text className="font-bold text-base text-midnight">
                          {item.name}
                        </Text>
                        <Text
                          className="text-xs font-medium mt-0.5"
                          style={{ color: `${item.accentColor}B3` }}
                        >
                          {item.subtitle}
                        </Text>
                      </View>
                    </View>

                    {/* Action icon */}
                    <View
                      className="w-9 h-9 rounded-xl items-center justify-center"
                      style={{
                        backgroundColor: item.accentColor,
                        ...Shadows.card,
                      }}
                    >
                      {item.iconType === 'video' ? (
                        <Video size={16} color="#FFFFFF" />
                      ) : item.iconType === 'person' ? (
                        <User size={16} color="#FFFFFF" />
                      ) : item.iconType === 'building' ? (
                        <Building2 size={16} color="#FFFFFF" />
                      ) : (
                        <Clock size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </View>

                  {/* Progress bar for in-progress */}
                  {item.progress >= 0 && (
                    <View className="mt-4 flex-row items-center gap-4">
                      <View className="flex-row items-center gap-1.5">
                        <Clock size={14} color={item.accentColor} />
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: `${item.accentColor}CC` }}
                        >
                          {item.duration}
                        </Text>
                      </View>
                      <View className="flex-1 h-1 bg-blue-100 rounded-full overflow-hidden">
                        <View
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: item.accentColor,
                            width: `${item.progress * 100}%`,
                          }}
                        />
                      </View>
                    </View>
                  )}

                  {/* Duration text for non-progress items */}
                  {item.progress < 0 && item.duration && !item.showJoinCall && (
                    <View className="mt-4 flex-row items-center gap-2">
                      <Clock size={14} color={item.accentColor} />
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: `${item.accentColor}CC` }}
                      >
                        {item.duration}
                      </Text>
                    </View>
                  )}

                  {/* Join Call button for video */}
                  {item.showJoinCall && (
                    <View className="mt-4 flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5">
                        <Clock size={14} color={item.accentColor} />
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: `${item.accentColor}CC` }}
                        >
                          {item.duration}
                        </Text>
                      </View>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleJoinCall();
                        }}
                        className="px-5 py-2 rounded-full"
                        style={{
                          backgroundColor: '#7C3AED',
                          ...Shadows.focus,
                        }}
                      >
                        <Text className="text-white text-xs font-bold">Join Call</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* View Details link */}
                  {item.showViewDetails && (
                    <View className="mt-3">
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleViewDetails();
                        }}
                        className="flex-row items-center gap-0.5"
                      >
                        <Text className="text-primary text-[11px] font-bold">
                          View Details
                        </Text>
                        <ChevronRight size={12} color="#1A73E8" />
                      </Pressable>
                    </View>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={handleFABPress}
        className="absolute bottom-28 right-6 w-14 h-14 bg-primary rounded-full items-center justify-center active:opacity-80"
        style={Shadows.focus}
      >
        <Plus size={26} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}
