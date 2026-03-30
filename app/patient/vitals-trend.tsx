import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, Heart, Activity, Wind, Thermometer, Weight, Droplets } from 'lucide-react-native';
import { Shadows } from '@/constants/theme';
import { getVitalsTrend, VitalsTrendPoint } from '@/services/patientDashboardService';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W  = SCREEN_W - 40; // full width minus horizontal padding
const CHART_H  = 140;
const PAD_L    = 36;
const PAD_R    = 12;
const PAD_T    = 12;
const PAD_B    = 28;

// ─── Metric config ────────────────────────────────────────────────────────
type MetricKey = 'bp' | 'heart_rate' | 'spo2' | 'temperature_c' | 'weight_kg' | 'blood_glucose';

interface MetricConfig {
  key: MetricKey;
  label: string;
  unit: string;
  color: string;
  icon: any;
  normalMin?: number;
  normalMax?: number;
  extract: (p: VitalsTrendPoint) => number | null;
}

const METRICS: MetricConfig[] = [
  {
    key: 'bp',
    label: 'Blood Pressure (Systolic)',
    unit: 'mmHg',
    color: '#EF4444',
    icon: Activity,
    normalMin: 90,
    normalMax: 120,
    extract: p => p.bp_systolic,
  },
  {
    key: 'heart_rate',
    label: 'Heart Rate',
    unit: 'BPM',
    color: '#1A73E8',
    icon: Heart,
    normalMin: 60,
    normalMax: 100,
    extract: p => p.heart_rate,
  },
  {
    key: 'spo2',
    label: 'SpO₂',
    unit: '%',
    color: '#38BDF8',
    icon: Wind,
    normalMin: 95,
    normalMax: 100,
    extract: p => p.spo2,
  },
  {
    key: 'temperature_c',
    label: 'Temperature',
    unit: '°C',
    color: '#F59E0B',
    icon: Thermometer,
    normalMin: 36.1,
    normalMax: 37.2,
    extract: p => p.temperature_c ? Number(p.temperature_c) : null,
  },
  {
    key: 'weight_kg',
    label: 'Weight',
    unit: 'kg',
    color: '#22C55E',
    icon: Weight,
    extract: p => p.weight_kg ? Number(p.weight_kg) : null,
  },
  {
    key: 'blood_glucose',
    label: 'Blood Glucose',
    unit: 'mg/dL',
    color: '#059669',
    icon: Droplets,
    normalMin: 70,
    normalMax: 140,
    extract: p => p.blood_glucose ? Number(p.blood_glucose) : null,
  },
];

