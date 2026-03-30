import { CustomAlert } from '@/components/CustomAlert';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows, Colors } from '@/constants/theme';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import {
  User, Shield, Bell, LogOut, ChevronRight, Camera, Phone, Mail,
  Calendar, HelpCircle, Globe, Moon, Fingerprint, Lock,
  FileText, Package, Pill, AlertCircle, Clock, ExternalLink,
  AlertTriangle,
} from 'lucide-react-native';
import { pharmacistService, PharmacistProfile, PharmacistStats } from '@/services/pharmacistService';

/* ───── Static menu config ───── */

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

/* ───── Sub-components ───── */

const QuickStatCard = React.memo(function QuickStatCard({
  label, value, icon: Icon, color, onPress,
}: { label: string; value: string; icon: React.ElementType; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-1 bg-white rounded-2xl p-3 items-center active:opacity-80" style={Shadows.card}>
      <View className="w-9 h-9 rounded-xl items-center justify-center mb-1.5" style={{ backgroundColor: color + '15' }}>
        <Icon size={16} color={color} />
      </View>
      <Text className="text-lg font-extrabold text-midnight">{value}</Text>
      <Text className="text-[10px] text-slate-400 font-medium">{label}</Text>
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
  const { userName, logout } = useAuthStore();

  const [profile, setProfile] = useState<PharmacistProfile | null>(null);
  const [stats, setStats] = useState<PharmacistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [p, s] = await Promise.all([
          pharmacistService.getProfile(),
          pharmacistService.getStats(),
        ]);
        setProfile(p);
        setStats(s);
      } catch {
        // fall back to auth store name; stats stay null
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const displayName = profile?.fullName || userName || 'Pharmacist';
  const initials = useMemo(() => {
    const parts = displayName.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName[0].toUpperCase();
  }, [displayName]);

  // Build menu sections dynamically — inventory badge from real lowStockCount
  const menuSections: MenuSection[] = useMemo(() => {
    const lowCount = stats?.lowStockCount ?? 0;
    return [
      {
        title: 'Work',
        items: [
          { icon: FileText, label: 'Dispensing History', subtitle: "Today's prescriptions", color: '#059669', actionId: 'dispensing_history' },
          {
            icon: Package, label: 'Inventory Alerts',
            subtitle: lowCount > 0 ? `${lowCount} item${lowCount > 1 ? 's' : ''} low stock` : 'All items sufficiently stocked',
            color: '#EF4444',
            badge: lowCount > 0 ? String(lowCount) : undefined,
            actionId: 'inventory',
          },
          { icon: Clock, label: 'Shift Schedule', subtitle: 'Morning shift this week', color: '#EA580C', actionId: 'shift_schedule' },
          { icon: Calendar, label: 'Leave Management', subtitle: '7 CL remaining', color: '#0EA5E9', actionId: 'leave' },
        ],
      },
      {
        title: 'Preferences',
        items: [
          { icon: Bell, label: 'Notifications', subtitle: 'New Rx, orders, stock alerts', color: '#F59E0B', actionId: 'notifications' },
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
  }, [stats?.lowStockCount]);

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
    router.push('/pharmacist/edit-profile');
  }, [router]);

  const handleLogout = useCallback(() => {
    CustomAlert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
    ]);
  }, [logout, router]);

  const handleStatPress = useCallback((label: string) => {
    switch (label) {
      case 'Dispensed':
        CustomAlert.alert('Dispensed Today', `${stats?.dispensedToday ?? 0} prescriptions dispensed today.`);
        break;
      case 'Pending':
        CustomAlert.alert('Pending Prescriptions', `${stats?.pendingToday ?? 0} prescriptions awaiting processing.`);
        break;
      case 'Rejected':
        CustomAlert.alert('Rejected Today', `${stats?.rejectedToday ?? 0} prescriptions rejected today.`);
        break;
      case 'Low Stock':
        CustomAlert.alert('Low Stock Alert', `${stats?.lowStockCount ?? 0} medicine${(stats?.lowStockCount ?? 0) !== 1 ? 's' : ''} with fewer than 10 units in stock.`);
        break;
    }
  }, [stats]);

  const handleMenuPress = useCallback((actionId: string) => {
    switch (actionId) {
      case 'dispensing_history':
        CustomAlert.alert('Dispensing History', `Today:\n\nDispensed: ${stats?.dispensedToday ?? '—'}\nPending: ${stats?.pendingToday ?? '—'}\nRejected: ${stats?.rejectedToday ?? '—'}`);
        break;

      case 'inventory':
        CustomAlert.alert('Inventory Alerts', stats?.lowStockCount
          ? `${stats.lowStockCount} medicine${stats.lowStockCount > 1 ? 's' : ''} below 10 units.\n\nCheck the Dashboard → Low Stock card for the full list.`
          : 'All medicines are sufficiently stocked.');
        break;

      case 'shift_schedule':
        CustomAlert.alert('Shift Schedule', 'This Week:\n\nMon: Morning (8 AM - 4 PM)\nTue: Morning (8 AM - 4 PM)\nWed: Afternoon (12 PM - 8 PM)\nThu: Morning (8 AM - 4 PM)\nFri: Morning (8 AM - 4 PM)\nSat: Morning (8 AM - 1 PM)\nSun: OFF', [
          { text: 'OK' },
          { text: 'Request Swap', onPress: () => CustomAlert.alert('Submitted', 'Shift swap request sent.\nRef: SWP-2026-0321') },
        ]);
        break;

      case 'leave':
        CustomAlert.alert('Leave Management', 'Leave Balance:\n\nCasual Leave: 7/12 remaining\nSick Leave: 8/8 remaining\nEarned Leave: 12/15 remaining', [
          { text: 'OK' },
          { text: 'Apply Leave', onPress: () => CustomAlert.alert('Apply', 'Leave application submitted.') },
        ]);
        break;

      case 'notifications':
        CustomAlert.alert('Notifications', 'Manage alerts:', [
          { text: 'Prescription Alerts', onPress: () => CustomAlert.alert('Rx Alerts', 'New prescriptions: ON\nSTAT priority: ON', [{ text: 'OK' }]) },
          { text: 'Stock Alerts', onPress: () => CustomAlert.alert('Stock', 'Low stock warnings: ON\nExpiry alerts: ON', [{ text: 'OK' }]) },
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
        CustomAlert.alert('Biometric Login', 'Fingerprint login is currently enabled.', [
          { text: 'OK' },
          { text: 'Disable', style: 'destructive', onPress: () => CustomAlert.alert('Disabled', 'Biometric login disabled.') },
        ]);
        break;

      case 'change_password':
        CustomAlert.alert('Change Password', 'Verify your identity first.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send OTP', onPress: () => CustomAlert.alert('OTP Sent', `OTP sent to ${profile?.mobileNumber ?? 'your mobile'}.`) },
        ]);
        break;

      case 'privacy':
        CustomAlert.alert('Privacy & Data', '', [
          { text: 'Data Access', onPress: () => CustomAlert.alert('Access Levels', 'Prescription data: Full access\nPatient data: Limited\nAll access is audited.') },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'help':
        CustomAlert.alert('Help & Support', '', [
          { text: 'Contact IT', onPress: () => CustomAlert.alert('IT Support', 'Email: it.support@hospital.com') },
          { text: 'FAQ', onPress: () => CustomAlert.alert('FAQ', 'Q: How to process STAT Rx?\nA: STAT prescriptions appear at top with red badge.') },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'about':
        CustomAlert.alert('About Nalam', 'Nalam — Pharmacist Portal\n\nVersion: 1.0.0\nBuild: 2026.03\n\n© 2026 Nalam Healthcare Pvt. Ltd.');
        break;
    }
  }, [stats, profile]);

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
              <Text className="text-primary text-sm font-semibold mt-0.5">Hospital Pharmacy</Text>
            </View>

            <View className="flex-row items-center justify-center gap-2 mb-3">
              <View className="flex-row items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                <Shield size={12} color={Colors.primary} />
                <Text className="text-primary text-xs font-bold">Pharmacist</Text>
              </View>
              <RoleSwitcher />
              {loading
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <View className="bg-slate-100 px-3 py-1.5 rounded-full">
                    <Text className="text-slate-600 text-xs font-bold">{profile?.employeeId ?? 'N/A'}</Text>
                  </View>
              }
            </View>

            {loading
              ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 8 }} />
              : (
                <View className="flex-row flex-wrap">
                  {[
                    { label: 'Dept', value: profile?.department ?? 'Pharmacy', icon: Package },
                    { label: 'Joined', value: profile?.joinDate ?? '—', icon: Calendar },
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
              )
            }

            {!loading && (profile?.email || profile?.mobileNumber) && (
              <View className="mt-2 pt-3 border-t border-slate-100 gap-2">
                {profile?.email && (
                  <Pressable onPress={() => Linking.openURL(`mailto:${profile.email}`)} className="flex-row items-center gap-2 active:opacity-60">
                    <Mail size={12} color="#94A3B8" />
                    <Text className="text-xs text-slate-500">{profile.email}</Text>
                    <ExternalLink size={10} color="#CBD5E1" />
                  </Pressable>
                )}
                {profile?.mobileNumber && (
                  <Pressable onPress={() => Linking.openURL(`tel:${profile.mobileNumber}`)} className="flex-row items-center gap-2 active:opacity-60">
                    <Phone size={12} color="#94A3B8" />
                    <Text className="text-xs text-slate-500">{profile.mobileNumber}</Text>
                    <ExternalLink size={10} color="#CBD5E1" />
                  </Pressable>
                )}
              </View>
            )}

            <Pressable onPress={handleEditProfile} className="mt-3 bg-primary/10 py-2.5 rounded-full items-center active:opacity-70">
              <Text className="text-primary font-bold text-xs">Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row mx-6 mt-4 gap-2.5">
          {[
            { label: 'Dispensed', value: loading ? '—' : String(stats?.dispensedToday ?? 0), icon: Pill, color: '#22C55E' },
            { label: 'Pending',   value: loading ? '—' : String(stats?.pendingToday ?? 0),   icon: Clock, color: '#F59E0B' },
            { label: 'Rejected',  value: loading ? '—' : String(stats?.rejectedToday ?? 0),  icon: Package, color: Colors.primary },
            { label: 'Low Stock', value: loading ? '—' : String(stats?.lowStockCount ?? 0),  icon: AlertTriangle, color: '#EF4444' },
          ].map((stat, idx) => (
            <QuickStatCard
              key={idx}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              onPress={() => handleStatPress(stat.label)}
            />
          ))}
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, si) => (
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
