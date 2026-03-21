import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft, MoreVertical, Minus, Plus, Trash2, Pill, Info, ArrowRight, User,
} from 'lucide-react-native';

interface PrescribedItem {
  id: string;
  name: string;
  dosage: string;
  price: number;
  quantity: number;
}

interface CartItem {
  id: string;
  name: string;
  category: string;
  form: string;
  price: number;
  quantity: number;
  image: string;
  requiresPrescription?: boolean;
}

const prescriptionInfo = {
  doctor: 'Dr. Aruna Devi',
  date: 'Oct 24, 2023',
};

const initialPrescribedItems: PrescribedItem[] = [
  {
    id: 'p1',
    name: 'Amlodipine 5mg',
    dosage: '14 Days, 1 tablet daily (Morning)',
    price: 120.0,
    quantity: 1,
  },
  {
    id: 'p2',
    name: 'Neurobion Forte',
    dosage: '30 Days, 1 tablet daily (After food)',
    price: 85.0,
    quantity: 1,
  },
];

const initialCartItems: CartItem[] = [
  {
    id: 'c1',
    name: 'Amoxicillin 500mg',
    category: 'Antibiotic',
    form: '10 Capsules',
    price: 120.0,
    quantity: 1,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZsEV-Ix-Ul18Mnfd0TaO29AFxFXCZrb3ffSGv3b-GGS3bryetzIzn8bwhNPkU28HBzVjsNzG3Nr_plpI09ch75I-YjVYUo-Zy-JEn6WnydMDymOyFgMzxt9wmmDvoIxvCdmF7NCZMfIJRasOck7_FMY5JaomIWTRo0LBFC0kjNc49Ic5eggddXD9fK00TDx6Y8eRgX4ib8TseUc3jaKKTsNIpb0rVT5RM7LP4XA-JIUBfXb2oyGKNrqKsj8wtse5rCB4ezhQpVgTl',
    requiresPrescription: true,
  },
  {
    id: 'c2',
    name: 'Cough Relief Syrup',
    category: 'Expectorant',
    form: '100ml',
    price: 85.0,
    quantity: 2,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuChb4HDPfzME4H_O4SCg4ndIbJVChvq3ipDvgU8c6baWx6Uxr0e_XFvR8AmWoiEcBxNtmqrJtm1Eiq2gB-h_c9hXD9YZOaQNqT3YyKS6QvLuWkMkHe2VZumyiYjT21QYawW-wvtcYPBdyP3aNvuSg7JzYYoTAwp7qlJhWmnjReq_rjwcpRf-3h__-0Pm1RGrDUUjJe9QmgSUhzgxMo5MwoYnqcGMUZNSP1oON-CjNhM3Rgs1-KuNGOkOTiQ_T-X-ipgG8uVB3BW16rG',
  },
];

