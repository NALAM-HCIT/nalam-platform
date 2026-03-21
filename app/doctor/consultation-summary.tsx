import React from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft, Clock, Pill, ChevronRight, Send, Plus,
} from 'lucide-react-native';

const medications = [
  { name: 'Metformin', dosage: '500mg', schedule: 'Once daily (Morning)' },
  { name: 'Lisinopril', dosage: '10mg', schedule: 'Twice daily (Morning/Night)' },
];

export default function ConsultationSummaryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="bg-white/80 border-b border-slate-200 px-4 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
            <ArrowLeft size={20} color="#0B1B3D" />
          </Pressable>
          <Text className="text-lg font-bold tracking-tight text-midnight">Consultation Summary</Text>
        </View>
        <Pressable>
          <Text className="text-primary font-bold text-sm">Edit</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Patient Info Card */}
        <View className="bg-white rounded-[24px] p-5 flex-row items-center gap-4 border border-slate-100" style={Shadows.card}>
          <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center overflow-hidden border-2 border-white" style={Shadows.card}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1qPHF6ganmk720b5tQRK0zl91I6c5dVC2dOWdDfSc2kNV42qjjU06G8A2RPyqzgj3sU7Cc746ZP4hwg0gPrCmE9hww5G2F5u0L3QvNeiQv5xKOu_4PRzFdogMJXXN47duyeejDvFBMiZywjuH3KGI7nyCAMG_-0r-IFGY0wDSLeExj2aDdE1dylez5J-keUS4daPdXZsVQYO59PVelPha_MaMckZRN8Q-v3oJzWbEZ-v6gYqjK1eVMeGuGxNG7Isjs5_Nd5ey0LRy' }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          <View className="flex-1">
            <View className="flex-row justify-between items-start">
              <Text className="text-lg font-bold text-midnight">John Doe</Text>
              <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                <Text className="text-[10px] font-bold text-primary uppercase tracking-wider">Active</Text>
              </View>
            </View>
            <Text className="text-slate-500 text-sm font-medium">ID: #NAL-88291</Text>
            <View className="flex-row items-center gap-1 mt-1">
              <Clock size={12} color="#94A3B8" />
              <Text className="text-xs text-slate-400">Session: 15:30 mins</Text>
            </View>
          </View>
        </View>

        {/* Clinical Notes */}
        <View className="gap-3">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Clinical Notes</Text>
          <View className="bg-white rounded-[24px] p-6 border border-slate-100 gap-5" style={Shadows.card}>
            <View>
              <Text className="text-[10px] font-bold text-primary mb-2 uppercase tracking-widest">Chief Complaint</Text>
              <Text className="text-midnight leading-relaxed font-medium italic">
                "Patient reports persistent headaches and fatigue for the past 3 days. Pain is localized in the frontal lobe area."
              </Text>
            </View>
            <View className="pt-5 border-t border-slate-50">
              <Text className="text-[10px] font-bold text-primary mb-2 uppercase tracking-widest">Observations</Text>
              <View className="gap-2">
                <Text className="text-midnight font-medium">{'\u2022'} Elevated blood pressure (145/95)</Text>
                <Text className="text-midnight font-medium">{'\u2022'} Mild dehydration noted</Text>
                <Text className="text-midnight font-medium">{'\u2022'} Pupillary reflex is normal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Final Diagnosis */}
        <View className="gap-3">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Final Diagnosis</Text>
          <View className="bg-white rounded-[24px] p-5 border border-slate-100" style={Shadows.card}>
            <TextInput
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-midnight font-medium"
              placeholder="Enter primary diagnosis here..."
              placeholderTextColor="#94A3B8"
              defaultValue="Primary Hypertension and Tension-type Headache"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Prescribed Medications */}
        <View className="gap-3">
          <View className="flex-row justify-between items-center px-1">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prescribed Medications</Text>
            <Pressable className="flex-row items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
              <Plus size={14} color="#1A73E8" />
              <Text className="text-primary text-xs font-bold">Add</Text>
            </Pressable>
          </View>
          <View className="gap-3">
            {medications.map((med, i) => (
              <Pressable key={i} className="flex-row items-center justify-between bg-white p-4 rounded-[24px] border border-slate-100" style={Shadows.card}>
                <View className="flex-row items-center gap-4">
                  <View className="w-11 h-11 rounded-full bg-primary/10 items-center justify-center">
                    <Pill size={20} color="#1A73E8" />
                  </View>
                  <View>
                    <Text className="font-bold text-midnight">{med.name}</Text>
                    <Text className="text-xs text-slate-500 font-medium">{med.dosage} {'\u2022'} {med.schedule}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#CBD5E1" />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="pt-8 gap-4 pb-12">
          <Pressable
            onPress={() => router.push('/doctor/consultation-success')}
            className="w-full py-4 bg-primary rounded-full flex-row items-center justify-center gap-2"
            style={Shadows.focus}
          >
            <Text className="text-white font-bold">Finalize & Send</Text>
            <Send size={18} color="#FFFFFF" />
          </Pressable>
          <Pressable className="w-full py-4 bg-white rounded-full border border-slate-200 items-center" style={Shadows.card}>
            <Text className="text-midnight font-bold">Save as Draft</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
