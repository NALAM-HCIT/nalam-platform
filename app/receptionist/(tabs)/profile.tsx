import { CustomAlert } from '@/components/CustomAlert';
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows, Colors } from '@/constants/theme';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import {
  User, Shield, Bell, LogOut, ChevronRight, Camera, Phone, Mail,
  Calendar, HelpCircle, Globe, Moon, Fingerprint, Lock,
  UserCheck, CalendarCheck, Clock, ClipboardList, AlertCircle, ExternalLink,
} from 'lucide-react-native';

/* ───── Data ───── */

const RECEPTIONIST_INFO = {
  role: 'Front Desk — Reception',
  shift: 'Morning (8:00 AM - 4:00 PM)',
  empId: 'EMP-REC-042',
  email: 'receptionist@arunpriya.com',
  phone: '+91 98765 12345',
  department: 'Front Office',
  joinDate: 'Jan 15, 2024',
};

const QUICK_STATS = [
  { label: 'Registered', value: '12', icon: UserCheck, color: '#22C55E' },
  { label: 'Appointments', value: '28', icon: CalendarCheck, color: Colors.primary },
  { label: 'Walk-ins', value: '5', icon: User, color: '#F59E0B' },
  { label: 'Pending', value: '3', icon: Clock, color: '#EF4444' },
];

