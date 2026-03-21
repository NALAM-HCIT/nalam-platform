import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft, Package, Check, RotateCcw, Calendar,
  Pill, Clock, Truck, XCircle,
} from 'lucide-react-native';

type OrderStatus = 'placed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled';

interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  deliveredAt?: string;
  estimatedDelivery?: string;
}

const currentOrders: Order[] = [
  {
    id: 'NLM-12345',
    date: 'Mar 20, 2026',
    status: 'processing',
    items: [
      { name: 'Amlodipine 5mg', qty: 14, price: 120 },
      { name: 'Neurobion Forte', qty: 30, price: 180 },
    ],
    total: 300,
    estimatedDelivery: '45 mins',
  },
  {
    id: 'NLM-12348',
    date: 'Mar 21, 2026',
    status: 'placed',
    items: [
      { name: 'Paracetamol 500mg', qty: 10, price: 35 },
      { name: 'Cough Relief Syrup', qty: 1, price: 90 },
    ],
    total: 125,
    estimatedDelivery: '1 hr',
  },
];

const pastOrders: Order[] = [
  {
    id: 'NLM-12340',
    date: 'Mar 18, 2026',
    status: 'delivered',
    deliveredAt: 'Mar 18, 2026 • 3:45 PM',
    items: [
      { name: 'Amlodipine 5mg', qty: 14, price: 120 },
      { name: 'Metformin 500mg', qty: 30, price: 95 },
    ],
    total: 215,
  },
  {
    id: 'NLM-12298',
    date: 'Mar 10, 2026',
    status: 'delivered',
    deliveredAt: 'Mar 10, 2026 • 11:20 AM',
    items: [
      { name: 'Paracetamol 500mg', qty: 10, price: 35 },
      { name: 'Cetirizine 10mg', qty: 10, price: 45 },
      { name: 'Vitamin D3 60k', qty: 4, price: 120 },
    ],
    total: 200,
  },
  {
    id: 'NLM-12250',
    date: 'Feb 28, 2026',
    status: 'cancelled',
    items: [
      { name: 'Omeprazole 20mg', qty: 14, price: 85 },
    ],
    total: 85,
  },
  {
    id: 'NLM-12190',
    date: 'Feb 15, 2026',
    status: 'delivered',
    deliveredAt: 'Feb 15, 2026 • 5:10 PM',
    items: [
      { name: 'Neurobion Forte', qty: 30, price: 180 },
      { name: 'Calcium + D3', qty: 30, price: 210 },
    ],
    total: 390,
  },
  {
    id: 'NLM-12101',
    date: 'Jan 30, 2026',
    status: 'delivered',
    deliveredAt: 'Jan 30, 2026 • 2:00 PM',
    items: [
      { name: 'Amlodipine 5mg', qty: 14, price: 120 },
    ],
    total: 120,
  },
];

const allOrders = [...currentOrders, ...pastOrders];

const statusConfig: Record<OrderStatus, { label: string; bg: string; border: string; text: string; icon: React.ElementType; iconColor: string }> = {
  placed: {
    label: 'Placed',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-600',
    icon: Check,
    iconColor: '#2563EB',
  },
  processing: {
    label: 'Processing',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-600',
    icon: Clock,
    iconColor: '#D97706',
  },
  out_for_delivery: {
    label: 'On the way',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-600',
    icon: Truck,
    iconColor: '#7C3AED',
  },
  delivered: {
    label: 'Delivered',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-600',
    icon: Check,
    iconColor: '#059669',
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-600',
    icon: XCircle,
    iconColor: '#E11D48',
  },
};

const orderStepKeys = ['placed', 'processing', 'out_for_delivery', 'delivered'] as const;

const getStepStatus = (stepKey: string, currentStatus: string) => {
  const stepIndex = orderStepKeys.indexOf(stepKey as typeof orderStepKeys[number]);
  const currentIndex = orderStepKeys.indexOf(currentStatus as typeof orderStepKeys[number]);
  if (stepIndex < currentIndex) return 'completed';
  if (stepIndex === currentIndex) return 'current';
  return 'pending';
};

type FilterTab = 'current' | 'all' | 'delivered' | 'cancelled';

