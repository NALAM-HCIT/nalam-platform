import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Animated, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import * as ImagePicker from 'expo-image-picker';
import {
  ShoppingCart, Pill, FileText, Camera, Search, X,
  Package, ChevronRight,
  Syringe, Wind, BriefcaseMedical, Heart, Droplets, Brain,
  Plus, CheckCircle, Trash2, Truck,
} from 'lucide-react-native';
import { pharmacyService, Medicine } from '@/services/pharmacyService';
import { patientService, PatientPrescription } from '@/services/patientService';
import { uploadService } from '@/services/uploadService';
import { useAuthStore } from '@/stores/authStore';

const categories = [
  { id: '1', name: 'Tablets', icon: Pill, color: '#1A73E8' },
  { id: '2', name: 'Syrups', icon: Syringe, color: '#7C3AED' },
  { id: '3', name: 'Inhalers', icon: Wind, color: '#0891B2' },
  { id: '4', name: 'Cardiac', icon: Heart, color: '#E11D48' },
  { id: '5', name: 'Diabetes', icon: Droplets, color: '#EA580C' },
  { id: '6', name: 'Neuro', icon: Brain, color: '#4F46E5' },
  { id: '7', name: 'General', icon: BriefcaseMedical, color: '#059669' },
];


export default function PharmacyScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const [lastPrescription, setLastPrescription] = useState<PatientPrescription | null>(null);
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [rxImages, setRxImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [cartItems, setCartItems] = useState<{ id: string; name: string; price: number; qty: number }[]>([]);

  // Live medicine catalog
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicinesLoading, setMedicinesLoading] = useState(true);

  // Load most recent prescription on mount
  useEffect(() => {
    patientService.getPrescriptions()
      .then((list) => setLastPrescription(list[0] ?? null))
      .catch(() => {});
  }, []);

  // Fetch medicines whenever search or category changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setMedicinesLoading(true);
      pharmacyService.getMedicines({
        search: searchText.trim() || undefined,
        category: activeCategory || undefined,
        pageSize: 50,
      })
        .then((res) => setMedicines(res.medicines))
        .catch(() => {/* silently keep old list */})
        .finally(() => setMedicinesLoading(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, activeCategory]);



  const handleCategoryPress = useCallback((name: string) => {
    setActiveCategory((prev) => prev === name ? null : name);
  }, []);

  const uploadPrescription = useCallback(async (uri: string) => {
    setIsUploading(true);
    setUploadProgress(0);
    progressAnim.setValue(0);
    // Show local image immediately for fast UX
    setRxImages((prev) => [...prev, uri]);

    try {
      const { url } = await uploadService.uploadMedicalDocument(
        userId ?? 'guest',
        uri,
        'prescription.jpg',
        ({ progress }) => {
          setUploadProgress(progress);
          Animated.timing(progressAnim, {
            toValue: progress / 100,
            duration: 200,
            useNativeDriver: false,
          }).start();
        },
      );
      // Replace local URI with Supabase public URL
      setRxImages((prev) => prev.map((img) => (img === uri ? url : img)));
    } catch (err: any) {
      const msg = err?.message ?? err?.error_description ?? JSON.stringify(err);
      console.error('Prescription upload error:', msg);
      CustomAlert.alert('Upload Failed', msg || 'Could not upload prescription.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [userId, progressAnim]);

  const handlePickImage = useCallback(async (source: 'camera' | 'gallery') => {
    const permResult = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permResult.granted) {
      CustomAlert.alert('Permission Required', `Please allow ${source} access to upload prescriptions.`);
      return;
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, allowsEditing: true });

    if (!result.canceled && result.assets[0]) {
      uploadPrescription(result.assets[0].uri);
    }
  }, [uploadPrescription]);

  const handleUploadPress = useCallback(() => {
    CustomAlert.alert('Upload Prescription', 'Choose how to upload your prescription', [
      { text: 'Take Photo', onPress: () => handlePickImage('camera') },
      { text: 'Choose from Gallery', onPress: () => handlePickImage('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handlePickImage]);

  const handleRemoveRx = useCallback((index: number) => {
    CustomAlert.alert('Remove Prescription', `Remove Prescription ${index + 1}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Remove',
        style: 'destructive',
        onPress: () => setRxImages((prev) => prev.filter((_, i) => i !== index)),
      },
    ]);
  }, []);

  const handleClearAllRx = useCallback(() => {
    CustomAlert.alert('Clear Order', 'Remove all prescriptions and medicines from this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Clear',
        style: 'destructive',
        onPress: () => {
          setRxImages([]);
          setCartItems([]);
          setUploadProgress(0);
          progressAnim.setValue(0);
        },
      },
    ]);
  }, [progressAnim]);

  const handleAddToCart = useCallback((med: { id: string; name: string; price: number }) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === med.id);
      if (existing) {
        return prev.map((item) => item.id === med.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { id: med.id, name: med.name, price: med.price, qty: 1 }];
    });
  }, []);

  const handleRemoveCartItem = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleUpdateQty = useCallback((id: string, delta: number) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }).filter((item) => item.qty > 0),
    );
  }, []);

  const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0), [cartItems]);

  const cartMap = useMemo(() => {
    const map = new Map<string, number>();
    cartItems.forEach((item) => map.set(item.id, item.qty));
    return map;
  }, [cartItems]);

  const hasOrderItems = rxImages.length > 0 || cartItems.length > 0;

  const handleSendToPharmacy = useCallback(() => {
    if (rxImages.length > 0) {
      // Has prescription — send to pharmacy (pharmacist will review Rx + any added medicines)
      const parts: string[] = [];
      parts.push(`${rxImages.length} prescription${rxImages.length > 1 ? 's' : ''}`);
      if (cartItems.length > 0) parts.push(`${cartItems.length} medicine${cartItems.length > 1 ? 's' : ''}`);
      CustomAlert.alert(
        'Sent to Pharmacy',
        `${parts.join(' + ')} sent to the pharmacy. Our pharmacist will review and prepare your order shortly.`,
      );
      setRxImages([]);
      setCartItems([]);
      setUploadProgress(0);
      progressAnim.setValue(0);
      return;
    }

    // No prescription, only medicines — go to checkout for payment
    const params: Record<string, string> = {};
    if (cartItems.length > 0) {
      params.items = JSON.stringify(cartItems.map((item) => ({ name: item.name, price: item.price, qty: item.qty })));
    }
    router.push({ pathname: '/patient/secure-checkout', params });
    setCartItems([]);
  }, [rxImages, cartItems, progressAnim, router]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-extrabold text-midnight tracking-tight">Pharmacy</Text>
            <Text className="text-slate-500 text-sm font-light tracking-wide mt-1">
              Order medicines and manage prescriptions.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/patient/pharmacy-cart')}
            className="w-12 h-12 rounded-full bg-primary items-center justify-center relative"
            style={Shadows.focus}
          >
            <ShoppingCart size={20} color="#FFFFFF" />
            <View className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full items-center justify-center border-2 border-surface">
              <Text className="text-white text-[10px] font-bold">2</Text>
            </View>
          </Pressable>
        </View>

        {/* Latest Prescription */}
        {lastPrescription ? (
          <Pressable
            onPress={() => router.push('/patient/(tabs)/bookings' as any)}
            className="mx-6 mt-4 bg-white rounded-[24px] p-5 border border-slate-100"
            style={Shadows.card}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2.5">
                <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
                  <FileText size={18} color="#1A73E8" />
                </View>
                <View>
                  <Text className="font-bold text-sm text-midnight">Latest Prescription</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    {lastPrescription.doctorName} • {lastPrescription.scheduleDate}
                  </Text>
                </View>
              </View>
              <View className={`px-3 py-1 rounded-full border ${
                lastPrescription.prescriptionStatus === 'dispensed'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <Text className={`text-[10px] font-bold uppercase tracking-wider ${
                  lastPrescription.prescriptionStatus === 'dispensed' ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {lastPrescription.prescriptionStatus === 'dispensed' ? 'Dispensed' : 'Pending'}
                </Text>
              </View>
            </View>
            {lastPrescription.prescriptionNotes ? (
              <Text className="text-[11px] text-slate-500 leading-[16px] mb-3" numberOfLines={2}>
                {lastPrescription.prescriptionNotes}
              </Text>
            ) : null}
            <View className="flex-row items-center justify-between pt-3 border-t border-slate-100">
              <Text className="text-slate-400 text-xs">{lastPrescription.specialty}</Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-primary text-xs font-bold">View Prescription</Text>
                <ChevronRight size={14} color="#1A73E8" />
              </View>
            </View>
          </Pressable>
        ) : null}

        {/* Order Builder */}
        <View className="mx-6 mt-4 bg-white rounded-[24px] border border-slate-100 overflow-hidden" style={Shadows.card}>
          <View className="p-4">
            {/* Upload Prescription Header */}
            <View className="flex-row items-center">
              <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                hasOrderItems ? 'bg-emerald-50' : 'bg-primary/10'
              }`}>
                {hasOrderItems ? (
                  <CheckCircle size={22} color="#059669" />
                ) : (
                  <FileText size={22} color="#1A73E8" />
                )}
              </View>
              <View className="flex-1 mr-3">
                <Text className="font-bold text-sm text-midnight">
                  {hasOrderItems ? 'Your Order' : 'Upload Prescription'}
                </Text>
                <Text className="text-slate-500 text-[11px] mt-0.5">
                  {isUploading
                    ? `Uploading... ${uploadProgress}%`
                    : hasOrderItems
                    ? 'Add prescriptions or medicines below'
                    : 'Order medicines from your Rx'}
                </Text>
              </View>
              {!isUploading && (
                <Pressable
                  onPress={handleUploadPress}
                  className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full ${
                    hasOrderItems ? 'bg-slate-100' : 'bg-primary'
                  }`}
                  style={!hasOrderItems ? Shadows.focus : undefined}
                >
                  {hasOrderItems ? (
                    <>
                      <Camera size={14} color="#0B1B3D" />
                      <Text className="text-midnight font-bold text-xs">Add Rx</Text>
                    </>
                  ) : (
                    <>
                      <Camera size={14} color="#FFFFFF" />
                      <Text className="text-white font-bold text-xs">Upload</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            {/* Progress Bar */}
            {isUploading && (
              <View className="mt-3">
                <View className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <Animated.View
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    }}
                  />
                </View>
              </View>
            )}

            {/* Uploaded Prescriptions */}
            {rxImages.length > 0 && (
              <View className="mt-3">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Prescriptions ({rxImages.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {rxImages.map((uri, index) => (
                    <View key={index} className="relative">
                      <Image
                        source={{ uri }}
                        className="w-16 h-16 rounded-xl"
                        resizeMode="cover"
                      />
                      <Pressable
                        onPress={() => handleRemoveRx(index)}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 items-center justify-center border-2 border-white"
                      >
                        <X size={8} color="#FFFFFF" strokeWidth={3} />
                      </Pressable>
                      <View className="absolute bottom-0.5 left-0.5 bg-black/50 px-1 py-0.5 rounded">
                        <Text className="text-white text-[7px] font-bold">Rx {index + 1}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Added Medicines */}
            {cartItems.length > 0 && (
              <View className="mt-3">
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Added Medicines ({cartItems.length})
                </Text>
                <View className="bg-slate-50 rounded-2xl p-3">
                  {cartItems.map((item, idx) => (
                    <View
                      key={item.id}
                      className={`flex-row items-center justify-between ${
                        idx < cartItems.length - 1 ? 'mb-2.5 pb-2.5 border-b border-slate-100' : ''
                      }`}
                    >
                      <View className="flex-row items-center gap-2 flex-1">
                        <Pill size={12} color="#1A73E8" />
                        <Text className="text-sm text-midnight font-medium" numberOfLines={1}>{item.name}</Text>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <View className="flex-row items-center bg-white rounded-full border border-slate-200">
                          <Pressable onPress={() => handleUpdateQty(item.id, -1)} className="px-2 py-1">
                            <Text className="text-midnight font-bold text-xs">-</Text>
                          </Pressable>
                          <Text className="text-midnight font-bold text-xs px-1">{item.qty}</Text>
                          <Pressable onPress={() => handleUpdateQty(item.id, 1)} className="px-2 py-1">
                            <Text className="text-midnight font-bold text-xs">+</Text>
                          </Pressable>
                        </View>
                        <Text className="text-midnight font-semibold text-xs w-14 text-right">Rs. {item.price * item.qty}</Text>
                        <Pressable onPress={() => handleRemoveCartItem(item.id)}>
                          <X size={14} color="#E11D48" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Order Footer */}
            {hasOrderItems && (
              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <View>
                  {cartTotal > 0 && (
                    <Text className="text-midnight font-extrabold text-base">Rs. {cartTotal}</Text>
                  )}
                  <Pressable onPress={handleClearAllRx} className="flex-row items-center gap-1 mt-0.5">
                    <Trash2 size={10} color="#E11D48" />
                    <Text className="text-rose-600 text-[10px] font-bold">Clear Order</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={handleSendToPharmacy}
                  className={`flex-row items-center gap-1.5 px-4 py-2.5 rounded-full ${
                    rxImages.length === 0 && cartItems.length > 0 ? 'bg-primary' : 'bg-emerald-500'
                  }`}
                  style={Shadows.focus}
                >
                  {rxImages.length > 0 ? (
                    <>
                      <Truck size={13} color="#FFFFFF" />
                      <Text className="text-white font-bold text-xs">Send to Pharmacy</Text>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={13} color="#FFFFFF" />
                      <Text className="text-white font-bold text-xs">Checkout • Rs. {cartTotal}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <View className="px-6 mt-5">
          <View
            className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-slate-100"
            style={Shadows.card}
          >
            <Search size={18} color="#94A3B8" />
            <TextInput
              className="flex-1 ml-3 text-midnight text-sm"
              placeholder="Search medicines..."
              placeholderTextColor="#94A3B8"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText('')}>
                <X size={16} color="#94A3B8" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Categories */}
        <View className="mt-5">
          <View className="flex-row items-center justify-between mb-3 px-6">
            <Text className="text-base font-bold text-midnight">Categories</Text>
            {activeCategory && (
              <Pressable onPress={() => setActiveCategory(null)}>
                <Text className="text-primary text-xs font-semibold">Show All</Text>
              </Pressable>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}
          >
            {categories.map((cat) => {
              const CatIcon = cat.icon;
              const isActive = activeCategory === cat.name;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => handleCategoryPress(cat.name)}
                  className="items-center gap-1.5"
                >
                  <View
                    className={`w-14 h-14 rounded-2xl items-center justify-center border ${
                      isActive ? 'border-transparent' : 'border-slate-100 bg-white'
                    }`}
                    style={[Shadows.card, isActive && { backgroundColor: cat.color }]}
                  >
                    <CatIcon size={22} color={isActive ? '#FFFFFF' : cat.color} />
                  </View>
                  <Text className={`text-[10px] font-semibold ${isActive ? 'text-primary' : 'text-midnight'}`}>
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Medicines List */}
        <View className="px-6 mt-5">
          <Text className="text-base font-bold text-midnight mb-3">
            {activeCategory || 'All Medicines'}
            {!medicinesLoading && (
              <Text className="text-slate-400 text-xs font-normal"> ({medicines.length})</Text>
            )}
          </Text>
          {medicinesLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#1A73E8" />
            </View>
          ) : medicines.length === 0 ? (
            <View className="items-center py-10">
              <Pill size={36} color="#CBD5E1" />
              <Text className="text-slate-400 text-sm font-medium mt-3">No medicines found</Text>
            </View>
          ) : (
            medicines.map((med) => (
              <View
                key={med.id}
                className="bg-white rounded-2xl p-4 mb-2.5 flex-row items-center border border-slate-50"
                style={Shadows.card}
              >
                <View className="w-10 h-10 rounded-xl bg-primary/10 items-center justify-center mr-3">
                  <Pill size={18} color="#1A73E8" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-sm text-midnight">{med.name}</Text>
                  <Text className="text-slate-400 text-[11px] mt-0.5">{med.category}{med.packSize ? ` • ${med.packSize}` : ''}</Text>
                </View>
                <View className="items-end gap-1">
                  <Text className="font-extrabold text-midnight text-sm">Rs. {med.price}</Text>
                  {(() => {
                    const qty = cartMap.get(med.id);
                    return qty ? (
                      <View className="flex-row items-center bg-primary/10 rounded-full border border-primary/20">
                        <Pressable onPress={() => handleUpdateQty(med.id, -1)} className="px-2.5 py-1.5">
                          <Text className="text-primary font-bold text-xs">-</Text>
                        </Pressable>
                        <Text className="text-primary font-bold text-xs px-1">{qty}</Text>
                        <Pressable onPress={() => handleUpdateQty(med.id, 1)} className="px-2.5 py-1.5">
                          <Text className="text-primary font-bold text-xs">+</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => handleAddToCart(med)}
                        className="bg-primary px-3.5 py-1.5 rounded-full flex-row items-center gap-1"
                      >
                        <Plus size={11} color="#FFFFFF" />
                        <Text className="text-white text-[10px] font-bold">Add</Text>
                      </Pressable>
                    );
                  })()}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
