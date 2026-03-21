import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows } from '@/constants/theme';
import {
  ArrowLeft, Download, Share2, Maximize, FileText, ZoomIn, ZoomOut, Hospital,
} from 'lucide-react-native';

const testResults = [
  { test: 'Hemoglobin (Hb)', result: '14.2 g/dL', range: '12.0 - 15.5' },
  { test: 'Total WBC Count', result: '6.5 x 10^9/L', range: '4.5 - 11.0' },
  { test: 'Platelet Count', result: '245 x 10^3/µL', range: '150 - 450' },
  { test: 'RBC Count', result: '4.8 million/µL', range: '3.8 - 5.1' },
  { test: 'Packed Cell Volume (PCV)', result: '42.1 %', range: '36.0 - 46.0' },
];

export default function DocumentViewScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-200 bg-[#F8FAFC]/80">
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center"
          >
            <ArrowLeft size={20} color="#334155" />
          </Pressable>
          <Text className="text-xl font-bold tracking-tight text-[#0B1B3D]">Blood Test Report</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable className="w-10 h-10 rounded-full items-center justify-center">
            <Maximize size={18} color="#334155" />
          </Pressable>
          <Pressable className="w-10 h-10 rounded-full items-center justify-center">
            <Download size={18} color="#334155" />
          </Pressable>
          <Pressable className="w-10 h-10 rounded-full items-center justify-center">
            <Share2 size={18} color="#334155" />
          </Pressable>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        className="flex-1 px-4 pt-6"
        contentContainerStyle={{ alignItems: 'center', paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Document Card */}
        <View
          className="w-full bg-white rounded-2xl border border-slate-100 overflow-hidden"
          style={Shadows.presence}
        >
          {/* PDF Preview Header */}
          <View className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex-row justify-between items-center">
            <View className="flex-row items-center gap-3">
              <View className="bg-red-100 p-2 rounded-lg">
                <FileText size={16} color="#DC2626" />
              </View>
              <View>
                <Text className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Document ID: CBC-99203
                </Text>
                <Text className="text-sm font-bold text-[#0B1B3D]">Comprehensive Blood Count</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-[10px] text-slate-400">Generated on</Text>
              <Text className="text-sm font-medium text-[#0B1B3D]">Oct 24, 2023</Text>
            </View>
          </View>

          {/* Report Content */}
          <View className="p-8 gap-8">
            {/* Hospital Letterhead */}
            <View className="flex-row justify-between items-start border-b border-slate-100 pb-6">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 bg-[#1A73E8] rounded-lg items-center justify-center">
                  <Hospital size={16} color="#FFFFFF" />
                </View>
                <Text className="text-lg font-bold tracking-tight text-[#0B1B3D]">
                  Arun Priya Multispeciality{' '}
                  <Text className="text-[#1A73E8]">Hospital</Text>
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] text-slate-500 leading-relaxed">
                  123 Healthcare Blvd, Medical District
                </Text>
                <Text className="text-[10px] text-slate-500 leading-relaxed">
                  Chennai, Tamil Nadu - 600001
                </Text>
                <Text className="text-[10px] text-slate-500 leading-relaxed">
                  Contact: +91 44 2345 6789
                </Text>
              </View>
            </View>

            {/* Patient Info */}
            <View className="bg-slate-50 rounded-xl p-4 flex-row flex-wrap">
              <View className="w-1/2 mb-3">
                <Text className="text-[10px] text-slate-400">Patient Name</Text>
                <Text className="font-bold text-sm text-[#0B1B3D]">Jane Doe</Text>
              </View>
              <View className="w-1/2 mb-3">
                <Text className="text-[10px] text-slate-400">Age / Gender</Text>
                <Text className="font-bold text-sm text-[#0B1B3D]">28 Y / Female</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-[10px] text-slate-400">Referred By</Text>
                <Text className="font-bold text-sm text-[#0B1B3D]">Dr. Anirudh Sharma</Text>
              </View>
              <View className="w-1/2">
                <Text className="text-[10px] text-slate-400">Sample Type</Text>
                <Text className="font-bold text-sm text-[#0B1B3D]">EDTA Whole Blood</Text>
              </View>
            </View>

            {/* Test Results */}
            <View className="gap-4">
              <View className="flex-row items-center">
                <View className="w-1 h-5 bg-[#1A73E8] rounded-full mr-3" />
                <Text className="font-bold text-[#0B1B3D]">Hematology Report</Text>
              </View>

              {/* Table Header */}
              <View className="flex-row border-b border-slate-100 pb-2">
                <Text className="flex-1 text-slate-400 text-xs font-medium">Test Description</Text>
                <Text className="w-28 text-right text-slate-400 text-xs font-medium">Result</Text>
                <Text className="w-24 text-right text-slate-400 text-xs font-medium">Ref Range</Text>
              </View>

              {/* Table Rows */}
              {testResults.map((item, index) => (
                <View
                  key={index}
                  className={`flex-row items-center py-3 ${
                    index < testResults.length - 1 ? 'border-b border-slate-50' : ''
                  }`}
                >
                  <Text className="flex-1 text-sm text-[#0B1B3D]">{item.test}</Text>
                  <Text className="w-28 text-right text-sm font-bold text-[#1A73E8]">{item.result}</Text>
                  <Text className="w-24 text-right text-xs text-slate-500">{item.range}</Text>
                </View>
              ))}
            </View>

            {/* Clinical Impression */}
            <View className="bg-[#1A73E8]/5 p-4 rounded-xl border border-[#1A73E8]/10">
              <Text className="text-[10px] font-bold text-[#1A73E8] uppercase mb-1">
                Clinical Impression
              </Text>
              <Text className="text-sm leading-relaxed text-[#0B1B3D]">
                All parameters are within normal physiological ranges. No significant hematological
                abnormalities detected at this time. Clinical correlation is advised.
              </Text>
            </View>

            {/* Signature */}
            <View className="items-end pt-8">
              <View className="w-48 items-center">
                <View className="h-12 items-center justify-center">
                  <Text className="text-slate-400 italic text-sm">- Signature -</Text>
                </View>
                <View className="w-full border-t border-slate-300 mt-2 pt-2 items-center">
                  <Text className="text-sm font-bold text-[#0B1B3D]">Dr. S. K. Nair</Text>
                  <Text className="text-xs text-slate-500">Chief Pathologist</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Zoom / Pagination Controls */}
        <View
          className="flex-row items-center gap-4 bg-white/70 px-5 py-2.5 rounded-full border border-white/40 mt-6"
          style={Shadows.presence}
        >
          <View className="flex-row items-center gap-3">
            <Pressable className="w-8 h-8 rounded-full items-center justify-center">
              <ZoomOut size={18} color="#1A73E8" />
            </Pressable>
            <Text className="text-xs font-bold text-slate-600 min-w-[40px] text-center">100%</Text>
            <Pressable className="w-8 h-8 rounded-full items-center justify-center">
              <ZoomIn size={18} color="#1A73E8" />
            </Pressable>
          </View>
          <View className="h-4 w-px bg-slate-200 mx-1" />
          <Pressable className="w-8 h-8 rounded-full items-center justify-center">
            <Maximize size={18} color="#1A73E8" />
          </Pressable>
          <View className="h-4 w-px bg-slate-200 mx-1" />
          <Text className="text-sm font-medium text-slate-600">Page 1 of 1</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
