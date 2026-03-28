import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  Modal, ActivityIndicator, RefreshControl, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import { ArrowLeft, Search, X, Plus, Pill } from 'lucide-react-native';
import { medicineService, MedicineAdminItem } from '@/services/doctorPortalService';

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Inhaler', 'Drops', 'Cream', 'Ointment', 'Powder', 'Patch'];
const CATEGORIES   = ['Analgesic', 'Antibiotic', 'Antifungal', 'Antiviral', 'Cardiovascular', 'Diabetes', 'Dermatology', 'Gastrointestinal', 'Neurology', 'Oncology', 'Respiratory', 'Vitamins', 'Other'];

interface FormState {
  name: string;
  genericName: string;
  category: string;
  dosageForm: string;
  strength: string;
  manufacturer: string;
  price: string;
  stockQuantity: string;
}

const EMPTY_FORM: FormState = {
  name: '', genericName: '', category: 'Other', dosageForm: 'Tablet',
  strength: '', manufacturer: '', price: '0', stockQuantity: '0',
};

export default function ManageMedicinesScreen() {
  const router = useRouter();
  const [medicines, setMedicines] = useState<MedicineAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<MedicineAdminItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await medicineService.listAll({ pageSize: 200 });
      setMedicines(res.medicines);
    } catch {
      CustomAlert.alert('Error', 'Failed to load medicines.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = medicines.filter((m) => {
    const q = search.toLowerCase();
    return q === '' || m.name.toLowerCase().includes(q) || (m.genericName ?? '').toLowerCase().includes(q) || m.category.toLowerCase().includes(q);
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (m: MedicineAdminItem) => {
    setEditTarget(m);
    setForm({
      name: m.name,
      genericName: m.genericName ?? '',
      category: m.category,
      dosageForm: m.dosageForm,
      strength: m.strength ?? '',
      manufacturer: m.manufacturer ?? '',
      price: String(m.price),
      stockQuantity: String(m.stockQuantity),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { CustomAlert.alert('Required', 'Medicine name is required.'); return; }
    if (!form.category.trim()) { CustomAlert.alert('Required', 'Category is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        genericName: form.genericName.trim() || undefined,
        category: form.category,
        dosageForm: form.dosageForm,
        strength: form.strength.trim() || undefined,
        manufacturer: form.manufacturer.trim() || undefined,
        price: parseFloat(form.price) || 0,
        stockQuantity: parseInt(form.stockQuantity, 10) || 0,
      };
      if (editTarget) {
        await medicineService.update(editTarget.id, payload);
      } else {
        await medicineService.add({ ...payload, requiresPrescription: true });
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      CustomAlert.alert('Error', err?.response?.data?.error || 'Failed to save medicine.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (m: MedicineAdminItem) => {
    const action = m.isActive ? 'deactivate' : 'activate';
    CustomAlert.alert(
      m.isActive ? 'Deactivate Medicine' : 'Activate Medicine',
      `${action.charAt(0).toUpperCase() + action.slice(1)} "${m.name}"? ${m.isActive ? 'It will no longer appear in prescriptions.' : 'It will be available for prescriptions.'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: m.isActive ? 'Deactivate' : 'Activate',
          style: m.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await medicineService.update(m.id, { isActive: !m.isActive });
              await load();
            } catch {
              CustomAlert.alert('Error', 'Failed to update status.');
            }
          },
        },
      ],
    );
  };

  const setField = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200">
            <ArrowLeft size={20} color="#0B1B3D" />
          </Pressable>
          <View>
            <Text className="text-lg font-bold text-midnight">Medicine Catalog</Text>
            <Text className="text-xs text-slate-400">{medicines.length} total • {medicines.filter(m => !m.isActive).length} inactive</Text>
          </View>
        </View>
        <Pressable onPress={openAdd} className="flex-row items-center gap-1.5 bg-primary px-4 py-2.5 rounded-full active:opacity-80" style={Shadows.focus}>
          <Plus size={16} color="#FFFFFF" />
          <Text className="text-white font-bold text-sm">Add</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View className="px-4 py-3">
        <View className="flex-row items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 gap-2" style={Shadows.card}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            className="flex-1 text-sm text-midnight"
            placeholder="Search by name, generic, category..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <X size={15} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />}
        >
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <Pill size={40} color="#CBD5E1" />
              <Text className="text-slate-400 text-sm mt-3">No medicines found.</Text>
            </View>
          ) : (
            filtered.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => openEdit(m)}
                className={`bg-white rounded-2xl p-4 mb-3 border ${m.isActive ? 'border-slate-100' : 'border-slate-200 opacity-60'}`}
                style={Shadows.card}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-center gap-3 flex-1 mr-3">
                    <View className={`w-10 h-10 rounded-xl items-center justify-center ${m.isActive ? 'bg-primary/10' : 'bg-slate-100'}`}>
                      <Pill size={18} color={m.isActive ? '#1A73E8' : '#94A3B8'} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-sm text-midnight" numberOfLines={1}>{m.name}</Text>
                      {m.genericName ? <Text className="text-xs text-slate-400 mt-0.5">{m.genericName}</Text> : null}
                      <View className="flex-row items-center gap-2 mt-1 flex-wrap">
                        <View className="bg-slate-100 px-1.5 py-0.5 rounded-full">
                          <Text className="text-[10px] font-semibold text-slate-500">{m.category}</Text>
                        </View>
                        <Text className="text-[10px] text-slate-400">{m.dosageForm}{m.strength ? ` · ${m.strength}` : ''}</Text>
                      </View>
                    </View>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-sm font-bold text-midnight">₹{m.price.toFixed(0)}</Text>
                    <Text className="text-[10px] text-slate-400">Stock: {m.stockQuantity}</Text>
                    {!m.isActive && (
                      <View className="bg-red-100 px-1.5 py-0.5 rounded-full">
                        <Text className="text-[10px] font-bold text-red-600">Inactive</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-50">
                  <Text className="text-xs text-slate-400">Tap to edit</Text>
                  <Pressable
                    onPress={() => handleToggleActive(m)}
                    className={`px-3 py-1 rounded-full ${m.isActive ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}
                  >
                    <Text className={`text-[11px] font-bold ${m.isActive ? 'text-red-600' : 'text-emerald-600'}`}>
                      {m.isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[90%]" style={Shadows.presence}>
            <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <Text className="text-xl font-extrabold text-midnight">
                {editTarget ? 'Edit Medicine' : 'Add Medicine'}
              </Text>
              <Pressable onPress={() => setShowForm(false)} className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
              {/* Name */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 uppercase mb-1.5">Name *</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-midnight text-sm"
                  placeholder="e.g. Paracetamol 500mg"
                  placeholderTextColor="#94A3B8"
                  value={form.name}
                  onChangeText={(v) => setField('name', v)}
                />
              </View>

              {/* Generic Name */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 uppercase mb-1.5">Generic Name</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-midnight text-sm"
                  placeholder="e.g. Acetaminophen"
                  placeholderTextColor="#94A3B8"
                  value={form.genericName}
                  onChangeText={(v) => setField('genericName', v)}
                />
              </View>

              {/* Category */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 uppercase mb-1.5">Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => setField('category', cat)}
                      className={`px-3 py-1.5 rounded-full border ${form.category === cat ? 'bg-primary border-primary' : 'border-slate-200 bg-white'}`}
                    >
                      <Text className={`text-xs font-semibold ${form.category === cat ? 'text-white' : 'text-slate-600'}`}>{cat}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Dosage Form */}
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 uppercase mb-1.5">Dosage Form *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {DOSAGE_FORMS.map((df) => (
                    <Pressable
                      key={df}
                      onPress={() => setField('dosageForm', df)}
                      className={`px-3 py-1.5 rounded-full border ${form.dosageForm === df ? 'bg-primary border-primary' : 'border-slate-200 bg-white'}`}
                    >
                      <Text className={`text-xs font-semibold ${form.dosageForm === df ? 'text-white' : 'text-slate-600'}`}>{df}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Strength + Manufacturer row */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-500 uppercase mb-1.5">Strength</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-midnight text-sm"
                    placeholder="e.g. 500mg"
                    placeholderTextColor="#94A3B8"
                    value={form.strength}
                    onChangeText={(v) => setField('strength', v)}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-500 uppercase mb-1.5">Manufacturer</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-midnight text-sm"
                    placeholder="e.g. Sun Pharma"
                    placeholderTextColor="#94A3B8"
                    value={form.manufacturer}
                    onChangeText={(v) => setField('manufacturer', v)}
                  />
                </View>
              </View>

              {/* Price + Stock row */}
              <View className="flex-row gap-3 mb-6">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-500 uppercase mb-1.5">Price (₹)</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-midnight text-sm"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    value={form.price}
                    onChangeText={(v) => setField('price', v)}
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-500 uppercase mb-1.5">Stock Qty</Text>
                  <TextInput
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-midnight text-sm"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    value={form.stockQuantity}
                    onChangeText={(v) => setField('stockQuantity', v)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Save Button */}
              <Pressable
                onPress={handleSave}
                disabled={saving}
                className="w-full bg-primary py-4 rounded-2xl items-center mb-10 active:opacity-80"
                style={[Shadows.focus, saving && { opacity: 0.6 }]}
              >
                <Text className="text-white font-bold text-base">
                  {saving ? 'Saving...' : editTarget ? 'Save Changes' : 'Add Medicine'}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
