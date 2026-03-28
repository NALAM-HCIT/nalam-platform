import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import { patientService, PrescriptionDetail, PrescriptionLineItem } from '@/services/patientService';
import {
  ArrowLeft, Stethoscope, FileText, Pill, Download,
  Calendar, AlertCircle,
} from 'lucide-react-native';

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function PostConsultationScreen() {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();

  const [detail, setDetail] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appointmentId) { setLoading(false); return; }
    patientService.getPrescriptionDetail(appointmentId)
      .then(setDetail)
      .catch(() => setError('Failed to load consultation summary.'))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-slate-400 text-sm mt-3">Loading summary...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-[#F8FAFC]/80">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
        >
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="text-lg font-bold tracking-tight text-[#0B1B3D]">
          Consultation Summary
        </Text>
        <View className="w-10 h-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View className="bg-red-50 rounded-2xl p-6 items-center mt-4 border border-red-100">
            <AlertCircle size={28} color="#EF4444" />
            <Text className="text-red-700 font-semibold mt-2 text-center">{error}</Text>
          </View>
        ) : detail ? (
          <>
            {/* Doctor Info Card */}
            <View className="bg-white rounded-[20px] p-5 flex-row items-center gap-4 mb-6" style={Shadows.card}>
              <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center border-2 border-primary/20">
                <Text className="text-xl font-bold text-primary">
                  {detail.doctor.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <View className="bg-green-500/10 px-2 py-1 rounded-full self-start mb-1">
                  <Text className="text-green-600 text-[10px] font-bold uppercase tracking-[2px]">
                    Session Completed
                  </Text>
                </View>
                <Text className="text-xl font-bold leading-tight text-[#0B1B3D]">
                  {detail.doctor.name}
                </Text>
                <Text className="text-slate-500 text-sm">
                  {detail.doctor.specialty} {'\u2022'} {detail.hospital.name}
                </Text>
                <Text className="text-[10px] text-slate-400 mt-1">
                  {formatDate(detail.scheduleDate)} • Ref: {detail.bookingReference}
                </Text>
              </View>
            </View>

            {/* Prescribed Medications */}
            <View className="bg-white rounded-[20px] p-6 border border-slate-100 mb-6" style={Shadows.card}>
              <View className="flex-row items-center gap-2 mb-4">
                <Pill size={18} color="#1A73E8" />
                <Text className="font-bold text-sm text-[#1A73E8] uppercase tracking-[2px]">
                  Medications
                </Text>
                {detail.prescriptionItems?.length > 0 && (
                  <View className="ml-auto bg-primary/10 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-primary">{detail.prescriptionItems.length} item{detail.prescriptionItems.length > 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>

              {detail.prescriptionItems?.length > 0 ? (
                <View className="gap-3">
                  {detail.prescriptionItems.map((item: PrescriptionLineItem, i: number) => (
                    <View key={item.id} className={`flex-row items-center gap-3 pb-3 ${i < detail.prescriptionItems.length - 1 ? 'border-b border-slate-50' : ''}`}>
                      <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                        <Pill size={16} color="#1A73E8" />
                      </View>
                      <View className="flex-1">
                        <Text className="font-bold text-midnight text-sm">{item.medicineName}</Text>
                        {item.dosageInstructions ? (
                          <Text className="text-xs text-slate-500 mt-0.5">{item.dosageInstructions}</Text>
                        ) : null}
                      </View>
                      <View className="px-2 py-0.5 bg-slate-100 rounded-full">
                        <Text className="text-[10px] font-bold text-slate-500">×{item.quantity}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : detail.prescriptionNotes ? (
                <Text className="text-sm text-slate-700 leading-6">{detail.prescriptionNotes}</Text>
              ) : (
                <Text className="text-sm text-slate-400 italic">
                  No medications prescribed for this consultation.
                </Text>
              )}

              {detail.doctor.bio && (
                <>
                  <View className="h-px bg-slate-100 my-6" />
                  <View>
                    <View className="flex-row items-center gap-2 mb-2">
                      <Stethoscope size={18} color="#1A73E8" />
                      <Text className="font-bold text-sm text-[#1A73E8] uppercase tracking-[2px]">
                        About Doctor
                      </Text>
                    </View>
                    <Text className="text-sm text-slate-600 leading-5">{detail.doctor.bio}</Text>
                  </View>
                </>
              )}
            </View>
          </>
        ) : (
          /* No appointment ID — generic success state */
          <View className="bg-white rounded-[20px] p-6 items-center mt-4" style={Shadows.card}>
            <View className="bg-green-500/10 px-3 py-1.5 rounded-full mb-3">
              <Text className="text-green-600 text-xs font-bold uppercase tracking-wider">Session Completed</Text>
            </View>
            <Text className="text-lg font-bold text-midnight text-center">
              Your consultation has ended.
            </Text>
            <Text className="text-slate-400 text-sm mt-1 text-center">
              Your prescription will be available shortly in your health records.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View className="gap-3 py-2">
          {detail && (
            <Pressable
              onPress={() => router.push('/patient/digital-prescription')}
              className="w-full bg-[#1A73E8] py-4 rounded-[16px] flex-row items-center justify-center gap-2"
              style={{
                shadowColor: '#1A73E8',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.2,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <Download size={20} color="#FFFFFF" />
              <Text className="text-white font-bold text-[15px]">
                View Digital Prescription
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => router.push('/patient/consultation-type')}
            className="w-full py-3.5 rounded-[16px] flex-row items-center justify-center gap-2"
          >
            <Calendar size={20} color="#64748B" />
            <Text className="text-slate-500 font-medium text-[15px]">
              Book Follow-up Appointment
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
