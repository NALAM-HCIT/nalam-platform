import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft, Check, Bike,
} from 'lucide-react-native';

const timelineSteps = [
  {
    id: '1',
    title: 'Order Placed',
    desc: "We've received your order",
    status: 'completed' as const,
  },
  {
    id: '2',
    title: 'Pharmacy Processing',
    desc: 'Pharmacist is verifying your prescription',
    status: 'current' as const,
  },
  {
    id: '3',
    title: 'Out for Delivery',
    desc: 'Our rider will pick up soon',
    status: 'pending' as const,
  },
];

export default function OrderConfirmationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center p-4 justify-between">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
        >
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="text-lg font-bold tracking-tight text-[#0B1B3D] flex-1 text-center pr-10">
          Order Status
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View className="items-center pt-8 pb-10">
          <View
            className="w-24 h-24 rounded-full bg-white items-center justify-center mb-6 border border-slate-100"
            style={Shadows.presence}
          >
            <Check size={48} color="#22C55E" strokeWidth={3} />
          </View>
          <Text className="text-[#0B1B3D] text-3xl font-bold text-center mb-2">
            Order Placed Successfully!
          </Text>
          <Text className="text-slate-500 text-lg font-medium">Order #NLM-12345</Text>
        </View>

        {/* Delivery Card */}
        <View
          className="bg-white border border-slate-100 rounded-[24px] p-6 mb-6"
          style={Shadows.card}
        >
          {/* Estimated Delivery */}
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-slate-400 text-sm uppercase tracking-widest font-semibold mb-1">
                Estimated Delivery
              </Text>
              <Text className="text-[#0B1B3D] text-2xl font-bold">45 mins</Text>
            </View>
            <View className="bg-[#1A73E8]/10 p-3 rounded-full">
              <Bike size={28} color="#1A73E8" />
            </View>
          </View>

          {/* Timeline */}
          <View className="gap-0">
            {timelineSteps.map((step, index) => (
              <View key={step.id} className="flex-row gap-4">
                {/* Timeline Indicator */}
                <View className="items-center">
                  {step.status === 'completed' ? (
                    <View className="w-6 h-6 rounded-full bg-[#1A73E8] items-center justify-center"
                      style={{ shadowColor: '#1A73E8', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 8 }}
                    >
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : step.status === 'current' ? (
                    <View className="w-6 h-6 rounded-full bg-[#1A73E8]/10 border border-[#1A73E8] items-center justify-center">
                      <View className="w-2 h-2 rounded-full bg-[#1A73E8]" />
                    </View>
                  ) : (
                    <View className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200" />
                  )}
                  {/* Connector Line */}
                  {index < timelineSteps.length - 1 && (
                    <View
                      className={`w-0.5 flex-1 min-h-[32px] mt-1 ${
                        step.status === 'completed' ? 'bg-[#1A73E8]/30' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </View>
                {/* Content */}
                <View className={`pb-6 ${index === timelineSteps.length - 1 ? 'pb-0' : ''}`}>
                  <Text
                    className={`font-semibold ${
                      step.status === 'pending' ? 'text-slate-400' : 'text-[#0B1B3D]'
                    }`}
                  >
                    {step.title}
                  </Text>
                  <Text
                    className={`text-sm ${
                      step.status === 'pending' ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {step.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="gap-4 mt-8">
          <Pressable
            className="bg-[#1A73E8] py-4 px-8 rounded-full items-center"
            style={Shadows.focus}
          >
            <Text className="text-white font-bold text-base">Track Order</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/patient/(tabs)')}
            className="bg-white border border-slate-200 py-4 px-8 rounded-full items-center"
          >
            <Text className="text-[#0B1B3D] font-semibold text-base">Back to Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
