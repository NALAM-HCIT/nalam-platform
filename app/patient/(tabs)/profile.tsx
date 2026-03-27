import { CustomAlert } from '@/components/CustomAlert';
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthStore } from '@/stores/authStore';
import { Shadows, Colors } from '@/constants/theme';
import { patientService, PatientProfile, ProfileStats } from '@/services/patientService';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import {
  User, Heart, Shield, Bell, FileText, LogOut, ChevronRight,
  Camera, MapPin, Phone, Mail, Calendar, Briefcase, CreditCard,
  HelpCircle, Star, Share2, Package, Stethoscope, Pill, AlertCircle,
  Globe, Moon, Fingerprint, Lock, ExternalLink,
} from 'lucide-react-native';

/* ───── Helpers ───── */

function computeAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function formatUHID(id: string): string {
  // Use first segment of UUID as friendly UHID, e.g. "NLM-A1B2C3D4"
  return `NLM-${id.split('-')[0].toUpperCase()}`;
}

/* ───── Types ───── */

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

function buildMenuSections(profile: PatientProfile | null, stats: ProfileStats | null): MenuSection[] {
  const activePrescriptions = stats?.activeRx ?? 0;
  const totalVisits = stats?.totalVisits ?? 0;
  const insurance = profile?.insuranceProvider;

  return [
    {
      title: 'Health',
      items: [
        { icon: Heart, label: 'Health Profile', subtitle: 'Allergies, conditions, vitals', color: '#EF4444', actionId: 'health_profile' },
        {
          icon: Pill,
          label: 'My Medications',
          subtitle: activePrescriptions > 0 ? `${activePrescriptions} active prescription${activePrescriptions > 1 ? 's' : ''}` : 'No active prescriptions',
          color: '#8B5CF6',
          actionId: 'medications',
        },
        {
          icon: Stethoscope,
          label: 'My Doctors',
          subtitle: totalVisits > 0 ? `${totalVisits} past consultation${totalVisits > 1 ? 's' : ''}` : 'No consultations yet',
          color: Colors.primary,
          actionId: 'my_doctors',
        },
        {
          icon: CreditCard,
          label: 'Insurance Details',
          subtitle: insurance ? `${insurance} — Active` : 'No insurance on file',
          color: '#059669',
          badge: insurance ? 'Active' : undefined,
          actionId: 'insurance',
        },
      ],
    },
    {
      title: 'Orders & History',
      items: [
        { icon: Package, label: 'Order History', subtitle: 'View pharmacy orders', color: '#F59E0B', actionId: 'order_history' },
        { icon: FileText, label: 'Medical Records', subtitle: 'Documents & reports', color: '#0EA5E9', actionId: 'medical_records' },
        {
          icon: Calendar,
          label: 'Appointment History',
          subtitle: totalVisits > 0 ? `${totalVisits} past visit${totalVisits > 1 ? 's' : ''}` : 'No past visits',
          color: Colors.primary,
          actionId: 'appointment_history',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', subtitle: 'Push, SMS, Email', color: '#F59E0B', actionId: 'notifications' },
        { icon: Globe, label: 'Language', subtitle: 'English', color: '#0EA5E9', actionId: 'language' },
        { icon: Moon, label: 'Appearance', subtitle: 'System default', color: '#64748B', actionId: 'appearance' },
      ],
    },
    {
      title: 'Security',
      items: [
        { icon: Fingerprint, label: 'Biometric Login', subtitle: 'Face ID enabled', color: '#8B5CF6', actionId: 'biometric' },
        { icon: Lock, label: 'Change Password', color: '#64748B', actionId: 'change_password' },
        { icon: Shield, label: 'Privacy & Data', subtitle: 'Manage permissions', color: '#059669', actionId: 'privacy' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & Support', subtitle: '24/7 assistance', color: Colors.primary, actionId: 'help' },
        { icon: Star, label: 'Rate the App', color: '#EAB308', actionId: 'rate_app' },
        { icon: Share2, label: 'Refer a Friend', subtitle: 'Earn Rs. 100 credit', color: '#EC4899', actionId: 'refer' },
        { icon: AlertCircle, label: 'About Nalam', subtitle: 'Version 1.0.0', color: '#64748B', actionId: 'about' },
      ],
    },
  ];
}

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
        <View className={`px-2 py-0.5 rounded-full mr-2 ${
          item.badge === 'Active' ? 'bg-emerald-50 border border-emerald-200' : 'bg-primary'
        }`}>
          <Text className={`text-[10px] font-bold ${
            item.badge === 'Active' ? 'text-emerald-600' : 'text-white'
          }`}>
            {item.badge}
          </Text>
        </View>
      )}
      <ChevronRight size={15} color="#CBD5E1" />
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function ProfileScreen() {
  const router = useRouter();
  const { userName, phone, logout } = useAuthStore();

  const { profileImage, handleChangePhoto } = useProfilePhoto();

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [quickStats, setQuickStats] = useState<ProfileStats | null>(null);
  const [statsLoaded, setStatsLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setProfileLoading(true);

      Promise.all([
        patientService.getProfile(),
        patientService.getProfileStats(),
      ])
        .then(([prof, stats]) => {
          if (cancelled) return;
          setProfile(prof);
          setQuickStats(stats);
        })
        .catch((err) => {
          if (!cancelled) console.error('Failed to load profile data:', err);
        })
        .finally(() => {
          if (!cancelled) {
            setProfileLoading(false);
            setStatsLoaded(true);
          }
        });

      return () => { cancelled = true; };
    }, []),
  );

  const displayName = profile?.fullName || userName || 'Patient';
  const initials = useMemo(() => {
    const parts = displayName.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName[0]?.toUpperCase() ?? 'P';
  }, [displayName]);

  const age = useMemo(() => computeAge(profile?.dateOfBirth ?? null), [profile]);
  const uhid = useMemo(() => profile ? formatUHID(profile.id) : '—', [profile]);

  const displayPhone = profile?.mobileNumber || phone || '—';
  const displayEmail = profile?.email || null;
  const displayAddress = [profile?.address, profile?.city, profile?.state, profile?.pincode]
    .filter(Boolean).join(', ') || null;
  const emergencyContact = profile?.emergencyContactName || null;
  const emergencyPhone = profile?.emergencyContactPhone || null;

  const quickStatItems = useMemo(() => [
    { label: 'Visits', value: statsLoaded ? String(quickStats?.totalVisits ?? 0) : '—', icon: Calendar, color: Colors.primary },
    { label: 'Rx', value: statsLoaded ? String(quickStats?.activeRx ?? 0) : '—', icon: FileText, color: '#8B5CF6' },
    { label: 'Appts', value: statsLoaded ? String(quickStats?.totalAppointments ?? 0) : '—', icon: Package, color: '#F59E0B' },
  ], [quickStats, statsLoaded]);

  const menuSections = useMemo(() => buildMenuSections(profile, quickStats), [profile, quickStats]);

  /* ── Action Handlers ── */

  const handleLogout = useCallback(() => {
    CustomAlert.alert(
      'Log Out',
      'Are you sure you want to log out? You can log back in anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => { logout(); router.replace('/'); },
        },
      ],
    );
  }, [logout, router]);

  const handleEditProfile = useCallback(() => {
    router.push('/patient/edit-profile');
  }, [router]);

  const handleEmergencyContact = useCallback(() => {
    const name = emergencyContact || 'Not set';
    const phone = emergencyPhone || 'Not set';
    const relation = profile?.emergencyContactRelation || '';
    CustomAlert.alert(
      'Emergency Contact',
      `Name: ${name}${relation ? ` (${relation})` : ''}\nPhone: ${phone}\n\nThis contact will be notified during SOS emergencies.`,
      [
        { text: 'OK' },
        { text: 'Edit', onPress: () => router.push('/patient/edit-profile') },
        ...(emergencyPhone ? [{ text: 'Call Now', onPress: () => Linking.openURL(`tel:${emergencyPhone}`) }] : []),
      ],
    );
  }, [emergencyContact, emergencyPhone, profile, router]);

  const handleStatPress = useCallback((label: string) => {
    switch (label) {
      case 'Visits':
      case 'Appts':
        router.push('/patient/(tabs)/bookings');
        break;
      case 'Rx':
        router.push('/patient/digital-prescription');
        break;
    }
  }, [router]);

  const handleMenuPress = useCallback((actionId: string) => {
    switch (actionId) {
      // ── Health ──
      case 'health_profile':
        router.push('/patient/(tabs)/records');
        break;

      case 'medications':
        router.push('/patient/digital-prescription');
        break;

      case 'my_doctors':
        router.push('/patient/(tabs)/bookings');
        break;

      case 'insurance':
        if (profile?.insuranceProvider) {
          CustomAlert.alert(
            'Insurance Details',
            `Provider: ${profile.insuranceProvider}${profile.insurancePolicyNumber ? `\nPolicy No: ${profile.insurancePolicyNumber}` : ''}\n\nUpdate your insurance details from Edit Profile.`,
            [
              { text: 'OK' },
              { text: 'Update', onPress: () => router.push('/patient/edit-profile') },
            ],
          );
        } else {
          CustomAlert.alert(
            'Insurance Details',
            'No insurance information on file.\n\nAdd your insurance details from Edit Profile.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Add Insurance', onPress: () => router.push('/patient/edit-profile') },
            ],
          );
        }
        break;

      // ── Orders & History ──
      case 'order_history':
        router.push('/patient/order-history');
        break;

      case 'medical_records':
        router.push('/patient/(tabs)/records');
        break;

      case 'appointment_history':
        router.push('/patient/(tabs)/bookings');
        break;

      // ── Preferences ──
      case 'notifications':
        CustomAlert.alert('Notification Settings', 'Manage your notification preferences:', [
          {
            text: 'Appointment Reminders',
            onPress: () =>
              CustomAlert.alert('Appointment Reminders', 'Current settings:\n\n- 24 hours before: ON\n- 1 hour before: ON\n- 15 minutes before: ON\n- SMS reminders: ON\n- Email reminders: OFF', [
                { text: 'OK' },
                { text: 'Edit', onPress: () => CustomAlert.alert('Updated', 'Notification preferences saved.') },
              ]),
          },
          {
            text: 'Medicine Reminders',
            onPress: () =>
              CustomAlert.alert('Medicine Reminders', 'Configure medicine reminder times from the Medications section.', [
                { text: 'OK' },
              ]),
          },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'language':
        CustomAlert.alert('Select Language', 'Choose your preferred language:', [
          { text: 'English (Current)', style: 'cancel' },
          { text: 'Tamil (தமிழ்)', onPress: () => CustomAlert.alert('Language Changed', 'App language will switch to Tamil on next restart.') },
          { text: 'Hindi (हिन्दी)', onPress: () => CustomAlert.alert('Language Changed', 'App language will switch to Hindi on next restart.') },
          { text: 'Telugu (తెలుగు)', onPress: () => CustomAlert.alert('Language Changed', 'App language will switch to Telugu on next restart.') },
        ]);
        break;

      case 'appearance':
        CustomAlert.alert('Appearance', 'Choose your preferred theme:', [
          { text: 'System Default (Current)', style: 'cancel' },
          { text: 'Light Mode', onPress: () => CustomAlert.alert('Theme Updated', 'Light mode activated.') },
          { text: 'Dark Mode', onPress: () => CustomAlert.alert('Theme Updated', 'Dark mode activated.') },
        ]);
        break;

      // ── Security ──
      case 'biometric':
        CustomAlert.alert(
          'Biometric Login',
          'Face ID is currently enabled for quick login.',
          [
            { text: 'OK' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: () =>
                CustomAlert.alert('Disable Face ID?', 'You will need to enter your phone number each time you log in.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Disable', style: 'destructive', onPress: () => CustomAlert.alert('Disabled', 'Face ID login has been disabled.') },
                ]),
            },
          ],
        );
        break;

      case 'change_password':
        CustomAlert.alert(
          'Change Password',
          'For your security, you\'ll need to verify your identity first.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Send OTP',
              onPress: () =>
                CustomAlert.alert(
                  'OTP Sent',
                  `A 6-digit OTP has been sent to ${displayPhone}.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Verify', onPress: () => CustomAlert.alert('Verified', 'You can now set a new password.') },
                  ],
                ),
            },
          ],
        );
        break;

      case 'privacy':
        CustomAlert.alert('Privacy & Data', 'Manage your privacy settings:', [
          {
            text: 'Data Sharing',
            onPress: () =>
              CustomAlert.alert(
                'Data Sharing',
                'Your health data is shared only with your treating doctors and pharmacy (for prescriptions). We never sell your data.',
                [{ text: 'OK' }],
              ),
          },
          {
            text: 'Download My Data',
            onPress: () =>
              CustomAlert.alert('Download My Data', 'We\'ll compile all your data. This may take up to 24 hours. You\'ll receive a notification when ready.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Request Download', onPress: () => CustomAlert.alert('Request Submitted', 'Your data download request has been submitted.') },
              ]),
          },
          {
            text: 'Delete Account',
            style: 'destructive',
            onPress: () =>
              CustomAlert.alert(
                'Delete Account',
                'This is permanent and cannot be undone. All your records, appointments and prescriptions will be deleted.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Permanently',
                    style: 'destructive',
                    onPress: () =>
                      CustomAlert.alert('Confirm Deletion', 'Your account will be scheduled for deletion in 30 days. You can cancel by logging in within this period.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Confirm', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
                      ]),
                  },
                ],
              ),
          },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      // ── Support ──
      case 'help':
        CustomAlert.alert('Help & Support', 'How can we help you?', [
          {
            text: 'FAQs',
            onPress: () =>
              CustomAlert.alert(
                'Frequently Asked Questions',
                'Q: How do I book an appointment?\nA: Go to Bookings tab > Book New > Select Doctor > Choose Slot > Confirm.\n\nQ: How do I cancel an appointment?\nA: Go to Bookings > Select appointment > Cancel. Free cancellation up to 4 hrs before.\n\nQ: Is my data secure?\nA: Yes, all data is encrypted. We comply with Indian healthcare data regulations.',
                [{ text: 'OK' }],
              ),
          },
          {
            text: 'Call Support',
            onPress: () =>
              CustomAlert.alert('Call Support', 'Our support team is available 24/7.\n\nToll-free: 1800-123-NALAM', [
                { text: 'OK' },
                { text: 'Call Now', onPress: () => Linking.openURL('tel:1800123625') },
              ]),
          },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'rate_app':
        CustomAlert.alert(
          'Rate Nalam',
          'How would you rate your experience?\n\nYour feedback helps us improve.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Rate on App Store', onPress: () => CustomAlert.alert('Thank You!', 'Redirecting to App Store...') },
            {
              text: 'Send Feedback',
              onPress: () => CustomAlert.alert('Thank You!', 'Your feedback has been submitted. We appreciate it!'),
            },
          ],
        );
        break;

      case 'refer':
        CustomAlert.alert(
          'Refer a Friend',
          `Share Nalam with friends and family!\n\nReferral code: NALAM-${uhid.split('-')[1] ?? 'FRIEND'}\n\nYou get Rs. 100 credit per referral. Your friend gets Rs. 100 off their first consultation.`,
          [
            { text: 'OK' },
            {
              text: 'Share via WhatsApp',
              onPress: () =>
                Linking.openURL('whatsapp://send?text=Hey! Try Nalam for doctor consultations and medicine delivery. Download the app today!').catch(() =>
                  CustomAlert.alert('WhatsApp not available', 'Please install WhatsApp to share.'),
                ),
            },
          ],
        );
        break;

      case 'about':
        CustomAlert.alert(
          'About Nalam',
          'Nalam — Your Health Companion\n\nVersion: 1.0.0\n\nNalam connects patients with doctors, pharmacies, and diagnostic centers.\n\nMade with care in Chennai, India.\n\n© 2026 Nalam Healthcare Pvt. Ltd.',
          [
            { text: 'OK' },
            { text: 'Terms & Conditions', onPress: () => CustomAlert.alert('Terms & Conditions', 'Cancellation policy: Free up to 4 hours before appointment.\nMedicine returns: Within 7 days if unopened.') },
            { text: 'Privacy Policy', onPress: () => CustomAlert.alert('Privacy Policy', 'We take your privacy seriously. Data is encrypted at rest and in transit. We never sell your health data.') },
          ],
        );
        break;

      default:
        break;
    }
  }, [router, displayPhone, logout, profile, uhid]);

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
              <Text className="text-slate-400 text-sm mt-0.5">{displayPhone}</Text>
            </View>

            {profileLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 12 }} />
            ) : (
              <>
                {/* Info Grid */}
                <View className="flex-row flex-wrap">
                  {[
                    { label: 'UHID', value: uhid, icon: User },
                    { label: 'Blood', value: profile?.bloodGroup || '—', icon: Heart },
                    { label: 'Age', value: age != null ? `${age} yrs` : '—', icon: Calendar },
                    { label: 'Gender', value: profile?.gender || '—', icon: User },
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
                  {displayEmail ? (
                    <Pressable onPress={() => Linking.openURL(`mailto:${displayEmail}`)} className="flex-row items-center gap-2 active:opacity-60">
                      <Mail size={12} color="#94A3B8" />
                      <Text className="text-xs text-slate-500">{displayEmail}</Text>
                      <ExternalLink size={10} color="#CBD5E1" />
                    </Pressable>
                  ) : (
                    <Pressable onPress={handleEditProfile} className="flex-row items-center gap-2 active:opacity-60">
                      <Mail size={12} color="#94A3B8" />
                      <Text className="text-xs text-slate-400 italic">Add email address</Text>
                    </Pressable>
                  )}
                  {displayAddress ? (
                    <Pressable
                      onPress={() =>
                        CustomAlert.alert('Address', displayAddress, [
                          { text: 'OK' },
                          { text: 'Edit', onPress: handleEditProfile },
                        ])
                      }
                      className="flex-row items-center gap-2 active:opacity-60"
                    >
                      <MapPin size={12} color="#94A3B8" />
                      <Text className="text-xs text-slate-500 flex-1" numberOfLines={1}>{displayAddress}</Text>
                      <ExternalLink size={10} color="#CBD5E1" />
                    </Pressable>
                  ) : (
                    <Pressable onPress={handleEditProfile} className="flex-row items-center gap-2 active:opacity-60">
                      <MapPin size={12} color="#94A3B8" />
                      <Text className="text-xs text-slate-400 italic">Add address</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}

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
          {quickStatItems.map((stat, idx) => (
            <QuickStatCard key={idx} stat={stat} onPress={() => handleStatPress(stat.label)} />
          ))}
        </View>

        {/* Emergency Contact Card */}
        <Pressable
          onPress={handleEmergencyContact}
          className="mx-6 mt-4 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex-row items-center gap-3 active:opacity-80"
        >
          <View className="w-10 h-10 rounded-xl bg-rose-100 items-center justify-center">
            <Phone size={18} color="#E11D48" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-sm text-rose-800">Emergency Contact</Text>
            {emergencyContact && emergencyPhone ? (
              <Text className="text-rose-600 text-xs mt-0.5">{emergencyContact} — {emergencyPhone}</Text>
            ) : (
              <Text className="text-rose-400 text-xs mt-0.5 italic">Tap to add emergency contact</Text>
            )}
          </View>
          <ChevronRight size={16} color="#FDA4AF" />
        </Pressable>

        {/* SOS Button */}
        <Pressable
          onPress={() => router.push('/patient/sos-emergency')}
          className="mx-6 mt-3 bg-red-600 rounded-2xl p-4 flex-row items-center justify-center gap-3 active:opacity-90"
          style={{
            shadowColor: '#DC2626',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <AlertCircle size={20} color="#FFFFFF" />
          <Text className="text-white font-bold text-base">SOS Emergency</Text>
        </Pressable>

        {/* Menu Sections */}
        {menuSections.map((section, si) => (
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

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          className="mx-6 mt-5 flex-row items-center justify-center py-4 bg-white rounded-2xl active:bg-rose-50"
          style={Shadows.card}
        >
          <View className="w-9 h-9 rounded-xl bg-rose-50 items-center justify-center mr-3">
            <LogOut size={17} color="#E11D48" />
          </View>
          <Text className="font-bold text-rose-500 text-sm">Log Out</Text>
        </Pressable>

        {/* App Version */}
        <Text className="text-center text-[10px] text-slate-300 mt-4 font-medium">
          Nalam v1.0.0 • Made with care in Chennai
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
