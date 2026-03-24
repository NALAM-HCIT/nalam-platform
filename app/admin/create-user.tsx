import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  ArrowLeft, UserPlus, BadgeCheck, Check, AlertCircle, User, Mail,
  Phone, Shield, Building2, ChevronDown, Stethoscope, Clock, DollarSign,
  Globe, FileText,
} from 'lucide-react-native';
import { api } from '@/services/api';

/* ───── Constants ───── */

const ROLES = [
  { name: 'Admin', description: 'Full system access', color: '#DC2626' },
  { name: 'Doctor', description: 'Clinical charts & prescriptions', color: '#1D4ED8' },
  { name: 'Pharmacist', description: 'Inventory & dispensing', color: '#7E22CE' },
  { name: 'Receptionist', description: 'Appointments & billing', color: '#C2410C' },
];

const DEPARTMENTS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'General Medicine', 'Pediatrics',
  'Pharmacy', 'Front Desk', 'General Ward', 'ICU', 'IT', 'Emergency',
];

const SPECIALTIES = [
  'Cardiology', 'Neurology', 'Orthopedics', 'General Medicine', 'Pediatrics',
  'Dermatology', 'ENT', 'Ophthalmology', 'Gynecology', 'Urology',
  'Psychiatry', 'Pulmonology', 'Gastroenterology', 'Nephrology', 'Oncology',
];

interface FormField {
  key: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  placeholder: string;
  type: 'text' | 'email' | 'phone' | 'select';
  options?: string[];
  keyboard?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'characters';
}

const FORM_FIELDS: FormField[] = [
  { key: 'name', label: 'Full Name', icon: User, iconColor: Colors.primary, placeholder: 'e.g. Dr. Sarah Connor', type: 'text', autoCapitalize: 'words' },
  { key: 'employeeId', label: 'Employee ID', icon: Shield, iconColor: '#64748B', placeholder: 'APH-2024-001', type: 'text', autoCapitalize: 'characters' },
  { key: 'email', label: 'Email Address', icon: Mail, iconColor: '#0EA5E9', placeholder: 'sarah.c@arunpriya.com', type: 'email', keyboard: 'email-address', autoCapitalize: 'none' },
  { key: 'phone', label: 'Phone Number', icon: Phone, iconColor: '#059669', placeholder: '+91 98765 43210', type: 'phone', keyboard: 'phone-pad' },
  { key: 'department', label: 'Department', icon: Building2, iconColor: '#8B5CF6', placeholder: 'Select department', type: 'select', options: DEPARTMENTS },
];

/* ───── Sub-components ───── */

const FormInput = React.memo(function FormInput({ field, value, error, onChange, onSelectPress }: {
  field: FormField; value: string; error?: string; onChange: (val: string) => void; onSelectPress: (field: FormField) => void;
}) {
  const Icon = field.icon;
  const isSelect = field.type === 'select';
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">{field.label}</Text>
      {isSelect ? (
        <Pressable
          onPress={() => onSelectPress(field)}
          className={`flex-row items-center bg-white rounded-2xl px-4 py-3.5 border ${error ? 'border-red-300' : 'border-slate-100'} active:border-primary/30`}
          style={Shadows.card}
        >
          <View className="w-9 h-9 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: field.iconColor + '12' }}>
            <Icon size={16} color={field.iconColor} />
          </View>
          <Text className={`flex-1 text-sm ${value ? 'text-midnight font-medium' : 'text-slate-400'}`}>{value || field.placeholder}</Text>
          <ChevronDown size={16} color="#94A3B8" />
        </Pressable>
      ) : (
        <View className={`flex-row items-center bg-white rounded-2xl px-4 py-1 border ${error ? 'border-red-300' : 'border-slate-100'}`} style={Shadows.card}>
          <View className="w-9 h-9 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: field.iconColor + '12' }}>
            <Icon size={16} color={field.iconColor} />
          </View>
          <TextInput
            className="flex-1 text-sm text-midnight py-3"
            placeholder={field.placeholder}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={onChange}
            keyboardType={field.keyboard || 'default'}
            autoCapitalize={field.autoCapitalize || 'words'}
          />
        </View>
      )}
      {error ? (
        <View className="flex-row items-center gap-1 mt-1.5 ml-2">
          <AlertCircle size={11} color="#EF4444" />
          <Text className="text-red-500 text-[11px]">{error}</Text>
        </View>
      ) : null}
    </View>
  );
});

