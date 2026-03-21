import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft, MapPin, CreditCard, Shield, Lock, Smartphone, Landmark, Wallet,
  Banknote, Pill,
} from 'lucide-react-native';

const deliverySlots = [
  { id: 'standard', label: 'Standard', time: '45-60 mins', fee: 0 },
  { id: 'express', label: 'Express', time: '20-30 mins', fee: 30 },
  { id: 'scheduled', label: 'Scheduled', time: 'Choose time', fee: 0 },
];

const paymentMethods = [
  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when you receive', icon: Banknote },
  { id: 'upi', label: 'UPI', desc: 'GPay, PhonePe, Paytm', icon: Smartphone },
  { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', icon: Landmark },
  { id: 'wallet', label: 'Wallet', desc: 'Paytm, Amazon Pay', icon: Wallet },
  { id: 'insurance', label: 'Insurance Coverage', desc: 'Hospital Partner Benefit', icon: Shield },
];

export default function SecureCheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ items?: string; rxCount?: string }>();
  const [selectedSlot, setSelectedSlot] = useState('standard');
  const [selectedPayment, setSelectedPayment] = useState('cod');

  const orderItems: { name: string; price: number; qty: number }[] = useMemo(() => {
    if (params.items) {
      try { return JSON.parse(params.items); } catch { return []; }
    }
    return [];
  }, [params.items]);

  const rxCount = params.rxCount ? parseInt(params.rxCount, 10) : 0;
  const slotFee = deliverySlots.find((s) => s.id === selectedSlot)?.fee ?? 0;
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const deliveryFee = subtotal > 0 ? 40 + slotFee : slotFee;
  const total = subtotal + deliveryFee;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header with Blue Gradient */}
      <View className="bg-[#1A73E8] pt-2 pb-12 px-4 rounded-b-[32px]" style={Shadows.focus}>
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="p-2 rounded-full"
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </Pressable>
          <Text className="text-xl font-bold tracking-tight text-white">Checkout</Text>
          <View className="w-10" />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        className="flex-1 -mt-6 px-4"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery Address */}
        <View
          className="bg-white p-6 rounded-[24px] border border-slate-100 mb-4"
          style={Shadows.card}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-[#0B1B3D]">Delivery Address</Text>
            <Pressable>
              <Text className="text-[#1A73E8] text-sm font-semibold">Change</Text>
            </Pressable>
          </View>
          <View className="flex-row items-center gap-4">
            <View className="h-12 w-12 rounded-xl bg-[#1A73E8]/10 items-center justify-center">
              <MapPin size={22} color="#1A73E8" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-base text-[#0B1B3D]">Home</Text>
              <Text className="text-slate-500 text-sm leading-tight">
                12, Anna Nagar Main Road, Chennai, TN 600040
              </Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        {(orderItems.length > 0 || rxCount > 0) && (
          <View
            className="bg-white p-6 rounded-[24px] border border-slate-100 mb-4"
            style={Shadows.card}
          >
            <Text className="text-lg font-bold text-[#0B1B3D] mb-4">Order Summary</Text>
            {rxCount > 0 && (
              <View className="flex-row items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                <View className="w-10 h-10 rounded-xl bg-violet-50 items-center justify-center">
                  <Shield size={18} color="#7C3AED" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-sm text-[#0B1B3D]">{rxCount} Prescription{rxCount > 1 ? 's' : ''}</Text>
                  <Text className="text-slate-400 text-xs">Pharmacist will review & price</Text>
                </View>
              </View>
            )}
            {orderItems.map((item, idx) => (
              <View
                key={idx}
                className={`flex-row items-center justify-between ${
                  idx < orderItems.length - 1 ? 'mb-2.5 pb-2.5 border-b border-slate-100' : ''
                }`}
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <Pill size={12} color="#1A73E8" />
                  <Text className="text-sm text-[#0B1B3D] font-medium" numberOfLines={1}>{item.name}</Text>
                </View>
                <Text className="text-slate-400 text-xs mr-2">x{item.qty}</Text>
                <Text className="text-[#0B1B3D] font-semibold text-sm">Rs. {item.price * item.qty}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Delivery Slot */}
        <View
          className="bg-white p-6 rounded-[24px] border border-slate-100 mb-4"
          style={Shadows.card}
        >
          <Text className="text-lg font-bold text-[#0B1B3D] mb-4">Delivery Slot</Text>
          <View className="gap-3">
            {deliverySlots.map((slot) => (
              <Pressable
                key={slot.id}
                onPress={() => setSelectedSlot(slot.id)}
                className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                  selectedSlot === slot.id
                    ? 'border-[#1A73E8] bg-[#1A73E8]/5'
                    : 'border-slate-100 bg-slate-50/50'
                }`}
              >
                <View>
                  <Text className={`font-bold ${selectedSlot === slot.id ? 'text-[#0B1B3D]' : 'text-slate-600'}`}>
                    {slot.label}
                  </Text>
                  <Text className="text-xs text-slate-400">{slot.time}</Text>
                </View>
                <View className="flex-row items-center gap-3">
                  {slot.fee > 0 && (
                    <Text className="text-xs text-amber-600 font-bold">+Rs. {slot.fee}</Text>
                  )}
                  {slot.fee === 0 && slot.id !== 'scheduled' && (
                    <Text className="text-xs text-emerald-600 font-bold">Free</Text>
                  )}
                  <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    selectedSlot === slot.id ? 'border-[#1A73E8]' : 'border-slate-300'
                  }`}>
                    {selectedSlot === slot.id && (
                      <View className="w-3 h-3 rounded-full bg-[#1A73E8]" />
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Payment Method */}
        <View
          className="bg-white p-6 rounded-[24px] border border-slate-100 mb-4"
          style={Shadows.card}
        >
          <Text className="text-lg font-bold text-[#0B1B3D] mb-4">Payment Method</Text>
          <View className="gap-3">
            {paymentMethods.map((pm) => (
              <Pressable
                key={pm.id}
                onPress={() => setSelectedPayment(pm.id)}
                className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                  selectedPayment === pm.id
                    ? 'border-[#1A73E8] bg-[#1A73E8]/5'
                    : 'border-slate-100 bg-slate-50/50'
                }`}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View
                    className={`w-10 h-10 rounded-xl items-center justify-center ${
                      selectedPayment === pm.id ? 'bg-primary/10' : 'bg-slate-100'
                    }`}
                  >
                    <pm.icon
                      size={20}
                      color={selectedPayment === pm.id ? '#1A73E8' : '#94A3B8'}
                    />
                  </View>
                  <View>
                    <Text
                      className={`font-bold ${
                        selectedPayment === pm.id ? 'text-[#0B1B3D]' : 'text-slate-600'
                      }`}
                    >
                      {pm.label}
                    </Text>
                    {pm.desc && (
                      <Text className="text-xs text-slate-400 font-medium">{pm.desc}</Text>
                    )}
                  </View>
                </View>
                {/* Radio */}
                <View
                  className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    selectedPayment === pm.id ? 'border-[#1A73E8]' : 'border-slate-300'
                  }`}
                >
                  {selectedPayment === pm.id && (
                    <View className="w-3 h-3 rounded-full bg-[#1A73E8]" />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Price Breakdown */}
        <View
          className="bg-white p-6 rounded-[24px] border border-slate-100 mb-4"
          style={Shadows.card}
        >
          <Text className="text-lg font-bold text-[#0B1B3D] mb-4">Price Details</Text>
          <View className="gap-2">
            {subtotal > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500 font-medium">Subtotal ({orderItems.length} items)</Text>
                <Text className="text-[#0B1B3D] font-medium">Rs. {subtotal}</Text>
              </View>
            )}
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-500 font-medium">Delivery Fee</Text>
              <Text className={`font-medium ${deliveryFee === 0 ? 'text-emerald-600' : 'text-[#0B1B3D]'}`}>
                {deliveryFee === 0 ? 'Free' : `Rs. ${deliveryFee}`}
              </Text>
            </View>
            {rxCount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-slate-500 font-medium">Prescription medicines</Text>
                <Text className="text-amber-600 font-medium text-sm">To be confirmed</Text>
              </View>
            )}
            <View className="flex-row justify-between pt-3 mt-2 border-t border-slate-100">
              <Text className="text-base font-extrabold text-[#0B1B3D]">Total</Text>
              <Text className="text-base font-extrabold text-[#0B1B3D]">
                Rs. {total}{rxCount > 0 ? '+' : ''}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-100" style={Shadows.presence}>
        <Pressable
          onPress={() => router.push('/patient/order-confirmation')}
          className="w-full bg-[#1A73E8] py-4 rounded-full items-center flex-row justify-center gap-2"
          style={Shadows.focus}
        >
          {selectedPayment === 'cod' ? (
            <>
              <Banknote size={18} color="#FFFFFF" />
              <Text className="text-white font-bold text-base">
                Place Order • Rs. {total}{rxCount > 0 ? '+' : ''}
              </Text>
            </>
          ) : (
            <>
              <Lock size={18} color="#FFFFFF" />
              <Text className="text-white font-bold text-base">
                Pay Rs. {total}{rxCount > 0 ? '+' : ''}
              </Text>
            </>
          )}
        </Pressable>
        {selectedPayment === 'cod' && (
          <Text className="text-slate-400 text-[10px] text-center mt-2 font-medium">
            Pay cash when your order is delivered
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}