export default function OrderHistoryScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('current');

  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case 'current': return currentOrders;
      case 'delivered': return allOrders.filter((o) => o.status === 'delivered');
      case 'cancelled': return allOrders.filter((o) => o.status === 'cancelled');
      default: return allOrders;
    }
  }, [activeFilter]);

  const filters: { key: FilterTab; label: string; count: number }[] = [
    { key: 'current', label: 'Current', count: currentOrders.length },
    { key: 'all', label: 'All', count: allOrders.length },
    { key: 'delivered', label: 'Delivered', count: allOrders.filter((o) => o.status === 'delivered').length },
    { key: 'cancelled', label: 'Cancelled', count: allOrders.filter((o) => o.status === 'cancelled').length },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
        >
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="text-xl font-bold tracking-tight text-midnight flex-1 ml-2">
          My Orders
        </Text>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-6 gap-2 mb-4">
        {filters.map((filter) => (
          <Pressable
            key={filter.key}
            onPress={() => setActiveFilter(filter.key)}
            className={`px-4 py-2 rounded-full flex-row items-center gap-1.5 ${
              activeFilter === filter.key
                ? 'bg-primary'
                : 'bg-white border border-slate-200'
            }`}
            style={activeFilter === filter.key ? Shadows.focus : undefined}
          >
            <Text
              className={`text-xs font-bold ${
                activeFilter === filter.key ? 'text-white' : 'text-slate-500'
              }`}
            >
              {filter.label}
            </Text>
            <View
              className={`px-1.5 py-0.5 rounded-full ${
                activeFilter === filter.key ? 'bg-white/20' : 'bg-slate-100'
              }`}
            >
              <Text
                className={`text-[10px] font-bold ${
                  activeFilter === filter.key ? 'text-white' : 'text-slate-400'
                }`}
              >
                {filter.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Orders List */}
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <View className="items-center justify-center pt-20">
            <Package size={48} color="#CBD5E1" />
            <Text className="text-slate-400 text-base font-medium mt-4">No orders found</Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const config = statusConfig[order.status];
            const StatusIcon = config.icon;
            const isActive = order.status === 'placed' || order.status === 'processing' || order.status === 'out_for_delivery';

            return (
              <Pressable
                key={order.id}
                onPress={isActive ? () => router.push('/patient/order-confirmation') : undefined}
                className="bg-white rounded-[24px] p-5 mb-4 border border-slate-100"
                style={Shadows.card}
              >
                {/* Order Header */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2.5">
                    <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
                      <Package size={18} color="#1A73E8" />
                    </View>
                    <View>
                      <Text className="font-bold text-sm text-midnight">Order #{order.id}</Text>
                      <View className="flex-row items-center gap-1 mt-0.5">
                        <Calendar size={10} color="#94A3B8" />
                        <Text className="text-slate-400 text-xs">{order.date}</Text>
                      </View>
                    </View>
                  </View>
                  <View className={`${config.bg} px-3 py-1 rounded-full border ${config.border} flex-row items-center gap-1`}>
                    <StatusIcon size={10} color={config.iconColor} strokeWidth={2.5} />
                    <Text className={`${config.text} text-[10px] font-bold uppercase tracking-wider`}>
                      {config.label}
                    </Text>
                  </View>
                </View>

                {/* Progress Stepper for Active Orders */}
                {isActive && (
                  <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-1">
                      {orderStepKeys.map((stepKey, index) => {
                        const stepStatus = getStepStatus(stepKey, order.status);
                        const StepIcon = statusConfig[stepKey].icon;
                        return (
                          <React.Fragment key={stepKey}>
                            {index > 0 && (
                              <View className={`flex-1 h-[2px] mx-1 rounded-full ${
                                stepStatus === 'pending' ? 'bg-slate-200' : 'bg-primary/30'
                              }`} />
                            )}
                            <View className={`w-7 h-7 rounded-full items-center justify-center ${
                              stepStatus === 'completed' ? 'bg-primary'
                                : stepStatus === 'current' ? 'bg-primary/10 border border-primary'
                                : 'bg-slate-100 border border-slate-200'
                            }`}>
                              <StepIcon
                                size={13}
                                color={stepStatus === 'completed' ? '#FFFFFF' : stepStatus === 'current' ? '#1A73E8' : '#CBD5E1'}
                                strokeWidth={2.5}
                              />
                            </View>
                          </React.Fragment>
                        );
                      })}
                    </View>
                    <View className="flex-row items-center justify-between mt-1">
                      {orderStepKeys.map((stepKey) => (
                        <Text key={stepKey} className="text-[9px] text-slate-400 font-medium text-center" style={{ width: 52 }}>
                          {statusConfig[stepKey].label}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* Items List */}
                <View className="bg-slate-50 rounded-2xl p-3.5 mb-3">
                  {order.items.map((item, idx) => (
                    <View
                      key={idx}
                      className={`flex-row items-center justify-between ${
                        idx < order.items.length - 1 ? 'mb-2.5 pb-2.5 border-b border-slate-100' : ''
                      }`}
                    >
                      <View className="flex-row items-center gap-2 flex-1">
                        <Pill size={12} color="#94A3B8" />
                        <Text className="text-sm text-midnight font-medium" numberOfLines={1}>
                          {item.name}
                        </Text>
                      </View>
                      <Text className="text-slate-400 text-xs">x{item.qty}</Text>
                      <Text className="text-midnight font-semibold text-sm ml-3">Rs. {item.price}</Text>
                    </View>
                  ))}
                </View>

                {/* Delivered At */}
                {order.deliveredAt && (
                  <Text className="text-slate-400 text-xs mb-3">
                    Delivered: {order.deliveredAt}
                  </Text>
                )}

                {/* Estimated Delivery for Active */}
                {isActive && order.estimatedDelivery && (
                  <Text className="text-slate-400 text-xs mb-3">
                    Estimated delivery: {order.estimatedDelivery}
                  </Text>
                )}

                {/* Footer */}
                <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
                  <Text className="text-midnight font-extrabold text-base">Rs. {order.total}</Text>
                  {isActive ? (
                    <Pressable
                      onPress={() => router.push('/patient/order-confirmation')}
                      className="flex-row items-center gap-1"
                    >
                      <Truck size={12} color="#1A73E8" />
                      <Text className="text-primary text-xs font-bold">Track Order</Text>
                    </Pressable>
                  ) : order.status === 'delivered' ? (
                    <Pressable
                      onPress={() => router.push('/patient/(tabs)/pharmacy')}
                      className="flex-row items-center gap-1"
                    >
                      <RotateCcw size={12} color="#1A73E8" />
                      <Text className="text-primary text-xs font-bold">Reorder</Text>
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
