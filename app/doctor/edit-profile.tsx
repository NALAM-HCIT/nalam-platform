import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  ArrowLeft, User, Mail, Phone, Briefcase, Award,
  CheckCircle2, ChevronDown, Shield, Clock, Stethoscope,
} from 'lucide-react-native';
import { doctorPortalService, UpdateDoctorProfilePayload } from '@/services/doctorPortalService';

/* ───── Data ───── */

const DEPARTMENTS = ['Cardiology', 'Neurology', 'Orthopedics', 'Dermatology', 'Pediatrics', 'General Medicine', 'ENT', 'Ophthalmology', 'Psychiatry', 'Radiology'];

interface FormField {
  key: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  placeholder: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'multiline';
  options?: string[];
  section: 'personal' | 'professional' | 'contact';
}

const FORM_FIELDS: FormField[] = [
  { key: 'fullName', label: 'Full Name', icon: User, iconColor: Colors.primary, placeholder: 'Dr. Full Name', type: 'text', section: 'personal' },
  { key: 'email', label: 'Email Address', icon: Mail, iconColor: '#0EA5E9', placeholder: 'doctor@hospital.com', type: 'email', section: 'contact' },
  { key: 'phone', label: 'Phone Number (read-only)', icon: Phone, iconColor: '#059669', placeholder: '+91 00000 00000', type: 'phone', section: 'contact' },
  { key: 'department', label: 'Department', icon: Briefcase, iconColor: '#8B5CF6', placeholder: 'Select department', type: 'select', options: DEPARTMENTS, section: 'professional' },
  { key: 'specialty', label: 'Specialization', icon: Stethoscope, iconColor: Colors.primary, placeholder: 'e.g., Interventional Cardiology', type: 'text', section: 'professional' },
  { key: 'qualification', label: 'Qualification', icon: Award, iconColor: '#F59E0B', placeholder: 'e.g., MD, DM (Cardio)', type: 'text', section: 'professional' },
  { key: 'mciRegistration', label: 'MCI Registration No.', icon: Shield, iconColor: '#059669', placeholder: 'e.g., MCI-45892', type: 'text', section: 'professional' },
  { key: 'experienceYears', label: 'Years of Experience', icon: Clock, iconColor: '#EA580C', placeholder: 'e.g., 12', type: 'text', section: 'professional' },
  { key: 'bio', label: 'Professional Bio', icon: User, iconColor: '#64748B', placeholder: 'Brief professional summary...', type: 'multiline', section: 'professional' },
];

const SECTIONS = [
  { key: 'personal', title: 'Personal Information' },
  { key: 'professional', title: 'Professional Details' },
  { key: 'contact', title: 'Contact Details' },
];

/* ───── Sub-components ───── */

const FormInput = React.memo(function FormInput({
  field,
  value,
  onChange,
  onSelectPress,
  readOnly,
}: {
  field: FormField;
  value: string;
  onChange: (val: string) => void;
  onSelectPress: (field: FormField) => void;
  readOnly?: boolean;
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
          onPress={() => !readOnly && onSelectPress(field)}
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
          className={`flex-row items-start bg-white rounded-2xl px-4 py-1 border border-slate-100 ${readOnly ? 'opacity-60' : ''}`}
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
            editable={!readOnly}
            keyboardType={field.type === 'email' ? 'email-address' : field.type === 'phone' ? 'phone-pad' : 'numeric' === field.key ? 'numeric' : 'default'}
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

export default function DoctorEditProfileScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({
    fullName: '',
    email: '',
    phone: '',
    department: '',
    specialty: '',
    qualification: '',
    mciRegistration: '',
    experienceYears: '',
    bio: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Load profile on mount
  useEffect(() => {
    doctorPortalService.getMyProfile()
      .then((data) => {
        const dp = data.doctorProfile;
        setFormData({
          fullName: data.user.name ?? '',
          email: data.user.email ?? '',
          phone: data.user.phone ?? '',
          department: data.user.department ?? '',
          specialty: dp?.specialty ?? '',
          qualification: dp?.qualification ?? '',
          mciRegistration: dp?.mciRegistration ?? '',
          experienceYears: dp?.experienceYears != null ? String(dp.experienceYears) : '',
          bio: dp?.bio ?? '',
        });
        setEmployeeId(data.user.employeeId);
      })
      .catch(() => {
        CustomAlert.alert('Error', 'Failed to load profile. Please try again.');
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
      const payload: UpdateDoctorProfilePayload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim() || undefined,
        department: formData.department.trim() || undefined,
        specialty: formData.specialty.trim() || undefined,
        experienceYears: formData.experienceYears ? parseInt(formData.experienceYears, 10) : undefined,
        bio: formData.bio.trim() || undefined,
        qualification: formData.qualification.trim() || undefined,
        mciRegistration: formData.mciRegistration.trim() || undefined,
      };
      await doctorPortalService.updateMyProfile(payload);
      CustomAlert.alert('Profile Updated', 'Your profile has been updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      CustomAlert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [formData, router]);

  const handleDiscard = useCallback(() => {
    if (!hasChanges) { router.back(); return; }
    CustomAlert.alert('Discard Changes?', 'You have unsaved changes. Are you sure you want to go back?', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [hasChanges, router]);

  const initials = useMemo(() => {
    const name = (formData.fullName || 'D').replace(/^Dr\.?\s*/i, '');
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name[0]?.toUpperCase() ?? 'D';
  }, [formData.fullName]);

  const completionPercent = useMemo(() => {
    const keys = ['fullName', 'email', 'department', 'specialty', 'qualification', 'mciRegistration', 'experienceYears', 'bio'];
    const filled = keys.filter((k) => formData[k]?.trim().length > 0).length;
    return Math.round((filled / keys.length) * 100);
  }, [formData]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center">
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-slate-400 text-sm mt-3">Loading profile…</Text>
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
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text className={`text-xs font-bold ${hasChanges ? 'text-white' : 'text-slate-400'}`}>Save</Text>
          }
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Section */}
          <View className="items-center pt-6 pb-4">
            <View
              className="rounded-full bg-primary/10 items-center justify-center border-[3px] border-primary/20"
              style={{ width: 96, height: 96 }}
            >
              <Text className="text-primary text-3xl font-extrabold">{initials}</Text>
            </View>
            <Text className="text-midnight font-bold text-lg mt-3">{formData.fullName || 'Doctor'}</Text>
            {employeeId && (
              <Text className="text-slate-400 text-xs mt-0.5">EMP: {employeeId}</Text>
            )}
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
                style={{ width: `${completionPercent}%`, backgroundColor: completionPercent === 100 ? '#059669' : Colors.primary }}
              />
            </View>
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
            if (fields.length === 0) return null;
            return (
              <View key={section.key} className="px-6 mb-2">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  {section.title}
                </Text>
                {fields.map((field) => (
                  <FormInput
                    key={field.key}
                    field={field}
                    value={formData[field.key] || ''}
                    onChange={(val) => updateField(field.key, val)}
                    onSelectPress={handleSelectPress}
                    readOnly={field.key === 'phone'}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Save Button */}
      {hasChanges && (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100" style={Shadows.presence}>
          <SafeAreaView edges={['bottom']}>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="w-full py-4 rounded-full items-center bg-primary"
              style={Shadows.focus}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text className="font-bold text-base text-white">Save Changes</Text>
              }
            </Pressable>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}
