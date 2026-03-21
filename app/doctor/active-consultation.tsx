import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  Mic, Video, PhoneOff, FileText, ChevronRight,
} from 'lucide-react-native';

const labReports = [
  { name: 'Full Blood Count', date: 'Oct 24, 2023' },
  { name: 'Lipid Profile', date: 'Sep 12, 2023' },
];

export default function ActiveConsultationScreen() {
  const router = useRouter();
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  const [timer, setTimer] = useState(862); // 14:22

  useEffect(() => {
    const interval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const handleDictate = () => {
    setIsDictating(true);
    setTimeout(() => {
      setChiefComplaint((prev) =>
        prev + 'Patient reports persistent headache and mild fatigue for the past 3 days. '
      );
      setIsDictating(false);
    }, 1500);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Video Call Section */}
        <View className="w-full aspect-[3/4] bg-slate-200 rounded-[24px] overflow-hidden border border-slate-200" style={Shadows.card}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcjiFTLsw9Z13tNhO3o-B6PjFYi5s-a9_yQJvAWjvm9WcElRpW6BgLZaPArNHJDPziZ8WH6bRHqXjMc9Y87yLzYn4ErAxr5FQ6jIc3xpgKcCFufdjcr0wfETkDytllDMaVpApT9n0o2WlrKROA-9Sx0VrrDg4bR-OM5eA3n2HF3AyMuLW2bLcDMmJa4sgMduIGGqTYUtnvj7lQFiTV45kMKGSJoWxGbL4ZTA4TjHjs3gpKmumFhOHiz8_PwD8DPFt3GGOncyvEDbKT' }}
            className="w-full h-full"
            resizeMode="cover"
          />
          {/* Self View PiP */}
          <View className="absolute top-4 right-4 w-32 h-24 bg-slate-700 rounded-xl border-2 border-white/20 overflow-hidden" style={Shadows.card}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAwQlPt_HA63uNGJMBs8RLjmqWnCBvCji7uFzzchNZWSfH8TxiTR0B-L_aEIiY37TUyohDU5JGfvIpDkhCpZbsqtLjRGFx9I06nFo9YVhEunzthwbRstmRkGmvzThLtPYsq01t_fjgFcHooVbTxKOZHPxmx7_x7ni4nxT3FnonL3kGPnGtMF1gB_Fnjc9JoM1wCvWlYJdCCmil-aXSCGIlwaQ9FDKoZgayd_JsNp5KKzwYOmcllJO68wO9TWnALMz09nOKtxhDlE_MJ' }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>
          {/* Timer Overlay */}
          <View className="absolute top-4 left-4 bg-black/40 px-3 py-1.5 rounded-full flex-row items-center gap-2">
            <View className="w-2 h-2 bg-red-500 rounded-full" />
            <Text className="text-white text-xs font-medium">{formatTime(timer)}</Text>
          </View>
          {/* Video Controls */}
          <View className="absolute bottom-6 left-0 right-0 items-center">
            <View className="flex-row items-center gap-3 bg-white/10 p-2.5 rounded-full border border-white/20">
              <Pressable className="p-3 bg-white/20 rounded-full">
                <Mic size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable className="p-3 bg-white/20 rounded-full">
                <Video size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable className="py-3 px-6 bg-red-500 rounded-full">
                <Text className="text-white font-bold text-sm">End Call</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Live Wearable Vitals */}
        <View>
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2 px-1">Live Wearable Vitals</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {/* Heart Rate */}
            <View className="bg-white p-4 rounded-2xl border border-slate-200 min-w-[140px]" style={Shadows.card}>
              <Text className="text-[10px] text-red-600 font-bold mb-1">Heart Rate</Text>
              <View className="flex-row items-end gap-1">
                <Text className="text-xl font-bold text-[#0F172A]">72</Text>
                <Text className="text-[10px] text-slate-500 mb-1">bpm</Text>
              </View>
            </View>
            {/* SpO2 */}
            <View className="bg-white p-4 rounded-2xl border border-slate-200 min-w-[140px]" style={Shadows.card}>
              <Text className="text-[10px] text-blue-600 font-bold mb-1">SpO2</Text>
              <View className="flex-row items-end gap-1">
                <Text className="text-xl font-bold text-[#0F172A]">98</Text>
                <Text className="text-[10px] text-slate-500 mb-1">%</Text>
              </View>
            </View>
            {/* Blood Pressure */}
            <View className="bg-white p-4 rounded-2xl border border-slate-200 min-w-[140px]" style={Shadows.card}>
              <Text className="text-[10px] text-emerald-600 font-bold mb-1">Blood Pressure</Text>
              <View className="flex-row items-end gap-1">
                <Text className="text-xl font-bold text-[#0F172A]">120/80</Text>
              </View>
              <Text className="text-[9px] text-slate-400 mt-2">Sync: 2m ago</Text>
            </View>
          </ScrollView>
        </View>

        {/* Recent Lab Reports */}
        <View className="bg-white p-5 rounded-[24px] border border-slate-200" style={Shadows.card}>
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">Recent Lab Reports</Text>
          <View className="gap-3">
            {labReports.map((report, i) => (
              <Pressable key={i} className="flex-row items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-white rounded-lg items-center justify-center border border-slate-100" style={Shadows.card}>
                    <FileText size={20} color="#1A73E8" />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-[#0F172A]">{report.name}</Text>
                    <Text className="text-[10px] text-slate-500">{report.date}</Text>
                  </View>
                </View>
                <Text className="text-blue-600 text-[10px] font-bold">VIEW</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Chief Complaint & Dictation */}
        <View className="bg-white p-5 rounded-[24px] border border-slate-200" style={Shadows.card}>
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Chief Complaint</Text>
            <Pressable
              onPress={handleDictate}
              className="flex-row items-center gap-2 bg-red-500 px-4 py-2 rounded-full"
            >
              <Mic size={14} color="#FFFFFF" />
              <Text className="text-white text-[10px] font-bold">
                {isDictating ? 'LISTENING...' : 'DICTATE'}
              </Text>
            </Pressable>
          </View>
          <TextInput
            className="w-full border border-slate-200 bg-slate-50 rounded-2xl p-4 text-sm text-[#0F172A] min-h-[120px]"
            placeholder="Describe symptoms or dictated text..."
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            value={chiefComplaint}
            onChangeText={setChiefComplaint}
          />
        </View>

        {/* E-Prescription Tool */}
        <View className="bg-white p-5 rounded-[24px] border border-slate-200" style={Shadows.card}>
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4">E-Prescription Tool</Text>
          <View className="gap-4">
            <View>
              <Text className="text-[10px] font-bold text-slate-500 mb-1 px-1">Medicine Name</Text>
              <TextInput
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-[#0F172A]"
                placeholder="e.g. Paracetamol"
                placeholderTextColor="#94A3B8"
                value={medicineName}
                onChangeText={setMedicineName}
              />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-500 mb-1 px-1">Dosage</Text>
                <TextInput
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-[#0F172A]"
                  placeholder="e.g. 500mg"
                  placeholderTextColor="#94A3B8"
                  value={dosage}
                  onChangeText={setDosage}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-500 mb-1 px-1">Freq</Text>
                <TextInput
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-[#0F172A]"
                  placeholder="1-0-1"
                  placeholderTextColor="#94A3B8"
                  value={frequency}
                  onChangeText={setFrequency}
                />
              </View>
            </View>
            <View>
              <Text className="text-[10px] font-bold text-slate-500 mb-1 px-1">Duration & Frequency</Text>
              <TextInput
                className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-[#0F172A]"
                placeholder="e.g. 5 Days, after meals"
                placeholderTextColor="#94A3B8"
                value={duration}
                onChangeText={setDuration}
              />
            </View>
            <Pressable
              onPress={() => router.push('/doctor/consultation-summary')}
              className="w-full bg-[#1E3A8A] py-4 rounded-2xl items-center mt-2"
              style={Shadows.focus}
            >
              <Text className="text-white font-bold text-xs uppercase tracking-widest">Issue E-Prescription</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
