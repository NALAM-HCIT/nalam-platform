import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  ArrowLeft, Video, Calendar, Stethoscope, User, Info, ChevronRight,
  Pencil, Building2, CreditCard, Smartphone, Landmark, Wallet,
  Star, Briefcase, Clock, Tag, CheckCircle2, MapPin,
} from 'lucide-react-native';
import { createAppointment } from '@/services/appointmentService';
import { useAuthStore } from '@/stores/authStore';

// Lazily required so Expo Go doesn't crash on module load.
// Only resolves in a native development/production build.
function getRazorpay(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-razorpay').default;
  } catch {
    return null;
  }
}

/* ───── Constants ───── */

const RAZORPAY_KEY_ID = 'rzp_test_h8mR4F2lGwgFX4';

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', desc: 'GPay, PhonePe, Paytm', icon: Smartphone },
  { id: 'card', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', icon: Landmark },
  { id: 'wallet', label: 'Wallet', desc: 'Paytm, Amazon Pay', icon: Wallet },
  { id: 'pay_on_visit', label: 'Pay on Visit', desc: 'Pay at the clinic during your visit', icon: MapPin },
];

/* ───── Sub-components ───── */

const PaymentOption = React.memo(function PaymentOption({
  pm,
  isSelected,
  onSelect,
}: {
  pm: typeof PAYMENT_METHODS[0];
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon = pm.icon;
  return (
    <Pressable
      onPress={onSelect}
      className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
        isSelected
          ? 'border-[#1A73E8] bg-[#1A73E8]/5'
          : 'border-slate-100 bg-slate-50/50'
      }`}
    >
      <View className="flex-row items-center gap-3 flex-1">
        <View
          className={`w-10 h-10 rounded-xl items-center justify-center ${
            isSelected ? 'bg-primary/10' : 'bg-slate-100'
          }`}
        >
          <Icon size={20} color={isSelected ? Colors.primary : '#94A3B8'} />
        </View>
        <View>
          <Text
            className={`font-bold ${
              isSelected ? 'text-[#0B1B3D]' : 'text-slate-600'
            }`}
          >
            {pm.label}
          </Text>
          {pm.desc && (
            <Text className="text-xs text-slate-400 font-medium">{pm.desc}</Text>
          )}
        </View>
      </View>
      <View
        className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
          isSelected ? 'border-[#1A73E8]' : 'border-slate-300'
        }`}
      >
        {isSelected && <View className="w-3 h-3 rounded-full bg-[#1A73E8]" />}
      </View>
    </Pressable>
  );
});

const DetailRow = React.memo(function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="w-9 h-9 rounded-xl bg-primary/10 items-center justify-center">
        <Icon size={16} color={Colors.primary} />
      </View>
      <View>
        <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</Text>
        <Text className="text-sm text-midnight font-semibold mt-0.5">{value}</Text>
      </View>
    </View>
  );
});

/* ───── Main Screen ───── */

