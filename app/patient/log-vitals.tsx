import React, { useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Heart, Thermometer, Wind, Weight, Droplets, Activity, Check } from 'lucide-react-native';
import { Shadows } from '@/constants/theme';
import { logVitals, LogVitalsRequest } from '@/services/patientDashboardService';
import { CustomAlert } from '@/components/CustomAlert';

// ─── Field config ──────────────────────────────────────────────────────────
interface VitalField {
  key: keyof LogVitalsRequest;
  label: string;
  unit: string;
  placeholder: string;
  icon: any;
  color: string;
  hint: string;
  decimal?: boolean;
}

const VITAL_FIELDS: VitalField[] = [
  {
    key: 'bp_systolic',
    label: 'Systolic BP',
    unit: 'mmHg',
    placeholder: '120',
    icon: Activity,
    color: '#EF4444',
    hint: 'Top number (normal: 90–120)',
  },
  {
    key: 'bp_diastolic',
    label: 'Diastolic BP',
    unit: 'mmHg',
    placeholder: '80',
    icon: Activity,
    color: '#F87171',
    hint: 'Bottom number (normal: 60–80)',
  },
  {
    key: 'heart_rate',
    label: 'Heart Rate',
    unit: 'BPM',
    placeholder: '72',
    icon: Heart,
    color: '#1A73E8',
    hint: 'Resting pulse (normal: 60–100)',
  },
  {
    key: 'temperature_c',
    label: 'Temperature',
    unit: '°C',
    placeholder: '36.8',
    icon: Thermometer,
    color: '#F59E0B',
    hint: 'Body temp (normal: 36.1–37.2°C)',
    decimal: true,
  },
  {
    key: 'spo2',
    label: 'SpO₂',
    unit: '%',
    placeholder: '98',
    icon: Wind,
    color: '#38BDF8',
    hint: 'Oxygen saturation (normal: 95–100%)',
  },
  {
    key: 'respiratory_rate',
    label: 'Respiratory Rate',
    unit: 'breaths/min',
    placeholder: '16',
    icon: Wind,
    color: '#8B5CF6',
    hint: 'Breaths per minute (normal: 12–20)',
  },
  {
    key: 'weight_kg',
    label: 'Weight',
    unit: 'kg',
    placeholder: '70.0',
    icon: Weight,
    color: '#22C55E',
    hint: 'Body weight in kilograms',
    decimal: true,
  },
  {
    key: 'blood_glucose',
    label: 'Blood Glucose',
    unit: 'mg/dL',
    placeholder: '100',
    icon: Droplets,
    color: '#059669',
    hint: 'Fasting: 70–100 mg/dL, Post-meal: <140',
    decimal: true,
  },
];

export default function LogVitalsScreen() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const setValue = (key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const hasAnyValue = Object.values(values).some(v => v.trim() !== '');

  const handleSave = async () => {
    if (!hasAnyValue) {
      CustomAlert.alert('No Data', 'Please enter at least one vital reading before saving.');
      return;
    }

    const payload: LogVitalsRequest = {};

    for (const field of VITAL_FIELDS) {
      const raw = values[field.key]?.trim();
      if (!raw) continue;
      const num = parseFloat(raw);
      if (isNaN(num)) {
        CustomAlert.alert('Invalid Input', `Please enter a valid number for ${field.label}.`);
        return;
      }
      (payload as any)[field.key] = field.decimal ? num : Math.round(num);
    }

    setLoading(true);
    try {
      await logVitals(payload);
      CustomAlert.alert(
        'Vitals Saved',
        'Your readings have been recorded and will appear in your 30-day trend.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      CustomAlert.alert('Error', 'Could not save your vitals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center px-5 pt-3 pb-4 border-b border-slate-100">
          <Pressable
            onPress={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3 active:opacity-70"
          >
            <ArrowLeft size={18} color="#475569" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-extrabold text-midnight">Log Vitals</Text>
            <Text className="text-xs text-slate-400">Enter any readings you have available</Text>
          </View>
          {hasAnyValue && (
            <Pressable
              onPress={handleSave}
              disabled={loading}
              className="flex-row items-center gap-1.5 px-4 py-2 rounded-full active:opacity-70"
              style={{ backgroundColor: '#1A73E8' }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Check size={14} color="#FFF" />
                  <Text className="text-white font-bold text-sm">Save</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-xs text-slate-400 mb-4 leading-4">
            All fields are optional. Log only what you have measured. Your readings are private and
            visible only to you and your care team.
          </Text>

          {/* Group BP together */}
          <View className="bg-white rounded-2xl p-4 mb-3" style={Shadows.card}>
            <View className="flex-row items-center gap-2 mb-3">
              <View className="w-8 h-8 rounded-lg items-center justify-center" style={{ backgroundColor: '#FEF2F2' }}>
                <Activity size={16} color="#EF4444" />
              </View>
              <Text className="font-bold text-midnight">Blood Pressure</Text>
            </View>
            <Text className="text-[10px] text-slate-400 mb-3">Normal range: Systolic 90–120 / Diastolic 60–80 mmHg</Text>
            <View className="flex-row gap-3">
              {(['bp_systolic', 'bp_diastolic'] as const).map(key => {
                const field = VITAL_FIELDS.find(f => f.key === key)!;
                return (
                  <View key={key} className="flex-1">
                    <Text className="text-xs font-semibold text-slate-500 mb-1">{field.label}</Text>
                    <View className="flex-row items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                      <TextInput
                        value={values[key] ?? ''}
                        onChangeText={v => setValue(key, v)}
                        placeholder={field.placeholder}
                        placeholderTextColor="#CBD5E1"
                        keyboardType="numeric"
                        className="flex-1 text-base font-bold text-midnight"
                      />
                      <Text className="text-xs text-slate-400 ml-1">mmHg</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Remaining vitals — individual cards */}
          {VITAL_FIELDS.filter(f => f.key !== 'bp_systolic' && f.key !== 'bp_diastolic').map(field => {
            const Icon = field.icon;
            return (
              <View key={field.key} className="bg-white rounded-2xl p-4 mb-3" style={Shadows.card}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2 flex-1">
                    <View
                      className="w-8 h-8 rounded-lg items-center justify-center"
                      style={{ backgroundColor: `${field.color}15` }}
                    >
                      <Icon size={16} color={field.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-midnight text-sm">{field.label}</Text>
                      <Text className="text-[10px] text-slate-400">{field.hint}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center bg-slate-50 rounded-xl px-3 py-2 border border-slate-100 ml-3" style={{ minWidth: 100 }}>
                    <TextInput
                      value={values[field.key] ?? ''}
                      onChangeText={v => setValue(field.key, v)}
                      placeholder={field.placeholder}
                      placeholderTextColor="#CBD5E1"
                      keyboardType="decimal-pad"
                      className="text-base font-bold text-midnight text-right"
                      style={{ minWidth: 56 }}
                    />
                    <Text className="text-xs text-slate-400 ml-1">{field.unit}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Save button at bottom */}
          <Pressable
            onPress={handleSave}
            disabled={loading || !hasAnyValue}
            className="rounded-2xl py-4 items-center mt-2 active:opacity-80"
            style={{ backgroundColor: hasAnyValue ? '#1A73E8' : '#E2E8F0' }}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text
                className="font-bold text-base"
                style={{ color: hasAnyValue ? '#FFF' : '#94A3B8' }}
              >
                Save Vitals
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