export default function PharmacyCartScreen() {
  const router = useRouter();
  const [prescribedItems, setPrescribedItems] = useState(initialPrescribedItems);
  const [cartItems, setCartItems] = useState(initialCartItems);

  const updatePrescribedQty = (id: string, delta: number) => {
    setPrescribedItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removePrescribedItem = (id: string) => {
    setPrescribedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateCartQty = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const totalItemCount = prescribedItems.length + cartItems.length;

  const subtotal =
    prescribedItems.reduce((sum, i) => sum + i.price * i.quantity, 0) +
    cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = 40.0;
  const total = subtotal + deliveryFee;

  const prescriptionRequired = cartItems.some((item) => item.requiresPrescription);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header with Blue Gradient */}
      <View className="bg-[#1A73E8] pt-4 pb-12 px-6 rounded-b-[32px]" style={Shadows.focus}>
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text className="text-xl font-bold text-white">My Cart</Text>
          <Pressable className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
            <MoreVertical size={20} color="#FFFFFF" />
          </Pressable>
        </View>
        <Text className="text-white/90 text-sm">
          {totalItemCount} {totalItemCount === 1 ? 'Item' : 'Items'} in your pharmacy cart
        </Text>
      </View>

      {/* Main Content */}
      <ScrollView
        className="flex-1 -mt-6 px-6"
        contentContainerStyle={{ paddingBottom: 320 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Prescribed Medicines Section */}
        {prescribedItems.length > 0 && (
          <View className="mb-4 mt-2">
            <Text className="text-xs font-light tracking-widest uppercase text-slate-500 mb-1">
              Active Prescription
            </Text>
            <Text className="text-2xl font-extrabold tracking-tight text-[#0B1B3D] mb-4">
              Prescribed Medicines Added
            </Text>

            {/* Doctor Info Card */}
            <View
              className="bg-white/70 p-5 rounded-[24px] flex-row items-center gap-4 mb-4"
              style={Shadows.presence}
            >
              <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
                <User size={20} color="#1A73E8" />
              </View>
              <View>
                <Text className="font-semibold text-[#0B1B3D]">{prescriptionInfo.doctor}</Text>
                <Text className="text-sm text-slate-500">
                  Consultation: {prescriptionInfo.date}
                </Text>
              </View>
            </View>

            {/* Prescribed Items Card */}
            <View className="bg-white/70 rounded-[24px] overflow-hidden" style={Shadows.presence}>
              {prescribedItems.map((item, index) => (
                <View
                  key={item.id}
                  className={`p-5 flex-row items-start gap-4 ${
                    index < prescribedItems.length - 1 ? 'border-b border-white/50' : ''
                  }`}
                >
                  <View className="w-16 h-16 rounded-xl bg-blue-50 items-center justify-center">
                    <Pill size={28} color="#1A73E8" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row justify-between items-start">
                      <Text className="font-bold text-lg text-[#0B1B3D]">{item.name}</Text>
                      <Pressable onPress={() => removePrescribedItem(item.id)} className="p-1">
                        <Trash2 size={20} color="#DC2626" />
                      </Pressable>
                    </View>
                    <Text className="text-slate-500 text-sm mt-1">{item.dosage}</Text>
                    <View className="flex-row justify-between items-center mt-4">
                      <View className="flex-row items-center gap-3 bg-white/50 rounded-full p-1 border border-blue-100">
                        <Pressable
                          onPress={() => updatePrescribedQty(item.id, -1)}
                          className="w-8 h-8 rounded-full items-center justify-center"
                        >
                          <Minus size={16} color="#1A73E8" />
                        </Pressable>
                        <Text className="font-bold text-[#0B1B3D] px-2">{item.quantity}</Text>
                        <Pressable
                          onPress={() => updatePrescribedQty(item.id, 1)}
                          className="w-8 h-8 rounded-full items-center justify-center"
                        >
                          <Plus size={16} color="#1A73E8" />
                        </Pressable>
                      </View>
                      <Text className="font-extrabold text-lg text-[#0B1B3D]">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Regular Cart Items */}
        {cartItems.length > 0 && (
          <View className="gap-4 mt-2">
            {prescribedItems.length > 0 && (
              <Text className="text-xs font-light tracking-widest uppercase text-slate-500">
                Other Items
              </Text>
            )}
            {cartItems.map((item) => (
              <View
                key={item.id}
                className="bg-white p-4 rounded-xl border border-blue-50 flex-row items-center gap-4"
                style={Shadows.card}
              >
                <View className="w-16 h-16 rounded-xl bg-slate-50 items-center justify-center overflow-hidden border border-slate-100">
                  <Image
                    source={{ uri: item.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-[#0B1B3D]">{item.name}</Text>
                  <Text className="text-xs text-slate-500 mb-2 font-medium">
                    {item.category} {'\u2022'} {item.form}
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[#1A73E8] font-bold">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </Text>
                    <View className="flex-row items-center gap-3 bg-slate-100 px-2 py-1 rounded-full">
                      <Pressable
                        onPress={() => updateCartQty(item.id, -1)}
                        className="w-6 h-6 items-center justify-center"
                      >
                        <Minus size={14} color="#64748B" />
                      </Pressable>
                      <Text className="text-sm font-bold w-4 text-center text-[#0B1B3D]">
                        {item.quantity}
                      </Text>
                      <Pressable
                        onPress={() => updateCartQty(item.id, 1)}
                        className="w-6 h-6 items-center justify-center"
                      >
                        <Plus size={14} color="#64748B" />
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Prescription Info Notice */}
        {prescriptionRequired && (
          <View className="bg-[#1A73E8]/5 border border-[#1A73E8]/10 p-4 rounded-xl flex-row items-start gap-3 mt-4">
            <Info size={20} color="#1A73E8" />
            <Text className="text-xs leading-relaxed text-slate-600 font-medium flex-1">
              A valid prescription is required for Amoxicillin. You can upload it during the
              checkout process.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Summary */}
      <View className="absolute bottom-0 left-0 right-0 p-6">
        <View
          className="bg-white/85 rounded-[24px] p-6 border border-white/40"
          style={Shadows.presence}
        >
          <View className="gap-3 mb-6">
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-500 font-medium">Subtotal</Text>
              <Text className="font-semibold text-[#0B1B3D]">₹{subtotal.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-500 font-medium">Delivery Fee</Text>
              <Text className="font-semibold text-[#0B1B3D]">₹{deliveryFee.toFixed(2)}</Text>
            </View>
            <View className="h-px bg-slate-200/60 my-1" />
            <View className="flex-row justify-between items-center">
              <Text className="text-lg font-bold text-[#0B1B3D]">Total Amount</Text>
              <Text className="text-xl font-bold text-[#1A73E8]">₹{total.toFixed(2)}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/patient/secure-checkout')}
            className="w-full bg-[#1A73E8] py-4 rounded-full items-center flex-row justify-center gap-2"
            style={Shadows.focus}
          >
            <Text className="text-white font-bold text-base">Proceed to Checkout</Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
