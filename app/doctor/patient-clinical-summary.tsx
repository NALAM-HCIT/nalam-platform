import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import { doctorPortalService, PatientSummary, PatientAppointment } from '@/services/doctorPortalService';
import {
  ArrowLeft, Heart, Activity, Thermometer, AlertCircle,
  Pill, Video, FlaskConical, Calendar, Clock, FileText,
  Stethoscope, User,
} from 'lucide-react-native';

export default function PatientClinicalSummaryScreen() {
  const router = useRouter();
  const { patientId, appointmentId } = useLocalSearchParams<{ patientId?: string; appointmentId?: string }>();
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }
    doctorPortalService.getPatientSummary(patientId)
      .then(setSummary)
      .catch((err) => {
        console.error(err);
        CustomAlert.alert('Error', 'Failed to load patient summary.');
      })
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-slate-400 text-sm mt-4">Loading patient summary...</Text>
      </SafeAreaView>
    );
  }

  if (!summary) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
        <View className="bg-primary/10 pt-6 pb-8 px-6 rounded-b-xl border-b border-primary/10">
          <View className="flex-row items-center justify-between mb-6">
            <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white items-center justify-center" style={Shadows.card}>
              <ArrowLeft size={20} color="#1A73E8" />
            </Pressable>
            <Text className="text-xl font-bold text-midnight">Patient Summary</Text>
            <View className="w-10" />
          </View>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <User size={48} color="#CBD5E1" />
          <Text className="text-slate-400 text-base mt-4 font-medium">Patient not found</Text>
          <Pressable onPress={() => router.back()} className="mt-6 bg-primary px-8 py-3 rounded-full" style={Shadows.focus}>
            <Text className="text-white font-bold text-sm">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const p = summary.patient;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="bg-primary/10 pt-6 pb-8 px-6 rounded-b-xl border-b border-primary/10">
        <View className="flex-row items-center justify-between mb-6">
          <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white items-center justify-center" style={Shadows.card}>
            <ArrowLeft size={20} color="#1A73E8" />
          </Pressable>
          <Text className="text-xl font-bold text-midnight">Patient Summary</Text>
          <View className="w-10" />
        </View>
        <View className="flex-row items-center gap-4">
          <View className="w-14 h-14 rounded-xl bg-primary/20 items-center justify-center">
            <Text className="text-lg font-bold text-primary">{p.initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-midnight">{p.name}</Text>
            <Text className="text-slate-600 font-medium">{p.phone}</Text>
          </View>
          <View className="px-3 py-1 bg-green-100 rounded-full">
            <Text className="text-green-700 text-xs font-bold uppercase tracking-wider">
              {summary.totalVisits} Visits
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 -mt-4" contentContainerStyle={{ gap: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View>
          <Text className="text-lg font-bold text-midnight mb-4 px-1">Overview</Text>
          <View className="flex-row gap-3">
            {[
              { icon: Stethoscope, label: 'Total Visits', value: String(summary.totalVisits), color: '#1A73E8' },
              { icon: FileText, label: 'Appointments', value: String(summary.recentAppointments.length), color: '#8B5CF6' },
              { icon: Pill, label: 'Prescriptions', value: String(summary.recentAppointments.filter(a => a.prescriptionStatus != null).length), color: '#F59E0B' },
            ].map((v, i) => (
              <View key={i} className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 items-center" style={Shadows.card}>
                <v.icon size={20} color={v.color} />
                <Text className="text-xs text-slate-500 font-medium mt-2">{v.label}</Text>
                <Text className="text-lg font-bold text-midnight">{v.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Appointments */}
        <View>
          <Text className="text-lg font-bold text-midnight mb-4 px-1">Recent Appointments</Text>
          {summary.recentAppointments.length === 0 ? (
            <View className="bg-white p-6 rounded-2xl border border-slate-100 items-center" style={Shadows.card}>
              <Calendar size={28} color="#CBD5E1" />
              <Text className="text-slate-400 text-sm mt-2">No appointment history with this patient</Text>
            </View>
          ) : (
            <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={Shadows.card}>
              {summary.recentAppointments.map((appt, i) => (
                <Pressable
                  key={appt.id}
                  onPress={() => {
                    CustomAlert.alert(
                      `${appt.scheduleDate} — ${appt.time}`,
                      `Type: ${appt.consultationType}\nStatus: ${appt.status}${appt.notes ? `\n\nNotes:\n${appt.notes}` : '\n\nNo notes recorded.'}${appt.prescriptionStatus ? `\n\nPrescription: ${appt.prescriptionStatus}` : ''}`,
                      [{ text: 'OK' }],
                    );
                  }}
                  className={`p-4 flex-row items-center gap-3 active:bg-slate-50 ${i < summary.recentAppointments.length - 1 ? 'border-b border-slate-50' : ''}`}
                >
                  <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center">
                    <Calendar size={18} color={Colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-midnight text-sm">{appt.scheduleDate}</Text>
                    <Text className="text-xs text-slate-500">{appt.time} • {appt.consultationType}</Text>
                  </View>
                  <View className={`px-2.5 py-1 rounded-full ${
                    appt.status === 'completed' ? 'bg-emerald-50' :
                    appt.status === 'cancelled' ? 'bg-rose-50' : 'bg-amber-50'
                  }`}>
                    <Text className={`text-[10px] font-bold ${
                      appt.status === 'completed' ? 'text-emerald-700' :
                      appt.status === 'cancelled' ? 'text-rose-700' : 'text-amber-700'
                    }`}>
                      {appt.status}
                    </Text>
                  </View>
                  {appt.prescriptionStatus && (
                    <View className="px-2 py-0.5 rounded-full bg-violet-50">
                      <Text className="text-[9px] font-bold text-violet-600">Rx</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Start Consultation Button */}
        <Pressable
          onPress={() => appointmentId
            ? router.push({ pathname: '/doctor/active-consultation', params: { id: appointmentId } })
            : router.push('/doctor/(tabs)/appointments')}
          className="w-full py-4 bg-primary rounded-2xl flex-row items-center justify-center gap-2"
          style={Shadows.focus}
        >
          <Video size={20} color="#FFFFFF" />
          <Text className="text-white font-bold text-lg">Start Consultation</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