export default function BookingReviewScreen() {
  const router = useRouter();
  const { userName, phone } = useAuthStore();

  const params = useLocalSearchParams<{
    doctorProfileId?: string;
    doctorName?: string;
    specialty?: string;
    fee?: string;
    consultationType?: string;
    date?: string;
    fullDate?: string;
    time?: string;
    initials?: string;
    exp?: string;
    rating?: string;
    reviews?: string;
  }>();

  const doctorProfileId = params.doctorProfileId ?? '';
  const doctorName = params.doctorName ?? 'Doctor';
  const specialty = params.specialty ?? '';
  const fee = parseFloat(params.fee ?? '0');
  const consultationType = params.consultationType ?? 'video';
  const dateStr = params.date ?? '';
  const fullDate = params.fullDate ?? '';
  const timeStr = params.time ?? '';
  const initials = params.initials ?? '';
  const exp = params.exp ?? '0';
  const rating = params.rating ?? '0';
  const reviews = params.reviews ?? '0';

  const isVideo = consultationType === 'video';
  const ConsultIcon = isVideo ? Video : Building2;
  const consultLabel = isVideo ? 'Video Consultation' : 'In-Person Visit';

  // Initials from patient name
  const patientInitials = userName
    ? userName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
    : '?';

  const [selectedPayment, setSelectedPayment] = useState('upi');
  const [couponApplied, setCouponApplied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPayOnVisit = selectedPayment === 'pay_on_visit';

  const pricing = useMemo(() => {
    const tax = fee * 0.05;
    const platformFee = 49;
    const discount = couponApplied ? 100 : 0;
    const total = Math.max(0, fee + tax + platformFee - discount);
    return { tax, platformFee, discount, total };
  }, [fee, couponApplied]);

  const handleApplyCoupon = useCallback(() => {
    if (couponApplied) {
      setCouponApplied(false);
      return;
    }
    CustomAlert.alert('Coupon Applied!', 'NALAM100 — Rs. 100 off on your first consultation.', [
      { text: 'OK', onPress: () => setCouponApplied(true) },
    ]);
  }, [couponApplied]);

  // Convert "10:30 AM" display time to "10:30" 24h format for API
  const parseTimeFor24h = (time12h: string): string => {
    const match = time12h.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return time12h;
    let hours = parseInt(match[1], 10);
    const mins = match[2];
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${hours.toString().padStart(2, '0')}:${mins}`;
  };

  const confirmBooking = useCallback(async (razorpayPaymentId?: string) => {
    try {
      const result = await createAppointment({
        doctorProfileId,
        scheduleDate: fullDate,
        startTime: parseTimeFor24h(timeStr),
        consultationType,
        paymentMethod: selectedPayment,
        couponCode: couponApplied ? 'NALAM100' : undefined,
      });

      router.push({
        pathname: '/patient/booking-confirmation',
        params: {
          bookingReference: result.bookingReference,
          doctorName,
          specialty,
          consultationType,
          date: dateStr,
          time: timeStr,
          total: result.totalAmount.toFixed(2),
        },
      });
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Booking failed. Please try again.';
      CustomAlert.alert('Booking Failed', message);
    }
  }, [doctorProfileId, fullDate, timeStr, consultationType, selectedPayment, couponApplied, doctorName, specialty, dateStr]);

  const handleConfirm = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      if (isPayOnVisit) {
        // Skip payment — confirm directly
        await confirmBooking();
      } else {
        // Open Razorpay checkout
        const RazorpayCheckout = getRazorpay();
        if (!RazorpayCheckout) {
          CustomAlert.alert(
            'Payment Unavailable',
            'Online payment requires a native build. Please select "Pay on Visit" or use the hospital app build.',
          );
          return;
        }

        const amountInPaise = Math.round(pricing.total * 100);
        // order_id is omitted here (test mode). For production, generate via backend POST /api/payments/create-order
        const options = {
          description: `Consultation with ${doctorName}`,
          currency: 'INR',
          key: RAZORPAY_KEY_ID,
          amount: amountInPaise,
          order_id: '',
          name: 'Nalam Health',
          prefill: {
            contact: phone || '',
            name: userName || '',
            email: '',
          },
          theme: { color: Colors.primary },
        };

        try {
          const data = await RazorpayCheckout.open(options);
          await confirmBooking(data.razorpay_payment_id);
        } catch (razorpayError: any) {
          // User cancelled or payment failed — do not throw to outer catch
          if (razorpayError?.code !== 0) {
            CustomAlert.alert('Payment Failed', razorpayError?.description || 'Payment was not completed. Please try again.');
          }
        }
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, isPayOnVisit, pricing.total, doctorName, phone, userName, confirmBooking]);

  const ctaLabel = isPayOnVisit
    ? 'Confirm Booking'
    : `Pay \u20B9${pricing.total.toFixed(2)} & Confirm`;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 pt-2 pb-2 bg-white">
        <Pressable onPress={() => router.back()} className="w-12 h-12 items-start justify-center">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-midnight text-center tracking-tight pr-12">
          Review & Confirm
        </Text>
      </View>

      {/* Progress */}
      <View className="px-5 py-3 bg-white">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs text-slate-400 font-medium">Step 3 of 3</Text>
          <Text className="text-xs text-primary font-bold">100%</Text>
        </View>
        <View className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <View className="h-full bg-primary rounded-full w-full" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Card */}
        <View className="mx-5 mt-4 bg-white rounded-[20px] overflow-hidden" style={Shadows.card}>
          {/* Colored Header Strip */}
          <View className={`px-5 py-4 ${isVideo ? 'bg-violet-50' : 'bg-blue-50'}`}>
            <View className="flex-row items-center gap-3">
              <View className="w-16 h-16 rounded-2xl bg-white items-center justify-center" style={Shadows.card}>
                <Text className="text-xl font-bold text-primary">{initials}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-midnight">{doctorName}</Text>
                <Text className="text-primary text-xs font-bold mt-0.5">{specialty}</Text>
                <View className="flex-row items-center gap-3 mt-1.5">
                  <View className="flex-row items-center gap-1">
                    <Briefcase size={10} color="#94A3B8" />
                    <Text className="text-[10px] text-slate-500 font-medium">{exp} yrs</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Star size={10} color="#EAB308" fill="#EAB308" />
                    <Text className="text-[10px] text-midnight font-bold">{rating}</Text>
                    <Text className="text-[9px] text-slate-400">({reviews})</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Appointment Details */}
          <View className="p-5 gap-3.5">
            <DetailRow icon={ConsultIcon} label="Type" value={consultLabel} />
            <DetailRow icon={Calendar} label="Date" value={dateStr} />
            <DetailRow icon={Clock} label="Time" value={`${timeStr} (30 min)`} />
          </View>

          {/* Edit Button */}
          <Pressable
            onPress={() => router.back()}
            className="mx-5 mb-5 flex-row items-center justify-center gap-1.5 py-2.5 rounded-full border border-primary/20 active:opacity-70"
          >
            <Pencil size={12} color={Colors.primary} />
            <Text className="text-primary text-xs font-bold">Edit Appointment</Text>
          </Pressable>
        </View>

        {/* Patient Details */}
        <View className="mx-5 mt-4">
          <Text className="text-base font-bold text-midnight mb-3">Patient Details</Text>
          <View className="flex-row items-center gap-4 bg-white p-4 rounded-2xl" style={Shadows.card}>
            <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center border-2 border-primary/20">
              <Text className="text-base font-bold text-primary">{patientInitials}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-[15px] text-midnight">{userName || 'Patient'}</Text>
              {phone ? (
                <Text className="text-slate-400 text-xs mt-0.5">{phone}</Text>
              ) : null}
            </View>
            <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center">
              <CheckCircle2 size={16} color="#059669" />
            </View>
          </View>
        </View>

        {/* Coupon */}
        <Pressable
          onPress={handleApplyCoupon}
          className={`mx-5 mt-4 flex-row items-center justify-between p-4 rounded-2xl border-2 active:opacity-80 ${
            couponApplied ? 'border-emerald-300 bg-emerald-50' : 'border-dashed border-primary/30 bg-white'
          }`}
          style={!couponApplied ? Shadows.card : undefined}
        >
          <View className="flex-row items-center gap-3">
            <View className={`w-10 h-10 rounded-xl items-center justify-center ${couponApplied ? 'bg-emerald-100' : 'bg-primary/10'}`}>
              {couponApplied ? (
                <CheckCircle2 size={20} color="#059669" />
              ) : (
                <Tag size={20} color={Colors.primary} />
              )}
            </View>
            <View>
              {couponApplied ? (
                <>
                  <Text className="font-bold text-emerald-700 text-sm">NALAM100 Applied</Text>
                  <Text className="text-emerald-600 text-xs">You saved Rs. 100!</Text>
                </>
              ) : (
                <>
                  <Text className="font-bold text-midnight text-sm">Apply Coupon</Text>
                  <Text className="text-slate-400 text-xs">NALAM100 — Rs. 100 off first visit</Text>
                </>
              )}
            </View>
          </View>
          <Text className={`text-xs font-bold ${couponApplied ? 'text-rose-500' : 'text-primary'}`}>
            {couponApplied ? 'Remove' : 'Apply'}
          </Text>
        </Pressable>

        {/* Payment Method */}
        <View className="mx-5 mt-5">
          <Text className="text-base font-bold text-midnight mb-3">Payment Method</Text>
          <View className="gap-2.5">
            {PAYMENT_METHODS.map((pm) => (
              <PaymentOption
                key={pm.id}
                pm={pm}
                isSelected={selectedPayment === pm.id}
                onSelect={() => setSelectedPayment(pm.id)}
              />
            ))}
          </View>
        </View>

        {/* Payment Summary */}
        <View className="mx-5 mt-5">
          <Text className="text-base font-bold text-midnight mb-3">Payment Summary</Text>
          <View className="bg-white p-4 rounded-2xl" style={Shadows.card}>
            <View className="gap-2.5">
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-sm">Consultation Fee</Text>
                <Text className="text-midnight font-medium text-sm">{'\u20B9'}{fee.toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-sm">GST (5%)</Text>
                <Text className="text-midnight font-medium text-sm">{'\u20B9'}{pricing.tax.toFixed(2)}</Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-sm">Platform Fee</Text>
                <Text className="text-midnight font-medium text-sm">{'\u20B9'}{pricing.platformFee.toFixed(2)}</Text>
              </View>
              {couponApplied && (
                <View className="flex-row justify-between items-center">
                  <Text className="text-emerald-600 text-sm font-medium">Coupon Discount</Text>
                  <Text className="text-emerald-600 font-bold text-sm">-{'\u20B9'}{pricing.discount.toFixed(2)}</Text>
                </View>
              )}
              <View className="h-px bg-slate-100 my-1" />
              <View className="flex-row justify-between items-center">
                <Text className="text-midnight font-bold text-base">
                  {isPayOnVisit ? 'Amount Due at Clinic' : 'Total Payable'}
                </Text>
                <Text className="text-primary font-extrabold text-lg">{'\u20B9'}{pricing.total.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {isPayOnVisit ? (
            <View className="mt-3 flex-row items-start gap-2 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <Info size={13} color="#D97706" />
              <Text className="text-[11px] text-amber-700 flex-1 leading-[16px]">
                Please arrive 10 minutes early and carry exact change or a digital payment method. Payment is collected at the clinic reception.
              </Text>
            </View>
          ) : (
            <View className="mt-3 flex-row items-start gap-2">
              <Info size={12} color="#94A3B8" />
              <Text className="text-[10px] text-slate-400 flex-1 leading-[14px]">
                By clicking 'Pay & Confirm', you agree to our Terms of Service and Cancellation Policy. Free cancellation up to 4 hours before the appointment.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100" style={Shadows.presence}>
        <SafeAreaView edges={['bottom']}>
          <Pressable
            onPress={handleConfirm}
            disabled={submitting}
            className={`w-full py-4 rounded-full items-center flex-row justify-center gap-2 ${submitting ? 'bg-primary/70' : 'bg-primary'}`}
            style={Shadows.focus}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text className="text-white font-bold text-base">{ctaLabel}</Text>
                <ChevronRight size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}
