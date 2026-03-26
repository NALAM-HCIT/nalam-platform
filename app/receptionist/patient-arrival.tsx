import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowLeft,
  CheckCircle,
  User,
  Phone,
  MapPin,
  Clock,
  Users,
  Stethoscope,
  DoorOpen,
  Bell,
  ChevronRight,
  AlertCircle,
  HeartPulse,
  Clipboard,
  Ticket,
  X,
  Printer,
  Send,
} from 'lucide-react-native';

interface ArrivalData {
  patientName: string;
  patientId: string;
  age: number;
  gender: string;
  phone: string;
  doctorName: string;
  specialty: string;
  department: string;
  ward: string;
  appointmentTime: string;
  consultationType: string;
  arrivalTime: string;
  insurance: string;
  reason: string;
}

const arrivalData: ArrivalData = {
  patientName: 'Rahul Kapoor',
  patientId: 'NP-2026-0034',
  age: 34,
  gender: 'Male',
  phone: '+91 98765 43210',
  doctorName: 'Dr. Aruna Devi',
  specialty: 'Cardiologist',
  department: 'Cardiology',
  ward: 'Ward 4B, Room 12',
  appointmentTime: '10:00 AM',
  consultationType: 'In-Person',
  arrivalTime: '09:42 AM',
  insurance: 'Star Health - Active',
  reason: 'Follow-up cardiology consultation',
};

// Department-based token prefixes
const departmentTokens: Record<string, { prefix: string; nextNumber: number; currentQueue: number; totalQueue: number }> = {
  Cardiology: { prefix: 'CAR', nextNumber: 24, currentQueue: 3, totalQueue: 8 },
  Neurology: { prefix: 'NEU', nextNumber: 11, currentQueue: 2, totalQueue: 5 },
  Orthopedic: { prefix: 'ORT', nextNumber: 18, currentQueue: 4, totalQueue: 6 },
  Pediatrics: { prefix: 'PED', nextNumber: 32, currentQueue: 5, totalQueue: 10 },
  General: { prefix: 'GEN', nextNumber: 45, currentQueue: 6, totalQueue: 12 },
  Dermatology: { prefix: 'DER', nextNumber: 9, currentQueue: 1, totalQueue: 3 },
};

