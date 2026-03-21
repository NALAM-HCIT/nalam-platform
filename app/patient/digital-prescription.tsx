import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft,
  Download,
  Share2,
  ShoppingCart,
  Stethoscope,
  FileText,
  Calendar,
  Clock,
  User,
  Building2,
  Pill,
  AlertCircle,
  CheckCircle,
  Printer,
} from 'lucide-react-native';

const prescription = {
  id: 'RX-2023-10241',
  date: 'Oct 24, 2023',
  time: '11:15 AM',
  hospital: 'Arun Priya Multispeciality Hospital',
  hospitalAddress: '12, Anna Nagar Main Road, Chennai, TN 600040',
  doctor: {
    name: 'Dr. Aruna Devi',
    specialty: 'Cardiologist',
    regNo: 'MCI-45829',
    qualification: 'MBBS, MD (Cardiology), FACC',
  },
  patient: {
    name: 'John Doe',
    age: 32,
    gender: 'Male',
    patientId: 'NP-2026-0034',
    phone: '+91 98765 43210',
  },
  diagnosis: 'Mild Hypertension & Fatigue',
  vitals: {
    bp: '140/90 mmHg',
    pulse: '82 bpm',
    weight: '72 kg',
  },
  medicines: [
    {
      id: 'p1',
      name: 'Amlodipine 5mg',
      type: 'Tablet',
      dosage: '1 tablet daily',
      timing: 'Morning, before food',
      duration: '14 Days',
      quantity: '14 tablets',
      price: 120.0,
      instructions: 'Do not skip doses. Monitor BP daily.',
    },
    {
      id: 'p2',
      name: 'Neurobion Forte',
      type: 'Tablet',
      dosage: '1 tablet daily',
      timing: 'After food',
      duration: '30 Days',
      quantity: '30 tablets',
      price: 85.0,
      instructions: 'Take with water after meals.',
    },
  ],
  advice: [
    'Reduce daily sodium intake to less than 2300mg.',
    'Practice 15 minutes of guided meditation daily.',
    'Monitor blood pressure every morning for 7 days.',
    'Follow up after 14 days.',
  ],
  followUp: 'Nov 07, 2023',
};

