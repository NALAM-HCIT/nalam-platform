import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows, Colors } from '@/constants/theme';
import {
  ArrowLeft, Camera, User, Mail, Phone, Shield, Settings,
  CheckCircle2, ChevronDown,
} from 'lucide-react-native';

/* ───── Data ───── */

const DEPARTMENTS = ['IT Administration', 'Hospital Management', 'Finance & Billing', 'Human Resources', 'Operations'];

interface FormField {
  key: string;
  label: string;
  icon: React.ElementType;
  iconColor: string;
  placeholder: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'multiline';
  options?: string[];
  section: 'personal' | 'work' | 'contact';
}

const FORM_FIELDS: FormField[] = [
  { key: 'fullName', label: 'Full Name', icon: User, iconColor: Colors.primary, placeholder: 'Enter your full name', type: 'text', section: 'personal' },
  { key: 'email', label: 'Email Address', icon: Mail, iconColor: '#0EA5E9', placeholder: 'admin@hospital.com', type: 'email', section: 'contact' },
  { key: 'phone', label: 'Phone Number', icon: Phone, iconColor: '#059669', placeholder: '+91 00000 00000', type: 'phone', section: 'contact' },
  { key: 'department', label: 'Department', icon: Settings, iconColor: '#8B5CF6', placeholder: 'Select department', type: 'select', options: DEPARTMENTS, section: 'work' },
  { key: 'designation', label: 'Designation', icon: Shield, iconColor: '#059669', placeholder: 'e.g., System Administrator', type: 'text', section: 'work' },
  { key: 'address', label: 'Address', icon: User, iconColor: '#F97316', placeholder: 'Enter your address', type: 'multiline', section: 'contact' },
  { key: 'emergencyName', label: 'Emergency Contact', icon: User, iconColor: '#E11D48', placeholder: 'Contact name', type: 'text', section: 'contact' },
  { key: 'emergencyPhone', label: 'Emergency Phone', icon: Phone, iconColor: '#E11D48', placeholder: '+91 00000 00000', type: 'phone', section: 'contact' },
];

const SECTIONS = [
  { key: 'personal', title: 'Personal Information' },
  { key: 'work', title: 'Work Details' },
  { key: 'contact', title: 'Contact & Emergency' },
];

/* ───── Sub-components ───── */

