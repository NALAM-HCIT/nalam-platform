import React from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft, Heart, Activity, Thermometer, AlertCircle,
  Pill, Video, FlaskConical,
} from 'lucide-react-native';

const vitals = [
  { icon: Heart, label: 'Heart Rate', value: '72 bpm', color: '#EF4444' },
  { icon: Activity, label: 'BP', value: '120/80', color: '#1A73E8' },
  { icon: Thermometer, label: 'Temp', value: '98.6\u00B0F', color: '#FB923C' },
];

const conditions = [
  { name: 'Type II Diabetes', diagnosed: 'Diagnosed: Jan 2021', color: '#F97316', bg: 'bg-orange-100' },
  { name: 'Hypertension', diagnosed: 'Diagnosed: Mar 2019', color: '#EF4444', bg: 'bg-red-100' },
];

const medications = [
  { name: 'Metformin 500mg', dosage: '1 tablet, twice daily' },
  { name: 'Lisinopril 10mg', dosage: '1 tablet, once daily' },
];

export default function PatientClinicalSummaryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header with Gradient Background */}
      <View className="bg-primary/10 pt-6 pb-8 px-6 rounded-b-xl border-b border-primary/10">
        <View className="flex-row items-center justify-between mb-6">
          <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white items-center justify-center" style={Shadows.card}>
            <ArrowLeft size={20} color="#1A73E8" />
          </Pressable>
          <Text className="text-xl font-bold text-midnight">Patient Summary</Text>
          <View className="w-10 h-10 rounded-full overflow-hidden border-2 border-white" style={Shadows.card}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9DkjoSO1O21yjS8bjVksgf3S200zS_gN_ORj5GCv-ICJ0quXR0n9JBbOLtiusOozq0MDX9_5eCFObZzks5W9OjzLQJr-pmWirHvr0AqKhaqHQYroIY3pzvk-pXDIrN1CyXivN_G8403ra98aT1mdEqBRMp6GggJTu3wDSJj6dzmiMaPK0-re7arB_Q0z3L1xl6tGtlfM4ztkFEb5E4iBqXsh-Xfvb43jVVCOWUeoGElDkwQhe4hNESq0xTYFg42D9Zh1rxbD12FkQ' }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
        </View>
        <View className="flex-row items-center gap-4">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-midnight">John Doe</Text>
            <Text className="text-slate-600 font-medium">Male, 45 years {'\u2022'} ID: #NH-89231</Text>
          </View>
          <View className="px-3 py-1 bg-green-100 rounded-full">
            <Text className="text-green-700 text-xs font-bold uppercase tracking-wider">Stable</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 -mt-4" contentContainerStyle={{ gap: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Quick Vitals */}
        <View>
          <Text className="text-lg font-bold text-midnight mb-4 px-1">Quick Vitals</Text>
          <View className="flex-row gap-3">
            {vitals.map((v, i) => (
              <View key={i} className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 items-center" style={Shadows.card}>
                <v.icon size={20} color={v.color} />
                <Text className="text-xs text-slate-500 font-medium mt-2">{v.label}</Text>
                <Text className="text-lg font-bold text-midnight">{v.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Chronic Conditions */}
        <View>
          <View className="flex-row items-center justify-between mb-4 px-1">
            <Text className="text-lg font-bold text-midnight">Chronic Conditions</Text>
            <Pressable>
              <Text className="text-primary text-sm font-semibold">Edit</Text>
            </Pressable>
          </View>
          <View className="gap-3">
            {conditions.map((cond, i) => (
              <View key={i} className="bg-white p-4 rounded-2xl border border-slate-100 flex-row items-center gap-4" style={Shadows.card}>
                <View className={`w-10 h-10 rounded-full ${cond.bg} items-center justify-center`}>
                  <AlertCircle size={20} color={cond.color} />
                </View>
                <View>
                  <Text className="font-bold text-midnight">{cond.name}</Text>
                  <Text className="text-sm text-slate-500">{cond.diagnosed}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Lab Results */}
        <View>
          <Text className="text-lg font-bold text-midnight mb-4 px-1">Recent Lab Results</Text>
          <View className="bg-white p-4 rounded-2xl border border-slate-100 flex-row items-center justify-between" style={Shadows.card}>
            <View className="flex-row items-center gap-4">
              <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                <FlaskConical size={20} color="#1A73E8" />
              </View>
              <View>
                <Text className="font-bold text-midnight">Blood Work</Text>
                <Text className="text-sm text-slate-500">Oct 24, 2023</Text>
              </View>
            </View>
            <Pressable className="px-4 py-2 bg-slate-100 rounded-full">
              <Text className="text-slate-700 text-sm font-bold">View</Text>
            </Pressable>
          </View>
        </View>

        {/* Medication List */}
        <View>
          <View className="flex-row items-center justify-between mb-4 px-1">
            <Text className="text-lg font-bold text-midnight">Medication List</Text>
            <Pressable>
              <Text className="text-primary text-sm font-semibold">See All</Text>
            </Pressable>
          </View>
          <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={Shadows.card}>
            {medications.map((med, i) => (
              <View key={i} className={`p-4 flex-row items-center justify-between ${i < medications.length - 1 ? 'border-b border-slate-50' : ''}`}>
                <View>
                  <Text className="font-bold text-midnight">{med.name}</Text>
                  <Text className="text-sm text-slate-500">{med.dosage}</Text>
                </View>
                <Pill size={20} color="#CBD5E1" />
              </View>
            ))}
          </View>
        </View>

        {/* Start Consultation Button */}
        <Pressable
          onPress={() => router.push('/doctor/active-consultation')}
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
