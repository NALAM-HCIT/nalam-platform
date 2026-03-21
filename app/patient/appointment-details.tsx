import React from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  CheckCircle,
  UserCheck,
  CalendarClock,
  Phone,
} from 'lucide-react-native';

const doctor = {
  name: 'Dr. Aruna Devi',
  specialty: 'In-Person Specialist',
  image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDDr2nXD5OJHgK1UUOMqE3MTVTz7AXRxaQ3W49NAcEV6r_86zkXXA0odwatU8mLkGfBJcsr7HkspcpYk0qVj6uwLU6h6Lfay7wjc0g_K5LZefdGTZoYi2NvLL5aNPYkcbF2-ih-V5JpifXbcQGI3vDMe274NqD9O4_c9soBmMm4Wre4sFFfrBEOpheHZAzmKiNYOzsvl2Sor6gwMdkEcxf6ccvivNYRxzJPSRbvJAZTFScJ6CvnTUc6uDW3wGagzTgprkm5NNPFEq6Q',
  badges: ['Expert', 'Top Rated'],
};

const appointment = {
  date: 'Oct 24, 2023',
  time: '10:00 AM',
  department: 'Cardiology',
  ward: 'Ward 4B',
  status: 'Confirmed',
};

const checklist = [
  'Please carry your primary identification (Aadhar/Voter ID)',
  'Fasting required (8-10 hours) for blood samples',
  'Bring previous medical history and current prescriptions',
];

export default function AppointmentDetailsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F0F7FF]" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Header */}
        <View className="flex-row items-center gap-4 px-6 pt-4 pb-6">
          <Pressable onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1A73E8" />
          </Pressable>
          <Text className="text-3xl font-extrabold tracking-tight text-[#0B1B3D]">
            Appointment Details
          </Text>
        </View>

        {/* Doctor Hero Section */}
        <View
          className="bg-white/70 rounded-[24px] p-8 mx-6 mb-6 items-center"
          style={Shadows.card}
        >
          {/* Avatar with online indicator */}
          <View className="relative mb-5">
            <View className="w-32 h-32 rounded-full overflow-hidden border-4 border-white" style={Shadows.presence}>
              <Image
                source={{ uri: doctor.image }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-4 border-white" />
          </View>

          {/* Doctor Info */}
          <Text className="text-2xl font-bold text-[#0B1B3D] text-center">
            {doctor.name}
          </Text>
          <Text className="text-[#1A73E8] font-medium text-center mt-1">
            {doctor.specialty}
          </Text>

          {/* Badges */}
          <View className="flex-row flex-wrap justify-center gap-2 mt-4">
            {doctor.badges.map((badge) => (
              <View key={badge} className="bg-blue-100 px-3 py-1 rounded-full">
                <Text className="text-[#1A73E8] text-[10px] font-bold uppercase tracking-wider">
                  {badge}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Details Bento Grid */}
        <View className="px-6 gap-4 mb-6">
          {/* Date & Time Card */}
          <View className="bg-white/70 rounded-[24px] p-6 flex-row items-start gap-4" style={Shadows.card}>
            <View className="p-3 bg-blue-50 rounded-2xl">
              <Calendar size={22} color="#1A73E8" />
            </View>
            <View>
              <Text className="text-[14px] font-light tracking-widest text-[#64748B] uppercase">
                Date & Time
              </Text>
              <Text className="text-lg font-semibold mt-1 text-[#0B1B3D]">
                {appointment.date}
              </Text>
              <Text className="text-[#64748B]">{appointment.time}</Text>
            </View>
          </View>

          {/* Location Card */}
          <View className="bg-white/70 rounded-[24px] p-6 flex-row items-start gap-4" style={Shadows.card}>
            <View className="p-3 bg-blue-50 rounded-2xl">
              <MapPin size={22} color="#1A73E8" />
            </View>
            <View>
              <Text className="text-[14px] font-light tracking-widest text-[#64748B] uppercase">
                Department
              </Text>
              <Text className="text-lg font-semibold mt-1 text-[#0B1B3D]">
                {appointment.department}
              </Text>
              <Text className="text-[#64748B]">{appointment.ward}</Text>
            </View>
          </View>

          {/* Status Card */}
          <View className="bg-white/70 rounded-[24px] p-6 flex-row items-start gap-4" style={Shadows.card}>
            <View className="p-3 bg-green-50 rounded-2xl">
              <CheckCircle size={22} color="#16a34a" />
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between items-center">
                <Text className="text-[14px] font-light tracking-widest text-[#64748B] uppercase">
                  Status
                </Text>
                <View className="bg-green-100 px-3 py-1 rounded-full">
                  <Text className="text-green-700 text-xs font-bold uppercase tracking-wider">
                    {appointment.status}
                  </Text>
                </View>
              </View>
              <Text className="text-lg font-semibold mt-1 text-[#0B1B3D]">
                Your visit is all set.
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View className="px-6 gap-4 pt-2 mb-8">
          {/* Mark My Arrival */}
          <Pressable
            onPress={() => router.push('/patient/arrival-confirmed')}
            className="bg-[#1A73E8] w-full py-5 rounded-full flex-row items-center justify-center gap-3"
            style={Shadows.focus}
          >
            <UserCheck size={22} color="#FFFFFF" />
            <Text className="text-white font-bold text-lg">Mark My Arrival</Text>
          </Pressable>

          {/* Secondary Actions */}
          <View className="flex-row gap-4">
            <Pressable
              onPress={() => router.push({ pathname: '/patient/edit-booking', params: { type: 'in-person' } })}
              className="flex-1 bg-white/70 py-4 rounded-full flex-row items-center justify-center gap-2"
              style={Shadows.card}
            >
              <CalendarClock size={16} color="#1A73E8" />
              <Text className="text-[#1A73E8] font-semibold">Reschedule</Text>
            </Pressable>

            <Pressable
              className="flex-1 bg-white/70 py-4 rounded-full flex-row items-center justify-center gap-2"
              style={Shadows.card}
            >
              <Phone size={16} color="#64748B" />
              <Text className="text-[#64748B] font-semibold">Contact Hospital</Text>
            </Pressable>
          </View>
        </View>

        {/* Preparation Checklist */}
        <View className="px-6 pb-8 gap-4">
          <Text className="text-xl font-bold text-[#0B1B3D]">Preparation Checklist</Text>
          <View className="gap-3">
            {checklist.map((item, index) => (
              <View key={index} className="flex-row items-center gap-4">
                <View className="w-1.5 h-1.5 bg-[#1A73E8] rounded-full" />
                <Text className="text-[#64748B] flex-1">{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