function WaitRing({ minutes, size = 80, strokeWidth = 5 }: { minutes: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const maxMinutes = 30;
  const progress = Math.min(minutes / maxMinutes, 1);
  const offset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E2E8F0" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#F59E0B" strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference}`} strokeDashoffset={offset} strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text className="text-xl font-extrabold text-[#0B1B3D]">{minutes}</Text>
        <Text className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">min</Text>
      </View>
    </View>
  );
}

export default function PatientArrivalScreen() {
  const router = useRouter();
  const [showPulse, setShowPulse] = useState(true);
  const [tokenAssigned, setTokenAssigned] = useState(false);
  const [tokenNumber, setTokenNumber] = useState('');
  const [queuePosition, setQueuePosition] = useState(0);
  const [totalInQueue, setTotalInQueue] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(0);
  const [vitalsRecorded, setVitalsRecorded] = useState(false);
  const [roomAssigned, setRoomAssigned] = useState<string | null>(null);
  const [doctorNotified, setDoctorNotified] = useState(false);
  const [tokenModalVisible, setTokenModalVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setShowPulse((p) => !p), 1500);
    return () => clearInterval(interval);
  }, []);

  const deptInfo = departmentTokens[arrivalData.department] || departmentTokens.General;

  const handleAssignToken = () => {
    setTokenModalVisible(true);
  };

  const confirmTokenAssignment = (priority: 'normal' | 'priority') => {
    const num = deptInfo.nextNumber;
    const token = `${deptInfo.prefix}-${String(num).padStart(3, '0')}`;
    const pos = priority === 'priority' ? 1 : deptInfo.currentQueue + 1;
    const total = deptInfo.totalQueue + 1;
    const wait = priority === 'priority' ? 5 : pos * 5;

    setTokenNumber(token);
    setQueuePosition(pos);
    setTotalInQueue(total);
    setEstimatedWait(wait);
    setTokenAssigned(true);
    setTokenModalVisible(false);

    CustomAlert.alert(
      'Token Assigned',
      `Token: ${token}\nQueue Position: ${pos} of ${total}\nEstimated Wait: ~${wait} min\n\n${priority === 'priority' ? 'Priority queue - patient moved to front.' : 'Added to regular queue.'}`,
      [
        { text: 'OK' },
        {
          text: 'Print Token',
          onPress: () => CustomAlert.alert('Printing', `Token slip printing...\n\n${token}\n${arrivalData.patientName}\n${arrivalData.doctorName}\n${arrivalData.department}\nQueue: ${pos}\nEst. Wait: ~${wait} min`),
        },
      ]
    );
  };

  const handleRecordVitals = () => {
    CustomAlert.alert(
      'Record Vitals',
      `Patient: ${arrivalData.patientName}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record',
          onPress: () => {
            setVitalsRecorded(true);
            CustomAlert.alert('Vitals Recorded', 'BP: 120/80 mmHg\nPulse: 72 bpm\nTemp: 98.4°F\nSpO2: 98%\nWeight: 72 kg');
          },
        },
      ]
    );
  };

  const handleAssignRoom = () => {
    CustomAlert.alert(
      'Assign Room',
      `Assign a consultation room for ${arrivalData.patientName}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Room 3',
          onPress: () => {
            setRoomAssigned('Room 3');
            CustomAlert.alert('Room Assigned', `${arrivalData.patientName} → Room 3\n${arrivalData.doctorName} has been notified.`);
          },
        },
        {
          text: 'Room 5',
          onPress: () => {
            setRoomAssigned('Room 5');
            CustomAlert.alert('Room Assigned', `${arrivalData.patientName} → Room 5\n${arrivalData.doctorName} has been notified.`);
          },
        },
        {
          text: 'Room 8',
          onPress: () => {
            setRoomAssigned('Room 8');
            CustomAlert.alert('Room Assigned', `${arrivalData.patientName} → Room 8\n${arrivalData.doctorName} has been notified.`);
          },
        },
      ]
    );
  };

  const handleNotifyDoctor = () => {
    CustomAlert.alert(
      'Notify Doctor',
      `Send notification to ${arrivalData.doctorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: () => {
            setDoctorNotified(true);
            CustomAlert.alert('Notified', `${arrivalData.doctorName} has been notified.\n\nPatient: ${arrivalData.patientName}\nToken: ${tokenNumber}\n${roomAssigned ? `Room: ${roomAssigned}` : 'Room: Not yet assigned'}`);
          },
        },
      ]
    );
  };

  const handleSendToDoctor = () => {
    if (!tokenAssigned) {
      CustomAlert.alert('Token Required', 'Please assign a token before sending the patient to the doctor.');
      return;
    }
    if (!roomAssigned) {
      CustomAlert.alert('Room Required', 'Please assign a room before sending the patient to the doctor.');
      return;
    }
    CustomAlert.alert(
      'Confirm',
      `Send ${arrivalData.patientName} to ${arrivalData.doctorName} in ${roomAssigned}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Now',
          onPress: () => {
            CustomAlert.alert(
              'Patient Sent',
              `${arrivalData.patientName} has been directed to ${roomAssigned}.\n\nDoctor: ${arrivalData.doctorName}\nToken: ${tokenNumber}\nVitals: ${vitalsRecorded ? 'Recorded' : 'Pending'}`,
              [{ text: 'OK', onPress: () => router.back() }]
            );
          },
        },
      ]
    );
  };

  const canSend = tokenAssigned && roomAssigned;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 py-3 border-b border-slate-100 bg-white">
        <Pressable onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <Text className="text-lg font-bold text-[#0B1B3D] flex-1 text-center pr-10">
          Patient Arrival
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Arrival Alert Banner */}
        <View className="mx-5 mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex-row items-center gap-3">
          <View className="w-11 h-11 rounded-full bg-green-100 items-center justify-center">
            <CheckCircle size={24} color="#22C55E" fill="#22C55E" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-bold text-[#0B1B3D]">Patient Has Arrived</Text>
            <Text className="text-xs text-green-700 font-medium">
              Checked in at {arrivalData.arrivalTime} via Mobile App
            </Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className={`w-2 h-2 rounded-full ${showPulse ? 'bg-green-500' : 'bg-green-300'}`} />
            <Text className="text-green-600 text-[10px] font-bold">LIVE</Text>
          </View>
        </View>

        {/* Patient Info Card */}
        <View
          className="mx-5 mt-4 bg-white rounded-[24px] p-5 border border-slate-100"
          style={Shadows.card}
        >
          <View className="flex-row items-center gap-4 mb-4">
            <View className="w-16 h-16 rounded-2xl bg-[#1A73E8]/10 items-center justify-center border-2 border-[#1A73E8]/20">
              <User size={28} color="#1A73E8" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-[#0B1B3D]">{arrivalData.patientName}</Text>
              <Text className="text-xs text-slate-500 font-medium mt-0.5">
                {arrivalData.age} yrs | {arrivalData.gender} | ID: {arrivalData.patientId}
              </Text>
              <View className="flex-row items-center gap-1 mt-1">
                <Phone size={12} color="#94A3B8" />
                <Text className="text-xs text-slate-400">{arrivalData.phone}</Text>
              </View>
            </View>
          </View>

          <View className="flex-row gap-2">
            <View className="flex-1 bg-blue-50 rounded-xl p-3 items-center">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Insurance</Text>
              <Text className="text-xs font-bold text-[#1A73E8] mt-1">{arrivalData.insurance}</Text>
            </View>
            <View className="flex-1 bg-slate-50 rounded-xl p-3 items-center">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</Text>
              <Text className="text-xs font-bold text-[#0B1B3D] mt-1">{arrivalData.consultationType}</Text>
            </View>
          </View>
        </View>

        {/* Token Assignment Card - shown before assignment */}
        {!tokenAssigned ? (
          <Pressable
            onPress={handleAssignToken}
            className="mx-5 mt-4 bg-[#1A73E8]/5 border-2 border-dashed border-[#1A73E8]/30 rounded-[24px] p-6 items-center gap-3"
          >
            <View className="w-16 h-16 rounded-full bg-[#1A73E8]/10 items-center justify-center">
              <Ticket size={28} color="#1A73E8" />
            </View>
            <Text className="text-lg font-bold text-[#1A73E8]">Assign Token</Text>
            <Text className="text-xs text-slate-500 text-center">
              Tap to generate a token for {arrivalData.patientName}{'\n'}
              Department: {arrivalData.department} | Next: {deptInfo.prefix}-{String(deptInfo.nextNumber).padStart(3, '0')}
            </Text>
            <View className="flex-row items-center gap-4 mt-2">
              <View className="bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <Text className="text-[10px] text-slate-500 font-bold">Queue: {deptInfo.totalQueue} waiting</Text>
              </View>
              <View className="bg-white px-3 py-1.5 rounded-full border border-slate-200">
                <Text className="text-[10px] text-slate-500 font-bold">~{(deptInfo.currentQueue + 1) * 5} min wait</Text>
              </View>
            </View>
          </Pressable>
        ) : (
          /* Token & Queue Card - shown after assignment */
          <View
            className="mx-5 mt-4 bg-white rounded-[24px] p-5 border border-slate-100"
            style={Shadows.card}
          >
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Token Assigned
              </Text>
              <Pressable
                onPress={() => CustomAlert.alert('Print Token', `Printing token slip for ${tokenNumber}...`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Print', onPress: () => CustomAlert.alert('Sent', 'Token slip sent to printer.') },
                ])}
                className="flex-row items-center gap-1"
              >
                <Printer size={14} color="#1A73E8" />
                <Text className="text-xs text-[#1A73E8] font-bold">Print</Text>
              </Pressable>
            </View>
            <View className="flex-row items-center justify-between">
              {/* Token */}
              <View className="items-center flex-1">
                <View className="bg-[#1A73E8] px-5 py-3 rounded-2xl mb-2" style={Shadows.focus}>
                  <Text className="text-xl font-extrabold text-white tracking-wider">
                    {tokenNumber}
                  </Text>
                </View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Token</Text>
              </View>

              <View className="w-px h-16 bg-slate-100 mx-3" />

              {/* Queue */}
              <View className="items-center flex-1">
                <View className="flex-row items-baseline gap-1 mb-2">
                  <Text className="text-3xl font-extrabold text-[#0B1B3D]">{queuePosition}</Text>
                  <Text className="text-sm text-slate-400 font-medium">/ {totalInQueue}</Text>
                </View>
                <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In Queue</Text>
              </View>

              <View className="w-px h-16 bg-slate-100 mx-3" />

              {/* Wait Time */}
              <View className="items-center flex-1">
                <WaitRing minutes={estimatedWait} />
              </View>
            </View>

            {/* SMS notification */}
            <View className="mt-4 pt-4 border-t border-slate-100 flex-row items-center gap-2">
              <Send size={14} color="#22C55E" />
              <Text className="text-xs text-green-600 font-medium">
                Token SMS sent to {arrivalData.phone}
              </Text>
            </View>
          </View>
        )}

        {/* Appointment Details */}
        <View
          className="mx-5 mt-4 bg-white rounded-[24px] p-5 border border-slate-100"
          style={Shadows.card}
        >
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Appointment Details
          </Text>
          <View className="gap-4">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-[#1A73E8]/10 items-center justify-center">
                <Stethoscope size={18} color="#1A73E8" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#0B1B3D]">{arrivalData.doctorName}</Text>
                <Text className="text-xs text-[#1A73E8] font-medium">{arrivalData.specialty}</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-[#1A73E8]/10 items-center justify-center">
                <Clock size={18} color="#1A73E8" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#0B1B3D]">{arrivalData.appointmentTime}</Text>
                <Text className="text-xs text-slate-500 font-medium">Scheduled Time</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-[#1A73E8]/10 items-center justify-center">
                <MapPin size={18} color="#1A73E8" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#0B1B3D]">{arrivalData.department}</Text>
                <Text className="text-xs text-slate-500 font-medium">{arrivalData.ward}</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-slate-50 items-center justify-center">
                <Clipboard size={18} color="#64748B" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#0B1B3D]">Reason</Text>
                <Text className="text-xs text-slate-500 font-medium">{arrivalData.reason}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Check-in Checklist */}
        <View
          className="mx-5 mt-4 bg-white rounded-[24px] p-5 border border-slate-100"
          style={Shadows.card}
        >
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            Check-in Checklist
          </Text>
          <View className="gap-3">
            {/* 1. Arrival */}
            <View className="flex-row items-center gap-3">
              <View className="w-6 h-6 rounded-full bg-green-100 items-center justify-center">
                <CheckCircle size={14} color="#22C55E" />
              </View>
              <Text className="text-sm text-[#0B1B3D] font-medium flex-1">Patient arrived</Text>
              <Text className="text-[10px] text-slate-400">{arrivalData.arrivalTime}</Text>
            </View>

            {/* 2. Token */}
            <Pressable
              onPress={!tokenAssigned ? handleAssignToken : undefined}
              className="flex-row items-center gap-3"
            >
              <View className={`w-6 h-6 rounded-full items-center justify-center ${tokenAssigned ? 'bg-green-100' : 'bg-amber-100'}`}>
                {tokenAssigned ? (
                  <CheckCircle size={14} color="#22C55E" />
                ) : (
                  <Ticket size={14} color="#F59E0B" />
                )}
              </View>
              <Text className="text-sm text-[#0B1B3D] font-medium flex-1">
                {tokenAssigned ? `Token assigned: ${tokenNumber}` : 'Assign token'}
              </Text>
              {!tokenAssigned && <ChevronRight size={16} color="#F59E0B" />}
            </Pressable>

            {/* 3. Vitals */}
            <Pressable
              onPress={!vitalsRecorded ? handleRecordVitals : undefined}
              className="flex-row items-center gap-3"
            >
              <View className={`w-6 h-6 rounded-full items-center justify-center ${vitalsRecorded ? 'bg-green-100' : tokenAssigned ? 'bg-amber-100' : 'bg-slate-100'}`}>
                {vitalsRecorded ? (
                  <CheckCircle size={14} color="#22C55E" />
                ) : (
                  <AlertCircle size={14} color={tokenAssigned ? '#F59E0B' : '#94A3B8'} />
                )}
              </View>
              <Text className={`text-sm font-medium flex-1 ${tokenAssigned ? 'text-[#0B1B3D]' : 'text-slate-400'}`}>
                {vitalsRecorded ? 'Vitals recorded' : 'Record vitals'}
              </Text>
              {!vitalsRecorded && tokenAssigned && <ChevronRight size={16} color="#F59E0B" />}
            </Pressable>

            {/* 4. Room */}
            <Pressable
              onPress={!roomAssigned && tokenAssigned ? handleAssignRoom : undefined}
              className="flex-row items-center gap-3"
            >
              <View className={`w-6 h-6 rounded-full items-center justify-center ${roomAssigned ? 'bg-green-100' : 'bg-slate-100'}`}>
                {roomAssigned ? (
                  <CheckCircle size={14} color="#22C55E" />
                ) : (
                  <DoorOpen size={14} color="#94A3B8" />
                )}
              </View>
              <Text className={`text-sm font-medium flex-1 ${tokenAssigned ? 'text-[#0B1B3D]' : 'text-slate-400'}`}>
                {roomAssigned ? `Assigned to ${roomAssigned}` : 'Assign room'}
              </Text>
              {!roomAssigned && tokenAssigned && <ChevronRight size={16} color="#94A3B8" />}
            </Pressable>

            {/* 5. Doctor notified */}
            <View className="flex-row items-center gap-3">
              <View className={`w-6 h-6 rounded-full items-center justify-center ${doctorNotified ? 'bg-green-100' : 'bg-slate-100'}`}>
                {doctorNotified ? (
                  <CheckCircle size={14} color="#22C55E" />
                ) : (
                  <Bell size={14} color="#94A3B8" />
                )}
              </View>
              <Text className={`text-sm font-medium flex-1 ${doctorNotified ? 'text-[#0B1B3D]' : 'text-slate-400'}`}>
                {doctorNotified ? 'Doctor notified' : 'Notify doctor'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-5 mt-4 flex-row gap-3">
          <Pressable
            onPress={tokenAssigned ? handleRecordVitals : handleAssignToken}
            className="flex-1 bg-white rounded-2xl p-4 items-center gap-2 border border-slate-100"
            style={Shadows.card}
          >
            {tokenAssigned ? (
              <HeartPulse size={22} color="#EF4444" />
            ) : (
              <Ticket size={22} color="#1A73E8" />
            )}
            <Text className="text-xs font-semibold text-[#0B1B3D]">
              {tokenAssigned ? 'Record Vitals' : 'Assign Token'}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleAssignRoom}
            className="flex-1 bg-white rounded-2xl p-4 items-center gap-2 border border-slate-100"
            style={Shadows.card}
          >
            <DoorOpen size={22} color="#1A73E8" />
            <Text className="text-xs font-semibold text-[#0B1B3D]">Assign Room</Text>
          </Pressable>
          <Pressable
            onPress={handleNotifyDoctor}
            className="flex-1 bg-white rounded-2xl p-4 items-center gap-2 border border-slate-100"
            style={Shadows.card}
          >
            <Bell size={22} color="#F59E0B" />
            <Text className="text-xs font-semibold text-[#0B1B3D]">Notify Doctor</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      <View className="absolute bottom-0 left-0 right-0 p-5 bg-white/90 border-t border-slate-100">
        <SafeAreaView edges={['bottom']}>
          <Pressable
            onPress={handleSendToDoctor}
            className={`w-full py-4 rounded-full items-center flex-row justify-center gap-2 ${
              canSend ? 'bg-[#1A73E8]' : 'bg-slate-200'
            }`}
            style={canSend ? Shadows.focus : undefined}
          >
            <Stethoscope size={20} color={canSend ? '#FFFFFF' : '#94A3B8'} />
            <Text className={`font-bold text-base ${canSend ? 'text-white' : 'text-slate-400'}`}>
              Send to Doctor
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>

      {/* Token Assignment Modal */}
      <Modal visible={tokenModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl">
            <SafeAreaView edges={['bottom']}>
              {/* Modal Header */}
              <View className="flex-row items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                <Text className="text-xl font-bold text-[#0B1B3D]">Assign Token</Text>
                <Pressable
                  onPress={() => setTokenModalVisible(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={18} color="#64748B" />
                </Pressable>
              </View>

              <View className="px-6 py-5">
                {/* Patient Summary */}
                <View className="flex-row items-center gap-3 mb-6">
                  <View className="w-12 h-12 rounded-xl bg-[#1A73E8]/10 items-center justify-center">
                    <User size={22} color="#1A73E8" />
                  </View>
                  <View>
                    <Text className="font-bold text-[#0B1B3D]">{arrivalData.patientName}</Text>
                    <Text className="text-xs text-slate-500">{arrivalData.doctorName} | {arrivalData.department}</Text>
                  </View>
                </View>

                {/* Token Preview */}
                <View className="bg-slate-50 rounded-2xl p-5 items-center mb-6 border border-slate-100">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Next Token Number
                  </Text>
                  <Text className="text-4xl font-extrabold text-[#1A73E8] tracking-wider">
                    {deptInfo.prefix}-{String(deptInfo.nextNumber).padStart(3, '0')}
                  </Text>
                  <View className="flex-row items-center gap-4 mt-3">
                    <Text className="text-xs text-slate-500">
                      Dept: <Text className="font-bold">{arrivalData.department}</Text>
                    </Text>
                    <Text className="text-xs text-slate-500">
                      Queue: <Text className="font-bold">{deptInfo.totalQueue} waiting</Text>
                    </Text>
                  </View>
                </View>

                {/* Queue Info */}
                <View className="flex-row gap-3 mb-6">
                  <View className="flex-1 bg-amber-50 rounded-xl p-4 items-center border border-amber-100">
                    <Users size={18} color="#F59E0B" />
                    <Text className="text-lg font-bold text-[#0B1B3D] mt-1">{deptInfo.totalQueue}</Text>
                    <Text className="text-[10px] text-slate-500 font-medium">In Queue</Text>
                  </View>
                  <View className="flex-1 bg-blue-50 rounded-xl p-4 items-center border border-blue-100">
                    <Clock size={18} color="#1A73E8" />
                    <Text className="text-lg font-bold text-[#0B1B3D] mt-1">~{(deptInfo.currentQueue + 1) * 5} min</Text>
                    <Text className="text-[10px] text-slate-500 font-medium">Est. Wait</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="gap-3">
                  <Pressable
                    onPress={() => confirmTokenAssignment('normal')}
                    className="w-full bg-[#1A73E8] py-4 rounded-full items-center flex-row justify-center gap-2"
                    style={Shadows.focus}
                  >
                    <Ticket size={20} color="#FFFFFF" />
                    <Text className="text-white font-bold text-base">Assign Regular Token</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => confirmTokenAssignment('priority')}
                    className="w-full bg-red-50 border-2 border-red-200 py-4 rounded-full items-center flex-row justify-center gap-2"
                  >
                    <AlertCircle size={20} color="#DC2626" />
                    <Text className="text-red-600 font-bold text-base">Priority Token (Urgent)</Text>
                  </Pressable>
                </View>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