const RoleCard = React.memo(function RoleCard({ name, description, color, isSelected, onToggle }: {
  name: string; description: string; color: string; isSelected: boolean; onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className={`flex-row items-center gap-3 p-4 rounded-2xl mb-2 active:opacity-80 ${isSelected ? 'border border-primary/20' : 'bg-white/60'}`}
      style={isSelected ? { backgroundColor: Colors.primary + '08' } : undefined}
    >
      <View
        className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-slate-200 bg-white'}`}
      >
        {isSelected && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
      </View>
      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <View className="flex-1">
        <Text className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-midnight'}`}>{name}</Text>
        <Text className="text-[11px] text-slate-400 mt-0.5">{description}</Text>
      </View>
      {isSelected && (
        <View className="px-2.5 py-1 rounded-full bg-primary/10">
          <Text className="text-primary text-[9px] font-bold">ASSIGNED</Text>
        </View>
      )}
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function CreateUserScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>({
    name: '', employeeId: '', email: '', phone: '', department: '',
    specialty: '', experienceYears: '', consultationFee: '', languages: '', bio: '',
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  }, [errors]);

  const isDoctorRole = selectedRoles.includes('Doctor');

  const DOCTOR_FIELDS: FormField[] = useMemo(() => [
    { key: 'specialty', label: 'Specialty', icon: Stethoscope, iconColor: '#1D4ED8', placeholder: 'Select specialty', type: 'select' as const, options: SPECIALTIES },
    { key: 'experienceYears', label: 'Experience (Years)', icon: Clock, iconColor: '#059669', placeholder: 'e.g. 10', type: 'text' as const, keyboard: 'phone-pad' as const },
    { key: 'consultationFee', label: 'Consultation Fee (INR)', icon: DollarSign, iconColor: '#D97706', placeholder: 'e.g. 500', type: 'text' as const, keyboard: 'phone-pad' as const },
    { key: 'languages', label: 'Languages', icon: Globe, iconColor: '#8B5CF6', placeholder: 'e.g. English, Tamil', type: 'text' as const },
    { key: 'bio', label: 'Bio (Optional)', icon: FileText, iconColor: '#64748B', placeholder: 'Short professional bio', type: 'text' as const },
  ], []);

  const toggleRole = useCallback((roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName]
    );
    if (errors.roles) setErrors((prev) => ({ ...prev, roles: '' }));
  }, [errors]);

  const handleSelectPress = useCallback((field: FormField) => {
    if (field.options) {
      Alert.alert(`Select ${field.label}`, '', [
        { text: 'Cancel', style: 'cancel' },
        ...field.options.map((opt) => ({ text: opt, onPress: () => updateField(field.key, opt) })),
      ]);
    }
  }, [updateField]);

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Full name is required';
    if (!formData.employeeId.trim()) e.employeeId = 'Employee ID is required';
    if (!formData.email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      e.email = 'Enter a valid email address';
    }
    if (!formData.phone.trim()) {
      e.phone = 'Phone number is required';
    } else if (formData.phone.replace(/[^0-9]/g, '').length < 10) {
      e.phone = 'Enter a valid phone number';
    }
    if (!formData.department) e.department = 'Department is required';
    if (selectedRoles.length === 0) e.roles = 'Select at least one role';
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [formData, selectedRoles]);

  const handleCreate = useCallback(async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the highlighted fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Create a user for each selected role (API expects one role per user)
      const primaryRole = selectedRoles[0].toLowerCase();
      const payload: Record<string, any> = {
        fullName: formData.name.trim(),
        mobileNumber: formData.phone.replace(/[^0-9]/g, ''),
        email: formData.email.trim(),
        role: primaryRole,
        department: formData.department,
        employeeId: formData.employeeId.trim(),
      };

      // Include doctor-specific fields when creating a doctor
      if (primaryRole === 'doctor') {
        if (formData.specialty) payload.specialty = formData.specialty;
        if (formData.experienceYears) payload.experienceYears = parseInt(formData.experienceYears, 10) || 0;
        if (formData.consultationFee) payload.consultationFee = parseFloat(formData.consultationFee) || 500;
        if (formData.languages) payload.languages = formData.languages.trim();
        if (formData.bio) payload.bio = formData.bio.trim();
      }

      const response = await api.post('/admin/users', payload);

      const doctorNote = primaryRole === 'doctor'
        ? '\n\nDoctor profile & default schedule (Mon-Sat) have been auto-created.'
        : '';

      Alert.alert(
        'User Created',
        `${formData.name} has been registered as ${selectedRoles.join(', ')}.\n\nEmployee ID: ${formData.employeeId}\nDepartment: ${formData.department}\n\nThe user can now login with their phone number.${doctorNote}`,
        [
          {
            text: 'Create Another',
            onPress: () => {
              setFormData({ name: '', employeeId: '', email: '', phone: '', department: '', specialty: '', experienceYears: '', consultationFee: '', languages: '', bio: '' });
              setSelectedRoles([]);
              setErrors({});
            },
          },
          { text: 'Done', onPress: () => router.back() },
        ]
      );
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Failed to create user.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, formData, selectedRoles, router]);

  const hasData = useMemo(() =>
    Object.values(formData).some((v) => v.trim().length > 0) || selectedRoles.length > 0,
    [formData, selectedRoles]
  );

  const handleDiscard = useCallback(() => {
    if (hasData) {
      Alert.alert('Discard Changes', 'You have unsaved changes. Discard them?', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }, [hasData, router]);

  const completionPercent = useMemo(() => {
    const baseFields = FORM_FIELDS.length + 1; // +1 for roles
    // Count doctor-required fields (specialty, fee) if doctor role selected
    const doctorRequired = isDoctorRole ? 2 : 0;
    const total = baseFields + doctorRequired;
    let filled = FORM_FIELDS.filter((f) => formData[f.key]?.trim().length > 0).length;
    if (selectedRoles.length > 0) filled++;
    if (isDoctorRole) {
      if (formData.specialty?.trim()) filled++;
      if (formData.consultationFee?.trim()) filled++;
    }
    return Math.round((filled / total) * 100);
  }, [formData, selectedRoles, isDoctorRole]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View className="flex-row items-center px-4 pt-2 pb-2 bg-white border-b border-slate-100">
          <Pressable onPress={handleDiscard} className="w-10 h-10 items-center justify-center rounded-full">
            <ArrowLeft size={22} color="#0B1B3D" />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-midnight text-center tracking-tight">Create New User</Text>
          <View className="w-10 h-10 items-center justify-center">
            <UserPlus size={20} color={Colors.primary} />
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Completion Bar */}
          <View className="mx-6 mt-4 mb-5 bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-slate-400">Form Completion</Text>
              <Text className={`text-xs font-bold ${completionPercent === 100 ? 'text-emerald-600' : 'text-primary'}`}>{completionPercent}%</Text>
            </View>
            <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <View className="h-full rounded-full" style={{ width: `${completionPercent}%`, backgroundColor: completionPercent === 100 ? '#059669' : Colors.primary }} />
            </View>
          </View>

          {/* Account Details */}
          <View className="px-6 mb-2">
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-8 h-8 rounded-xl bg-primary/10 items-center justify-center">
                <User size={14} color={Colors.primary} />
              </View>
              <Text className="text-base font-bold text-midnight">Account Details</Text>
            </View>
            {FORM_FIELDS.map((field) => (
              <FormInput
                key={field.key}
                field={field}
                value={formData[field.key] || ''}
                error={errors[field.key]}
                onChange={(val) => updateField(field.key, val)}
                onSelectPress={handleSelectPress}
              />
            ))}
          </View>

          {/* Doctor-Specific Fields (shown when Doctor role is selected) */}
          {isDoctorRole && (
            <View className="px-6 mt-2 mb-2">
              <View className="flex-row items-center gap-2 mb-4">
                <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center">
                  <Stethoscope size={14} color="#1D4ED8" />
                </View>
                <Text className="text-base font-bold text-midnight">Doctor Profile</Text>
              </View>
              <Text className="text-slate-400 text-xs mb-3 ml-1">A doctor profile & default schedule will be auto-created</Text>
              {DOCTOR_FIELDS.map((field) => (
                <FormInput
                  key={field.key}
                  field={field}
                  value={formData[field.key] || ''}
                  error={errors[field.key]}
                  onChange={(val) => updateField(field.key, val)}
                  onSelectPress={handleSelectPress}
                />
              ))}
            </View>
          )}

          {/* Role Selection */}
          <View className="px-6 mt-2">
            <View className="flex-row items-center gap-2 mb-2">
              <View className="w-8 h-8 rounded-xl bg-primary/10 items-center justify-center">
                <BadgeCheck size={14} color={Colors.primary} />
              </View>
              <Text className="text-base font-bold text-midnight">Assign Role(s)</Text>
            </View>
            {errors.roles ? (
              <View className="flex-row items-center gap-1 mb-3 ml-1">
                <AlertCircle size={11} color="#EF4444" />
                <Text className="text-red-500 text-[11px]">{errors.roles}</Text>
              </View>
            ) : (
              <Text className="text-slate-400 text-xs mb-3 ml-1">You can assign multiple roles</Text>
            )}
            {ROLES.map((role) => (
              <RoleCard
                key={role.name}
                name={role.name}
                description={role.description}
                color={role.color}
                isSelected={selectedRoles.includes(role.name)}
                onToggle={() => toggleRole(role.name)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100" style={Shadows.presence}>
          <SafeAreaView edges={['bottom']}>
            <View className="flex-row gap-3">
              <Pressable onPress={handleDiscard} className="flex-1 py-4 rounded-full items-center border border-slate-200 active:opacity-80">
                <Text className="font-semibold text-sm text-slate-500">Discard</Text>
              </Pressable>
              <Pressable
                onPress={handleCreate}
                disabled={isSubmitting}
                className={`flex-[2] py-4 rounded-full flex-row items-center justify-center gap-2 ${isSubmitting ? 'bg-primary/70' : 'bg-primary active:opacity-90'}`}
                style={Shadows.focus}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <UserPlus size={16} color="#FFFFFF" />
                    <Text className="text-white font-bold text-base">Create User</Text>
                  </>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