// ─── SVG Line Chart ────────────────────────────────────────────────────────
function LineChart({
  data,
  color,
  unit,
  normalMin,
  normalMax,
}: {
  data: { date: string; value: number }[];
  color: string;
  unit: string;
  normalMin?: number;
  normalMax?: number;
}) {
  if (data.length === 0) {
    return (
      <View style={{ height: CHART_H, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#CBD5E1', fontSize: 12 }}>No data in the last 30 days</Text>
      </View>
    );
  }

  const values = data.map(d => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = rawMax === rawMin ? 5 : (rawMax - rawMin) * 0.15;
  const minV = rawMin - padding;
  const maxV = rawMax + padding;

  const plotW = CHART_W - PAD_L - PAD_R;
  const plotH = CHART_H - PAD_T - PAD_B;

  const xOf = (i: number) => PAD_L + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const yOf = (v: number) => PAD_T + plotH - ((v - minV) / (maxV - minV)) * plotH;

  const points = data.map((d, i) => `${xOf(i)},${yOf(d.value)}`).join(' ');

  // Axis labels: show first, middle, last date
  const labelIndices = data.length <= 1
    ? [0]
    : data.length <= 4
      ? data.map((_, i) => i)
      : [0, Math.floor((data.length - 1) / 2), data.length - 1];

  // Y-axis labels: 3 levels
  const yLabels = [minV, (minV + maxV) / 2, maxV].map(v => ({
    y: yOf(v),
    label: Number(v.toFixed(0)).toString(),
  }));

  const shortDate = (s: string) => {
    const d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {/* Normal range band */}
      {normalMin != null && normalMax != null && (() => {
        const yTop = yOf(Math.min(normalMax, maxV));
        const yBot = yOf(Math.max(normalMin, minV));
        if (yTop < yBot) {
          return (
            <Polyline
              points={`${PAD_L},${yTop} ${CHART_W - PAD_R},${yTop} ${CHART_W - PAD_R},${yBot} ${PAD_L},${yBot} ${PAD_L},${yTop}`}
              fill={`${color}12`}
              stroke={`${color}30`}
              strokeWidth={0.5}
            />
          );
        }
        return null;
      })()}

      {/* Grid lines */}
      {yLabels.map((l, i) => (
        <Line
          key={i}
          x1={PAD_L} y1={l.y}
          x2={CHART_W - PAD_R} y2={l.y}
          stroke="#F1F5F9"
          strokeWidth={1}
        />
      ))}

      {/* Y-axis labels */}
      {yLabels.map((l, i) => (
        <SvgText
          key={i}
          x={PAD_L - 4} y={l.y + 4}
          fontSize={8} fill="#94A3B8"
          textAnchor="end"
        >
          {l.label}
        </SvgText>
      ))}

      {/* Line */}
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {data.map((d, i) => (
        <Circle
          key={i}
          cx={xOf(i)}
          cy={yOf(d.value)}
          r={3}
          fill="#FFFFFF"
          stroke={color}
          strokeWidth={1.5}
        />
      ))}

      {/* X-axis date labels */}
      {labelIndices.map(i => (
        <SvgText
          key={i}
          x={xOf(i)} y={CHART_H - 4}
          fontSize={8} fill="#94A3B8"
          textAnchor="middle"
        >
          {shortDate(data[i].date)}
        </SvgText>
      ))}
    </Svg>
  );
}

// ─── Stat Badge ──────────────────────────────────────────────────────────
function StatBadge({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View className="items-center px-4 py-2 rounded-xl" style={{ backgroundColor: `${color}10` }}>
      <Text style={{ fontSize: 18, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ fontSize: 9, color, fontWeight: '700', marginTop: -1 }}>{unit}</Text>
      <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────
export default function VitalsTrendScreen() {
  const router = useRouter();
  const [data, setData] = useState<VitalsTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<MetricKey>('bp');

  const loadTrend = useCallback(async () => {
    try {
      const res = await getVitalsTrend();
      setData(res.data);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrend(); }, [loadTrend]);

  const metric = METRICS.find(m => m.key === activeMetric)!;
  const chartData = data
    .map(p => ({ date: p.log_date, value: metric.extract(p) }))
    .filter((d): d is { date: string; value: number } => d.value !== null);

  const values = chartData.map(d => d.value);
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  const min = values.length > 0 ? Math.min(...values) : null;
  const max = values.length > 0 ? Math.max(...values) : null;

  const MetricIcon = metric.icon;

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
          <Text className="text-lg font-extrabold text-midnight">30-Day Trends</Text>
          <Text className="text-xs text-slate-400">Your vitals over the last 30 days</Text>
        </View>
        <View className="flex-row items-center gap-1 px-2.5 py-1 rounded-full" style={{ backgroundColor: '#EEF4FF' }}>
          <TrendingUp size={12} color="#1A73E8" />
          <Text className="text-[11px] font-bold" style={{ color: '#1A73E8' }}>Live Data</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="items-center py-20">
            <ActivityIndicator color="#1A73E8" />
            <Text className="text-slate-400 text-sm mt-3">Loading your trends…</Text>
          </View>
        ) : (
          <>
            {/* Metric selector tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 -mx-0.5">
              <View className="flex-row gap-2 px-0.5">
                {METRICS.map(m => {
                  const Icon = m.icon;
                  const isActive = activeMetric === m.key;
                  const mData = data
                    .map(p => m.extract(p))
                    .filter(v => v !== null);
                  const hasData = mData.length > 0;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setActiveMetric(m.key)}
                      className="flex-row items-center gap-1.5 px-3 py-2 rounded-full active:opacity-70"
                      style={{
                        backgroundColor: isActive ? m.color : '#F8FAFC',
                        borderWidth: 1,
                        borderColor: isActive ? m.color : '#E2E8F0',
                        opacity: hasData ? 1 : 0.5,
                      }}
                    >
                      <Icon size={12} color={isActive ? '#FFFFFF' : m.color} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? '#FFFFFF' : '#64748B' }}>
                        {m.label.split(' ')[0]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Chart card */}
            <View className="bg-white rounded-2xl p-4 mb-4" style={Shadows.card}>
              {/* Metric header */}
              <View className="flex-row items-center gap-2 mb-3">
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center"
                  style={{ backgroundColor: `${metric.color}15` }}
                >
                  <MetricIcon size={16} color={metric.color} />
                </View>
                <View>
                  <Text className="font-bold text-midnight text-sm">{metric.label}</Text>
                  {metric.normalMin != null && metric.normalMax != null && (
                    <Text className="text-[10px] text-slate-400">
                      Normal: {metric.normalMin}–{metric.normalMax} {metric.unit}
                    </Text>
                  )}
                </View>
              </View>

              {/* Summary stats */}
              {avg !== null && (
                <View className="flex-row gap-2 mb-3">
                  <StatBadge label="Avg" value={avg.toFixed(1)} unit={metric.unit} color={metric.color} />
                  <StatBadge label="Low" value={String(min!.toFixed(1))} unit={metric.unit} color="#64748B" />
                  <StatBadge label="High" value={String(max!.toFixed(1))} unit={metric.unit} color={metric.color} />
                  <View className="items-center px-4 py-2 rounded-xl" style={{ backgroundColor: '#F8FAFC' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#0B1B3D' }}>{chartData.length}</Text>
                    <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>readings</Text>
                  </View>
                </View>
              )}

              {/* Line chart */}
              <LineChart
                data={chartData}
                color={metric.color}
                unit={metric.unit}
                normalMin={metric.normalMin}
                normalMax={metric.normalMax}
              />
            </View>

            {/* Recent readings table */}
            {chartData.length > 0 && (
              <View className="bg-white rounded-2xl p-4" style={Shadows.card}>
                <Text className="font-extrabold text-midnight mb-3">Recent Readings</Text>
                {chartData.slice(-10).reverse().map((d, i) => {
                  const inNormal =
                    metric.normalMin != null && metric.normalMax != null
                      ? d.value >= metric.normalMin && d.value <= metric.normalMax
                      : null;
                  return (
                    <View
                      key={i}
                      className="flex-row items-center justify-between py-2"
                      style={{ borderBottomWidth: i < chartData.length - 1 ? 1 : 0, borderBottomColor: '#F8FAFC' }}
                    >
                      <Text className="text-sm text-slate-500">
                        {new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-bold text-midnight">
                          {d.value} <Text className="text-xs font-normal text-slate-400">{metric.unit}</Text>
                        </Text>
                        {inNormal !== null && (
                          <View
                            className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: inNormal ? '#EEFBF4' : '#FEF2F2' }}
                          >
                            <Text style={{ fontSize: 9, fontWeight: '700', color: inNormal ? '#22C55E' : '#EF4444' }}>
                              {inNormal ? 'Normal' : 'High'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Empty state */}
            {data.length === 0 && (
              <View className="items-center py-16">
                <TrendingUp size={48} color="#E2E8F0" />
                <Text className="text-slate-400 font-semibold text-base mt-4">No vitals recorded yet</Text>
                <Text className="text-slate-300 text-sm mt-1 text-center">
                  Start logging your vitals from the dashboard to see your 30-day trend here.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
