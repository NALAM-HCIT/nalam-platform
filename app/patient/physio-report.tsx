import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Dumbbell, Calendar, Clock, Flame, TrendingUp, ChevronDown,
} from 'lucide-react-native';
import { Shadows } from '@/constants/theme';
import { getPhysioReport, PhysioReport, PhysioDaySummary } from '@/services/patientDashboardService';

// ─── Date helpers ────────────────────────────────────────────────────────
function toIsoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const RANGE_OPTIONS = [
  { label: 'Last 7 days',  days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

// ─── Pain colour ─────────────────────────────────────────────────────────
function painColor(pain: number | null): string {
  if (pain === null) return '#94A3B8';
  if (pain <= 2) return '#22C55E';
  if (pain <= 5) return '#F59E0B';
  return '#EF4444';
}

// ─── Stat card ───────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub?: string; color: string;
}) {
  const Icon = icon;
  return (
    <View className="flex-1 bg-white rounded-2xl p-3 items-center" style={Shadows.card}>
      <View className="w-9 h-9 rounded-xl items-center justify-center mb-1" style={{ backgroundColor: `${color}15` }}>
        <Icon size={18} color={color} />
      </View>
      <Text style={{ fontSize: 20, fontWeight: '900', color: '#0B1B3D' }}>{value}</Text>
      {sub && <Text style={{ fontSize: 9, color, fontWeight: '700' }}>{sub}</Text>}
      <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 2, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────
export default function PhysioReportScreen() {
  const router = useRouter();
  const [report, setReport] = useState<PhysioReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);
  const [showRangePicker, setShowRangePicker] = useState(false);

  const loadReport = useCallback(async (days: number) => {
    setLoading(true);
    try {
      const to   = toIsoDate(new Date());
      const from = toIsoDate(addDays(new Date(), -(days - 1)));
      const res  = await getPhysioReport(from, to);
      setReport(res);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReport(rangeDays); }, [loadReport, rangeDays]);

  const rangeLabel = RANGE_OPTIONS.find(r => r.days === rangeDays)?.label ?? 'Custom';

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-4 border-b border-slate-100">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center mr-3 active:opacity-70"
        >
          <ArrowLeft size={18} color="#475569" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-midnight">Physio Report</Text>
          <Text className="text-xs text-slate-400">Your physiotherapy history</Text>
        </View>

        {/* Range picker button */}
        <Pressable
          onPress={() => setShowRangePicker(v => !v)}
          className="flex-row items-center gap-1 px-3 py-2 rounded-full active:opacity-70"
          style={{ backgroundColor: '#EEF4FF' }}
        >
          <Calendar size={12} color="#1A73E8" />
          <Text className="text-xs font-bold" style={{ color: '#1A73E8' }}>{rangeLabel}</Text>
          <ChevronDown size={12} color="#1A73E8" />
        </Pressable>
      </View>

      {/* Range dropdown */}
      {showRangePicker && (
        <View
          className="absolute right-5 top-[70px] z-50 bg-white rounded-2xl overflow-hidden"
          style={[Shadows.presence, { width: 160 }]}
        >
          {RANGE_OPTIONS.map(opt => (
            <Pressable
              key={opt.days}
              onPress={() => { setRangeDays(opt.days); setShowRangePicker(false); }}
              className="px-4 py-3 active:bg-slate-50"
              style={{ borderBottomWidth: 1, borderBottomColor: '#F8FAFC' }}
            >
              <Text className={`text-sm font-semibold ${rangeDays === opt.days ? 'text-primary' : 'text-slate-600'}`}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="items-center py-20">
            <ActivityIndicator color="#8B5CF6" />
            <Text className="text-slate-400 text-sm mt-3">Loading your report…</Text>
          </View>
        ) : report?.total_sessions === 0 ? (
          <View className="items-center py-16">
            <Dumbbell size={48} color="#E2E8F0" />
            <Text className="text-slate-400 font-semibold text-base mt-4">No sessions logged yet</Text>
            <Text className="text-slate-300 text-sm mt-1 text-center px-8">
              Log your physiotherapy activities from the dashboard to see your progress here.
            </Text>
          </View>
        ) : report ? (
          <>
            {/* Period badge */}
            <View className="flex-row items-center gap-2 mb-4">
              <View className="flex-row items-center gap-1.5 px-3 py-1.5 bg-white rounded-full" style={Shadows.card}>
                <Calendar size={12} color="#8B5CF6" />
                <Text className="text-xs font-bold text-slate-600">
                  {new Date(report.period.from + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {' – '}
                  {new Date(report.period.to + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            </View>

            {/* Summary stat cards */}
            <View className="flex-row gap-2 mb-4">
              <StatCard
                icon={Dumbbell}
                label="Sessions"
                value={String(report.total_sessions)}
                color="#8B5CF6"
              />
              <StatCard
                icon={Clock}
                label="Total Minutes"
                value={String(report.total_duration_min)}
                color="#1A73E8"
              />
              <StatCard
                icon={TrendingUp}
                label="Days Active"
                value={String(report.days_active)}
                color="#22C55E"
              />
              {report.avg_pain_level !== null && (
                <StatCard
                  icon={Flame}
                  label="Avg Pain"
                  value={report.avg_pain_level.toFixed(1)}
                  sub="/ 10"
                  color={painColor(report.avg_pain_level)}
                />
              )}
            </View>

            {/* By activity */}
            {report.by_activity.length > 0 && (
              <View className="bg-white rounded-2xl p-4 mb-4" style={Shadows.card}>
                <Text className="font-extrabold text-midnight mb-3">By Activity</Text>
                {report.by_activity.map((a, i) => {
                  const maxSessions = report.by_activity[0].sessions;
                  const barWidth = maxSessions > 0 ? (a.sessions / maxSessions) * 100 : 0;
                  return (
                    <View key={i} className="mb-3">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-sm font-semibold text-midnight flex-1" numberOfLines={1}>
                          {a.activity_name}
                        </Text>
                        <Text className="text-xs text-slate-500 ml-2">
                          {a.sessions} session{a.sessions !== 1 ? 's' : ''} · {a.total_min} min
                        </Text>
                      </View>
                      <View className="h-1.5 bg-slate-100 rounded-full">
                        <View
                          className="h-1.5 rounded-full"
                          style={{ width: `${barWidth}%`, backgroundColor: '#8B5CF6' }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Daily log */}
            <View className="bg-white rounded-2xl p-4" style={Shadows.card}>
              <Text className="font-extrabold text-midnight mb-3">Daily Log</Text>
              {report.daily_summary.map((day: PhysioDaySummary, i) => (
                <View
                  key={i}
                  className="flex-row items-center py-2.5"
                  style={{ borderBottomWidth: i < report.daily_summary.length - 1 ? 1 : 0, borderBottomColor: '#F8FAFC' }}
                >
                  <View className="w-8 h-8 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: '#F3EEFF' }}>
                    <Dumbbell size={14} color="#8B5CF6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-midnight">
                      {new Date(day.log_date + 'T00:00:00').toLocaleDateString('en-IN', {
                        weekday: 'short', day: 'numeric', month: 'short',
                      })}
                    </Text>
                    <Text className="text-xs text-slate-400">
                      {day.sessions} session{day.sessions !== 1 ? 's' : ''} · {day.total_min} min
                    </Text>
                  </View>
                  {day.avg_pain !== null && (
                    <View
                      className="px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${painColor(day.avg_pain)}15` }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: painColor(day.avg_pain) }}>
                        Pain {day.avg_pain.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        ) : (
          <View className="items-center py-16">
            <Text className="text-slate-400">Could not load your report. Pull to retry.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
