import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Modal, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, Clock, CheckCircle, Search, X, Pill } from 'lucide-react-native';
import { Shadows } from '@/constants/theme';
import { StatusChip } from '@/components';
import { pharmacistService, PrescriptionItem } from '@/services/pharmacistService';
type OrderFilter = 'all' | 'dispensed' | 'rejected';

const filterTabs: { label: string; value: OrderFilter }[] = [
  { label: 'All Processed', value: 'all' },
  { label: 'Dispensed', value: 'dispensed' },
  { label: 'Rejected', value: 'rejected' },
];

export default function OrdersScreen() {
  const [orders, setOrders] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<PrescriptionItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Load only dispensed and rejected (i.e., processed prescriptions)
      let data: PrescriptionItem[];
      if (activeFilter === 'all') {
        const [dispensed, rejected] = await Promise.all([
          pharmacistService.getPrescriptions('dispensed', searchQuery || undefined),
          pharmacistService.getPrescriptions('rejected', searchQuery || undefined),
        ]);
        data = [...dispensed, ...rejected].sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      } else {
        data = await pharmacistService.getPrescriptions(activeFilter, searchQuery || undefined);
      }
      setOrders(data);
    } catch (err) {
      console.error(err);
      CustomAlert.alert('Error', 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [activeFilter]);

  useEffect(() => {
    const delay = setTimeout(() => { loadOrders(); }, 500);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const onRefresh = useCallback(async () => {
    await loadOrders();
  }, [activeFilter, searchQuery]);

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
            placeholder="Search by patient or reference..."
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
            return (
              <Pressable
                key={tab.value}
                onPress={() => setActiveFilter(tab.value)}
                className={`px-3.5 py-1.5 rounded-full flex-row items-center gap-1.5 ${isActive ? 'bg-primary' : 'bg-white border border-slate-100'}`}
              >
                <Text className={`text-[11px] font-bold ${isActive ? 'text-white' : 'text-slate-600'}`}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Order List */}
      <ScrollView
        className="flex-1 px-6 mt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor="#1A73E8" />}
      >
        {orders.length === 0 && !loading ? (
          <View className="items-center py-12">
            <Package size={40} color="#CBD5E1" />
            <Text className="text-slate-400 text-sm mt-3 font-medium">No processed orders</Text>
          </View>
        ) : (
          orders.map((o) => {
            const isDispensed = o.prescriptionStatus === 'dispensed';
            const statusColor = isDispensed ? '#22C55E' : '#EF4444';
            const StatusIcon = isDispensed ? CheckCircle : X;
            return (
              <Pressable
                key={o.id}
                onPress={() => { setSelectedOrder(o); setShowDetail(true); }}
                className="bg-white rounded-2xl p-4 mb-3 border border-slate-50 active:opacity-80"
                style={Shadows.card}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row gap-3 flex-1">
                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: `${statusColor}15` }}>
                      <StatusIcon size={18} color={statusColor} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-sm text-midnight">{o.bookingReference}</Text>
                      <Text className="text-slate-600 text-xs mt-0.5">{o.patientName}</Text>
                      <Text className="text-slate-400 text-xs mt-0.5">{o.doctorName} • {o.time}</Text>
                    </View>
                  </View>
                  <StatusChip
                    label={o.prescriptionStatus.toUpperCase()}
                    variant={isDispensed ? 'success' : 'danger'}
                  />
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Order Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[80%]" style={Shadows.presence}>
            {selectedOrder && (() => {
              const o = selectedOrder;
              const isDispensed = o.prescriptionStatus === 'dispensed';
              return (
                <>
                  <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                    <View>
                      <Text className="text-xl font-extrabold text-midnight">{o.bookingReference}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{o.prescriptionStatus.toUpperCase()}</Text>
                    </View>
                    <Pressable onPress={() => { setShowDetail(false); setSelectedOrder(null); }} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200">
                      <X size={18} color="#64748B" />
                    </Pressable>
                  </View>
                  <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
                    <View className="bg-slate-50 rounded-2xl p-4 mb-4">
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Patient</Text>
                      <Text className="text-base font-bold text-midnight">{o.patientName}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{o.patientMobile}</Text>
                      <View className="h-px bg-slate-200 my-3" />
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Prescribing Doctor</Text>
                      <Text className="text-base font-bold text-midnight">{o.doctorName}</Text>
                      <Text className="text-xs text-slate-500 mt-0.5">{o.doctorSpecialty}</Text>
                      <View className="h-px bg-slate-200 my-3" />
                      <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Time</Text>
                      <Text className="text-sm text-midnight">{o.time}</Text>
                    </View>

                    {/* Prescription Notes */}
                    <View className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
                      <View className="flex-row items-center gap-2 mb-2">
                        <Pill size={14} color="#F59E0B" />
                        <Text className="text-xs font-bold uppercase tracking-wider text-amber-700">Prescription Notes</Text>
                      </View>
                      <Text className="text-sm text-amber-900">{o.prescriptionNotes || 'No notes'}</Text>
                    </View>

                    <View className="mt-4 mb-8">
                      {isDispensed ? (
                        <View className="bg-emerald-50 py-4 rounded-2xl items-center border border-emerald-100">
                          <Text className="text-emerald-700 font-bold text-sm">Order Dispensed ✓</Text>
                        </View>
                      ) : (
                        <View className="bg-rose-50 py-4 rounded-2xl items-center border border-rose-100">
                          <Text className="text-rose-700 font-bold text-sm">Prescription Rejected</Text>
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
