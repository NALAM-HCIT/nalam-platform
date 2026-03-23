import React, { useState, useEffect } from 'react';
import {
  View, Text, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  CheckCircle, FileText, Clock,
  CalendarClock, LayoutDashboard,
} from 'lucide-react-native';
import { getAppointmentDetail, DoctorAppointment } from '@/services/doctorService';

export default function ConsultationSuccessScreen() {
  const router = useRouter();
  const { id, sessionDuration } = useLocalSearchParams<{ id: string; sessionDuration: string }>();
  const [appointment, setAppointment] = useState<DoctorAppointment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    (async () => {
      try {
        const data = await getAppointmentDetail(id);
        setAppointment(data);
      } catch {
        // non-critical
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const patientName = appointment?.patientName || 'the patient';

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <View className="flex-1 px-6 justify-center">
        {/* Success State */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-emerald-100 items-center justify-center mb-6">
            <CheckCircle size={48} color="#22C55E" />
          </View>
          <Text className="text-2xl font-bold text-midnight tracking-tight mb-2 text-center">
            Consultation Completed
          </Text>
          <Text className="text-slate-500 text-sm leading-relaxed text-center max-w-[300px]">
            The consultation with {patientName} has been marked as completed.
          </Text>
        </View>

        {/* Summary Card */}
        <View className="bg-white p-6 rounded-3xl border border-slate-100 mb-8" style={Shadows.card}>
          <View className="flex-row items-start gap-4">
            <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
              <FileText size={22} color="#1A73E8" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-base text-midnight mb-1">
                {patientName}
              </Text>
              <Text className="text-slate-500 text-sm mb-2">
                {appointment?.bookingReference || 'Consultation'}
              </Text>
              <View className="flex-row items-center gap-1.5">
                <Clock size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-400">
                  Session duration: {sessionDuration || '–'}
                </Text>
              </View>
            </View>
          </View>
          <View className="mt-4 pt-4 border-t border-slate-50 flex-row items-center gap-2">
            <View className="w-2 h-2 bg-emerald-500 rounded-full" />
            <Text className="text-xs text-emerald-600 font-semibold">Status: Completed</Text>
          </View>
        </View>

        {/* Actions */}
        <View className="gap-4">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider px-2">Next Steps</Text>
          <Pressable
            className="w-full h-14 bg-primary rounded-full flex-row items-center justify-center gap-2"
            style={Shadows.focus}
            onPress={() => {
              // Future: schedule follow-up appointment
              router.replace('/doctor/(tabs)');
            }}
          >
            <CalendarClock size={20} color="#FFFFFF" />
            <Text className="text-white font-bold">Schedule Follow-up</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/doctor/(tabs)')}
            className="w-full h-14 rounded-full border-2 border-slate-100 flex-row items-center justify-center gap-2"
          >
            <LayoutDashboard size={20} color="#475569" />
            <Text className="text-slate-600 font-bold">Return to Dashboard</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
