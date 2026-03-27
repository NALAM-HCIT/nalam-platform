import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows, Colors } from '@/constants/theme';
import { patientService } from '@/services/patientService';
import {
  ArrowLeft, Camera, User, Heart, Calendar, Mail, MapPin, Phone,
  CheckCircle2, ChevronDown, Droplets, Users, AlertCircle,
} from 'lucide-react-native';

/* ───── Data ───── */

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other'];

interface FormField {
  key: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  placeholder: string;
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'multiline';
  options?: string[];
  section: 'personal' | 'contact' | 'medical' | 'emergency';
}

const FORM_FIELDS: FormField[] = [
  { key: 'fullName', label: 'Full Name', icon: User, iconColor: Colors.primary, placeholder: 'Enter your full name', type: 'text', section: 'personal' },
  { key: 'dob', label: 'Date of Birth', icon: Calendar, iconColor: '#F59E0B', placeholder: 'YYYY-MM-DD', type: 'text', section: 'personal' },
  { key: 'gender', label: 'Gender', icon: Users, iconColor: '#8B5CF6', placeholder: 'Select gender', type: 'select', options: GENDERS, section: 'personal' },
  { key: 'bloodGroup', label: 'Blood Group', icon: Droplets, iconColor: '#EF4444', placeholder: 'Select blood group', type: 'select', options: BLOOD_GROUPS, section: 'medical' },
  { key: 'email', label: 'Email Address', icon: Mail, iconColor: '#0EA5E9', placeholder: 'your@email.com', type: 'email', section: 'contact' },
  { key: 'address', label: 'Address', icon: MapPin, iconColor: '#F97316', placeholder: 'Enter your full address', type: 'multiline', section: 'contact' },
  { key: 'city', label: 'City', icon: MapPin, iconColor: '#F97316', placeholder: 'City', type: 'text', section: 'contact' },
  { key: 'state', label: 'State', icon: MapPin, iconColor: '#F97316', placeholder: 'State', type: 'text', section: 'contact' },
  { key: 'pincode', label: 'Pincode', icon: MapPin, iconColor: '#F97316', placeholder: '600001', type: 'text', section: 'contact' },
  { key: 'insuranceProvider', label: 'Insurance Provider', icon: AlertCircle, iconColor: '#059669', placeholder: 'e.g., Star Health, HDFC Ergo', type: 'text', section: 'medical' },
  { key: 'insurancePolicyNumber', label: 'Policy Number', icon: AlertCircle, iconColor: '#059669', placeholder: 'e.g., SHI-2024-78456', type: 'text', section: 'medical' },
  { key: 'emergencyName', label: 'Emergency Contact Name', icon: Users, iconColor: '#E11D48', placeholder: 'Contact person name', type: 'text', section: 'emergency' },
  { key: 'emergencyPhone', label: 'Emergency Contact Phone', icon: Phone, iconColor: '#E11D48', placeholder: '+91 00000 00000', type: 'phone', section: 'emergency' },
  { key: 'emergencyRelation', label: 'Relationship', icon: Heart, iconColor: '#EC4899', placeholder: 'e.g., Spouse, Parent, Sibling', type: 'text', section: 'emergency' },
];

const SECTIONS = [
  { key: 'personal', title: 'Personal Information' },
  { key: 'contact', title: 'Contact Details' },
  { key: 'medical', title: 'Medical & Insurance' },
  { key: 'emergency', title: 'Emergency Contact' },
];

/* ───── Sub-components ───── */

const FormInput = React.memo(function FormInput({
  field,
  value,
  onChange,
  onSelectPress,
}: {
  field: FormField;
  value: string;
  onChange: (val: string) => void;
  onSelectPress: (field: FormField) => void;
}) {
  const Icon = field.icon;
  const isSelect = field.type === 'select';

  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
        {field.label}
      </Text>
      {isSelect ? (
        <Pressable
          onPress={() => onSelectPress(field)}
          className="flex-row items-center bg-white rounded-2xl px-4 py-3.5 border border-slate-100 active:border-primary/30"
          style={Shadows.card}
        >
          <View className="w-9 h-9 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: field.iconColor + '12' }}>
            <Icon size={16} color={field.iconColor} />
          </View>
          <Text className={`flex-1 text-sm ${value ? 'text-midnight font-medium' : 'text-slate-400'}`}>
            {value || field.placeholder}
          </Text>
          <ChevronDown size={16} color="#94A3B8" />
        </Pressable>
      ) : (
        <View
          className="flex-row items-start bg-white rounded-2xl px-4 py-1 border border-slate-100"
          style={Shadows.card}
        >
          <View className="w-9 h-9 rounded-xl items-center justify-center mr-3 mt-2" style={{ backgroundColor: field.iconColor + '12' }}>
            <Icon size={16} color={field.iconColor} />
          </View>
          <TextInput
            className="flex-1 text-sm text-midnight py-3"
            placeholder={field.placeholder}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={onChange}
            keyboardType={
              field.type === 'email' ? 'email-address'
              : field.type === 'phone' ? 'phone-pad'
              : 'default'
            }
            autoCapitalize={field.type === 'email' ? 'none' : 'words'}
            multiline={field.type === 'multiline'}
            numberOfLines={field.type === 'multiline' ? 3 : 1}
            style={field.type === 'multiline' ? { minHeight: 70, textAlignVertical: 'top' } : undefined}
          />
        </View>
      )}
    </View>
  );
});

