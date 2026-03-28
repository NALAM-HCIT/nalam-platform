import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import { ArrowLeft, Clock, Pill, Send, User, Video } from 'lucide-react-native';
import { getAppointmentDetail, DoctorAppointment } from '@/services/doctorService';
import { prescriptionItemService, AddPrescriptionItemPayload } from '@/services/doctorPortalService';

function formatTime(t: string): string {
  const [hh, mm] = t.split(':');
  const h = parseInt(hh, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${mm} ${ampm}`;
}

export default function ConsultationSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    chiefComplaint: string;
    observations: string;
    rxItems: string;        // JSON-encoded AddPrescriptionItemPayload[]
    sessionDuration: string;
  }>();

  const [appointment, setAppointment] = useState<DoctorAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');

  // Parse structured prescription items
  const rxItems: AddPrescriptionItemPayload[] = (() => {
    try {
      return params.rxItems ? JSON.parse(params.rxItems) : [];
    } catch {
      return [];
    }
  })();

  useEffect(() => {
    if (!params.id) return;
    (async () => {
      try {
        const data = await getAppointmentDetail(params.id!);
        setAppointment(data);
      } catch (err) {
        console.error('Failed to load appointment:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const handleFinalize = async () => {
    if (!diagnosis.trim()) {
      CustomAlert.alert('Required', 'Please enter the diagnosis before finalizing.');
      return;
    }
    CustomAlert.alert(
      'Finalize Consultation?',
      'This will mark the appointment as completed and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finalize',
          onPress: async () => {
            setSubmitting(true);
            try {
              await prescriptionItemService.finalize(params.id!, {
                chiefComplaint: params.chiefComplaint,
                observations: params.observations,
                diagnosis: diagnosis.trim(),
                items: rxItems.length > 0 ? rxItems : undefined,
              });
              router.push({
                pathname: '/doctor/consultation-success',
                params: {
                  id: params.id!,
                  sessionDuration: params.sessionDuration || '00:00:00',
                },
              });
            } catch (err: any) {
              CustomAlert.alert('Error', err.response?.data?.error || 'Failed to finalize consultation.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const isVideo = appointment?.consultationType === 'video';

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-slate-100 px-4 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
            <ArrowLeft size={20} color="#0B1B3D" />
          </Pressable>
          <Text className="text-lg font-bold tracking-tight text-midnight">Consultation Summary</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ gap: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Patient Info Card */}
        <View className="bg-white rounded-2xl p-5 flex-row items-center gap-4 border border-slate-100" style={Shadows.card}>
          <View className="w-14 h-14 rounded-xl items-center justify-center" style={{ backgroundColor: isVideo ? '#1D4ED815' : '#16A34A15' }}>
            {isVideo ? <Video size={22} color="#1D4ED8" /> : <User size={22} color="#16A34A" />}
          </View>
          <View className="flex-1">
            <View className="flex-row justify-between items-start">
              <Text className="text-lg font-bold text-midnight">{appointment?.patientName || 'Patient'}</Text>
              <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-primary uppercase tracking-wider">
                  {isVideo ? 'VIDEO' : 'IN-PERSON'}
                </Text>
              </View>
            </View>
            <Text className="text-slate-500 text-sm font-medium">{appointment?.bookingReference}</Text>
            <View className="flex-row items-center gap-1 mt-1">
              <Clock size={12} color="#94A3B8" />
              <Text className="text-xs text-slate-400">Session: {params.sessionDuration || '–'}</Text>
            </View>
          </View>
        </View>

        {/* Clinical Notes */}
        <View className="gap-3">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Clinical Notes</Text>
          <View className="bg-white rounded-2xl p-6 border border-slate-100 gap-5" style={Shadows.card}>
            <View>
              <Text className="text-[10px] font-bold text-primary mb-2 uppercase tracking-widest">Chief Complaint</Text>
              <Text className="text-midnight leading-relaxed font-medium italic">
                "{params.chiefComplaint || 'No complaint recorded'}"
              </Text>
            </View>
            {params.observations ? (
              <View className="pt-5 border-t border-slate-50">
                <Text className="text-[10px] font-bold text-primary mb-2 uppercase tracking-widest">Observations</Text>
                <Text className="text-midnight font-medium">{params.observations}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Final Diagnosis */}
        <View className="gap-3">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Final Diagnosis *</Text>
          <View className="bg-white rounded-2xl p-5 border border-slate-100" style={Shadows.card}>
            <TextInput
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-midnight font-medium"
              placeholder="Enter primary diagnosis..."
              placeholderTextColor="#94A3B8"
              value={diagnosis}
              onChangeText={setDiagnosis}
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Prescribed Medications */}
        {rxItems.length > 0 && (
          <View className="gap-3">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
              Prescribed Medications ({rxItems.length})
            </Text>
            <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={Shadows.card}>
              {rxItems.map((item, i) => (
                <View
                  key={i}
                  className={`flex-row items-center gap-4 p-4 ${
                    i < rxItems.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                    <Pill size={18} color="#1A73E8" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-midnight text-sm">{item.medicineName}</Text>
                    {item.dosageInstructions ? (
                      <Text className="text-xs text-slate-500 font-medium">{item.dosageInstructions}</Text>
                    ) : null}
                  </View>
                  <View className="px-2 py-0.5 bg-slate-100 rounded-full">
                    <Text className="text-[10px] font-bold text-slate-500">×{item.quantity}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View className="pt-8 gap-4 pb-12">
          <Pressable
            onPress={handleFinalize}
            disabled={submitting}
            className="w-full py-4 bg-primary rounded-full flex-row items-center justify-center gap-2"
            style={[Shadows.focus, submitting && { opacity: 0.6 }]}
          >
            <Text className="text-white font-bold">{submitting ? 'Finalizing...' : 'Finalize & Complete'}</Text>
            {!submitting && <Send size={18} color="#FFFFFF" />}
          </Pressable>
          <Pressable
            onPress={() => router.back()}
            className="w-full py-4 bg-white rounded-full border border-slate-200 items-center"
            style={Shadows.card}
          >
            <Text className="text-midnight font-bold">Go Back & Edit</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