const FormInput = React.memo(function FormInput({
  field, value, onChange, onSelectPress,
}: { field: FormField; value: string; onChange: (val: string) => void; onSelectPress: (field: FormField) => void }) {
  const Icon = field.icon;
  const isSelect = field.type === 'select';
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">{field.label}</Text>
      {isSelect ? (
        <Pressable onPress={() => onSelectPress(field)} className="flex-row items-center bg-white rounded-2xl px-4 py-3.5 border border-slate-100 active:border-primary/30" style={Shadows.card}>
          <View className="w-9 h-9 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: field.iconColor + '12' }}>
            <Icon size={16} color={field.iconColor} />
          </View>
          <Text className={`flex-1 text-sm ${value ? 'text-midnight font-medium' : 'text-slate-400'}`}>{value || field.placeholder}</Text>
          <ChevronDown size={16} color="#94A3B8" />
        </Pressable>
      ) : (
        <View className="flex-row items-start bg-white rounded-2xl px-4 py-1 border border-slate-100" style={Shadows.card}>
          <View className="w-9 h-9 rounded-xl items-center justify-center mr-3 mt-2" style={{ backgroundColor: field.iconColor + '12' }}>
            <Icon size={16} color={field.iconColor} />
          </View>
          <TextInput
            className="flex-1 text-sm text-midnight py-3"
            placeholder={field.placeholder}
            placeholderTextColor="#94A3B8"
            value={value}
            onChangeText={onChange}
            keyboardType={field.type === 'email' ? 'email-address' : field.type === 'phone' ? 'phone-pad' : 'default'}
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

export default function AdminEditProfileScreen() {
  const router = useRouter();
  const { userName, phone: storePhone } = useAuthStore();

  const [formData, setFormData] = useState<Record<string, string>>({
    fullName: userName || 'Administrator',
    email: 'admin@arunpriya.com',
    phone: storePhone || '+91 98765 43215',
    department: 'IT Administration',
    designation: 'System Administrator',
    address: 'Anna Nagar, Chennai - 600040',
    emergencyName: '',
    emergencyPhone: '',
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const updateField = useCallback((key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleSelectPress = useCallback((field: FormField) => {
    if (field.options) {
      Alert.alert(`Select ${field.label}`, '', [
        { text: 'Cancel', style: 'cancel' },
        ...field.options.map((opt) => ({ text: opt, onPress: () => updateField(field.key, opt) })),
      ]);
    }
  }, [updateField]);

  const handleSave = useCallback(() => {
    if (!formData.fullName.trim()) { Alert.alert('Required', 'Full name is required.'); return; }
    if (!formData.phone.trim()) { Alert.alert('Required', 'Phone number is required.'); return; }
    if (formData.email && !formData.email.includes('@')) { Alert.alert('Invalid Email', 'Please enter a valid email.'); return; }
    Alert.alert('Save Changes', 'Update your profile?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: () => Alert.alert('Updated', 'Profile updated successfully.', [{ text: 'OK', onPress: () => router.back() }]) },
    ]);
  }, [formData, router]);

  const handleDiscard = useCallback(() => {
    if (!hasChanges) { router.back(); return; }
    Alert.alert('Discard Changes?', 'You have unsaved changes.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [hasChanges, router]);

  const pickImage = useCallback(async (useCamera: boolean) => {
    const perm = useCamera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission Required', 'Please allow access in settings.'); return; }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setProfileImage(result.assets[0].uri); setHasChanges(true); }
  }, []);

  const handlePhotoUpdate = useCallback(() => {
    const buttons: any[] = [
      { text: 'Cancel', style: 'cancel' as const },
      { text: 'Take Photo', onPress: () => pickImage(true) },
      { text: 'Choose from Gallery', onPress: () => pickImage(false) },
    ];
    if (profileImage) buttons.push({ text: 'Remove', style: 'destructive' as const, onPress: () => { setProfileImage(null); setHasChanges(true); } });
    Alert.alert('Update Photo', 'Choose a source:', buttons);
  }, [pickImage, profileImage]);

  const initials = useMemo(() => {
    const parts = (formData.fullName || 'A').split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }, [formData.fullName]);

  const completionPercent = useMemo(() => {
    const filled = Object.values(formData).filter((v) => v.trim().length > 0).length;
    return Math.round((filled / Object.keys(formData).length) * 100);
  }, [formData]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-2 bg-white border-b border-slate-100">
        <Pressable onPress={handleDiscard} className="w-10 h-10 items-center justify-center rounded-full">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-midnight text-center tracking-tight">Edit Profile</Text>
        <Pressable onPress={handleSave} disabled={!hasChanges} className={`px-4 py-2 rounded-full ${hasChanges ? 'bg-primary' : 'bg-slate-200'}`}>
          <Text className={`text-xs font-bold ${hasChanges ? 'text-white' : 'text-slate-400'}`}>Save</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="items-center pt-6 pb-4">
            <Pressable onPress={handlePhotoUpdate} className="relative">
              <View className="rounded-full bg-primary/10 items-center justify-center border-[3px] border-primary/20 overflow-hidden" style={{ width: 96, height: 96 }}>
                {profileImage ? <Image source={{ uri: profileImage }} style={{ width: 96, height: 96 }} /> : <Text className="text-primary text-3xl font-extrabold">{initials}</Text>}
              </View>
              <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary items-center justify-center border-[3px] border-white" style={Shadows.focus}>
                <Camera size={14} color="#FFFFFF" />
              </View>
            </Pressable>
            <Text className="text-midnight font-bold text-lg mt-3">{formData.fullName}</Text>
            <Text className="text-slate-400 text-xs mt-0.5">ID: ADM-001</Text>
          </View>

          <View className="mx-6 mb-5 bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs font-bold text-slate-400">Profile Completion</Text>
              <Text className={`text-xs font-bold ${completionPercent === 100 ? 'text-emerald-600' : 'text-primary'}`}>{completionPercent}%</Text>
            </View>
            <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <View className="h-full rounded-full" style={{ width: `${completionPercent}%`, backgroundColor: completionPercent === 100 ? '#059669' : Colors.primary }} />
            </View>
            {completionPercent === 100 && (
              <View className="flex-row items-center gap-1 mt-1.5">
                <CheckCircle2 size={10} color="#059669" />
                <Text className="text-[10px] text-emerald-600 font-medium">Profile is complete!</Text>
              </View>
            )}
          </View>

          {SECTIONS.map((section) => {
            const fields = FORM_FIELDS.filter((f) => f.section === section.key);
            if (fields.length === 0) return null;
            return (
              <View key={section.key} className="px-6 mb-2">
                <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{section.title}</Text>
                {fields.map((field) => (
                  <FormInput key={field.key} field={field} value={formData[field.key] || ''} onChange={(val) => updateField(field.key, val)} onSelectPress={handleSelectPress} />
                ))}
              </View>
            );
          })}
        </ScrollView>
      </KeyboardAvoidingView>

      {hasChanges && (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100" style={Shadows.presence}>
          <SafeAreaView edges={['bottom']}>
            <Pressable onPress={handleSave} className="w-full py-4 rounded-full items-center bg-primary" style={Shadows.focus}>
              <Text className="font-bold text-base text-white">Save Changes</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}
