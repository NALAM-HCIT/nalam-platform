import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Phone, MessageSquare,
  Heart, Wind, AlertTriangle, Clock, X,
} from 'lucide-react-native';
import { agoraService } from '@/services/agoraService';
import { AgoraSurfaceView, isAgoraAvailable } from '@/components/AgoraSurface';

// Mock data
const doctorData = {
  name: 'Dr. Rajesh Kumar',
  specialty: 'Senior Cardiologist',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIh-3iidT6V2zFlQCc723B3LsrBC6k6TmjePD4jVV618U_pOajvUapbFi06sU9btVPM0XVIP8nqpJsykecIcZf3Oy0hWLGBPw42SkfjepTlOBnXhY3rYgKQ98sI7Dn2s5V-Qlqe7Jokvrs18PH1UIcty8Qm4eBAnngW45OYkbCXsssTzL1WvbIGZvHAGi-H5z451AaeFLHW6unAHKcYohEH9H1AvF3a2a9uVdyFcplFCCHeD6apalLPBfLC0kqLkUy790QFaWUyoP6',
};

const healthMetrics = [
  {
    label: 'Heart Rate',
    value: '72',
    unit: 'BPM',
    icon: Heart,
    iconColor: '#EF4444',
    bgColor: 'bg-red-50',
    barColor: 'bg-red-400',
    bars: [40, 60, 80, 50, 90],
  },
  {
    label: 'SpO2 Level',
    value: '98',
    unit: '%',
    icon: Wind,
    iconColor: '#1A73E8',
    bgColor: 'bg-blue-50',
    barColor: 'bg-[#1A73E8]',
    bars: [70, 75, 85, 80, 95],
  },
];

