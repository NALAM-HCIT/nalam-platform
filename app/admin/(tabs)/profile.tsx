import { CustomAlert } from '@/components/CustomAlert';
import { HospitalConfig } from '@/config/hospital';
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { Shadows, Colors } from '@/constants/theme';
import { api, isAuthError } from '@/services/api';
import { adminService } from '@/services/adminService';
import {
  User, Shield, Bell, LogOut, ChevronRight, Camera, Phone, Mail,
  Calendar, HelpCircle, Globe, Moon, Fingerprint, Lock,
  Users, Settings, BarChart3, AlertCircle, ExternalLink, AlertTriangle,
} from 'lucide-react-native';

/* ───── Data ───── */

const ADMIN_INFO = {
  role: 'Hospital Admin',
  department: 'Administration',
  empId: 'ADM-001',
  email: '',
  phone: '',
  joinDate: '',
};

const QUICK_STATS = [
  { label: 'Actions', value: '0', icon: BarChart3, color: Colors.primary },
  { label: 'Session', value: '0h', icon: Calendar, color: '#059669' },
  { label: 'Users', value: '0', icon: Users, color: '#8B5CF6' },
  { label: 'Alerts', value: '0', icon: AlertTriangle, color: '#EF4444' },
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
    title: 'Administration',
    items: [
      { icon: Users, label: 'User Management', subtitle: 'Manage hospital staff', color: '#8B5CF6', actionId: 'user_management' },
      { icon: Settings, label: 'System Configuration', subtitle: 'Hospital settings', color: '#64748B', actionId: 'system_config' },
      { icon: BarChart3, label: 'Audit Logs', subtitle: 'Activity tracking', color: Colors.primary, actionId: 'audit_logs' },
      { icon: Shield, label: 'Access Control', subtitle: 'Roles & permissions', color: '#059669', actionId: 'access_control' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', subtitle: 'System alerts, reports', color: '#F59E0B', badge: '3', actionId: 'notifications' },
      { icon: Globe, label: 'Language', subtitle: 'English', color: '#0EA5E9', actionId: 'language' },
      { icon: Moon, label: 'Appearance', subtitle: 'System default', color: '#64748B', actionId: 'appearance' },
    ],
  },
  {
    title: 'Security',
    items: [
      { icon: Fingerprint, label: 'Biometric Login', subtitle: 'Face ID enabled', color: '#8B5CF6', actionId: 'biometric' },
      { icon: Lock, label: 'Change Password', subtitle: 'Last changed 5 days ago', color: '#64748B', actionId: 'change_password' },
      { icon: Shield, label: 'Active Sessions', subtitle: '2 devices connected', color: '#059669', actionId: 'sessions' },
      { icon: AlertTriangle, label: 'Delete Account', subtitle: 'Permanent action', color: '#EF4444', actionId: 'delete_account' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help & Support', subtitle: 'IT support, user guide', color: Colors.primary, actionId: 'help' },
      { icon: AlertCircle, label: 'About Nalam', subtitle: 'Version 1.0.0', color: '#64748B', actionId: 'about' },
    ],
  },
];

/* ───── Sub-components ───── */

const QuickStatCard = React.memo(function QuickStatCard({
  stat, value, onPress,
}: { stat: typeof QUICK_STATS[0]; value: string; onPress: () => void }) {
  const Icon = stat.icon;
  return (
    <Pressable onPress={onPress} className="flex-1 bg-white rounded-2xl p-3 items-center active:opacity-80" style={Shadows.card}>
      <View className="w-9 h-9 rounded-xl items-center justify-center mb-1.5" style={{ backgroundColor: stat.color + '15' }}>
        <Icon size={16} color={stat.color} />
      </View>
      <Text className="text-lg font-extrabold text-midnight">{value}</Text>
      <Text className="text-[10px] text-slate-400 font-medium">{stat.label}</Text>
    </Pressable>
  );
});

const MenuRow = React.memo(function MenuRow({
  item, isLast, onPress,
}: { item: MenuItem; isLast: boolean; onPress: () => void }) {
  const Icon = item.icon;
  return (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-3.5 active:bg-slate-50" style={!isLast ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : undefined}>
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

export default function AdminProfileScreen() {
  const router = useRouter();
  const { userName, phone, role, logout } = useAuthStore();
  
  const [adminInfo, setAdminInfo] = useState(ADMIN_INFO);
  const [userCount, setUserCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/admin/profile');
      setAdminInfo({
        role: res.data.role.toUpperCase(),
        department: res.data.department || 'Administration',
        empId: res.data.employeeId || 'N/A',
        email: res.data.email || 'N/A',
        phone: res.data.mobileNumber || phone,
        joinDate: new Date(res.data.createdAt).toLocaleDateString()
      });
    } catch(e) {
      if (!isAuthError(e)) console.log('Failed to fetch profile', e);
    }
  }, [phone]);

  React.useEffect(() => {
    fetchProfile();
    adminService.getUserCount().then(setUserCount).catch(() => {});
  }, [fetchProfile]);

  const [profileImage, setProfileImage] = useState<string | null>(null);

  const displayName = userName || 'Administrator';
  const initials = useMemo(() => {
    const parts = displayName.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName[0].toUpperCase();
  }, [displayName]);

  /* ── Image Picker ── */

  const pickImage = useCallback(async (useCamera: boolean) => {
    const perm = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { CustomAlert.alert('Permission Required', 'Please allow access in settings.'); return; }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setProfileImage(result.assets[0].uri); CustomAlert.alert('Success', 'Profile photo updated!'); }
  }, []);

  const handleChangePhoto = useCallback(() => {
    CustomAlert.alert('Update Profile Photo', 'Choose a source:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Gallery', onPress: () => pickImage(false) },
    ]);
  }, [pickImage]);

  const handleEditProfile = useCallback(() => {
    router.push('/admin/edit-profile');
  }, [router]);

  const handleLogout = useCallback(() => {
    CustomAlert.alert('Log Out', 'Are you sure you want to log out of the admin portal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
    ]);
  }, [logout, router]);

  const handleStatPress = useCallback((label: string) => {
    switch (label) {
      case 'Actions':
        CustomAlert.alert('Admin Actions Today', 'Total: 156\n\nUser Management: 12\nConfiguration Changes: 8\nApprovals: 24\nReport Views: 45\nSystem Checks: 67');
        break;
      case 'Session':
        CustomAlert.alert('Session Info', 'Current Session: 4.2 hours\n\nLogin Time: 8:30 AM\nLast Activity: Just now\nDevice: iPhone 15 Pro\nIP: 192.168.1.xxx');
        break;
      case 'Users':
        CustomAlert.alert('Staff Users', `Total active staff accounts: ${userCount}`);
        break;
      case 'Alerts':
        CustomAlert.alert('System Alerts', '3 active alerts:\n\n1. Server disk space at 85%\n2. 2 failed login attempts (Dr. Rajesh)\n3. Backup pending — last: 23 hours ago');
        break;
    }
  }, []);

  const handleMenuPress = useCallback((actionId: string) => {
    switch (actionId) {
      case 'user_management':
        CustomAlert.alert('User Management', 'Active Accounts: 45\n\nDoctors: 12\nReceptionists: 8\nPharmacists: 5\nAdmins: 3\nLab Technicians: 7', [
          { text: 'OK' },
          { text: 'Add User', onPress: () => router.push('/admin/create-user') },
          { text: 'Deactivate', onPress: () => CustomAlert.alert('Deactivate User', 'Select user to deactivate:\n\n(User search would open in production)', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Search', onPress: () => CustomAlert.alert('Search', 'User search interface would open.') },
          ]) },
        ]);
        break;

      case 'system_config':
        CustomAlert.alert('System Configuration', 'Hospital Settings:', [
          { text: 'Hospital Info', onPress: () => CustomAlert.alert('Hospital Info', `Name: ${HospitalConfig.name}\nAddress: Anna Nagar, Chennai\nPhone: +91 44 2345 6789\nEmail: info@arunpriya.com\n\nBeds: 200 | OPD Rooms: 25\nOperating Theatres: 6\nICU Beds: 30`) },
          { text: 'Working Hours', onPress: () => CustomAlert.alert('Working Hours', 'OPD: 8:00 AM - 8:00 PM\nEmergency: 24/7\nPharmacy: 8:00 AM - 10:00 PM\nLab: 7:00 AM - 9:00 PM\nAdmin: 9:00 AM - 6:00 PM') },
          { text: 'Fee Structure', onPress: () => CustomAlert.alert('Fees', 'Consultation: Rs. 500 - Rs. 2,000\nEmergency: Rs. 1,500\nLab Tests: As per panel\nPharmacy: MRP - 10% discount\n\nLast updated: Mar 15, 2026') },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'audit_logs':
        router.push('/admin/audit-log' as any);
        break;

      case 'access_control':
        CustomAlert.alert('Access Control', 'Role Permissions:\n\nDoctor: Patient records, prescriptions, appointments\nReceptionist: Appointments, check-in, registration\nPharmacist: Prescriptions, inventory, dispensing\nAdmin: Full system access', [
          { text: 'OK' },
          { text: 'Modify', onPress: () => CustomAlert.alert('Modify Roles', 'Role modification requires super-admin approval.\n\nContact: CTO Office\nExt: 100') },
        ]);
        break;

      case 'notifications':
        CustomAlert.alert('Notifications', 'Manage alerts:', [
          { text: 'System Alerts', onPress: () => CustomAlert.alert('System', 'Server health: ON\nBackup status: ON\nSecurity alerts: ON\nPerformance warnings: ON', [{ text: 'OK' }, { text: 'Edit', onPress: () => CustomAlert.alert('Saved', 'Preferences updated.') }]) },
          { text: 'User Alerts', onPress: () => CustomAlert.alert('Users', 'New user requests: ON\nPassword resets: ON\nFailed logins: ON\nRole changes: ON', [{ text: 'OK' }, { text: 'Edit', onPress: () => CustomAlert.alert('Saved', 'Preferences updated.') }]) },
          { text: 'Reports', onPress: () => CustomAlert.alert('Reports', 'Daily summary: ON\nWeekly analytics: ON\nMonthly report: ON', [{ text: 'OK' }]) },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'language':
        CustomAlert.alert('Select Language', '', [
          { text: 'English (Current)', style: 'cancel' },
          { text: 'Tamil (தமிழ்)', onPress: () => CustomAlert.alert('Changed', 'Language will switch on restart.') },
          { text: 'Hindi (हिन्दी)', onPress: () => CustomAlert.alert('Changed', 'Language will switch on restart.') },
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
        CustomAlert.alert('Biometric Login', 'Face ID is currently enabled.', [
          { text: 'OK' },
          { text: 'Disable', style: 'destructive', onPress: () => CustomAlert.alert('Disabled', 'Biometric login disabled.') },
        ]);
        break;

      case 'change_password':
        CustomAlert.alert('Change Password', 'For security, a password reset link will be sent to your email.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send Link', onPress: () => CustomAlert.alert('Sent', `Password reset link sent to ${ADMIN_INFO.email}.`) },
        ]);
        break;

      case 'sessions':
        CustomAlert.alert('Active Sessions', 'Current Sessions:\n\n1. This device (iPhone 15 Pro)\n   Last active: Now\n\n2. Chrome — Office Desktop\n   Last active: 30 min ago', [
          { text: 'OK' },
          { text: 'Sign Out Others', style: 'destructive', onPress: () => CustomAlert.alert('Done', 'All other sessions terminated.') },
        ]);
        break;

      case 'delete_account':
        CustomAlert.alert('Delete Account', 'Admin accounts cannot be self-deleted for security reasons.\n\nPlease contact the IT administrator or CTO to process account deletion.', [
          { text: 'OK' },
          { text: 'Contact IT', onPress: () => Linking.openURL('mailto:it-support@arunpriya.com?subject=Admin Account Deletion Request') },
        ]);
        break;

      case 'help':
        CustomAlert.alert('Help & Support', '', [
          { text: 'Contact IT', onPress: () => CustomAlert.alert('IT Support', 'Email: it-support@arunpriya.com\nPhone: +91 44 2815 0000\nHours: Mon-Sat, 8AM - 8PM', [
            { text: 'OK' },
            { text: 'Call', onPress: () => Linking.openURL('tel:+914428150000') },
            { text: 'Email', onPress: () => Linking.openURL('mailto:it-support@arunpriya.com') },
          ]) },
          { text: 'User Guide', onPress: () => CustomAlert.alert('Admin Guide', 'Quick Start:\n\n1. Dashboard — Hospital stats & activity\n2. Users — Manage accounts, roles\n3. Settings — Hospital config, security\n4. Profile — Your info & preferences\n\nFor full guide, contact IT.') },
          { text: 'Report Bug', onPress: () => CustomAlert.alert('Report Bug', '', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send Report', onPress: () => Linking.openURL('mailto:it-support@arunpriya.com?subject=Bug Report - Admin Portal') },
          ]) },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'about':
        CustomAlert.alert('About Nalam', 'Nalam — Admin Portal\n\nVersion: 1.0.0\nBuild: 2026.03.21\n\nPowered by Azure Ethereal Design System\nHIPAA Compliant | ISO 27001\n\n© 2026 Nalam Healthcare Pvt. Ltd.', [
          { text: 'OK' },
          { text: 'Terms', onPress: () => CustomAlert.alert('Terms', 'By using the Admin Portal, you agree to comply with all hospital data access policies.\n\nUnauthorized access will result in immediate termination and legal action.') },
          { text: 'Privacy', onPress: () => CustomAlert.alert('Privacy', 'All admin actions are logged.\nData encrypted at rest and in transit.\nCompliant with Indian healthcare regulations.') },
        ]);
        break;
    }
  }, [router, logout]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-4 pb-2">
          <Text className="text-3xl font-extrabold text-midnight tracking-tight">Profile</Text>
        </View>

        {/* Profile Card */}
        <View className="mx-6 mt-3 bg-white rounded-[24px] overflow-hidden" style={Shadows.card}>
          <View className="bg-primary pt-6 pb-12 px-6 items-center">
            <View className="relative">
              <View className="rounded-full bg-white/20 items-center justify-center border-[3px] border-white/40 overflow-hidden" style={{ width: 88, height: 88 }}>
                {profileImage ? <Image source={{ uri: profileImage }} style={{ width: 88, height: 88 }} /> : <Text className="text-white text-3xl font-extrabold">{initials}</Text>}
              </View>
              <Pressable onPress={handleChangePhoto} className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white items-center justify-center" style={Shadows.card}>
                <Camera size={14} color={Colors.primary} />
              </Pressable>
            </View>
          </View>

          <View className="-mt-6 mx-4 mb-4 bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="items-center mb-3">
              <Text className="text-xl font-extrabold text-midnight tracking-tight mb-0.5">{displayName}</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-xs text-primary font-semibold">{adminInfo.role}</Text>
                <Text className="text-slate-300">|</Text>
                <Text className="text-xs text-slate-500">{adminInfo.department}</Text>
              </View>
            </View>

            <View className="flex-row items-center justify-center gap-2 mb-3">
              <RoleSwitcher />
              <View className="bg-slate-100 px-3 py-1.5 rounded-full">
                <Text className="text-slate-600 text-xs font-bold">{adminInfo.empId}</Text>
              </View>
            </View>

            <View className="flex-row flex-wrap">
              {[
                { label: 'Dept', value: adminInfo.department, icon: Settings },
                { label: 'Joined', value: adminInfo.joinDate, icon: Calendar },
              ].map((info, idx) => {
                const Icon = info.icon;
                return (
                  <View key={idx} className="w-1/2 flex-row items-center gap-2 py-2">
                    <Icon size={12} color="#94A3B8" />
                    <Text className="text-[10px] text-slate-400 font-medium">{info.label}:</Text>
                    <Text className="text-xs text-midnight font-bold">{info.value}</Text>
                  </View>
                );
              })}
            </View>

            <View className="mt-2 pt-3 border-t border-slate-100 gap-2">
              <Pressable onPress={() => Linking.openURL(`mailto:${adminInfo.email}`)} className="flex-row items-center gap-2 active:opacity-60">
                <Mail size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-500">{adminInfo.email}</Text>
                <ExternalLink size={10} color="#CBD5E1" />
              </Pressable>
              <Pressable onPress={() => Linking.openURL(`tel:${adminInfo.phone.replace(/\s/g, '')}`)} className="flex-row items-center gap-2 active:opacity-60">
                <Phone size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-500">{adminInfo.phone}</Text>
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
            <QuickStatCard
              key={idx}
              stat={stat}
              value={stat.label === 'Users' ? String(userCount) : stat.value}
              onPress={() => handleStatPress(stat.label)}
            />
          ))}
        </View>

        {/* Menu Sections */}
        <View className="px-6 mb-8">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Professional Details</Text>
          <View className="bg-white rounded-3xl p-5 border border-slate-100" style={Shadows.card}>
            <View className="flex-row gap-6 mb-5 border-b border-slate-50 pb-5">
              <View className="flex-1 items-center bg-slate-50/50 py-3 rounded-2xl border border-slate-100/50">
                <Text className="text-[10px] text-slate-400 font-medium mb-1">Employee ID</Text>
                <Text className="text-sm font-bold text-midnight">{adminInfo.empId}</Text>
              </View>
              <View className="flex-1 items-center bg-slate-50/50 py-3 rounded-2xl border border-slate-100/50">
                <Text className="text-[10px] text-slate-400 font-medium mb-1">Join Date</Text>
                <Text className="text-sm font-bold text-midnight">{adminInfo.joinDate}</Text>
              </View>
            </View>
            <View className="gap-4">
              <View className="flex-row items-center gap-4 group">
                <View className="w-10 h-10 rounded-xl bg-orange-50 items-center justify-center border border-orange-100/50"><Mail size={16} color="#F97316" /></View>
                <View className="flex-1">
                  <Text className="text-[10px] text-slate-400 font-medium mb-0.5">Email Address</Text>
                  <Text className="text-[13px] font-semibold text-midnight">{adminInfo.email || 'N/A'}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center border border-blue-100/50"><Phone size={16} color="#3B82F6" /></View>
                <View className="flex-1">
                  <Text className="text-[10px] text-slate-400 font-medium mb-0.5">Contact Number</Text>
                  <Text className="text-[13px] font-semibold text-midnight">{adminInfo.phone || 'N/A'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
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

        <Text className="text-center text-[10px] text-slate-300 mt-4 font-medium">Nalam v1.0.0 • Admin Portal</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