export default function DigitalPrescriptionScreen() {
  const router = useRouter();
  const [downloaded, setDownloaded] = useState(false);

  const totalMedicineCost = prescription.medicines.reduce((sum, m) => sum + m.price, 0);

  const handleDownload = () => {
    setDownloaded(true);
    Alert.alert(
      'Prescription Downloaded',
      `Prescription ${prescription.id} has been saved to your device.\n\nFile: Prescription_${prescription.id}.pdf`,
      [{ text: 'OK' }]
    );
  };

  const handleShare = () => {
    Alert.alert(
      'Share Prescription',
      'Share this prescription via:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'WhatsApp', onPress: () => Alert.alert('Shared', 'Prescription shared via WhatsApp.') },
        { text: 'Email', onPress: () => Alert.alert('Shared', 'Prescription sent to your email.') },
      ]
    );
  };

  const handleOrderMedicines = () => {
    router.push('/patient/pharmacy-cart');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-3 border-b border-slate-100 bg-white">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="text-lg font-bold text-[#0B1B3D] flex-1 text-center">
          Digital Prescription
        </Text>
        <Pressable onPress={handleShare} className="w-10 h-10 items-center justify-center">
          <Share2 size={20} color="#1A73E8" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Prescription Document */}
        <View className="mx-5 mt-4">
          <View
            className="bg-white rounded-[24px] border border-slate-100 overflow-hidden"
            style={Shadows.card}
          >
            {/* Document Header - Hospital */}
            <View className="bg-[#1A73E8] p-5">
              <View className="flex-row items-center gap-3 mb-2">
                <Building2 size={20} color="#FFFFFF" />
                <Text className="text-white font-bold text-lg">{prescription.hospital}</Text>
              </View>
              <Text className="text-white/70 text-xs">{prescription.hospitalAddress}</Text>
              <View className="flex-row items-center gap-4 mt-3">
                <View className="bg-white/20 px-3 py-1 rounded-full">
                  <Text className="text-white text-[10px] font-bold">Rx {prescription.id}</Text>
                </View>
                <Text className="text-white/70 text-xs">{prescription.date} | {prescription.time}</Text>
              </View>
            </View>

            {/* Doctor Info */}
            <View className="p-5 border-b border-slate-100">
              <View className="flex-row items-center gap-3">
                <View className="w-12 h-12 rounded-xl bg-[#1A73E8]/10 items-center justify-center">
                  <Stethoscope size={20} color="#1A73E8" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-[#0B1B3D]">{prescription.doctor.name}</Text>
                  <Text className="text-xs text-[#1A73E8] font-medium">{prescription.doctor.specialty}</Text>
                  <Text className="text-[10px] text-slate-400 mt-0.5">
                    {prescription.doctor.qualification} | Reg: {prescription.doctor.regNo}
                  </Text>
                </View>
              </View>
            </View>

            {/* Patient Info */}
            <View className="p-5 border-b border-slate-100">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Patient Details
              </Text>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-xs text-slate-500">Name</Text>
                  <Text className="text-sm font-bold text-[#0B1B3D]">{prescription.patient.name}</Text>
                </View>
                <View>
                  <Text className="text-xs text-slate-500">Age/Gender</Text>
                  <Text className="text-sm font-bold text-[#0B1B3D]">{prescription.patient.age} / {prescription.patient.gender}</Text>
                </View>
                <View>
                  <Text className="text-xs text-slate-500">ID</Text>
                  <Text className="text-sm font-bold text-[#0B1B3D]">{prescription.patient.patientId}</Text>
                </View>
              </View>
            </View>

            {/* Vitals */}
            <View className="p-5 border-b border-slate-100">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Vitals Recorded
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1 bg-red-50 rounded-xl p-3 items-center">
                  <Text className="text-[10px] font-bold text-slate-400">BP</Text>
                  <Text className="text-sm font-bold text-[#0B1B3D] mt-1">{prescription.vitals.bp}</Text>
                </View>
                <View className="flex-1 bg-blue-50 rounded-xl p-3 items-center">
                  <Text className="text-[10px] font-bold text-slate-400">Pulse</Text>
                  <Text className="text-sm font-bold text-[#0B1B3D] mt-1">{prescription.vitals.pulse}</Text>
                </View>
                <View className="flex-1 bg-green-50 rounded-xl p-3 items-center">
                  <Text className="text-[10px] font-bold text-slate-400">Weight</Text>
                  <Text className="text-sm font-bold text-[#0B1B3D] mt-1">{prescription.vitals.weight}</Text>
                </View>
              </View>
            </View>

            {/* Diagnosis */}
            <View className="p-5 border-b border-slate-100">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Diagnosis
              </Text>
              <View className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex-row items-center gap-2">
                <AlertCircle size={16} color="#F59E0B" />
                <Text className="text-sm font-bold text-[#0B1B3D] flex-1">{prescription.diagnosis}</Text>
              </View>
            </View>

            {/* Prescribed Medicines */}
            <View className="p-5 border-b border-slate-100">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Prescribed Medicines
                </Text>
                <Text className="text-xs text-slate-400">{prescription.medicines.length} items</Text>
              </View>
              <View className="gap-4">
                {prescription.medicines.map((med, index) => (
                  <View key={med.id}>
                    <View className="flex-row items-start gap-3">
                      <View className="w-8 h-8 rounded-lg bg-[#1A73E8]/10 items-center justify-center mt-0.5">
                        <Pill size={16} color="#1A73E8" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm font-bold text-[#0B1B3D]">{med.name}</Text>
                          <Text className="text-sm font-bold text-[#1A73E8]">{'\u20B9'}{med.price.toFixed(0)}</Text>
                        </View>
                        <Text className="text-xs text-slate-500 mt-0.5">{med.type} | {med.quantity}</Text>
                        <View className="bg-slate-50 rounded-lg p-2.5 mt-2 gap-1">
                          <Text className="text-xs text-[#0B1B3D]">
                            <Text className="font-bold">Dosage:</Text> {med.dosage}
                          </Text>
                          <Text className="text-xs text-[#0B1B3D]">
                            <Text className="font-bold">Timing:</Text> {med.timing}
                          </Text>
                          <Text className="text-xs text-[#0B1B3D]">
                            <Text className="font-bold">Duration:</Text> {med.duration}
                          </Text>
                          <Text className="text-xs text-slate-500 italic mt-1">{med.instructions}</Text>
                        </View>
                      </View>
                    </View>
                    {index < prescription.medicines.length - 1 && (
                      <View className="h-px bg-slate-100 mt-4" />
                    )}
                  </View>
                ))}
              </View>

              {/* Medicine Total */}
              <View className="mt-4 pt-4 border-t border-dashed border-slate-200 flex-row items-center justify-between">
                <Text className="text-sm font-bold text-slate-500">Estimated Medicine Cost</Text>
                <Text className="text-base font-bold text-[#1A73E8]">{'\u20B9'}{totalMedicineCost.toFixed(0)}</Text>
              </View>
            </View>

            {/* Doctor's Advice */}
            <View className="p-5 border-b border-slate-100">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                Doctor's Advice
              </Text>
              <View className="gap-2">
                {prescription.advice.map((item, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <CheckCircle size={14} color="#22C55E" />
                    <Text className="text-sm text-slate-600 flex-1 leading-5">{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Follow-up */}
            <View className="p-5">
              <View className="bg-[#1A73E8]/5 border border-[#1A73E8]/10 rounded-xl p-4 flex-row items-center gap-3">
                <Calendar size={18} color="#1A73E8" />
                <View>
                  <Text className="text-xs text-slate-500">Next Follow-up</Text>
                  <Text className="text-sm font-bold text-[#0B1B3D]">{prescription.followUp}</Text>
                </View>
              </View>
            </View>

            {/* Digital Signature Footer */}
            <View className="bg-slate-50 p-4 border-t border-slate-100">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <CheckCircle size={14} color="#22C55E" />
                  <Text className="text-xs text-slate-500">Digitally signed by {prescription.doctor.name}</Text>
                </View>
                <Text className="text-[10px] text-slate-400">{prescription.date}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white/95 border-t border-slate-100">
        <SafeAreaView edges={['bottom']}>
          <View className="gap-3">
            {/* Order Medicines */}
            <Pressable
              onPress={handleOrderMedicines}
              className="w-full bg-[#1A73E8] py-4 rounded-full items-center flex-row justify-center gap-2"
              style={Shadows.focus}
            >
              <ShoppingCart size={20} color="#FFFFFF" />
              <Text className="text-white font-bold text-base">
                Order Medicines {'\u2022'} {'\u20B9'}{totalMedicineCost.toFixed(0)}
              </Text>
            </Pressable>

            {/* Download & Print Row */}
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleDownload}
                className={`flex-1 py-3.5 rounded-full items-center flex-row justify-center gap-2 border-2 ${
                  downloaded ? 'border-green-200 bg-green-50' : 'border-slate-200'
                }`}
              >
                {downloaded ? (
                  <CheckCircle size={18} color="#22C55E" />
                ) : (
                  <Download size={18} color="#64748B" />
                )}
                <Text className={`font-bold text-sm ${downloaded ? 'text-green-600' : 'text-slate-600'}`}>
                  {downloaded ? 'Downloaded' : 'Download PDF'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => Alert.alert('Printing', 'Prescription sent to printer.')}
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
