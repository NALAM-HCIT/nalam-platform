import { CustomAlert } from '@/components/CustomAlert';
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows, Colors } from '@/constants/theme';
import { patientService } from '@/services/patientService';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import {
  User, Heart, Shield, Bell, FileText, LogOut, ChevronRight,
  Camera, MapPin, Phone, Mail, Calendar, Briefcase, CreditCard,
  HelpCircle, Star, Share2, Package, Stethoscope, Pill, AlertCircle,
  Globe, Moon, Fingerprint, Lock, ExternalLink,
} from 'lucide-react-native';

/* ───── Data ───── */

const PATIENT_INFO = {
  age: 32,
  gender: 'Male',
  dob: 'Jun 15, 1993',
  blood: 'B+',
  email: 'john.doe@email.com',
  address: '12, Anna Nagar Main Road, Chennai, TN 600040',
  uhid: 'NLM-8923',
  emergencyContact: 'Jane Doe',
  emergencyPhone: '+91 98765 43210',
};

// QUICK_STATS are loaded from the API — see liveStats state in component

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
    title: 'Health',
    items: [
      { icon: Heart, label: 'Health Profile', subtitle: 'Allergies, conditions, vitals', color: '#EF4444', actionId: 'health_profile' },
      { icon: Pill, label: 'My Medications', subtitle: '2 active prescriptions', color: '#8B5CF6', actionId: 'medications' },
      { icon: Stethoscope, label: 'My Doctors', subtitle: '4 consulted doctors', color: Colors.primary, actionId: 'my_doctors' },
      { icon: CreditCard, label: 'Insurance Details', subtitle: 'Star Health — Active', color: '#059669', badge: 'Active', actionId: 'insurance' },
    ],
  },
  {
    title: 'Orders & History',
    items: [
      { icon: Package, label: 'Order History', subtitle: '2 active orders', color: '#F59E0B', actionId: 'order_history' },
      { icon: FileText, label: 'Medical Records', subtitle: '14 documents uploaded', color: '#0EA5E9', actionId: 'medical_records' },
      { icon: Calendar, label: 'Appointment History', subtitle: '12 past visits', color: Colors.primary, actionId: 'appointment_history' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, label: 'Notifications', subtitle: 'Push, SMS, Email', color: '#F59E0B', badge: '3', actionId: 'notifications' },
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

  const { profileImage, uploading, uploadProgress, handleChangePhoto } = useProfilePhoto();
  const [quickStats, setQuickStats] = useState([
    { label: 'Visits', value: '—', icon: Calendar, color: Colors.primary },
    { label: 'Rx', value: '—', icon: FileText, color: '#8B5CF6' },
    { label: 'Appts', value: '—', icon: Package, color: '#F59E0B' },
  ]);

  useEffect(() => {
    patientService.getProfileStats()
      .then((stats) => {
        setQuickStats([
          { label: 'Visits', value: String(stats.totalVisits), icon: Calendar, color: Colors.primary },
          { label: 'Rx', value: String(stats.activeRx), icon: FileText, color: '#8B5CF6' },
          { label: 'Appts', value: String(stats.totalAppointments), icon: Package, color: '#F59E0B' },
        ]);
      })
      .catch((err) => console.error('Failed to load profile stats:', err));
  }, []);

  const displayName = userName || 'Patient';
  const initials = useMemo(() => {
    const parts = displayName.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return displayName[0].toUpperCase();
  }, [displayName]);

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

  // Image picker logic is now handled by useProfilePhoto hook

  const handleEmergencyContact = useCallback(() => {
    CustomAlert.alert(
      'Emergency Contact',
      `Name: ${PATIENT_INFO.emergencyContact}\nPhone: ${PATIENT_INFO.emergencyPhone}\n\nThis contact will be notified during SOS emergencies and critical alerts.`,
      [
        { text: 'OK' },
        {
          text: 'Edit',
          onPress: () =>
            CustomAlert.alert('Edit Emergency Contact', 'Update your emergency contact details:\n\n- Contact Name\n- Phone Number\n- Relationship\n- Secondary Contact (optional)', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Save', onPress: () => CustomAlert.alert('Saved', 'Emergency contact updated successfully.') },
            ]),
        },
        { text: 'Call Now', onPress: () => Linking.openURL('tel:+919876543210') },
      ],
    );
  }, []);

  const handleStatPress = useCallback((label: string) => {
    switch (label) {
      case 'Visits':
        router.push('/patient/(tabs)/bookings');
        break;
      case 'Rx':
        router.push('/patient/digital-prescription');
        break;
      case 'Orders':
        router.push('/patient/order-history');
        break;
      case 'Reports':
        router.push('/patient/(tabs)/records');
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
        CustomAlert.alert('My Doctors', 'Doctors you have consulted:', [
          { text: 'OK' },
          {
            text: 'View All',
            onPress: () =>
              CustomAlert.alert(
                'Consulted Doctors',
                '1. Dr. Aruna Devi — Cardiologist\n   Last visit: Mar 10, 2026\n   Next follow-up: Mar 24, 2026\n\n2. Dr. Rajesh Kumar — Neurologist\n   Last visit: Feb 25, 2026\n\n3. Dr. Shalini Singh — Dermatologist\n   Last visit: Feb 25, 2026\n\n4. Dr. Elena Gomez — Pediatrician\n   Last visit: Jan 28, 2026',
                [
                  { text: 'OK' },
                  { text: 'Book New', onPress: () => router.push('/patient/consultation-type') },
                ],
              ),
          },
        ]);
        break;

      case 'insurance':
        CustomAlert.alert(
          'Insurance Details',
          'Provider: Star Health Insurance\nPolicy No: SHI-2024-78456\nType: Family Floater\nSum Insured: Rs. 10,00,000\nValid Till: Dec 31, 2026\nStatus: Active\n\nCovered Members:\n- John Doe (Self)\n- Jane Doe (Spouse)\n\nCashless Hospitals: 14,000+ network hospitals\nClaim Status: No pending claims',
          [
            { text: 'OK' },
            {
              text: 'Update Policy',
              onPress: () =>
                CustomAlert.alert('Update Insurance', 'Upload your updated insurance card or policy document.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Take Photo', onPress: () => CustomAlert.alert('Camera', 'Camera would open to capture insurance card.') },
                  { text: 'Upload PDF', onPress: () => CustomAlert.alert('Upload', 'File picker would open to select insurance document.') },
                ]),
            },
            {
              text: 'File Claim',
              onPress: () =>
                CustomAlert.alert('File Claim', 'To file an insurance claim, you need:\n\n1. Hospital bills & receipts\n2. Discharge summary\n3. Doctor prescription\n4. Investigation reports\n\nWould you like to proceed?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Start Claim', onPress: () => CustomAlert.alert('Claim Initiated', 'Your claim request has been initiated. Track status in the Insurance section.\n\nReference: CLM-2026-0321') },
                ]),
            },
          ],
        );
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
              CustomAlert.alert('Medicine Reminders', 'Current settings:\n\n- Amlodipine 5mg: 8:00 AM daily\n- Metformin 500mg: 8:00 AM & 8:00 PM daily\n- Missed dose alert: ON\n- Refill reminder: 3 days before', [
                { text: 'OK' },
                { text: 'Edit', onPress: () => CustomAlert.alert('Updated', 'Medicine reminder preferences saved.') },
              ]),
          },
          {
            text: 'Promotions & Offers',
            onPress: () =>
              CustomAlert.alert('Promotions', 'Current settings:\n\n- Health tips: ON\n- Pharmacy offers: ON\n- New features: ON\n\nYou have 3 unread notifications.', [
                { text: 'OK' },
                { text: 'Turn Off All', onPress: () => CustomAlert.alert('Updated', 'Promotional notifications turned off.') },
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
          { text: 'Light Mode', onPress: () => CustomAlert.alert('Theme Updated', 'Light mode activated. The app will use a bright theme.') },
          { text: 'Dark Mode', onPress: () => CustomAlert.alert('Theme Updated', 'Dark mode activated. The app will use a dark theme for comfortable viewing at night.') },
        ]);
        break;

      // ── Security ──
      case 'biometric':
        CustomAlert.alert(
          'Biometric Login',
          'Face ID is currently enabled for quick login.\n\nBiometric authentication adds an extra layer of security to your account.',
          [
            { text: 'OK' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: () =>
                CustomAlert.alert('Disable Face ID?', 'You will need to enter your password each time you log in.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Disable', style: 'destructive', onPress: () => CustomAlert.alert('Disabled', 'Face ID login has been disabled. You can re-enable it anytime.') },
                ]),
            },
            {
              text: 'Re-register',
              onPress: () => CustomAlert.alert('Re-register Face ID', 'Please look at the camera to register your face again.\n\n(Face ID registration would start in production)'),
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
                  `A 6-digit OTP has been sent to ${phone || '+91 ****0000'}.\n\nEnter the OTP to verify your identity and set a new password.`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Verify',
                      onPress: () =>
                        CustomAlert.alert('Set New Password', 'Password requirements:\n\n- Minimum 8 characters\n- At least one uppercase letter\n- At least one number\n- At least one special character', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Update', onPress: () => CustomAlert.alert('Success', 'Your password has been updated successfully. Please use your new password for your next login.') },
                        ]),
                    },
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
                'Data Sharing Preferences',
                'Control who can access your health data:\n\n- Share with treating doctors: ON\n- Share with pharmacy: ON (for prescriptions)\n- Share with insurance: OFF\n- Share with family members: OFF\n- Anonymous data for research: OFF',
                [
                  { text: 'OK' },
                  { text: 'Edit', onPress: () => CustomAlert.alert('Updated', 'Data sharing preferences saved.') },
                ],
              ),
          },
          {
            text: 'Download My Data',
            onPress: () =>
              CustomAlert.alert('Download My Data', 'We\'ll compile all your data including:\n\n- Personal information\n- Medical records\n- Appointment history\n- Prescriptions\n- Order history\n\nThis may take up to 24 hours. You\'ll receive an email when ready.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Request Download', onPress: () => CustomAlert.alert('Request Submitted', 'Your data download request has been submitted. You\'ll receive an email at john.doe@email.com within 24 hours.') },
              ]),
          },
          {
            text: 'Delete Account',
            style: 'destructive',
            onPress: () =>
              CustomAlert.alert(
                'Delete Account',
                'This action is permanent and cannot be undone.\n\nAll your data including medical records, appointments, prescriptions, and order history will be permanently deleted.\n\nAre you absolutely sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Permanently',
                    style: 'destructive',
                    onPress: () =>
                      CustomAlert.alert('Confirm Deletion', 'Type "DELETE" to confirm. Your account will be scheduled for deletion in 30 days. You can cancel within this period by logging in.', [
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
                'Q: How do I book an appointment?\nA: Go to Bookings tab > Book New > Select Doctor > Choose Slot > Pay & Confirm.\n\nQ: How do I order medicines?\nA: Go to Pharmacy tab > Upload prescription or search medicines > Add to cart > Checkout.\n\nQ: How to cancel an appointment?\nA: Go to Bookings > Select appointment > Cancel. Free cancellation up to 4 hrs before.\n\nQ: Is my data secure?\nA: Yes, all data is encrypted and stored securely. We comply with HIPAA and Indian healthcare data regulations.',
                [{ text: 'OK' }],
              ),
          },
          {
            text: 'Call Support',
            onPress: () =>
              CustomAlert.alert('Call Support', 'Our support team is available 24/7.\n\nToll-free: 1800-123-NALAM\nWhatsApp: +91 98765 00000', [
                { text: 'OK' },
                { text: 'Call Now', onPress: () => Linking.openURL('tel:1800123625') },
              ]),
          },
          {
            text: 'Chat with Us',
            onPress: () => CustomAlert.alert('Live Chat', 'Connecting you to a support agent...\n\nAverage wait time: < 2 minutes\n\n(Live chat would open in production)'),
          },
          {
            text: 'Report a Problem',
            onPress: () =>
              CustomAlert.alert('Report a Problem', 'Select the category:', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'App Bug', onPress: () => CustomAlert.alert('Bug Report', 'Please describe the issue you encountered. Include steps to reproduce if possible.\n\n(Bug report form would open in production)\n\nYour report helps us improve Nalam for everyone.', [{ text: 'Submit', onPress: () => CustomAlert.alert('Submitted', 'Thank you for your report! Our team will investigate and get back to you within 24 hours.\n\nTicket: SUP-2026-0321') }]) },
                { text: 'Billing Issue', onPress: () => CustomAlert.alert('Billing Support', 'For billing issues, our finance team will review your case.\n\nPlease have your order/booking ID ready.\n\n(Billing support form would open in production)', [{ text: 'Submit', onPress: () => CustomAlert.alert('Submitted', 'Billing inquiry submitted. You\'ll hear back within 48 hours.\n\nTicket: BIL-2026-0321') }]) },
                { text: 'Other', onPress: () => CustomAlert.alert('General Inquiry', 'Our team will get back to you shortly.\n\n(General support form would open in production)', [{ text: 'Submit', onPress: () => CustomAlert.alert('Submitted', 'Inquiry submitted. Reference: GEN-2026-0321') }]) },
              ]),
          },
          { text: 'Close', style: 'cancel' },
        ]);
        break;

      case 'rate_app':
        CustomAlert.alert(
          'Rate Nalam',
          'How would you rate your experience with Nalam?\n\nYour feedback helps us improve the app for millions of patients.',
          [
            { text: 'Not Now', style: 'cancel' },
            {
              text: 'Rate on App Store',
              onPress: () =>
                CustomAlert.alert('Thank You!', 'You\'ll be redirected to the App Store to leave a review.\n\n(App Store would open in production)', [{ text: 'OK' }]),
            },
            {
              text: 'Send Feedback',
              onPress: () =>
                CustomAlert.alert('Send Feedback', 'What can we improve?\n\n- App performance\n- Feature requests\n- UI/UX suggestions\n- Doctor experience\n- Pharmacy service\n\n(Feedback form would open in production)', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Submit', onPress: () => CustomAlert.alert('Thank You!', 'Your feedback has been submitted. We truly appreciate your input!') },
                ]),
            },
          ],
        );
        break;

      case 'refer':
        CustomAlert.alert(
          'Refer a Friend',
          'Share Nalam with friends and family!\n\nYour referral code: NALAM-JOHN100\n\nBenefits:\n- You get Rs. 100 credit per referral\n- Your friend gets Rs. 100 off their first consultation\n- No limit on referrals!\n\nTotal earned so far: Rs. 200 (2 referrals)',
          [
            { text: 'OK' },
            {
              text: 'Copy Code',
              onPress: () => CustomAlert.alert('Copied!', 'Referral code NALAM-JOHN100 copied to clipboard.'),
            },
            {
              text: 'Share via WhatsApp',
              onPress: () =>
                Linking.openURL('whatsapp://send?text=Hey! Try Nalam for doctor consultations and medicine delivery. Use my code NALAM-JOHN100 to get Rs. 100 off your first visit!').catch(() =>
                  CustomAlert.alert('WhatsApp not available', 'Please install WhatsApp to share via WhatsApp.'),
                ),
            },
          ],
        );
        break;

      case 'about':
        CustomAlert.alert(
          'About Nalam',
          'Nalam — Your Health Companion\n\nVersion: 1.0.0\nBuild: 2026.03.21\n\nNalam is a comprehensive healthcare platform that connects patients with doctors, pharmacies, and diagnostic centers.\n\nFeatures:\n- Video & In-person consultations\n- Digital prescriptions\n- Medicine delivery\n- Health records management\n- Lab report tracking\n- SOS Emergency\n\nMade with care in Chennai, India.\n\n© 2026 Nalam Healthcare Pvt. Ltd.\nAll rights reserved.',
          [
            { text: 'OK' },
            {
              text: 'Terms & Conditions',
              onPress: () => CustomAlert.alert('Terms & Conditions', 'Our Terms of Service govern your use of Nalam.\n\nKey points:\n- You must be 18+ to create an account\n- Medical advice is provided by licensed doctors\n- Prescriptions are digitally signed and legally valid\n- Cancellation policy: Free up to 4 hours before appointment\n- Medicine returns: Within 7 days if unopened\n\n(Full terms document would open in production)'),
            },
            {
              text: 'Privacy Policy',
              onPress: () => CustomAlert.alert('Privacy Policy', 'We take your privacy seriously.\n\n- Data is encrypted at rest and in transit\n- We never sell your health data\n- You can request data deletion anytime\n- Compliant with Indian healthcare data regulations\n- HIPAA-aligned security practices\n\n(Full privacy policy would open in production)'),
            },
          ],
        );
        break;

      default:
        break;
    }
  }, [router, phone, logout, displayName]);

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
              <Text className="text-slate-400 text-sm mt-0.5">{phone || '+91 0000000000'}</Text>
            </View>

            {/* Info Grid */}
            <View className="flex-row flex-wrap">
              {[
                { label: 'UHID', value: PATIENT_INFO.uhid, icon: User },
                { label: 'Blood', value: PATIENT_INFO.blood, icon: Heart },
                { label: 'Age', value: `${PATIENT_INFO.age} yrs`, icon: Calendar },
                { label: 'Gender', value: PATIENT_INFO.gender, icon: User },
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
              <Pressable onPress={() => Linking.openURL(`mailto:${PATIENT_INFO.email}`)} className="flex-row items-center gap-2 active:opacity-60">
                <Mail size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-500">{PATIENT_INFO.email}</Text>
                <ExternalLink size={10} color="#CBD5E1" />
              </Pressable>
              <Pressable
                onPress={() =>
                  CustomAlert.alert('Address', `${PATIENT_INFO.address}\n\nThis is your saved delivery address for pharmacy orders.`, [
                    { text: 'OK' },
                    { text: 'Edit', onPress: () => CustomAlert.alert('Edit Address', 'Address edit form would open here with map picker for accurate location.', [{ text: 'OK' }]) },
                    { text: 'Open in Maps', onPress: () => Linking.openURL('maps://app?q=12+Anna+Nagar+Main+Road+Chennai') },
                  ])
                }
                className="flex-row items-center gap-2 active:opacity-60"
              >
                <MapPin size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-500 flex-1" numberOfLines={1}>{PATIENT_INFO.address}</Text>
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
            <Text className="text-rose-600 text-xs mt-0.5">{PATIENT_INFO.emergencyContact} — {PATIENT_INFO.emergencyPhone}</Text>
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