/* ───── Main Screen ───── */

export default function EditProfileScreen() {
  const router = useRouter();
  const { userName, setRole } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uhid, setUhid] = useState('');

  const [formData, setFormData] = useState<Record<string, string>>({
    fullName: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    insuranceProvider: '',
    insurancePolicyNumber: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
  });

  // Load profile from API on mount
  useEffect(() => {
    patientService.getProfile()
      .then((profile) => {
        setUhid(`NLM-${profile.id.split('-')[0].toUpperCase()}`);
        setFormData({
          fullName: profile.fullName ?? '',
          dob: profile.dateOfBirth ?? '',
          gender: profile.gender ?? '',
          bloodGroup: profile.bloodGroup ?? '',
          email: profile.email ?? '',
          address: profile.address ?? '',
          city: profile.city ?? '',
          state: profile.state ?? '',
          pincode: profile.pincode ?? '',
          insuranceProvider: profile.insuranceProvider ?? '',
          insurancePolicyNumber: profile.insurancePolicyNumber ?? '',
          emergencyName: profile.emergencyContactName ?? '',
          emergencyPhone: profile.emergencyContactPhone ?? '',
          emergencyRelation: profile.emergencyContactRelation ?? '',
        });
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        CustomAlert.alert('Error', 'Failed to load your profile. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  const updateField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleSelectPress = useCallback((field: FormField) => {
    if (field.options) {
      CustomAlert.alert(`Select ${field.label}`, '', [
        { text: 'Cancel', style: 'cancel' },
        ...field.options.map((opt) => ({
          text: opt,
          onPress: () => updateField(field.key, opt),
        })),
      ]);
    }
  }, [updateField]);

  const handleSave = useCallback(async () => {
    if (!formData.fullName.trim()) {
      CustomAlert.alert('Required', 'Full name is required.');
      return;
    }
    if (formData.email && !formData.email.includes('@')) {
      CustomAlert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setSaving(true);
    try {
      await patientService.updateProfile({
        fullName: formData.fullName.trim() || undefined,
        email: formData.email.trim() || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        dateOfBirth: formData.dob || undefined,
        gender: formData.gender || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        pincode: formData.pincode.trim() || undefined,
        insuranceProvider: formData.insuranceProvider.trim() || undefined,
        insurancePolicyNumber: formData.insurancePolicyNumber.trim() || undefined,
        emergencyContactName: formData.emergencyName.trim() || undefined,
        emergencyContactPhone: formData.emergencyPhone.trim() || undefined,
        emergencyContactRelation: formData.emergencyRelation.trim() || undefined,
      });

      setHasChanges(false);
      CustomAlert.alert(
        'Profile Updated',
        'Your profile has been updated successfully.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to save profile.';
      CustomAlert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [formData, router]);

  const handleDiscard = useCallback(() => {
    if (!hasChanges) {
      router.back();
      return;
    }
    CustomAlert.alert(
      'Discard Changes?',
      'You have unsaved changes. Are you sure you want to go back?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ],
    );
  }, [hasChanges, router]);

  const pickImage = useCallback(async (useCamera: boolean) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      CustomAlert.alert('Permission Required', `Please allow ${useCamera ? 'camera' : 'photo library'} access in your device settings.`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0].uri);
      setHasChanges(true);
    }
  }, []);

  const handlePhotoUpdate = useCallback(() => {
    const buttons: any[] = [
      { text: 'Cancel', style: 'cancel' as const },
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Gallery', onPress: () => pickImage(false) },
    ];
    if (profileImage) {
      buttons.push({ text: 'Remove Photo', style: 'destructive' as const, onPress: () => { setProfileImage(null); setHasChanges(true); } });
    }
    CustomAlert.alert('Update Profile Photo', 'Choose a source:', buttons);
  }, [pickImage, profileImage]);

  const initials = useMemo(() => {
    const name = formData.fullName || userName || 'P';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name[0] ?? 'P').toUpperCase();
  }, [formData.fullName, userName]);

  const completionPercent = useMemo(() => {
    const filled = Object.values(formData).filter((v) => v.trim().length > 0).length;
    return Math.round((filled / Object.keys(formData).length) * 100);
  }, [formData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-slate-400 text-sm mt-3">Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-2 bg-white border-b border-slate-100">
        <Pressable onPress={handleDiscard} className="w-10 h-10 items-center justify-center rounded-full">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-midnight text-center tracking-tight">
          Edit Profile
        </Text>
        <Pressable
          onPress={handleSave}
          disabled={!hasChanges || saving}
          className={`px-4 py-2 rounded-full ${hasChanges && !saving ? 'bg-primary' : 'bg-slate-200'}`}
        >
          {saving
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <Text className={`text-xs font-bold ${hasChanges ? 'text-white' : 'text-slate-400'}`}>Save</Text>
          }
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View className="items-center pt-6 pb-4">
            <Pressable onPress={handlePhotoUpdate} className="relative">
              <View
                className="rounded-full bg-primary/10 items-center justify-center border-[3px] border-primary/20 overflow-hidden"
                style={{ width: 96, height: 96 }}
              >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={{ width: 96, height: 96 }} />
                ) : (
                  <Text className="text-primary text-3xl font-extrabold">{initials}</Text>
                )}
              </View>
              <View
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary items-center justify-center border-[3px] border-white"
                style={Shadows.focus}
              >
                <Camera size={14} color="#FFFFFF" />
              </View>
            </Pressable>
            <Text className="text-midnight font-bold text-lg mt-3">{formData.fullName || 'Patient'}</Text>
            {uhid ? <Text className="text-slate-400 text-xs mt-0.5">UHID: {uhid}</Text> : null}
          </View>

          {/* Completion Bar */}
          <View className="mx-6 mb-5 bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-slate-400">Profile Completion</Text>
              <Text className={`text-xs font-bold ${completionPercent === 100 ? 'text-emerald-600' : 'text-primary'}`}>
                {completionPercent}%
              </Text>
            </View>
            <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${completionPercent}%`,
                  backgroundColor: completionPercent === 100 ? '#059669' : Colors.primary,
                }}
              />
            </View>
            {completionPercent < 100 && (
              <Text className="text-[10px] text-slate-400 mt-1.5">
                Complete your profile for a better healthcare experience
              </Text>
            )}
            {completionPercent === 100 && (
              <View className="flex-row items-center gap-1 mt-1.5">
                <CheckCircle2 size={10} color="#059669" />
                <Text className="text-[10px] text-emerald-600 font-medium">Profile is complete!</Text>
              </View>
            )}
          </View>

          {/* Form Sections */}
          {SECTIONS.map((section) => {
            const fields = FORM_FIELDS.filter((f) => f.section === section.key);
            return (
              <View key={section.key} className="mb-2">
                <Text className="px-7 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  {section.title}
                </Text>
                <View className="px-6">
                  {fields.map((field) => (
                    <FormInput
                      key={field.key}
                      field={field}
                      value={formData[field.key] || ''}
                      onChange={(val) => updateField(field.key, val)}
                      onSelectPress={handleSelectPress}
                    />
                  ))}
                </View>
              </View>
            );
          })}

          {/* Delete Account */}
          <View className="px-6 mt-4">
            <Pressable
              onPress={() =>
                CustomAlert.alert(
                  'Delete Account',
                  'This action is permanent and cannot be undone.\n\nAll your data including medical records, appointments, prescriptions, and order history will be permanently deleted.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete My Account',
                      style: 'destructive',
                      onPress: () =>
                        CustomAlert.alert(
                          'Final Confirmation',
                          'Your account will be scheduled for deletion in 30 days. You can cancel by logging in within this period.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Confirm Delete', style: 'destructive', onPress: () => router.replace('/') },
                          ],
                        ),
                    },
                  ],
                )
              }
              className="flex-row items-center justify-center py-3.5 rounded-2xl border border-rose-200 active:bg-rose-50"
            >
              <Text className="text-rose-500 text-xs font-bold">Delete My Account</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Save Button */}
      {hasChanges && (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100" style={Shadows.presence}>
          <SafeAreaView edges={['bottom']}>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="w-full bg-primary py-4 rounded-full items-center flex-row justify-center gap-2"
              style={Shadows.focus}
            >
              {saving
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <>
                    <CheckCircle2 size={16} color="#FFFFFF" />
                    <Text className="text-white font-bold text-base">Save Changes</Text>
                  </>
              }
            </Pressable>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}
