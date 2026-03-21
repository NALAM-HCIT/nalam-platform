import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft, CheckCircle, FileText, Eye, ShieldCheck,
  CalendarClock, BarChart3, LayoutDashboard,
} from 'lucide-react-native';

export default function ConsultationSuccessScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center p-6 justify-between">
        <Pressable onPress={() => router.back()} className="w-12 h-12 rounded-full bg-white items-center justify-center" style={Shadows.card}>
          <ArrowLeft size={20} color="#0B1B3D" />
        </Pressable>
        <Text className="text-lg font-bold text-midnight flex-1 text-center pr-12">Consultation Status</Text>
      </View>

      <View className="flex-1 px-6">
        {/* Success State */}
        <View className="items-center py-8">
          <View className="w-24 h-24 rounded-full bg-emerald-100 items-center justify-center mb-6">
            <CheckCircle size={48} color="#22C55E" />
          </View>
          <Text className="text-2xl font-bold text-midnight tracking-tight mb-2 text-center">Consultation Finalized</Text>
          <Text className="text-slate-500 text-sm leading-relaxed text-center max-w-[280px]">
            The medical record for John Doe has been successfully synced with the Nalam Hospital database.
          </Text>
        </View>

        {/* Notification Summary Card */}
        <View className="bg-white p-6 rounded-3xl border border-slate-100 mb-8" style={Shadows.presence}>
          <View className="flex-row items-start gap-4">
            <View className="w-12 h-12 rounded-2xl bg-primary/10 items-center justify-center">
              <FileText size={22} color="#1A73E8" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-base text-midnight mb-1">Summary & E-Prescription</Text>
              <Text className="text-slate-500 text-sm mb-4">Sent to John Doe {'\u2022'} Today, 10:30 AM</Text>
              <Pressable className="flex-row items-center gap-2 bg-slate-50 px-4 py-2 rounded-full self-start">
                <Eye size={14} color="#475569" />
                <Text className="text-slate-700 text-sm font-semibold">View Sent Document</Text>
              </Pressable>
            </View>
          </View>
          <View className="mt-4 pt-4 border-t border-slate-50 flex-row items-center justify-between">
            <View className="flex-row items-center gap-1">
              <ShieldCheck size={12} color="#94A3B8" />
              <Text className="text-xs text-slate-400">Encrypted PDF</Text>
            </View>
            <Text className="text-xs text-slate-400">2.4 MB</Text>
          </View>
        </View>

        {/* Next Steps */}
        <View className="gap-4">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider px-2">Next Steps</Text>
          <Pressable
            className="w-full h-14 bg-primary rounded-full flex-row items-center justify-center gap-2"
            style={Shadows.focus}
          >
            <CalendarClock size={20} color="#FFFFFF" />
            <Text className="text-white font-bold">Schedule Follow-up</Text>
          </Pressable>
          <Pressable className="w-full h-14 rounded-full border-2 border-primary/20 flex-row items-center justify-center gap-2">
            <BarChart3 size={20} color="#1A73E8" />
            <Text className="text-primary font-bold">View Updated Patient Timeline</Text>
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
