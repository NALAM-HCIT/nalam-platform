import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Clock, CheckCircle, Truck, Search, X, FileImage, ZoomIn } from 'lucide-react-native';
import { Shadows } from '@/constants/theme';
import { StatusChip } from '@/components';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

interface OrderItem {
  name: string;
  dosage: string;
  qty: number;
}

interface Order {
  id: string;
  patient: string;
  doctor: string;
  items: OrderItem[];
  status: OrderStatus;
  time: string;
  date: string;
  prescriptionImage?: string; // uploaded Rx hardcopy
  orderType?: 'digital' | 'prescription_upload';
}

const initialOrders: Order[] = [
  {
    id: 'ORD-4525',
    patient: 'Suresh Kumar',
    doctor: 'Dr. Aruna Reddy',
    items: [
      { name: 'Amlodipine', dosage: '5mg - 1 tablet twice daily', qty: 60 },
      { name: 'Atorvastatin', dosage: '10mg - 1 tablet at bedtime', qty: 30 },
    ],
    status: 'pending',
    time: '11:00 AM',
    date: 'Today',
    orderType: 'prescription_upload',
    prescriptionImage: 'https://placehold.co/600x800/E8F0FE/1A73E8?text=Prescription+Rx\\nDr.+Aruna+Reddy\\n\\nAmlodipine+5mg\\nAtorvastatin+10mg',
  },
  {
    id: 'ORD-4524',
    patient: 'Lakshmi Devi',
    doctor: 'Dr. Sarah Johnson',
    items: [
      { name: 'Amoxicillin', dosage: '500mg - 1 cap three times daily', qty: 21 },
      { name: 'Pantoprazole', dosage: '40mg - 1 tablet before breakfast', qty: 14 },
      { name: 'Cetirizine', dosage: '10mg - 1 tablet at night', qty: 10 },
    ],
    status: 'pending',
    time: '10:45 AM',
    date: 'Today',
    orderType: 'prescription_upload',
    prescriptionImage: 'https://placehold.co/600x800/FEF3C7/92400E?text=Prescription+Rx\\nDr.+Sarah+Johnson\\n\\nAmoxicillin+500mg\\nPantoprazole+40mg\\nCetirizine+10mg',
  },
  {
    id: 'ORD-4523',
    patient: 'Priya Sharma',
    doctor: 'Dr. Kumar Patel',
    items: [
      { name: 'Insulin Glargine', dosage: '100IU/mL - as directed', qty: 1 },
    ],
    status: 'preparing',
    time: '10:15 AM',
    date: 'Today',
  },
  {
    id: 'ORD-4522',
    patient: 'Ravi Kumar',
    doctor: 'Dr. Sarah Johnson',
    items: [
      { name: 'Azithromycin', dosage: '500mg - 1 tablet daily', qty: 5 },
      { name: 'Montelukast', dosage: '10mg - 1 tablet at night', qty: 30 },
    ],
    status: 'ready',
    time: '09:30 AM',
    date: 'Today',
  },
  {
    id: 'ORD-4521',
    patient: 'Anita Patel',
    doctor: 'Dr. Aruna Reddy',
    items: [
      { name: 'Amlodipine', dosage: '5mg - 1 tablet daily', qty: 30 },
      { name: 'Losartan', dosage: '50mg - 1 tablet daily', qty: 30 },
      { name: 'Hydrochlorothiazide', dosage: '12.5mg - 1 tablet daily', qty: 30 },
    ],
    status: 'ready',
    time: '09:15 AM',
    date: 'Today',
  },
  {
    id: 'ORD-4520',
    patient: 'Meena Krishnan',
    doctor: 'Dr. Kumar Patel',
    items: [
      { name: 'Metformin', dosage: '500mg - 1 tablet twice daily', qty: 60 },
      { name: 'Glimepiride', dosage: '1mg - 1 tablet before breakfast', qty: 30 },
    ],
    status: 'delivered',
    time: '08:30 AM',
    date: 'Today',
  },
  {
    id: 'ORD-4519',
    patient: 'Rajesh Nair',
    doctor: 'Dr. Aruna Reddy',
    items: [
      { name: 'Clopidogrel', dosage: '75mg - 1 tablet daily', qty: 30 },
      { name: 'Pantoprazole', dosage: '40mg - 1 tablet before breakfast', qty: 30 },
      { name: 'Rosuvastatin', dosage: '10mg - 1 tablet at bedtime', qty: 30 },
      { name: 'Metoprolol', dosage: '25mg - 1 tablet twice daily', qty: 60 },
    ],
    status: 'delivered',
    time: '08:00 AM',
    date: 'Today',
  },
];

