import React from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft, Stethoscope, FileText, Lightbulb, Download,
  ShoppingCart, Calendar, ChevronRight,
} from 'lucide-react-native';

// Mock data
const doctorData = {
  name: 'Dr. Aruna Devi',
  specialty: 'Cardiologist',
  hospital: 'Apollo Hospitals',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCRndRGLNK7KTIJF1LcF-MOeifw7UhN4FwS6vcbMPPu0JStpJcTErV1uExaF5kVe_u257wQtibeTjrLuhEsoAf9lbr2sbYXMzAAoboYTTn0dHQGN7w30JjYyScUtoi2L6hRHBCw46xlVyG6Rrx0Q_G1b9JCajLIM7D2dm_5_AIA8IifvSViEP9BnARoyt6PMOlC2ZQXnUuVmOtbVSTqeEzfCGiiULOxaY88WN52JMn-KdV4s4oYsspUfcHk-9z-C1caO9Kmhp829zRP',
};

const diagnosis = {
  title: 'Mild Hypertension & Fatigue',
  description: 'Based on recent BP readings and stress markers.',
};

const prescriptions = [
  { name: 'Amlodipine 5mg', dosage: '1 tablet daily (Morning)', duration: '14 Days' },
  { name: 'Neurobion Forte', dosage: '1 tablet daily (After food)', duration: '30 Days' },
];

const advice = [
  'Reduce daily sodium intake to less than 2300mg.',
  'Practice 15 minutes of guided meditation daily.',
  'Monitor blood pressure every morning for 7 days.',
];

export default function PostConsultationScreen() {
  const router = useRouter();

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
        {/* Doctor Info Card */}
        <View
          className="bg-white rounded-[20px] p-5 flex-row items-center gap-4 mb-6"
          style={Shadows.card}
        >
          <View className="relative">
            <View className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#1A73E8]/20">
              <Image
                source={{ uri: doctorData.avatar }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          </View>
          <View className="flex-1">
            <View className="bg-green-500/10 px-2 py-1 rounded-full self-start mb-1">
              <Text className="text-green-600 text-[10px] font-bold uppercase tracking-[2px]">
                Session Completed
              </Text>
            </View>
            <Text className="text-xl font-bold leading-tight text-[#0B1B3D]">
              {doctorData.name}
            </Text>
            <Text className="text-slate-500 text-sm">
              {doctorData.specialty} {'\u2022'} {doctorData.hospital}
            </Text>
            <Pressable className="flex-row items-center gap-1 mt-2">
              <Text className="text-[#1A73E8] text-xs font-semibold">View Profile</Text>
              <ChevronRight size={14} color="#1A73E8" />
            </Pressable>
          </View>
        </View>

        {/* Summary Card */}
        <View
          className="bg-white rounded-[20px] p-6 border border-slate-100 mb-6"
          style={Shadows.card}
        >
          {/* Diagnosis */}
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <Stethoscope size={18} color="#1A73E8" />
              <Text className="font-bold text-sm text-[#1A73E8] uppercase tracking-[2px]">
                Diagnosis
              </Text>
            </View>
            <Text className="text-lg font-medium text-[#0B1B3D]">{diagnosis.title}</Text>
            <Text className="text-slate-500 text-sm mt-1">{diagnosis.description}</Text>
          </View>

          <View className="h-px bg-slate-100 my-6" />

          {/* Prescription */}
          <View>
            <View className="flex-row items-center gap-2 mb-3">
              <FileText size={18} color="#1A73E8" />
              <Text className="font-bold text-sm text-[#1A73E8] uppercase tracking-[2px]">
                Prescription
              </Text>
            </View>
            <View className="gap-3">
              {prescriptions.map((med, i) => (
                <View
                  key={i}
                  className="flex-row items-start justify-between p-3 rounded-xl bg-slate-50"
                >
                  <View>
                    <Text className="font-semibold text-sm text-[#0B1B3D]">{med.name}</Text>
                    <Text className="text-xs text-slate-500 mt-0.5">{med.dosage}</Text>
                  </View>
                  <View className="bg-[#1A73E8]/10 px-2 py-1 rounded">
                    <Text className="text-[#1A73E8] text-[10px] font-bold">{med.duration}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View className="h-px bg-slate-100 my-6" />

          {/* Doctor's Advice */}
          <View>
            <View className="flex-row items-center gap-2 mb-3">
              <Lightbulb size={18} color="#1A73E8" />
              <Text className="font-bold text-sm text-[#1A73E8] uppercase tracking-[2px]">
                Doctor's Advice
              </Text>
            </View>
            <View className="gap-2.5">
              {advice.map((item, i) => (
                <View key={i} className="flex-row gap-2.5">
                  <Text className="text-[#1A73E8] text-sm">{'\u2022'}</Text>
                  <Text className="text-sm text-slate-600 flex-1 leading-5">{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="gap-3 py-2">
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

          <Pressable
            onPress={() => router.push('/patient/pharmacy-cart')}
            className="w-full border-2 border-[#1A73E8] py-4 rounded-[16px] flex-row items-center justify-center gap-2 bg-transparent"
          >
            <ShoppingCart size={20} color="#1A73E8" />
            <Text className="text-[#1A73E8] font-bold text-[15px]">
              Order Prescribed Medicines  {'\u2022'}  {'\u20B9'}205
            </Text>
          </Pressable>

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
