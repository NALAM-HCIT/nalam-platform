import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import { patientService, PrescriptionDetail } from '@/services/patientService';
import {
  ArrowLeft, Download, Share2, ShoppingCart, Stethoscope,
  FileText, Calendar, Clock, User, Building2, Pill,
  AlertCircle, CheckCircle, Printer,
} from 'lucide-react-native';

export default function DigitalPrescriptionScreen() {
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const [prescription, setPrescription] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    patientService.getPrescriptionDetail(appointmentId)
      .then(setPrescription)
      .catch((err) => {
        console.error(err);
        CustomAlert.alert('Error', 'Failed to load prescription.');
      })
      .finally(() => setLoading(false));
  }, [appointmentId]);

  const handleDownload = () => {
    setDownloaded(true);
    CustomAlert.alert('Downloaded', `Prescription ${prescription?.bookingReference || ''} saved.`);
  };

  const handleShare = () => {
    CustomAlert.alert('Share Prescription', 'Share via:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'WhatsApp', onPress: () => CustomAlert.alert('Shared', 'Prescription shared via WhatsApp.') },
      { text: 'Email', onPress: () => CustomAlert.alert('Shared', 'Prescription sent to email.') },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center" edges={['top']}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text className="text-slate-400 text-sm mt-4">Loading prescription...</Text>
      </SafeAreaView>
    );
  }

  if (!prescription) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
        <View className="flex-row items-center px-5 py-3 border-b border-slate-100 bg-white">
          <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <ArrowLeft size={22} color="#0B1B3D" />
          </Pressable>
          <Text className="text-lg font-bold text-[#0B1B3D] flex-1 text-center">Digital Prescription</Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <FileText size={48} color="#CBD5E1" />
          <Text className="text-slate-400 text-base mt-4 font-medium">No prescription available</Text>
          <Text className="text-slate-300 text-xs mt-1 text-center">This appointment doesn't have a prescription yet.</Text>
          <Pressable onPress={() => router.back()} className="mt-6 bg-primary px-8 py-3 rounded-full" style={Shadows.focus}>
            <Text className="text-white font-bold text-sm">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const rx = prescription;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-3 border-b border-slate-100 bg-white">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="text-lg font-bold text-[#0B1B3D] flex-1 text-center">Digital Prescription</Text>
        <Pressable onPress={handleShare} className="w-10 h-10 items-center justify-center">
          <Share2 size={20} color="#1A73E8" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <View className="mx-5 mt-4">
          <View className="bg-white rounded-[24px] border border-slate-100 overflow-hidden" style={Shadows.card}>
            {/* Hospital Banner */}
            <View className="bg-[#1A73E8] p-5">
              <View className="flex-row items-center gap-3 mb-2">
                <Building2 size={20} color="#FFFFFF" />
                <Text className="text-white font-bold text-lg">{rx.hospital.name}</Text>
              </View>
              <Text className="text-white/70 text-xs">{rx.hospital.address}</Text>
              <View className="flex-row items-center gap-4 mt-3">
                <View className="bg-white/20 px-3 py-1 rounded-full">
                  <Text className="text-white text-[10px] font-bold">Rx {rx.bookingReference}</Text>
                </View>
                <Text className="text-white/70 text-xs">{rx.scheduleDate} | {rx.time}</Text>
              </View>
            </View>

            {/* Doctor Info */}
            <View className="p-5 border-b border-slate-100">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 rounded-xl bg-[#1A73E8]/10 items-center justify-center">
                  <Stethoscope size={20} color="#1A73E8" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-[#0B1B3D]">{rx.doctor.name}</Text>
                  <Text className="text-xs text-[#1A73E8] font-medium">{rx.doctor.specialty}</Text>
                  {rx.doctor.bio && (
                    <Text className="text-[10px] text-slate-400 mt-0.5">{rx.doctor.bio}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Patient Info */}
            <View className="p-5 border-b border-slate-100">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Patient Details</Text>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-xs text-slate-500">Name</Text>
                  <Text className="text-sm font-bold text-[#0B1B3D]">{rx.patient.name}</Text>
                </View>
                <View>
                  <Text className="text-xs text-slate-500">Mobile</Text>
                  <Text className="text-sm font-bold text-[#0B1B3D]">{rx.patient.mobile}</Text>
                </View>
              </View>
            </View>

            {/* Consultation Type */}
            <View className="p-5 border-b border-slate-100">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Consultation</Text>
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-1.5">
                  <Calendar size={12} color="#94A3B8" />
                  <Text className="text-xs text-slate-600">{rx.scheduleDate}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Clock size={12} color="#94A3B8" />
                  <Text className="text-xs text-slate-600">{rx.time}</Text>
                </View>
                <View className="bg-primary/10 px-2.5 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-primary">{rx.consultationType}</Text>
                </View>
              </View>
            </View>

            {/* Prescription Notes */}
            <View className="p-5 border-b border-slate-100">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Prescription Notes</Text>
              <View className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex-row items-start gap-2">
                <Pill size={16} color="#F59E0B" />
                <Text className="text-sm text-amber-900 flex-1">{rx.prescriptionNotes || 'No prescription notes recorded.'}</Text>
              </View>
            </View>

            {/* Status */}
            <View className="p-5 border-b border-slate-100">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Dispensing Status</Text>
              <View className="flex-row items-center gap-2">
                {rx.prescriptionStatus === 'dispensed' ? (
                  <>
                    <CheckCircle size={16} color="#22C55E" />
                    <Text className="text-sm font-bold text-emerald-700">Dispensed</Text>
                  </>
                ) : rx.prescriptionStatus === 'pending' ? (
                  <>
                    <Clock size={16} color="#F59E0B" />
                    <Text className="text-sm font-bold text-amber-700">Pending at Pharmacy</Text>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} color="#EF4444" />
                    <Text className="text-sm font-bold text-rose-700">Rejected</Text>
                  </>
                )}
              </View>
            </View>

            {/* Digital Signature Footer */}
            <View className="bg-slate-50 p-4 border-t border-slate-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <CheckCircle size={14} color="#22C55E" />
                  <Text className="text-xs text-slate-500">Digitally signed by {rx.doctor.name}</Text>
                </View>
                <Text className="text-[10px] text-slate-400">{rx.scheduleDate}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white/95 border-t border-slate-100">
        <SafeAreaView edges={['bottom']}>
          <View className="gap-3">
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleDownload}
                className={`flex-1 py-3.5 rounded-full items-center flex-row justify-center gap-2 border-2 ${
                  downloaded ? 'border-green-200 bg-green-50' : 'border-slate-200'
                }`}
              >
                {downloaded ? <CheckCircle size={18} color="#22C55E" /> : <Download size={18} color="#64748B" />}
                <Text className={`font-bold text-sm ${downloaded ? 'text-green-600' : 'text-slate-600'}`}>
                  {downloaded ? 'Downloaded' : 'Download PDF'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => CustomAlert.alert('Printing', 'Prescription sent to printer.')}
                className="flex-1 py-3.5 rounded-full items-center flex-row justify-center gap-2 border-2 border-slate-200"
              >
                <Printer size={18} color="#64748B" />
                <Text className="font-bold text-sm text-slate-600">Print</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