interface MenuItem {
  icon: React.ElementType;
  label: string;
  color: string;
  subtitle?: string;
  badge?: string;
  actionId: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: 'Work',
    items: [
      { icon: ClipboardList, label: 'Shift Schedule', subtitle: 'Morning shift this week', color: '#EA580C', actionId: 'shift_schedule' },
      { icon: Calendar, label: 'Leave Management', subtitle: '6 CL remaining', color: '#0EA5E9', badge: '6', actionId: 'leave' },
      { icon: UserCheck, label: 'Registration Stats', subtitle: 'Monthly performance', color: '#059669', actionId: 'stats' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', subtitle: 'Arrivals, appointments, alerts', color: '#F59E0B', badge: '3', actionId: 'notifications' },
      { icon: Globe, label: 'Language', subtitle: 'English', color: '#0EA5E9', actionId: 'language' },
      { icon: Moon, label: 'Appearance', subtitle: 'System default', color: '#64748B', actionId: 'appearance' },
    ],
  },
  {
    title: 'Security',
    items: [
      { icon: Fingerprint, label: 'Biometric Login', subtitle: 'Fingerprint enabled', color: '#8B5CF6', actionId: 'biometric' },
      { icon: Lock, label: 'Change Password', color: '#64748B', actionId: 'change_password' },
      { icon: Shield, label: 'Privacy & Data', subtitle: 'Manage permissions', color: '#059669', actionId: 'privacy' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help & Support', subtitle: 'IT support, FAQ', color: Colors.primary, actionId: 'help' },
      { icon: AlertCircle, label: 'About Nalam', subtitle: 'Version 1.0.0', color: '#64748B', actionId: 'about' },
    ],
  },
];

/* ───── Sub-components ───── */

const QuickStatCard = React.memo(function QuickStatCard({
  stat,
  onPress,
}: {
  stat: typeof QUICK_STATS[0];
  onPress: () => void;
}) {
  const Icon = stat.icon;
  return (
    <Pressable onPress={onPress} className="flex-1 bg-white rounded-2xl p-3 items-center active:opacity-80" style={Shadows.card}>
      <View className="w-9 h-9 rounded-xl items-center justify-center mb-1.5" style={{ backgroundColor: stat.color + '15' }}>
        <Icon size={16} color={stat.color} />
      </View>
      <Text className="text-lg font-extrabold text-midnight">{stat.value}</Text>
      <Text className="text-[10px] text-slate-400 font-medium">{stat.label}</Text>
    </Pressable>
  );
});

const MenuRow = React.memo(function MenuRow({
  item,
  isLast,
  onPress,
}: {
  item: MenuItem;
  isLast: boolean;
  onPress: () => void;
}) {
  const Icon = item.icon;
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3.5 active:bg-slate-50"
      style={!isLast ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : undefined}
    >
      <View className="w-9 h-9 rounded-xl items-center justify-center mr-3.5" style={{ backgroundColor: item.color + '12' }}>
        <Icon size={17} color={item.color} />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-[13px] text-midnight">{item.label}</Text>
        {item.subtitle && <Text className="text-[11px] text-slate-400 mt-0.5">{item.subtitle}</Text>}
      </View>
      {item.badge && (
        <View className="px-2 py-0.5 rounded-full mr-2 bg-primary">
          <Text className="text-[10px] font-bold text-white">{item.badge}</Text>
        </View>
      )}
      <ChevronRight size={15} color="#CBD5E1" />
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function ReceptionistProfileScreen() {
  const router = useRouter();
  const { userName, phone, logout } = useAuthStore();

  const [profileImage, setProfileImage] = useState<string | null>(null);

  const displayName = userName || 'Receptionist';
  const initials = useMemo(() => {
    const parts = displayName.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName[0].toUpperCase();
  }, [displayName]);

  /* ── Image Picker ── */

  const pickImage = useCallback(async (useCamera: boolean) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      CustomAlert.alert('Permission Required', `Please allow ${useCamera ? 'camera' : 'photo library'} access.`);
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      CustomAlert.alert('Success', 'Profile photo updated!');
    }
  }, []);

  const handleChangePhoto = useCallback(() => {
    CustomAlert.alert('Update Profile Photo', 'Choose a source:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Gallery', onPress: () => pickImage(false) },
    ]);
  }, [pickImage]);

  /* ── Action Handlers ── */

  const handleEditProfile = useCallback(() => {
    router.push('/receptionist/edit-profile');
  }, [router]);

  const handleLogout = useCallback(() => {
    CustomAlert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
    ]);
  }, [logout, router]);

  const handleStatPress = useCallback((label: string) => {
    switch (label) {
      case 'Registered':
        CustomAlert.alert('Patients Registered Today', 'Total: 12\n\nNew patients: 5\nReturning patients: 7\nPending registrations: 2');
        break;
      case 'Appointments':
        CustomAlert.alert('Appointments Managed', 'Total today: 28\n\nChecked in: 15\nRescheduled: 4\nCancelled: 2\nPending: 7');
        break;
      case 'Walk-ins':
        CustomAlert.alert('Walk-in Patients', 'Today: 5\n\nRegistered: 3\nWaiting: 2\n\nAvg. wait time: 12 minutes');
        break;
      case 'Pending':
        CustomAlert.alert('Pending Actions', '3 items need attention:\n\n1. Patient ID verification (Room 4)\n2. Insurance approval (Rajesh K.)\n3. Appointment confirmation (Dr. Aruna)');
        break;
    }
  }, []);

  const handleMenuPress = useCallback((actionId: string) => {
    switch (actionId) {
      case 'shift_schedule':
        CustomAlert.alert('Shift Schedule', 'This Week:\n\nMon: Morning (8 AM - 4 PM)\nTue: Morning (8 AM - 4 PM)\nWed: Morning (8 AM - 4 PM)\nThu: Afternoon (12 PM - 8 PM)\nFri: Morning (8 AM - 4 PM)\nSat: Morning (8 AM - 1 PM)\nSun: OFF', [
          { text: 'OK' },
          { text: 'Request Swap', onPress: () => CustomAlert.alert('Shift Swap', 'Shift swap request sent to supervisor.\nRef: SWP-2026-0321') },
        ]);
        break;

      case 'leave':
        CustomAlert.alert('Leave Management', 'Leave Balance:\n\nCasual Leave: 6/12 remaining\nSick Leave: 8/8 remaining\nEarned Leave: 10/15 remaining\n\nUpcoming:\n- Mar 28: Casual Leave (Pending)', [
          { text: 'OK' },
          { text: 'Apply Leave', onPress: () => CustomAlert.alert('Apply Leave', 'Leave application requires:\n- Leave type\n- Date range\n- Reason\n- Cover staff', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Submit', onPress: () => CustomAlert.alert('Submitted', 'Leave application submitted.\nRef: LV-2026-0321') },
          ]) },
        ]);
        break;

      case 'stats':
        CustomAlert.alert('Registration Stats', 'This Month:\n\nTotal Registrations: 186\nNew Patients: 64\nReturning: 122\n\nDaily Avg: 9.3\nBusiest Day: Monday (15 avg)\n\nPerformance: Above Average');
        break;

      case 'notifications':
        CustomAlert.alert('Notification Settings', 'Manage notifications:', [
          {
            text: 'Patient Arrivals',
            onPress: () => CustomAlert.alert('Patient Arrivals', 'New arrivals: ON\nCheck-in confirmations: ON\nNo-show alerts: ON', [
              { text: 'OK' },
              { text: 'Edit', onPress: () => CustomAlert.alert('Updated', 'Notification preferences saved.') },
            ]),
          },
          {
            text: 'Appointment Alerts',
            onPress: () => CustomAlert.alert('Appointments', 'New bookings: ON\nCancellations: ON\nReschedules: ON\nDoctor availability changes: ON', [
              { text: 'OK' },
              { text: 'Edit', onPress: () => CustomAlert.alert('Updated', 'Notification preferences saved.') },
            ]),
          },
          {
            text: 'System Alerts',
            onPress: () => CustomAlert.alert('System', 'Shift reminders: ON\nSchedule changes: ON\nAdmin announcements: ON', [
              { text: 'OK' },
              { text: 'Edit', onPress: () => CustomAlert.alert('Updated', 'Preferences saved.') },
            ]),
          },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'language':
        CustomAlert.alert('Select Language', '', [
          { text: 'English (Current)', style: 'cancel' },
          { text: 'Tamil (தமிழ்)', onPress: () => CustomAlert.alert('Changed', 'Language will switch on next restart.') },
          { text: 'Hindi (हिन्दी)', onPress: () => CustomAlert.alert('Changed', 'Language will switch on next restart.') },
        ]);
        break;

      case 'appearance':
        CustomAlert.alert('Appearance', '', [
          { text: 'System Default (Current)', style: 'cancel' },
          { text: 'Light Mode', onPress: () => CustomAlert.alert('Updated', 'Light mode activated.') },
          { text: 'Dark Mode', onPress: () => CustomAlert.alert('Updated', 'Dark mode activated.') },
        ]);
        break;

      case 'biometric':
        CustomAlert.alert('Biometric Login', 'Fingerprint login is currently enabled.', [
          { text: 'OK' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => CustomAlert.alert('Disabled', 'Biometric login has been disabled.'),
          },
        ]);
        break;

      case 'change_password':
        CustomAlert.alert('Change Password', 'Verify your identity first.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Send OTP',
            onPress: () => CustomAlert.alert('OTP Sent', `OTP sent to ${RECEPTIONIST_INFO.phone}.`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Verify', onPress: () => CustomAlert.alert('Set New Password', 'Requirements:\n- Min 8 characters\n- 1 uppercase, 1 number, 1 special char', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Update', onPress: () => CustomAlert.alert('Success', 'Password updated successfully.') },
              ]) },
            ]),
          },
        ]);
        break;

      case 'privacy':
        CustomAlert.alert('Privacy & Data', 'Manage your data:', [
          { text: 'Data Sharing', onPress: () => CustomAlert.alert('Data Sharing', 'Patient data access: Read-only\nAppointment data: Full access\nBilling data: Limited\n\nAll access is logged and auditable.') },
          { text: 'Download My Data', onPress: () => CustomAlert.alert('Download', 'Your data download will be sent to your registered email within 24 hours.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Request', onPress: () => CustomAlert.alert('Submitted', 'Data download request submitted.') },
          ]) },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'help':
        CustomAlert.alert('Help & Support', '', [
          {
            text: 'Contact IT',
            onPress: () => CustomAlert.alert('IT Support', 'Phone: +91 44 2345 6789\nExt: 501\nEmail: it.support@arunpriya.com\n\nAvailable: Mon-Sat, 8 AM - 8 PM', [
              { text: 'OK' },
              { text: 'Call Now', onPress: () => Linking.openURL('tel:+914423456789') },
            ]),
          },
          {
            text: 'FAQ',
            onPress: () => CustomAlert.alert('FAQ', '1. How to check in a patient?\n   → Tap appointment > "Check In"\n\n2. How to register a walk-in?\n   → Quick Actions > New Reg\n\n3. How to reschedule?\n   → Tap appointment > Reschedule\n\n4. Reset password?\n   → Settings > Change Password'),
          },
          {
            text: 'Report Bug',
            onPress: () => CustomAlert.alert('Report Bug', 'Bug report form:', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Send', onPress: () => CustomAlert.alert('Submitted', 'Bug report submitted.\nTicket: BUG-2026-0321') },
            ]),
          },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'about':
        CustomAlert.alert('About Nalam', 'Nalam — Receptionist Portal\n\nVersion: 1.0.0\nBuild: 2026.03.21\n\n© 2026 Nalam Healthcare Pvt. Ltd.', [
          { text: 'OK' },
          { text: 'Terms', onPress: () => CustomAlert.alert('Terms', 'Usage terms for the Receptionist Portal. All patient interactions are logged.') },
          { text: 'Privacy', onPress: () => CustomAlert.alert('Privacy', 'Data is encrypted end-to-end. Access logs are maintained for compliance.') },
        ]);
        break;
    }
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="text-3xl font-extrabold text-midnight tracking-tight">Profile</Text>
        </View>

        {/* Profile Card */}
        <View className="mx-6 mt-3 bg-white rounded-[24px] overflow-hidden" style={Shadows.card}>
          <View className="bg-primary pt-6 pb-12 px-6 items-center">
            <View className="relative">
              <View className="rounded-full bg-white/20 items-center justify-center border-[3px] border-white/40 overflow-hidden" style={{ width: 88, height: 88 }}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={{ width: 88, height: 88 }} />
                ) : (
                  <Text className="text-white text-3xl font-extrabold">{initials}</Text>
                )}
              </View>
              <Pressable onPress={handleChangePhoto} className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white items-center justify-center" style={Shadows.card}>
                <Camera size={14} color={Colors.primary} />
              </Pressable>
            </View>
          </View>

          <View className="-mt-6 mx-4 mb-4 bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="items-center mb-3">
              <Text className="text-xl font-extrabold text-midnight">{displayName}</Text>
              <Text className="text-primary text-sm font-semibold mt-0.5">{RECEPTIONIST_INFO.role}</Text>
            </View>

            <View className="flex-row items-center justify-center gap-2 mb-3">
              <View className="flex-row items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                <Shield size={12} color={Colors.primary} />
                <Text className="text-primary text-xs font-bold">Receptionist</Text>
              </View>
              <RoleSwitcher />
              <View className="bg-slate-100 px-3 py-1.5 rounded-full">
                <Text className="text-slate-600 text-xs font-bold">{RECEPTIONIST_INFO.empId}</Text>
              </View>
            </View>

            <View className="flex-row flex-wrap">
              {[
                { label: 'Dept', value: RECEPTIONIST_INFO.department, icon: User },
                { label: 'Shift', value: 'Morning', icon: Clock },
                { label: 'Joined', value: RECEPTIONIST_INFO.joinDate, icon: Calendar },
              ].map((info, idx) => {
                const Icon = info.icon;
                return (
                  <View key={idx} className={`${idx < 2 ? 'w-1/2' : 'w-full'} flex-row items-center gap-2 py-2`}>
                    <Icon size={12} color="#94A3B8" />
                    <Text className="text-[10px] text-slate-400 font-medium">{info.label}:</Text>
                    <Text className="text-xs text-midnight font-bold">{info.value}</Text>
                  </View>
                );
              })}
            </View>

            <View className="mt-2 pt-3 border-t border-slate-100 gap-2">
              <Pressable onPress={() => Linking.openURL(`mailto:${RECEPTIONIST_INFO.email}`)} className="flex-row items-center gap-2 active:opacity-60">
                <Mail size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-500">{RECEPTIONIST_INFO.email}</Text>
                <ExternalLink size={10} color="#CBD5E1" />
              </Pressable>
              <Pressable onPress={() => Linking.openURL(`tel:${RECEPTIONIST_INFO.phone.replace(/\s/g, '')}`)} className="flex-row items-center gap-2 active:opacity-60">
                <Phone size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-500">{RECEPTIONIST_INFO.phone}</Text>
                <ExternalLink size={10} color="#CBD5E1" />
              </Pressable>
            </View>

            <Pressable onPress={handleEditProfile} className="mt-3 bg-primary/10 py-2.5 rounded-full items-center active:opacity-70">
              <Text className="text-primary font-bold text-xs">Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row mx-6 mt-4 gap-2.5">
          {QUICK_STATS.map((stat, idx) => (
            <QuickStatCard key={idx} stat={stat} onPress={() => handleStatPress(stat.label)} />
          ))}
        </View>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section, si) => (
          <View key={si} className="mt-5">
            <Text className="px-6 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{section.title}</Text>
            <View className="mx-6 bg-white rounded-2xl overflow-hidden" style={Shadows.card}>
              {section.items.map((item, ii) => (
                <MenuRow key={ii} item={item} isLast={ii === section.items.length - 1} onPress={() => handleMenuPress(item.actionId)} />
              ))}
            </View>
          </View>
        ))}

        {/* Log Out */}
        <Pressable onPress={handleLogout} className="mx-6 mt-5 flex-row items-center justify-center py-4 bg-white rounded-2xl active:bg-rose-50" style={Shadows.card}>
          <View className="w-9 h-9 rounded-xl bg-rose-50 items-center justify-center mr-3">
            <LogOut size={17} color="#E11D48" />
          </View>
          <Text className="font-bold text-rose-500 text-sm">Log Out</Text>
        </Pressable>

        <Text className="text-center text-[10px] text-slate-300 mt-4 font-medium">
          Nalam v1.0.0 • Receptionist Portal
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
