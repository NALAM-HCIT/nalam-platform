import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Linking, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows, Colors } from '@/constants/theme';
import { doctorPortalService, DoctorMyProfile } from '@/services/doctorPortalService';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import {
  User, Heart, Shield, Bell, FileText, LogOut, ChevronRight,
  Camera, Phone, Mail, Calendar, Briefcase, Star, Clock,
  HelpCircle, Globe, Moon, Fingerprint, Lock, Users,
  Stethoscope, Award, ClipboardList, AlertCircle, ExternalLink,
} from 'lucide-react-native';

// Doctor info and stats are loaded from the API — see liveProfile state below

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
    title: 'Professional',
    items: [
      { icon: Briefcase, label: 'Professional Details', subtitle: 'Qualifications, specializations', color: '#8B5CF6', actionId: 'professional' },
      { icon: Award, label: 'Certificates & Awards', subtitle: '5 verified certificates', color: '#F59E0B', actionId: 'certificates' },
      { icon: ClipboardList, label: 'Consultation Settings', subtitle: 'Fees, duration, mode', color: Colors.primary, actionId: 'consultation_settings' },
    ],
  },
  {
    title: 'Schedule',
    items: [
      { icon: Clock, label: 'Availability Settings', subtitle: 'OPD, surgery, teleconsult', color: '#EA580C', actionId: 'availability' },
      { icon: Calendar, label: 'Leave Management', subtitle: '8 CL remaining', color: '#0EA5E9', badge: '8', actionId: 'leave' },
      { icon: Stethoscope, label: 'My Patients', subtitle: '320 active patients', color: '#059669', actionId: 'my_patients' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', subtitle: 'Patient alerts, system updates', color: '#F59E0B', badge: '5', actionId: 'notifications' },
      { icon: Globe, label: 'Language', subtitle: 'English', color: '#0EA5E9', actionId: 'language' },
      { icon: Moon, label: 'Appearance', subtitle: 'System default', color: '#64748B', actionId: 'appearance' },
    ],
  },
  {
    title: 'Security',
    items: [
      { icon: Fingerprint, label: 'Biometric Login', subtitle: 'Face ID enabled', color: '#8B5CF6', actionId: 'biometric' },
      { icon: Lock, label: 'Change Password', subtitle: 'Last changed 10 days ago', color: '#64748B', actionId: 'change_password' },
      { icon: Shield, label: 'Active Sessions', subtitle: '3 devices connected', color: '#059669', actionId: 'sessions' },
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
  stat,
  onPress,
}: {
  stat: { label: string; value: string; icon: React.ElementType; color: string };
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
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3.5"
        style={{ backgroundColor: item.color + '12' }}
      >
        <Icon size={17} color={item.color} />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-[13px] text-midnight">{item.label}</Text>
        {item.subtitle && (
          <Text className="text-[11px] text-slate-400 mt-0.5">{item.subtitle}</Text>
        )}
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

export default function DoctorProfileScreen() {
  const router = useRouter();
  const { userName, phone, logout } = useAuthStore();

  const { profileImage, uploading, uploadProgress, handleChangePhoto } = useProfilePhoto();
  const [liveProfile, setLiveProfile] = useState<DoctorMyProfile | null>(null);
  const [quickStats, setQuickStats] = useState([
    { label: 'Consults', value: '—', icon: Users, color: Colors.primary },
    { label: 'Rating', value: '—', icon: Star, color: '#EAB308' },
    { label: 'Patients', value: '—', icon: Heart, color: '#EF4444' },
    { label: 'Reviews', value: '—', icon: FileText, color: '#059669' },
  ]);

  useEffect(() => {
    doctorPortalService.getMyProfile()
      .then((profile) => {
        setLiveProfile(profile);
        setQuickStats([
          { label: 'Consults', value: String(profile.stats.totalConsults), icon: Users, color: Colors.primary },
          { label: 'Rating', value: profile.stats.rating > 0 ? profile.stats.rating.toFixed(1) : '—', icon: Star, color: '#EAB308' },
          { label: 'Patients', value: String(profile.stats.activePatients), icon: Heart, color: '#EF4444' },
          { label: 'Reviews', value: String(profile.stats.reviewCount), icon: FileText, color: '#059669' },
        ]);
      })
      .catch((err) => console.error('Failed to load profile:', err));
  }, []);

  const displayName = userName || 'Dr. Sarah Johnson';
  const initials = useMemo(() => {
    const name = displayName.replace(/^Dr\.?\s*/i, '');
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0].toUpperCase();
  }, [displayName]);

  // Image picker logic is now handled by useProfilePhoto hook

  /* ── Action Handlers ── */

  const handleEditProfile = useCallback(() => {
    router.push('/doctor/edit-profile');
  }, [router]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to log in again to access the doctor portal.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
      ],
    );
  }, [logout, router]);

  const handleStatPress = useCallback((label: string) => {
    switch (label) {
      case 'Consults':
        Alert.alert('Consultation Stats', 'Total Consultations: 1,240\n\nThis Month: 86\nLast Month: 72\nGrowth: +12%\n\nBreakdown:\n- OPD Consults: 920\n- Emergency: 180\n- Tele-consult: 140\n\nAvg. per day: 8.2 patients');
        break;
      case 'Rating':
        Alert.alert('Patient Ratings', 'Overall Rating: 4.9/5\nBased on 850 reviews\n\nBreakdown:\n5 stars: 720 (84.7%)\n4 stars: 102 (12.0%)\n3 stars: 20 (2.4%)\n2 stars: 5 (0.6%)\n1 star: 3 (0.4%)\n\nRecent Feedback:\n"Excellent doctor, very patient and thorough."\n"Best cardiologist in Chennai!"');
        break;
      case 'Surgeries':
        Alert.alert('Surgery Stats', 'Total Surgeries: 86\n\nThis Month: 6\nSuccess Rate: 99.2%\n\nTypes:\n- Angioplasty: 42\n- Bypass Surgery: 18\n- Pacemaker: 14\n- Others: 12');
        break;
      case 'Reviews':
        Alert.alert('Patient Reviews', '850 verified reviews\n\nMost Praised:\n- Communication: 4.9/5\n- Expertise: 5.0/5\n- Punctuality: 4.7/5\n- Empathy: 4.9/5');
        break;
    }
  }, []);

  const handleMenuPress = useCallback((actionId: string) => {
    switch (actionId) {
      case 'professional':
        Alert.alert(
          'Professional Details',
          `Specialization: ${liveProfile?.doctorProfile?.specialty || '—'}\nDepartment: ${liveProfile?.user?.department || '—'}\nExperience: ${liveProfile?.doctorProfile?.experienceYears || '—'} years\nLanguages: ${liveProfile?.doctorProfile?.languages || '—'}\nConsultation Fee: ₹${liveProfile?.doctorProfile?.consultationFee || '—'}`,
          [
            { text: 'OK' },
            { text: 'Edit', onPress: () => Alert.alert('Edit', 'To update professional details, please contact the Admin department.') },
          ],
        );
        break;

      case 'certificates':
        Alert.alert(
          'Certificates & Awards',
          '1. MD - Madras Medical College (2014)\n2. DM Cardiology - AIIMS Delhi (2017)\n3. FACC - American College of Cardiology\n4. Best Young Cardiologist Award 2022\n5. Advanced Life Support Certification\n\nAll certificates are verified and on file.',
          [
            { text: 'OK' },
            { text: 'Upload New', onPress: () => Alert.alert('Upload', 'Certificate upload form would open. Requires admin approval.') },
          ],
        );
        break;

      case 'consultation_settings':
        Alert.alert(
          'Consultation Settings',
          'OPD Fee: Rs. 800\nTeleconsult Fee: Rs. 500\nFollow-up Fee: Rs. 400\n\nSlot Duration: 20 minutes\nMax OPD per day: 25\nMax Teleconsult per day: 10\n\nModes: In-Person, Video Call',
          [
            { text: 'OK' },
            { text: 'Update Fees', onPress: () => Alert.alert('Fee Update', 'Fee change request sent to Admin for approval.\n\nRequest ID: FEE-2026-0321') },
          ],
        );
        break;

      case 'availability':
        Alert.alert('Availability Settings', 'Manage your schedule:', [
          { text: 'Close' },
          {
            text: 'OPD Hours',
            onPress: () => Alert.alert('OPD Schedule', 'Monday: 9:00 AM - 1:00 PM\nTuesday: 9:00 AM - 1:00 PM\nWednesday: 9:00 AM - 12:00 PM\nThursday: 9:00 AM - 1:00 PM\nFriday: 9:00 AM - 1:00 PM\nSaturday: 10:00 AM - 12:00 PM\nSunday: OFF', [
              { text: 'OK' },
              { text: 'Request Change', onPress: () => Alert.alert('Submitted', 'Schedule change request sent to Admin.\nRequest ID: SCH-2026-0321') },
            ]),
          },
          {
            text: 'Surgery Slots',
            onPress: () => Alert.alert('Surgery Schedule', 'Available Surgery Slots:\n\nMonday: 2:00 PM - 5:00 PM\nWednesday: 1:00 PM - 4:00 PM\nFriday: 2:00 PM - 5:00 PM\n\nMax surgeries per day: 2\nMin gap between surgeries: 1 hour', [
              { text: 'OK' },
              { text: 'Block a Slot', onPress: () => Alert.alert('Block Slot', 'Slot blocking calendar would open. Blocked slots will show as unavailable.') },
            ]),
          },
        ]);
        break;

      case 'leave':
        Alert.alert(
          'Leave Management',
          'Leave Balance:\n\nCasual Leave: 8/12 remaining\nSick Leave: 10/10 remaining\nPrivilege Leave: 15/20 remaining\n\nUpcoming:\n- March 25-26: Casual Leave (Approved)',
          [
            { text: 'OK' },
            {
              text: 'Apply Leave',
              onPress: () => Alert.alert('Apply Leave', 'Leave application form:\n- Leave type selection\n- Date range picker\n- Reason\n- Cover doctor assignment\n\nLeave requests require Admin approval.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Submit', onPress: () => Alert.alert('Submitted', 'Leave application submitted.\nRef: LV-2026-0321') },
              ]),
            },
          ],
        );
        break;

      case 'my_patients':
        Alert.alert(
          'My Patients',
          'Active Patients: 320\n\nRecent Consultations:\n1. Rajesh Kumar — Mar 20, Follow-up\n2. Priya Sharma — Mar 19, New\n3. Arun Patel — Mar 18, Emergency\n\nUpcoming Follow-ups: 8 this week',
          [
            { text: 'OK' },
            { text: 'View All', onPress: () => Alert.alert('Patient List', 'Full patient directory would open with search, filter by condition, and sort by last visit.') },
          ],
        );
        break;

      case 'notifications':
        Alert.alert('Notification Settings', 'Manage your notifications:', [
          {
            text: 'Patient Alerts',
            onPress: () => Alert.alert('Patient Notifications', 'New appointments: ON\nPatient check-in: ON\nLab results ready: ON\nCritical vitals alert: ON\nPrescription refill requests: ON', [
              { text: 'OK' },
              { text: 'Edit', onPress: () => Alert.alert('Updated', 'Patient notification preferences saved.') },
            ]),
          },
          {
            text: 'System Alerts',
            onPress: () => Alert.alert('System Notifications', 'Schedule changes: ON\nAdmin announcements: ON\nSystem maintenance: ON\nNew messages: ON\nMeeting reminders: ON', [
              { text: 'OK' },
              { text: 'Edit', onPress: () => Alert.alert('Updated', 'System notification preferences saved.') },
            ]),
          },
          {
            text: 'Quiet Hours',
            onPress: () => Alert.alert('Quiet Hours', 'Current: 10:00 PM - 7:00 AM\n\nDuring quiet hours, only emergency and critical patient alerts will come through.', [
              { text: 'OK' },
              { text: 'Edit Hours', onPress: () => Alert.alert('Updated', 'Quiet hours configuration saved.') },
            ]),
          },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'language':
        Alert.alert('Select Language', 'Choose your preferred language:', [
          { text: 'English (Current)', style: 'cancel' },
          { text: 'Tamil (தமிழ்)', onPress: () => Alert.alert('Language Changed', 'App language will switch to Tamil on next restart.') },
          { text: 'Hindi (हिन्दी)', onPress: () => Alert.alert('Language Changed', 'App language will switch to Hindi on next restart.') },
        ]);
        break;

      case 'appearance':
        Alert.alert('Appearance', 'Choose your preferred theme:', [
          { text: 'System Default (Current)', style: 'cancel' },
          { text: 'Light Mode', onPress: () => Alert.alert('Theme Updated', 'Light mode activated.') },
          { text: 'Dark Mode', onPress: () => Alert.alert('Theme Updated', 'Dark mode activated.') },
        ]);
        break;

      case 'biometric':
        Alert.alert(
          'Biometric Login',
          'Face ID is currently enabled for quick login.\n\nBiometric authentication adds an extra layer of security.',
          [
            { text: 'OK' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: () => Alert.alert('Disable Face ID?', 'You will need to enter your password each time you log in.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disable', style: 'destructive', onPress: () => Alert.alert('Disabled', 'Face ID login has been disabled.') },
              ]),
            },
          ],
        );
        break;

      case 'change_password':
        Alert.alert(
          'Change Password',
          'For your security, you\'ll need to verify your identity first.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send OTP',
              onPress: () => Alert.alert('OTP Sent', `A 6-digit OTP has been sent to ${phone || 'your registered number'}.`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Verify',
                  onPress: () => Alert.alert('Set New Password', 'Requirements:\n- Minimum 8 characters\n- At least one uppercase letter\n- At least one number\n- At least one special character', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Update', onPress: () => Alert.alert('Success', 'Your password has been updated successfully.') },
                  ]),
                },
              ]),
            },
          ],
        );
        break;

      case 'sessions':
        Alert.alert(
          'Active Sessions',
          'Current Sessions:\n\n1. This device (iPhone 15 Pro)\n   Last active: Now\n\n2. iPad Pro - Clinic\n   Last active: 2 hours ago\n\n3. Chrome - Office Desktop\n   Last active: Yesterday',
          [
            { text: 'OK' },
            { text: 'Sign Out Others', style: 'destructive', onPress: () => Alert.alert('Signed Out', 'All other sessions have been terminated.') },
          ],
        );
        break;

      case 'help':
        Alert.alert('Help & Support', 'How can we help you?', [
          {
            text: 'Contact IT',
            onPress: () => Alert.alert('IT Support', 'Phone: +91 44 2345 6789\nExtension: 501\nEmail: it.support@arunpriya.com\n\nAvailable: 24/7 for doctors\nPriority: High', [
              { text: 'OK' },
              { text: 'Call Now', onPress: () => Linking.openURL('tel:+914423456789') },
            ]),
          },
          {
            text: 'User Guide',
            onPress: () => Alert.alert('Doctor Portal Guide', 'Quick Start:\n\n1. Dashboard - View today\'s appointments and patient queue\n2. Patients - Access patient records and history\n3. Messages - Communicate with staff and patients\n\nTips:\n- Tap any appointment to view full details\n- Long-press a patient for quick actions'),
          },
          {
            text: 'Report a Bug',
            onPress: () => Alert.alert('Report a Bug', 'Bug report form would open.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Send Report', onPress: () => Alert.alert('Submitted', 'Bug report submitted.\nTicket: BUG-2026-0321\nPriority: High (Doctor)') },
            ]),
          },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'about':
        Alert.alert(
          'About Nalam',
          'Nalam — Doctor Portal\n\nVersion: 1.0.0\nBuild: 2026.03.21\n\nDeveloped for Arun Priya Hospital\n\nModules: Patient, Doctor, Pharmacist, Receptionist, Admin\n\n© 2026 Nalam Healthcare Pvt. Ltd.',
          [
            { text: 'OK' },
            { text: 'Terms', onPress: () => Alert.alert('Terms & Conditions', 'By using the Nalam Doctor Portal, you agree to all hospital policies regarding data access and patient confidentiality.') },
            { text: 'Privacy', onPress: () => Alert.alert('Privacy Policy', 'All patient data is encrypted. We comply with Indian healthcare data regulations and HIPAA-aligned practices.') },
          ],
        );
        break;
    }
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <Text className="text-3xl font-extrabold text-midnight tracking-tight">Profile</Text>
        </View>

        {/* Profile Card */}
        <View className="mx-6 mt-3 bg-white rounded-[24px] overflow-hidden" style={Shadows.card}>
          {/* Blue Banner */}
          <View className="bg-primary pt-6 pb-12 px-6 items-center">
            <View className="relative">
              <View
                className="rounded-full bg-white/20 items-center justify-center border-[3px] border-white/40 overflow-hidden"
                style={{ width: 88, height: 88 }}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={{ width: 88, height: 88 }} />
                ) : (
                  <Text className="text-white text-3xl font-extrabold">{initials}</Text>
                )}
              </View>
              <Pressable
                onPress={handleChangePhoto}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white items-center justify-center"
                style={Shadows.card}
              >
                <Camera size={14} color={Colors.primary} />
              </Pressable>
            </View>
          </View>

          {/* Info Section */}
          <View className="-mt-6 mx-4 mb-4 bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="items-center mb-3">
              <Text className="text-xl font-extrabold text-midnight">{displayName}</Text>
              <Text className="text-primary text-sm font-semibold mt-0.5">{liveProfile?.doctorProfile?.specialty || 'Doctor'}</Text>
            </View>

            {/* Role Badge & Employee ID */}
            <View className="flex-row items-center justify-center gap-2 mb-3">
              <View className="flex-row items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
                <Shield size={12} color={Colors.primary} />
                <Text className="text-primary text-xs font-bold">Doctor</Text>
              </View>
              <View className="bg-slate-100 px-3 py-1.5 rounded-full">
                <Text className="text-slate-600 text-xs font-bold">{liveProfile?.user?.employeeId || '—'}</Text>
              </View>
            </View>

            {/* Info Grid */}
            <View className="flex-row flex-wrap">
              {[
                { label: 'Dept', value: liveProfile?.user?.department || '—', icon: Briefcase },
                { label: 'Exp', value: liveProfile?.doctorProfile ? `${liveProfile.doctorProfile.experienceYears} yrs` : '—', icon: Clock },
                { label: 'Fee', value: liveProfile?.doctorProfile ? `₹${liveProfile.doctorProfile.consultationFee}` : '—', icon: Shield },
                { label: 'Lang', value: liveProfile?.doctorProfile?.languages || '—', icon: Award },
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

            {/* Contact Info */}
            <View className="mt-2 pt-3 border-t border-slate-100 gap-2">
              <Pressable onPress={() => liveProfile?.user?.email && Linking.openURL(`mailto:${liveProfile.user.email}`)} className="flex-row items-center gap-2 active:opacity-60">
                <Mail size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-500">{liveProfile?.user?.email || '—'}</Text>
                <ExternalLink size={10} color="#CBD5E1" />
              </Pressable>
              <Pressable onPress={() => Linking.openURL(`tel:${(phone || '').replace(/\s/g, '')}`)} className="flex-row items-center gap-2 active:opacity-60">
                <Phone size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-500">{phone || '—'}</Text>
                <ExternalLink size={10} color="#CBD5E1" />
              </Pressable>
            </View>

            {/* Edit Profile Button */}
            <Pressable
              onPress={handleEditProfile}
              className="mt-3 bg-primary/10 py-2.5 rounded-full items-center active:opacity-70"
            >
              <Text className="text-primary font-bold text-xs">Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="flex-row mx-6 mt-4 gap-2.5">
          {quickStats.map((stat, idx) => (
            <QuickStatCard key={idx} stat={stat} onPress={() => handleStatPress(stat.label)} />
          ))}
        </View>

        {/* Menu Sections */}
        {MENU_SECTIONS.map((section, si) => (
          <View key={si} className="mt-5">
            <Text className="px-6 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {section.title}
            </Text>
            <View className="mx-6 bg-white rounded-2xl overflow-hidden" style={Shadows.card}>
              {section.items.map((item, ii) => (
                <MenuRow
                  key={ii}
                  item={item}
                  isLast={ii === section.items.length - 1}
                  onPress={() => handleMenuPress(item.actionId)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Sign Out */}
        <Pressable
          onPress={handleLogout}
          className="mx-6 mt-5 flex-row items-center justify-center py-4 bg-white rounded-2xl active:bg-rose-50"
          style={Shadows.card}
        >
          <View className="w-9 h-9 rounded-xl bg-rose-50 items-center justify-center mr-3">
            <LogOut size={17} color="#E11D48" />
          </View>
          <Text className="font-bold text-rose-500 text-sm">Sign Out</Text>
        </Pressable>

        {/* App Version */}
        <Text className="text-center text-[10px] text-slate-300 mt-4 font-medium">
          Nalam v1.0.0 • Doctor Portal
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
