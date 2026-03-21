import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Linking, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows, Colors } from '@/constants/theme';
import {
  User, Shield, Bell, LogOut, ChevronRight, Camera, Phone, Mail,
  Calendar, HelpCircle, Globe, Moon, Fingerprint, Lock,
  FileText, Package, Pill, AlertCircle, Clock, ExternalLink,
  AlertTriangle,
} from 'lucide-react-native';

/* ───── Data ───── */

const PHARMACIST_INFO = {
  role: 'Hospital Pharmacy',
  license: 'PH-TN-2024-0042',
  empId: 'EMP-PH-0042',
  email: 'pharma@aph.in',
  phone: '+91 98765 43210',
  department: 'Pharmacy — Main Block',
  shift: 'Morning (8:00 AM - 4:00 PM)',
};

const QUICK_STATS = [
  { label: 'Dispensed', value: '24', icon: Pill, color: '#22C55E' },
  { label: 'Orders', value: '18', icon: Package, color: Colors.primary },
  { label: 'Pending', value: '6', icon: Clock, color: '#F59E0B' },
  { label: 'Low Stock', value: '3', icon: AlertTriangle, color: '#EF4444' },
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
      { icon: FileText, label: 'Dispensing History', subtitle: 'Today\'s prescriptions', color: '#059669', actionId: 'dispensing_history' },
      { icon: Package, label: 'Inventory Alerts', subtitle: '3 items low stock', color: '#EF4444', badge: '3', actionId: 'inventory' },
      { icon: Clock, label: 'Shift Schedule', subtitle: 'Morning shift this week', color: '#EA580C', actionId: 'shift_schedule' },
      { icon: Calendar, label: 'Leave Management', subtitle: '7 CL remaining', color: '#0EA5E9', actionId: 'leave' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', subtitle: 'New Rx, orders, stock alerts', color: '#F59E0B', badge: '4', actionId: 'notifications' },
      { icon: Globe, label: 'Language', subtitle: 'English', color: '#0EA5E9', actionId: 'language' },
      { icon: Moon, label: 'Appearance', subtitle: 'System default', color: '#64748B', actionId: 'appearance' },
    ],
  },
  {
    title: 'Security',
    items: [
      { icon: Fingerprint, label: 'Biometric Login', subtitle: 'Fingerprint enabled', color: '#8B5CF6', actionId: 'biometric' },
      { icon: Lock, label: 'Change Password', color: '#64748B', actionId: 'change_password' },
      { icon: Shield, label: 'Privacy & Data', subtitle: 'Access & permissions', color: '#059669', actionId: 'privacy' },
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
  stat, onPress,
}: { stat: typeof QUICK_STATS[0]; onPress: () => void }) {
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

export default function PharmacistProfileScreen() {
  const router = useRouter();
  const { userName, phone, logout } = useAuthStore();

  const [profileImage, setProfileImage] = useState<string | null>(null);

  const displayName = userName || 'Pharmacist';
  const initials = useMemo(() => {
    const parts = displayName.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName[0].toUpperCase();
  }, [displayName]);

  /* ── Image Picker ── */

  const pickImage = useCallback(async (useCamera: boolean) => {
    const perm = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission Required', 'Please allow access in settings.'); return; }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setProfileImage(result.assets[0].uri); Alert.alert('Success', 'Profile photo updated!'); }
  }, []);

  const handleChangePhoto = useCallback(() => {
    Alert.alert('Update Profile Photo', 'Choose a source:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Gallery', onPress: () => pickImage(false) },
    ]);
  }, [pickImage]);

  const handleEditProfile = useCallback(() => {
    router.push('/pharmacist/edit-profile');
  }, [router]);

  const handleLogout = useCallback(() => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
    ]);
  }, [logout, router]);

  const handleStatPress = useCallback((label: string) => {
    switch (label) {
      case 'Dispensed':
        Alert.alert('Dispensed Today', 'Total: 24 prescriptions\n\nSTAT: 3\nRegular: 18\nRefills: 3\n\nAvg. processing time: 8 min');
        break;
      case 'Orders':
        Alert.alert('Orders Completed', 'Today: 18\n\nHome Delivery: 6\nPickup: 12\n\nPending Dispatch: 2');
        break;
      case 'Pending':
        Alert.alert('Pending Prescriptions', '6 awaiting processing:\n\n1. STAT — Amlodipine (Dr. Aruna)\n2. Regular — Metformin (Dr. Rajesh)\n3. Regular — Insulin (Dr. Shalini)\n4. Regular — Antibiotics (Dr. Kumar)\n5. Refill — Atorvastatin\n6. Refill — Losartan');
        break;
      case 'Low Stock':
        Alert.alert('Low Stock Alerts', '3 items need reorder:\n\n1. Amlodipine 5mg — 12 units left\n2. Metformin 500mg — 8 units left\n3. Insulin Glargine — 3 units left\n\nReorder has been auto-triggered for all items.');
        break;
    }
  }, []);

  const handleMenuPress = useCallback((actionId: string) => {
    switch (actionId) {
      case 'dispensing_history':
        Alert.alert('Dispensing History', 'Today\'s Summary:\n\nTotal Dispensed: 24\nTotal Value: Rs. 18,450\n\nTop Dispensed:\n1. Amlodipine 5mg (8)\n2. Metformin 500mg (6)\n3. Paracetamol 650mg (5)\n\nClarifications Requested: 2\nRejected: 1 (out of stock)');
        break;

      case 'inventory':
        Alert.alert('Inventory Alerts', '3 items critically low:\n\n1. Amlodipine 5mg — 12 units (Min: 50)\n2. Metformin 500mg — 8 units (Min: 40)\n3. Insulin Glargine — 3 units (Min: 10)\n\nExpiring Soon:\n- Aspirin 75mg batch (Exp: Apr 2026)\n- Cough Syrup batch (Exp: Apr 2026)', [
          { text: 'OK' },
          { text: 'Reorder All', onPress: () => Alert.alert('Reorder', 'Reorder request submitted for 3 items.\nPO Ref: PO-2026-0321') },
        ]);
        break;

      case 'shift_schedule':
        Alert.alert('Shift Schedule', 'This Week:\n\nMon: Morning (8 AM - 4 PM)\nTue: Morning (8 AM - 4 PM)\nWed: Afternoon (12 PM - 8 PM)\nThu: Morning (8 AM - 4 PM)\nFri: Morning (8 AM - 4 PM)\nSat: Morning (8 AM - 1 PM)\nSun: OFF', [
          { text: 'OK' },
          { text: 'Request Swap', onPress: () => Alert.alert('Submitted', 'Shift swap request sent.\nRef: SWP-2026-0321') },
        ]);
        break;

      case 'leave':
        Alert.alert('Leave Management', 'Leave Balance:\n\nCasual Leave: 7/12 remaining\nSick Leave: 8/8 remaining\nEarned Leave: 12/15 remaining', [
          { text: 'OK' },
          { text: 'Apply Leave', onPress: () => Alert.alert('Apply', 'Leave application submitted.\nRef: LV-2026-0321') },
        ]);
        break;

      case 'notifications':
        Alert.alert('Notifications', 'Manage alerts:', [
          { text: 'Prescription Alerts', onPress: () => Alert.alert('Rx Alerts', 'New prescriptions: ON\nSTAT priority: ON\nClarification responses: ON\nRefill requests: ON', [{ text: 'OK' }, { text: 'Edit', onPress: () => Alert.alert('Saved', 'Preferences updated.') }]) },
          { text: 'Stock Alerts', onPress: () => Alert.alert('Stock', 'Low stock warnings: ON\nExpiry alerts: ON\nReorder confirmations: ON', [{ text: 'OK' }, { text: 'Edit', onPress: () => Alert.alert('Saved', 'Preferences updated.') }]) },
          { text: 'System Alerts', onPress: () => Alert.alert('System', 'Shift reminders: ON\nAdmin announcements: ON', [{ text: 'OK' }]) },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'language':
        Alert.alert('Select Language', '', [
          { text: 'English (Current)', style: 'cancel' },
          { text: 'Tamil (தமிழ்)', onPress: () => Alert.alert('Changed', 'Language will switch on restart.') },
          { text: 'Hindi (हिन्दी)', onPress: () => Alert.alert('Changed', 'Language will switch on restart.') },
        ]);
        break;

      case 'appearance':
        Alert.alert('Appearance', '', [
          { text: 'System Default (Current)', style: 'cancel' },
          { text: 'Light Mode', onPress: () => Alert.alert('Updated', 'Light mode activated.') },
          { text: 'Dark Mode', onPress: () => Alert.alert('Updated', 'Dark mode activated.') },
        ]);
        break;

      case 'biometric':
        Alert.alert('Biometric Login', 'Fingerprint login is currently enabled.', [
          { text: 'OK' },
          { text: 'Disable', style: 'destructive', onPress: () => Alert.alert('Disabled', 'Biometric login disabled.') },
        ]);
        break;

      case 'change_password':
        Alert.alert('Change Password', 'Verify your identity first.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send OTP', onPress: () => Alert.alert('OTP Sent', `OTP sent to ${PHARMACIST_INFO.phone}.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify', onPress: () => Alert.alert('New Password', 'Requirements:\n- Min 8 chars\n- 1 uppercase, 1 number, 1 special', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Update', onPress: () => Alert.alert('Success', 'Password updated.') },
            ]) },
          ]) },
        ]);
        break;

      case 'privacy':
        Alert.alert('Privacy & Data', '', [
          { text: 'Data Access', onPress: () => Alert.alert('Access Levels', 'Prescription data: Full access\nPatient data: Limited (name, allergies)\nBilling: Pharmacy orders only\n\nAll access is audited.') },
          { text: 'Download Data', onPress: () => Alert.alert('Download', 'Data export will be emailed within 24 hours.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Request', onPress: () => Alert.alert('Submitted', 'Request submitted.') },
          ]) },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'help':
        Alert.alert('Help & Support', '', [
          { text: 'Contact IT', onPress: () => Alert.alert('IT Support', 'Phone: +91 44 2345 6789\nExt: 2501\nEmail: it.support@arunpriya.com', [
            { text: 'OK' },
            { text: 'Call', onPress: () => Linking.openURL('tel:+914423456789') },
          ]) },
          { text: 'FAQ', onPress: () => Alert.alert('FAQ', 'Q: How to process STAT Rx?\nA: STAT prescriptions appear at top with red badge.\n\nQ: How to request clarification?\nA: Open Rx detail > "Request Clarification".\n\nQ: Out-of-stock handling?\nA: Reject with "Unavailable" — doctor is notified.') },
          { text: 'Report Bug', onPress: () => Alert.alert('Bug Report', '', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Send', onPress: () => Alert.alert('Submitted', 'Ticket: BUG-2026-0321') },
          ]) },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'about':
        Alert.alert('About Nalam', 'Nalam — Pharmacist Portal\n\nVersion: 1.0.0\nBuild: 2026.03.21\n\n© 2026 Nalam Healthcare Pvt. Ltd.', [
          { text: 'OK' },
          { text: 'Terms', onPress: () => Alert.alert('Terms', 'All dispensing activities are logged for regulatory compliance.') },
          { text: 'Privacy', onPress: () => Alert.alert('Privacy', 'Data encrypted. Access logs maintained for compliance.') },
        ]);
        break;
    }
  }, []);

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
              <Text className="text-xl font-extrabold text-midnight">{displayName}</Text>
              <Text className="text-primary text-sm font-semibold mt-0.5">{PHARMACIST_INFO.role}</Text>
            </View>

            <View className="flex-row items-center justify-center gap-2 mb-3">
              <View className="flex-row items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                <Shield size={12} color={Colors.primary} />
                <Text className="text-primary text-xs font-bold">Pharmacist</Text>
              </View>
              <View className="bg-slate-100 px-3 py-1.5 rounded-full">
                <Text className="text-slate-600 text-xs font-bold">{PHARMACIST_INFO.empId}</Text>
              </View>
            </View>

            <View className="flex-row flex-wrap">
              {[
                { label: 'Dept', value: 'Main Block', icon: Package },
                { label: 'License', value: PHARMACIST_INFO.license, icon: Shield },
                { label: 'Shift', value: 'Morning', icon: Clock },
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
              <Pressable onPress={() => Linking.openURL(`mailto:${PHARMACIST_INFO.email}`)} className="flex-row items-center gap-2 active:opacity-60">
                <Mail size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-500">{PHARMACIST_INFO.email}</Text>
                <ExternalLink size={10} color="#CBD5E1" />
              </Pressable>
              <Pressable onPress={() => Linking.openURL(`tel:${PHARMACIST_INFO.phone.replace(/\s/g, '')}`)} className="flex-row items-center gap-2 active:opacity-60">
                <Phone size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-500">{PHARMACIST_INFO.phone}</Text>
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

        <Text className="text-center text-[10px] text-slate-300 mt-4 font-medium">Nalam v1.0.0 • Pharmacist Portal</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
