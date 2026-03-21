import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft,
  CheckCircle,
  Calendar,
  MessageSquare,
} from 'lucide-react-native';

const updatedBooking = {
  doctorName: 'Dr. Aruna Devi',
  specialty: 'Cardiologist',
  doctorImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCrR_k6TxOSq7ekLqxKEAxrvG2fi6aqxqw5shkCD7WkoGlpr6AGQSPUHj76A6agoXA-6V0yiBce609Z8h_5g_-aKmLOWm622ed9Nen60t5iosMNOYgf5CnH1_C5yFGkiUs2jkawCNNkIwjNDZV5Gt1-KdAhw8guG0QCAMYy4YCHM5Gy7xk2dk6GNymIk216e98xl-8BTvWaZEpZqRPAkndG0VCY4tw3DTNYhEVN4dqafNbtfw6dkGOw1OYD8Bo1Y8JI18DBKdtXm_-W',
  dateTime: 'Oct 24, 2023, 11:00 AM',
  consultationType: 'In-Person Visit',
};

export default function EditSuccessScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={22} color="#64748B" />
        </Pressable>
        <Text className="text-lg font-bold text-[#0B1B3D] flex-1 text-center pr-10">Update Successful</Text>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6 justify-between">
        <View className="items-center pt-8">
          {/* Success Icon */}
          <View className="items-center justify-center mb-8">
            <View className="w-28 h-28 bg-green-500/10 rounded-full items-center justify-center">
              <View className="w-20 h-20 bg-green-500/20 rounded-full items-center justify-center">
                <CheckCircle size={48} color="#22C55E" fill="#22C55E" />
              </View>
            </View>
          </View>

          {/* Success Message */}
          <Text className="text-2xl font-bold text-[#0B1B3D] mb-2">Success!</Text>
          <Text className="text-slate-500 text-sm text-center mb-8">
            Your appointment has been successfully updated.
          </Text>

          {/* Details Card */}
          <View
            className="w-full bg-white rounded-2xl p-5 border border-slate-100"
            style={Shadows.card}
          >
            {/* Doctor Info */}
            <View className="flex-row items-center gap-3 mb-5">
              <View className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden">
                <Image
                  source={{ uri: updatedBooking.doctorImage }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
              <View>
                <Text className="font-bold text-base text-[#0B1B3D]">
                  {updatedBooking.doctorName}
                </Text>
                <Text className="text-[#1A73E8] text-sm font-medium">
                  {updatedBooking.specialty}
                </Text>
              </View>
            </View>

            {/* Appointment Details */}
            <View className="gap-4">
              <View className="flex-row items-start gap-3">
                <Calendar size={18} color="#94a3b8" />
                <View>
                  <Text className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Date & Time
                  </Text>
                  <Text className="text-slate-700 font-medium text-sm">{updatedBooking.dateTime}</Text>
                </View>
              </View>

              <View className="flex-row items-start gap-3">
                <MessageSquare size={18} color="#94a3b8" />
                <View>
                  <Text className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Consultation Type
                  </Text>
                  <Text className="text-slate-700 font-medium text-sm">
                    {updatedBooking.consultationType}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="w-full gap-3 pb-6">
          <Pressable
            onPress={() => router.replace('/patient/(tabs)')}
            className="w-full bg-[#1A73E8] h-14 rounded-full items-center justify-center"
            style={Shadows.focus}
          >
            <Text className="text-white font-bold text-base">Go to Dashboard</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/patient/(tabs)/bookings')}
            className="w-full bg-white border-2 border-[#1A73E8] h-14 rounded-full items-center justify-center"
          >
            <Text className="text-[#1A73E8] font-bold text-base">View All Bookings</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