const filterTabs: { label: string; value: 'all' | OrderStatus }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Ready', value: 'ready' },
  { label: 'Delivered', value: 'delivered' },
];

const statusConfig: Record<OrderStatus, { color: string; icon: any; variant: 'warning' | 'primary' | 'success' | 'neutral' }> = {
  pending: { color: '#F59E0B', icon: Clock, variant: 'warning' },
  preparing: { color: '#1A73E8', icon: Package, variant: 'primary' },
  ready: { color: '#22C55E', icon: CheckCircle, variant: 'success' },
  delivered: { color: '#64748B', icon: Truck, variant: 'neutral' },
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [activeFilter, setActiveFilter] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showRxImage, setShowRxImage] = useState(false);

  const filteredOrders = orders.filter((o) => {
    const matchesFilter = activeFilter === 'all' || o.status === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || o.patient.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const updateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    setShowDetail(false);
    setSelectedOrder(null);
    const statusLabel = newStatus === 'preparing' ? 'Preparing' : newStatus === 'ready' ? 'Ready for Pickup' : 'Delivered';
    Alert.alert('Status Updated', `${orderId} is now "${statusLabel}".`);
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const getStatusCounts = (status: 'all' | OrderStatus) => {
    if (status === 'all') return orders.length;
    return orders.filter((o) => o.status === status).length;
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-midnight tracking-tight">Orders</Text>
          <View className="px-3 py-1 rounded-full bg-primary/10">
            <Text className="text-primary text-xs font-bold">{orders.length} total</Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View className="px-6 mt-2 mb-3">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-slate-100" style={Shadows.card}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-sm text-midnight"
            placeholder="Search by patient or order ID..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} className="active:opacity-60">
              <X size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="mb-1">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}>
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.value;
            const count = getStatusCounts(tab.value);
            return (
              <Pressable
                key={tab.value}
                onPress={() => setActiveFilter(tab.value)}
                className={`px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5 ${isActive ? 'bg-primary' : 'bg-white border border-slate-100'}`}
              >
                <Text className={`text-[11px] font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>{tab.label}</Text>
                <View className={`px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                  <Text className={`text-[9px] font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Order List */}
      <ScrollView className="flex-1 px-6 mt-4" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {filteredOrders.length === 0 ? (
          <View className="items-center py-12">
            <Package size={40} color="#CBD5E1" />
            <Text className="text-slate-400 text-sm mt-3 font-medium">No orders found</Text>
          </View>
        ) : (
          filteredOrders.map((o) => {
            const config = statusConfig[o.status];
            const StatusIcon = config.icon;
            return (
              <Pressable
                key={o.id}
                onPress={() => openOrderDetail(o)}
                className="bg-white rounded-2xl p-4 mb-3 border border-slate-50 active:opacity-80"
                style={Shadows.card}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row gap-3 flex-1">
                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
                      <StatusIcon size={18} color={config.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-sm text-midnight">{o.id}</Text>
                      <Text className="text-slate-600 text-xs mt-0.5">{o.patient}</Text>
                      <Text className="text-slate-400 text-xs mt-0.5">{o.doctor} | {o.items.length} items</Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        <Text className="text-slate-400 text-[10px]">{o.date} at {o.time}</Text>
                        {o.prescriptionImage && (
                          <View className="flex-row items-center gap-0.5 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                            <FileImage size={8} color="#7C3AED" />
                            <Text className="text-violet-600 text-[9px] font-bold">Rx Uploaded</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <StatusChip
                    label={o.status.toUpperCase()}
                    variant={config.variant}
                  />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Prescription Image Viewer Modal */}
      <Modal visible={showRxImage} animationType="fade" transparent>
        <View className="flex-1 bg-black/90 justify-center items-center">
          <View className="absolute top-14 right-5 z-10">
            <Pressable
              onPress={() => setShowRxImage(false)}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center active:bg-white/40"
            >
              <X size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          <View className="absolute top-16 left-5 z-10">
            <View className="flex-row items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
              <FileImage size={14} color="#FFFFFF" />
              <Text className="text-white text-xs font-bold">Prescription Rx</Text>
            </View>
          </View>
          {selectedOrder?.prescriptionImage && (
            <Image
              source={{ uri: selectedOrder.prescriptionImage }}
              className="w-[90%] h-[70%] rounded-2xl"
              resizeMode="contain"
            />
          )}
          <Text className="text-white/60 text-xs mt-4 font-medium">Pinch to zoom • Tap X to close</Text>
        </View>
      </Modal>

      {/* Order Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%]" style={Shadows.presence}>
            {selectedOrder && (() => {
              const o = selectedOrder;
              const config = statusConfig[o.status];
              const StatusIcon = config.icon;
              return (
                <>
                  <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                    <View>
                      <Text className="text-xl font-extrabold text-midnight">{o.id}</Text>
                      <View className="flex-row items-center gap-2 mt-1">
                        <View className="w-5 h-5 rounded-full items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
                          <StatusIcon size={10} color={config.color} />
                        </View>
                        <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: config.color }}>{o.status}</Text>
                      </View>
                    </View>
                    <Pressable onPress={() => { setShowDetail(false); setSelectedOrder(null); }} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200">
                      <X size={18} color="#64748B" />
                    </Pressable>
                  </View>
                  <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
                    {/* Patient & Doctor Info */}
                    <View className="bg-slate-50 rounded-2xl p-4 mb-4">
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Patient</Text>
                      <Text className="text-base font-bold text-midnight">{o.patient}</Text>
                      <View className="h-px bg-slate-200 my-3" />
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Prescribing Doctor</Text>
                      <Text className="text-base font-bold text-midnight">{o.doctor}</Text>
                      <View className="h-px bg-slate-200 my-3" />
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Time</Text>
                      <Text className="text-sm text-midnight">{o.date} at {o.time}</Text>
                    </View>

                    {/* Uploaded Prescription */}
                    {o.prescriptionImage && (
                      <View className="mb-4">
                        <View className="flex-row items-center gap-2 mb-3">
                          <FileImage size={14} color="#7C3AED" />
                          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">Uploaded Prescription</Text>
                        </View>
                        <Pressable
                          onPress={() => setShowRxImage(true)}
                          className="bg-violet-50 border border-violet-200 rounded-2xl p-4 active:opacity-80"
                        >
                          <View className="w-full h-48 rounded-xl overflow-hidden bg-white border border-violet-100 mb-3">
                            <Image
                              source={{ uri: o.prescriptionImage }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          </View>
                          <View className="flex-row items-center justify-center gap-2">
                            <ZoomIn size={16} color="#7C3AED" />
                            <Text className="text-violet-700 font-bold text-sm">Tap to View Full Prescription</Text>
                          </View>
                        </Pressable>
                      </View>
                    )}

                    {/* Medications */}
                    <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Medications ({o.items.length})</Text>
                    {o.items.map((item, idx) => (
                      <View key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 mb-2" style={Shadows.card}>
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <Text className="font-bold text-sm text-midnight">{item.name}</Text>
                            <Text className="text-slate-500 text-xs mt-0.5">{item.dosage}</Text>
                          </View>
                          <View className="bg-primary/10 px-3 py-1 rounded-full">
                            <Text className="text-primary text-xs font-bold">Qty: {item.qty}</Text>
                          </View>
                        </View>
                      </View>
                    ))}

                    {/* Action Buttons */}
                    <View className="mt-4 mb-8">
                      {o.status === 'pending' && (
                        <Pressable
                          onPress={() => updateOrderStatus(o.id, 'preparing')}
                          className="bg-primary py-4 rounded-2xl items-center active:opacity-80"
                          style={Shadows.focus}
                        >
                          <Text className="text-white font-bold text-sm">Start Preparing</Text>
                        </Pressable>
                      )}
                      {o.status === 'preparing' && (
                        <Pressable
                          onPress={() => updateOrderStatus(o.id, 'ready')}
                          className="bg-emerald-500 py-4 rounded-2xl items-center active:opacity-80"
                          style={Shadows.focus}
                        >
                          <Text className="text-white font-bold text-sm">Mark Ready for Pickup</Text>
                        </Pressable>
                      )}
                      {o.status === 'ready' && (
                        <View className="gap-3">
                          <Pressable
                            onPress={() => updateOrderStatus(o.id, 'delivered')}
                            className="bg-emerald-500 py-4 rounded-2xl items-center active:opacity-80"
                            style={Shadows.focus}
                          >
                            <Text className="text-white font-bold text-sm">Mark Picked Up</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              Alert.alert('Delivery Initiated', `${o.id} has been sent for delivery.`, [
                                { text: 'OK', onPress: () => updateOrderStatus(o.id, 'delivered') },
                              ]);
                            }}
                            className="bg-amber-500 py-4 rounded-2xl items-center active:opacity-80"
                          >
                            <Text className="text-white font-bold text-sm">Send for Delivery</Text>
                          </Pressable>
                        </View>
                      )}
                      {o.status === 'delivered' && (
                        <View className="bg-slate-50 py-4 rounded-2xl items-center">
                          <Text className="text-slate-500 font-bold text-sm">Order Completed</Text>
                        </View>
                      )}
                    </View>
                  </ScrollView>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
