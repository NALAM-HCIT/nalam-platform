import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import {
  Bell, Clock, CheckCircle, Package, X,
  ChevronRight, Truck, Building2, FileText, AlertTriangle,
} from 'lucide-react-native';

const prescriptionData = [
  {
    id: 'RX-2041',
    patient: 'John Doe',
    age: 45,
    doctor: 'Dr. Aruna Reddy',
    department: 'Cardiology',
    meds: [
      { name: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days' },
      { name: 'Metoprolol 25mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '30 days' },
      { name: 'Aspirin 75mg', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days' },
      { name: 'Atorvastatin 10mg', dosage: '1 tablet', frequency: 'At bedtime', duration: '30 days' },
    ],
    priority: 'STAT',
    priorityColor: '#DC2626',
    borderColor: '#DC2626',
    time: '10:30 AM',
  },
  {
    id: 'RX-2042',
    patient: 'Jane Smith',
    age: 32,
    doctor: 'Dr. Sarah Johnson',
    department: 'General Medicine',
    meds: [
      { name: 'Amoxicillin 500mg', dosage: '1 capsule', frequency: 'Three times daily', duration: '7 days' },
      { name: 'Paracetamol 650mg', dosage: '1 tablet', frequency: 'As needed (max 3/day)', duration: '5 days' },
    ],
    priority: 'URGENT',
    priorityColor: '#38BDF8',
    borderColor: '#38BDF8',
    time: '10:15 AM',
  },
  {
    id: 'RX-2043',
    patient: 'Robert Brown',
    age: 58,
    doctor: 'Dr. Kumar Patel',
    department: 'Endocrinology',
    meds: [
      { name: 'Metformin 500mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '90 days' },
      { name: 'Glimepiride 1mg', dosage: '1 tablet', frequency: 'Before breakfast', duration: '90 days' },
      { name: 'Vitamin D3 60K IU', dosage: '1 sachet', frequency: 'Weekly', duration: '8 weeks' },
    ],
    priority: 'Regular',
    priorityColor: '#64748B',
    borderColor: '#BFDBFE',
    time: '09:50 AM',
  },
];

const activeOrdersData = [
  {
    id: 'ORD-4521',
    patient: 'Anita Patel',
    status: 'Ready for Pickup',
    statusColor: '#22C55E',
    icon: CheckCircle,
    items: 3,
    doctor: 'Dr. Aruna Reddy',
    meds: ['Amlodipine 5mg', 'Losartan 50mg', 'Hydrochlorothiazide 12.5mg'],
    time: '09:15 AM',
  },
  {
    id: 'ORD-4522',
    patient: 'Ravi Kumar',
    status: 'In Delivery',
    statusColor: '#F59E0B',
    icon: Truck,
    items: 2,
    doctor: 'Dr. Sarah Johnson',
    meds: ['Azithromycin 500mg', 'Montelukast 10mg'],
    time: '08:45 AM',
  },
  {
    id: 'ORD-4523',
    patient: 'Priya Sharma',
    status: 'Ready for Pickup',
    statusColor: '#22C55E',
    icon: CheckCircle,
    items: 1,
    doctor: 'Dr. Kumar Patel',
    meds: ['Insulin Glargine 100IU/mL'],
    time: '08:30 AM',
  },
];

const notificationsData = [
  { id: 1, title: 'New Prescription', message: 'RX-2041 from Dr. Aruna Reddy - STAT priority', time: '2 min ago', read: false },
  { id: 2, title: 'Order Update', message: 'ORD-4521 marked as Ready for Pickup', time: '15 min ago', read: false },
  { id: 3, title: 'New Prescription', message: 'RX-2042 from Dr. Sarah Johnson - URGENT', time: '25 min ago', read: true },
  { id: 4, title: 'Clarification Response', message: 'Dr. Kumar Patel responded to RX-2038 query', time: '1 hour ago', read: true },
  { id: 5, title: 'Order Completed', message: 'ORD-4517 picked up by patient', time: '2 hours ago', read: true },
];

export default function PharmacistDashboard() {
  const userName = useAuthStore((s) => s.userName);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(notificationsData);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const handleReviewPrescription = (rx: typeof prescriptionData[0]) => {
    const medsList = rx.meds.map((m, i) => `${i + 1}. ${m.name}\n   Dosage: ${m.dosage}\n   Frequency: ${m.frequency}\n   Duration: ${m.duration}`).join('\n\n');

    Alert.alert(
      `${rx.id} - Prescription Review`,
      `Patient: ${rx.patient} (Age: ${rx.age})\nDoctor: ${rx.doctor}\nDepartment: ${rx.department}\nPriority: ${rx.priority}\nTime: ${rx.time}\n\nMedications:\n\n${medsList}`,
      [
        { text: 'Reject', style: 'destructive', onPress: () => Alert.alert('Rejected', `Prescription ${rx.id} has been rejected. The doctor will be notified.`) },
        { text: 'Need Clarification', onPress: () => Alert.alert('Clarification Requested', `A clarification request has been sent to ${rx.doctor} for ${rx.id}.`) },
        { text: 'Accept & Dispense', onPress: () => Alert.alert('Accepted', `Prescription ${rx.id} accepted. Order has been created for dispensing.`) },
      ]
    );
  };

  const handleOrderTap = (order: typeof activeOrdersData[0]) => {
    const medsText = order.meds.map((m, i) => `${i + 1}. ${m}`).join('\n');
    const buttons: any[] = [];

    if (order.status === 'Ready for Pickup') {
      buttons.push({ text: 'Mark Picked Up', onPress: () => Alert.alert('Updated', `${order.id} marked as picked up.`) });
      buttons.push({ text: 'Send for Delivery', onPress: () => Alert.alert('Updated', `${order.id} sent for delivery.`) });
    } else if (order.status === 'In Delivery') {
      buttons.push({ text: 'Mark Delivered', onPress: () => Alert.alert('Updated', `${order.id} marked as delivered.`) });
    }
    buttons.push({ text: 'Close', style: 'cancel' });

    Alert.alert(
      `${order.id} - Order Details`,
      `Patient: ${order.patient}\nDoctor: ${order.doctor}\nStatus: ${order.status}\nTime: ${order.time}\nItems: ${order.items}\n\nMedications:\n${medsText}`,
      buttons
    );
  };

  const markNotificationRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Notifications Modal */}
      <Modal visible={showNotifications} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[70%]" style={Shadows.presence}>
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <View>
                <Text className="text-xl font-extrabold text-midnight">Notifications</Text>
                {unreadCount > 0 && (
                  <Text className="text-xs text-slate-500 mt-0.5">{unreadCount} unread</Text>
                )}
              </View>
              <View className="flex-row items-center gap-3">
                {unreadCount > 0 && (
                  <Pressable onPress={markAllRead} className="px-3 py-1.5 rounded-full bg-primary/10 active:bg-primary/20">
                    <Text className="text-primary text-xs font-bold">Mark all read</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setShowNotifications(false)} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200">
                  <X size={18} color="#64748B" />
                </Pressable>
              </View>
            </View>
            <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
              {notifications.map((notif) => (
                <Pressable
                  key={notif.id}
                  onPress={() => {
                    markNotificationRead(notif.id);
                    Alert.alert(notif.title, notif.message);
                  }}
                  className={`p-4 rounded-2xl mb-3 border active:opacity-80 ${notif.read ? 'bg-white border-slate-100' : 'bg-primary/5 border-primary/15'}`}
                  style={Shadows.card}
                >
                  <View className="flex-row items-start gap-3">
                    <View className={`w-9 h-9 rounded-full items-center justify-center ${notif.read ? 'bg-slate-100' : 'bg-primary/10'}`}>
                      {notif.title.includes('Prescription') ? (
                        <FileText size={16} color={notif.read ? '#94A3B8' : '#1A73E8'} />
                      ) : notif.title.includes('Clarification') ? (
                        <AlertTriangle size={16} color={notif.read ? '#94A3B8' : '#F59E0B'} />
                      ) : (
                        <Package size={16} color={notif.read ? '#94A3B8' : '#22C55E'} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm font-bold ${notif.read ? 'text-slate-500' : 'text-midnight'}`}>{notif.title}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{notif.message}</Text>
                      <Text className="text-[10px] text-slate-400 mt-1">{notif.time}</Text>
                    </View>
                    {!notif.read && <View className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />}
                  </View>
                </Pressable>
              ))}
              <View className="h-8" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A73E8" />}
      >
        {/* Header */}
        <View className="bg-primary/10 pt-6 pb-8 px-6 rounded-b-xl border-b border-primary/10">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-primary items-center justify-center" style={Shadows.focus}>
                <Building2 size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-xl font-bold tracking-tight text-midnight">Arun Priya Hospital</Text>
                <Text className="text-xs font-medium text-slate-500">Pharmacist Portal</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setShowNotifications(true)}
                className="w-10 h-10 rounded-full bg-white items-center justify-center border border-slate-100 active:bg-slate-50"
                style={Shadows.card}
              >
                <Bell size={20} color="#64748B" />
                {unreadCount > 0 && (
                  <View className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white items-center justify-center px-1">
                    <Text className="text-white text-[9px] font-bold">{unreadCount}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => router.navigate('/pharmacist/(tabs)/profile' as any)}
                className="w-10 h-10 rounded-full border-2 border-primary/20 bg-slate-200 items-center justify-center active:opacity-80"
              >
                <Text className="text-primary font-bold text-sm">{(userName || 'P')[0].toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-2">
            <Text className="text-sm font-light uppercase tracking-widest text-slate-500">
              Clinical Dashboard
            </Text>
            <Text className="text-2xl font-extrabold tracking-tight text-midnight">
              Good morning, {userName || 'Pharmacist'}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View className="px-6 mt-4 flex-row gap-3">
          <View className="flex-1 bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="flex-row items-center gap-2 mb-1">
              <FileText size={14} color="#1A73E8" />
              <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending Rx</Text>
            </View>
            <Text className="text-2xl font-extrabold text-midnight">{prescriptionData.length}</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="flex-row items-center gap-2 mb-1">
              <Package size={14} color="#22C55E" />
              <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Orders</Text>
            </View>
            <Text className="text-2xl font-extrabold text-midnight">{activeOrdersData.length}</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="flex-row items-center gap-2 mb-1">
              <Clock size={14} color="#F59E0B" />
              <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Today</Text>
            </View>
            <Text className="text-2xl font-extrabold text-midnight">12</Text>
          </View>
        </View>

        {/* New Prescriptions */}
        <View className="px-6 mt-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-extrabold tracking-tight text-midnight">New Prescriptions</Text>
              <View className="px-2.5 py-0.5 rounded-full bg-primary/10">
                <Text className="text-primary text-xs font-bold">{prescriptionData.length} Pending</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.navigate('/pharmacist/(tabs)/inventory' as any)}
              className="flex-row items-center gap-1 active:opacity-60"
            >
              <Text className="text-primary text-sm font-semibold">View All</Text>
              <ChevronRight size={14} color="#1A73E8" />
            </Pressable>
          </View>
          {prescriptionData.map((rx) => (
            <View
              key={rx.id}
              className="bg-white rounded-2xl p-4 mb-3 overflow-hidden"
              style={Shadows.card}
            >
              {/* Left accent border */}
              <View className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: rx.borderColor }} />

              <View className="flex-row items-start justify-between ml-2">
                <Pressable className="flex-1 active:opacity-70" onPress={() => handleReviewPrescription(rx)}>
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="font-extrabold text-base text-midnight">{rx.patient}</Text>
                    <View className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: `${rx.priorityColor}15` }}>
                      <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: rx.priorityColor }}>
                        {rx.priority}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-slate-500 text-xs">{rx.doctor}</Text>
                  <Text className="text-slate-400 text-xs mt-1">{rx.meds.length} medications - {rx.id}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleReviewPrescription(rx)}
                  className="bg-primary py-2.5 px-5 rounded-full active:opacity-80"
                  style={Shadows.focus}
                >
                  <Text className="text-white font-semibold text-xs">Review</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Active Orders - Horizontal scroll */}
        <View className="mt-6">
          <View className="px-6 flex-row items-center justify-between mb-4">
            <Text className="text-lg font-extrabold tracking-tight text-midnight">Active Orders</Text>
            <Pressable
              onPress={() => router.navigate('/pharmacist/(tabs)/orders' as any)}
              className="flex-row items-center gap-1 active:opacity-60"
            >
              <Text className="text-primary text-sm font-semibold">View All</Text>
              <ChevronRight size={14} color="#1A73E8" />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}>
            {activeOrdersData.map((order) => (
              <Pressable
                key={order.id}
                onPress={() => handleOrderTap(order)}
                className="w-56 bg-white rounded-2xl p-4 active:opacity-80"
                style={Shadows.card}
              >
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: `${order.statusColor}15` }}>
                    <order.icon size={16} color={order.statusColor} />
                  </View>
                  <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: order.statusColor }}>
                    {order.status}
                  </Text>
                </View>
                <Text className="font-extrabold text-sm text-midnight">{order.patient}</Text>
                <Text className="text-slate-500 text-xs mt-0.5">{order.id} - {order.items} items</Text>
                <Text className="text-slate-400 text-[10px] mt-1">{order.time}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