export default function VideoConsultationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [endCallModal, setEndCallModal] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);

  // Use the appointment ID for the channel name to match the doctor
  const channelName = id ? `consultation_${id}` : 'consultation_default';

  useEffect(() => {
    if (!id && !__DEV__) return; // Ensure we have an ID unless in dev mode
    if (!agoraService.isAvailable) return; // Skip if Agora not available
    let mounted = true;

    async function setupAgora() {
      try {
        await agoraService.init({
          onJoinChannelSuccess: () => {
            console.log('Joined successfully');
          },
          onUserJoined: (connection, uid) => {
            if (mounted) setRemoteUid(uid);
          },
          onUserOffline: () => {
             if (mounted) setRemoteUid(null);
          },
        });
        await agoraService.join(channelName);
      } catch (err) {
        console.error('Agora Init Error', err);
      }
    }

    setupAgora();

    return () => {
      mounted = false;
      agoraService.leave();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-[#F0F7FF]">
      {/* Top Navigation Bar */}
      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0 z-50">
        <View
          className="flex-row items-center justify-between mx-4 mt-2 px-4 py-2.5 bg-white/70 rounded-full"
          style={Shadows.presence}
        >
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#1A73E8]">
              <Image
                source={{ uri: doctorData.avatar }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </View>
            <View>
              <Text className="text-xl font-extrabold text-[#1A73E8] tracking-tight">
                {doctorData.name}
              </Text>
              <Text className="text-[10px] tracking-[3px] uppercase text-slate-500 font-light">
                {doctorData.specialty}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full">
            <View className="w-2 h-2 rounded-full bg-red-600" />
            <Text className="text-red-600 text-xs font-bold">
              LIVE &bull; {formatTime(elapsedSeconds)}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Main Content */}
      <View className="flex-1 pt-28 pb-36 px-4 gap-6">
        {/* Main Video Feed */}
        <View
          className="flex-1 rounded-2xl overflow-hidden bg-slate-900"
          style={{
            shadowColor: '#1A73E8',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.15,
            shadowRadius: 40,
            elevation: 8,
          }}
        >
          {remoteUid && isAgoraAvailable() ? (
            <AgoraSurfaceView
              canvas={{ uid: remoteUid }}
              style={{ flex: 1 }}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
               {!isAgoraAvailable() ? (
                 <Text className="text-white mt-4 font-medium">Video calls require a development build (not Expo Go).</Text>
               ) : (
                 <>
                   <ActivityIndicator size="large" color="#1A73E8" />
                   <Text className="text-white mt-4 font-medium">Waiting for doctor...</Text>
                 </>
               )}
            </View>
          )}

          {/* Watermark */}
          <View className="absolute top-6 right-6 opacity-30">
            <Text className="text-white font-extrabold text-lg tracking-tight">
              Arun Priya Multispeciality Hospital
            </Text>
          </View>

          {/* Patient PIP Overlay */}
          <View
            className="absolute bottom-6 right-6 w-32 rounded-2xl overflow-hidden border-2 border-white/50 bg-slate-800"
            style={{
              aspectRatio: 3 / 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {isVideoOn && isAgoraAvailable() ? (
              <AgoraSurfaceView
                canvas={{ uid: 0 }}
                style={{ flex: 1 }}
              />
            ) : (
              <View className="flex-1 items-center justify-center">
                <VideoOff size={24} color="#64748B" />
              </View>
            )}
            <View className="absolute bottom-2 left-2 bg-black/40 px-2 py-0.5 rounded">
              <Text className="text-[10px] text-white">You</Text>
            </View>
          </View>

          {/* Doctor Speaking Tag */}
          <View className="absolute bottom-6 left-6 bg-white/70 px-4 py-2 rounded-full">
            <Text className="text-sm font-semibold text-[#0B1B3D]">
              {doctorData.name} is speaking...
            </Text>
          </View>
        </View>

        {/* Health Sync Widgets */}
        <View className="flex-row gap-4">
          {healthMetrics.map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <View
                key={index}
                className="flex-1 bg-white/70 p-5 rounded-2xl flex-row items-center justify-between"
                style={Shadows.card}
              >
                <View className="flex-row items-center gap-3">
                  <View
                    className={`w-12 h-12 rounded-full ${metric.bgColor} items-center justify-center`}
                  >
                    <IconComponent size={24} color={metric.iconColor} />
                  </View>
                  <View>
                    <Text className="text-[10px] uppercase tracking-[2px] text-slate-500 font-light">
                      {metric.label}
                    </Text>
                    <View className="flex-row items-baseline gap-1">
                      <Text className="text-2xl font-extrabold text-[#0B1B3D]">
                        {metric.value}
                      </Text>
                      <Text className="text-sm text-slate-400">{metric.unit}</Text>
                    </View>
                  </View>
                </View>

                {/* Mini Bar Chart */}
                <View
                  className={`h-10 w-20 ${metric.bgColor}/50 rounded flex-row items-end px-1 pb-1 gap-0.5`}
                >
                  {metric.bars.map((height, barIdx) => (
                    <View
                      key={barIdx}
                      className={`flex-1 ${metric.barColor} rounded-t`}
                      style={{
                        height: `${height}%`,
                        opacity: 0.4 + barIdx * 0.15,
                      }}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Bottom Control Panel */}
      <SafeAreaView
        edges={['bottom']}
        className="absolute bottom-0 left-0 right-0 z-50 items-center pb-4 px-6"
      >
        <View
          className="bg-white/70 rounded-full flex-row items-center gap-2 p-3"
          style={{
            shadowColor: '#1A73E8',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 30,
            elevation: 12,
          }}
        >
          {/* Mute Toggle */}
          <Pressable
            onPress={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              agoraService.toggleMute(newMuted);
            }}
            className={`w-14 h-14 rounded-full items-center justify-center ${
              isMuted ? 'bg-red-100' : 'bg-transparent'
            }`}
          >
            {isMuted ? (
              <MicOff size={22} color="#64748B" />
            ) : (
              <Mic size={22} color="#64748B" />
            )}
          </Pressable>

          {/* Video Toggle */}
          <Pressable
            onPress={() => {
              const newVideo = !isVideoOn;
              setIsVideoOn(newVideo);
              agoraService.toggleVideo(newVideo);
            }}
            className={`w-14 h-14 rounded-full items-center justify-center ${
              !isVideoOn ? 'bg-red-100' : 'bg-transparent'
            }`}
          >
            {isVideoOn ? (
              <VideoIcon size={22} color="#64748B" />
            ) : (
              <VideoOff size={22} color="#64748B" />
            )}
          </Pressable>

          {/* Chat */}
          <Pressable className="w-14 h-14 rounded-full items-center justify-center">
            <MessageSquare size={22} color="#64748B" />
          </Pressable>

          {/* Divider */}
          <View className="w-px h-8 bg-slate-200 mx-2" />

          {/* End Call Button */}
          <Pressable
            onPress={() => setEndCallModal(true)}
            className="bg-[#DC2626] h-14 px-8 rounded-full flex-row items-center gap-2"
            style={{
              shadowColor: '#DC2626',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Phone
              size={20}
              color="#FFFFFF"
              style={{ transform: [{ rotate: '135deg' }] }}
            />
            <Text className="text-white text-xs tracking-[3px] uppercase font-bold">
              End Call
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* End Call Confirmation Modal */}
      <Modal visible={endCallModal} animationType="fade" transparent>
        <View className="flex-1 bg-black/60 items-center justify-center px-8">
          <View
            className="bg-white rounded-[28px] w-full overflow-hidden"
            style={Shadows.presence}
          >
            {/* Modal Header */}
            <View className="items-center pt-8 pb-4 px-6">
              <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
                <AlertTriangle size={32} color="#DC2626" />
              </View>
              <Text className="text-xl font-bold text-[#0B1B3D] text-center">
                End Consultation?
              </Text>
              <Text className="text-sm text-slate-500 text-center mt-2 leading-5">
                Are you sure you want to end this video consultation with {doctorData.name}?
              </Text>
            </View>

            {/* Call Duration */}
            <View className="mx-6 mb-6 bg-slate-50 rounded-xl p-4 flex-row items-center justify-center gap-3">
              <Clock size={16} color="#64748B" />
              <Text className="text-sm text-slate-600">
                Call duration: <Text className="font-bold text-[#0B1B3D]">{formatTime(elapsedSeconds)}</Text>
              </Text>
            </View>

            {/* Actions */}
            <View className="px-6 pb-8 gap-3">
              <Pressable
                onPress={() => {
                  setEndCallModal(false);
                  router.replace('/patient/post-consultation');
                }}
                className="w-full bg-[#DC2626] py-4 rounded-full items-center flex-row justify-center gap-2"
                style={{
                  shadowColor: '#DC2626',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Phone
                  size={18}
                  color="#FFFFFF"
                  style={{ transform: [{ rotate: '135deg' }] }}
                />
                <Text className="text-white font-bold text-base">End Call</Text>
              </Pressable>

              <Pressable
                onPress={() => setEndCallModal(false)}
                className="w-full bg-white border-2 border-slate-200 py-4 rounded-full items-center"
              >
                <Text className="text-[#0B1B3D] font-bold text-base">Continue Call</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
