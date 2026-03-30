import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows } from '@/constants/theme';
import { pharmacistService, PharmacyDashboardStats, PrescriptionItem, LowStockItem } from '@/services/pharmacistService';
import { isAuthError } from '@/services/api';
import {
  Clock, CheckCircle,
  ChevronRight, Building2, FileText, AlertTriangle, Pill,
} from 'lucide-react-native';

export default function PharmacistDashboard() {
  const userName = useAuthStore((s) => s.userName);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<PharmacyDashboardStats | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);

  const loadDashboard = async () => {
    try {
      const [dashStats, rxQueue, stockAlerts] = await Promise.all([
        pharmacistService.getDashboard(),
        pharmacistService.getPrescriptions('pending'),
        pharmacistService.getLowStock(),
      ]);
      setStats(dashStats);
      setPrescriptions(rxQueue);
      setLowStock(stockAlerts);
    } catch (err) {
      if (!isAuthError(err)) {
        console.error(err);
        CustomAlert.alert('Error', 'Failed to load pharmacy dashboard.');
      }
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, []);

  const handleReviewPrescription = (rx: PrescriptionItem) => {
    CustomAlert.alert(
      `${rx.bookingReference} - Prescription`,
      `Patient: ${rx.patientName}\nDoctor: ${rx.doctorName} (${rx.doctorSpecialty})\nTime: ${rx.time}\n\nPrescription Notes:\n${rx.prescriptionNotes || 'No notes available'}`,
      [
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => {
            CustomAlert.alert('Reject Prescription', 'Select a reason:', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Duplicate Rx',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await pharmacistService.rejectPrescription(rx.id, 'Duplicate prescription');
                    loadDashboard();
                    CustomAlert.alert('Rejected', `${rx.bookingReference} has been rejected.`);
                  } catch (e) { CustomAlert.alert('Error', 'Failed to reject prescription.'); }
                },
              },
              {
                text: 'Medication Unavailable',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await pharmacistService.rejectPrescription(rx.id, 'Medication unavailable');
                    loadDashboard();
                    CustomAlert.alert('Rejected', `${rx.bookingReference} rejected — medication unavailable.`);
                  } catch (e) { CustomAlert.alert('Error', 'Failed to reject prescription.'); }
                },
              },
            ]);
          },
        },
        {
          text: 'Dispense',
          onPress: async () => {
            try {
              await pharmacistService.dispensePrescription(rx.id);
              loadDashboard();
              CustomAlert.alert('Dispensed', `${rx.bookingReference} has been dispensed successfully.`);
            } catch (e) { CustomAlert.alert('Error', 'Failed to dispense prescription.'); }
          },
        },
        { text: 'Close', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
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
                <Text className="text-xl font-bold tracking-tight text-midnight">Pharmacy</Text>
                <Text className="text-xs font-medium text-slate-500">Pharmacist Portal</Text>
              </View>
            </View>
            <Pressable
              onPress={() => router.navigate('/pharmacist/(tabs)/profile' as any)}
              className="w-10 h-10 rounded-full border-2 border-primary/20 bg-slate-200 items-center justify-center active:opacity-80"
            >
              <Text className="text-primary font-bold text-sm">{(userName || 'P')[0].toUpperCase()}</Text>
            </Pressable>
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
            <Text className="text-2xl font-extrabold text-midnight">{stats?.stats.pending ?? 0}</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="flex-row items-center gap-2 mb-1">
              <CheckCircle size={14} color="#22C55E" />
              <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dispensed</Text>
            </View>
            <Text className="text-2xl font-extrabold text-midnight">{stats?.stats.dispensed ?? 0}</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4" style={Shadows.card}>
            <View className="flex-row items-center gap-2 mb-1">
              <Clock size={14} color="#F59E0B" />
              <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</Text>
            </View>
            <Text className="text-2xl font-extrabold text-midnight">{stats?.stats.total ?? 0}</Text>
          </View>
        </View>

        {/* Low Stock Alert */}
        {lowStock.length > 0 && (
          <View className="px-6 mt-5">
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <View className="flex-row items-center gap-2 mb-3">
                <AlertTriangle size={16} color="#D97706" />
                <Text className="text-sm font-bold text-amber-800">
                  Low Stock — {lowStock.length} item{lowStock.length !== 1 ? 's' : ''}
                </Text>
              </View>
              {lowStock.map((item, idx) => (
                <View
                  key={item.id}
                  className="flex-row items-center justify-between py-2"
                  style={idx < lowStock.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#FDE68A' } : undefined}
                >
                  <View className="flex-1 mr-3">
                    <Text className="text-xs font-semibold text-amber-900" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-[10px] text-amber-600">{item.category} · {item.dosageForm}</Text>
                  </View>
                  <View
                    className="px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: item.stockQuantity === 0 ? '#FEE2E2' : '#FEF3C7' }}
                  >
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: item.stockQuantity === 0 ? '#DC2626' : '#D97706' }}
                    >
                      {item.stockQuantity === 0 ? 'OUT' : `${item.stockQuantity} left`}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pending Prescriptions */}
        <View className="px-6 mt-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg font-extrabold tracking-tight text-midnight">Pending Prescriptions</Text>
              <View className="px-2.5 py-0.5 rounded-full bg-primary/10">
                <Text className="text-primary text-xs font-bold">{prescriptions.length} Pending</Text>
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

          {prescriptions.length === 0 ? (
            <View className="items-center py-10 bg-white rounded-2xl" style={Shadows.card}>
              <Pill size={32} color="#CBD5E1" />
              <Text className="text-slate-400 text-sm mt-3 font-medium">No pending prescriptions</Text>
              <Text className="text-slate-300 text-xs mt-1">Pull down to refresh</Text>
            </View>
          ) : (
            prescriptions.map((rx) => (
              <View
                key={rx.id}
                className="bg-white rounded-2xl p-4 mb-3 overflow-hidden"
                style={Shadows.card}
              >
                <View className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-amber-400" />
                <View className="flex-row items-start justify-between ml-2">
                  <Pressable className="flex-1 active:opacity-70" onPress={() => handleReviewPrescription(rx)}>
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="font-extrabold text-base text-midnight">{rx.patientName}</Text>
                      <View className="px-2.5 py-0.5 rounded-full bg-amber-50">
                        <Text className="text-[10px] font-bold uppercase tracking-wider text-amber-600">PENDING</Text>
                      </View>
                    </View>
                    <Text className="text-slate-500 text-xs">{rx.doctorName} • {rx.doctorSpecialty}</Text>
                    <Text className="text-slate-400 text-xs mt-1">{rx.time} - {rx.bookingReference}</Text>
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
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
