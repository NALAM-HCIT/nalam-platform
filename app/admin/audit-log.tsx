import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shadows, Colors } from '@/constants/theme';
import {
  ArrowLeft, Shield, Calendar, Activity, Stethoscope, Pill,
  RefreshCw, Info, AlertTriangle, AlertCircle, User,
} from 'lucide-react-native';
import { adminService, AuditLogItem } from '@/services/adminService';

// ── Constants ─────────────────────────────────────────────────

const CATEGORIES = [
  { id: '',            label: 'All' },
  { id: 'admin',       label: 'Admin' },
  { id: 'appointment', label: 'Appt' },
  { id: 'reception',   label: 'Reception' },
  { id: 'pharmacy',    label: 'Pharmacy' },
  { id: 'auth',        label: 'Auth' },
];

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  admin:       { icon: Shield,      color: '#8B5CF6', bg: '#8B5CF615' },
  appointment: { icon: Calendar,    color: Colors.primary, bg: Colors.primary + '15' },
  reception:   { icon: Activity,    color: '#059669', bg: '#05966915' },
  pharmacy:    { icon: Pill,        color: '#EA580C', bg: '#EA580C15' },
  auth:        { icon: User,        color: '#0EA5E9', bg: '#0EA5E915' },
  default:     { icon: Stethoscope, color: '#64748B', bg: '#64748B15' },
};

const SEVERITY_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  info:    { icon: Info,          color: '#64748B' },
  warning: { icon: AlertTriangle, color: '#F59E0B' },
  error:   { icon: AlertCircle,   color: '#EF4444' },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Sub-components ────────────────────────────────────────────

const LogRow = React.memo(function LogRow({ item }: { item: AuditLogItem }) {
  const catCfg = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.default;
  const sevCfg = SEVERITY_CONFIG[item.severity] ?? SEVERITY_CONFIG.info;
  const CatIcon = catCfg.icon;
  const SevIcon = sevCfg.icon;

  return (
    <View className="flex-row items-start px-4 py-3.5 border-b border-slate-50">
      <View className="w-9 h-9 rounded-xl items-center justify-center mr-3 mt-0.5" style={{ backgroundColor: catCfg.bg }}>
        <CatIcon size={16} color={catCfg.color} />
      </View>
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text className="text-[13px] font-semibold text-midnight flex-shrink" numberOfLines={1} style={{ flexShrink: 1 }}>
            {item.action}
          </Text>
          <SevIcon size={11} color={sevCfg.color} />
        </View>
        <View className="flex-row items-center gap-1.5 mt-0.5 flex-wrap">
          <Text className="text-[11px] text-slate-400">{item.user}</Text>
          <Text className="text-[11px] text-slate-300">·</Text>
          <View className="bg-slate-100 px-1.5 py-0.5 rounded-md">
            <Text className="text-[9px] font-bold text-slate-500 uppercase">{item.category}</Text>
          </View>
        </View>
        {item.details && (
          <Text className="text-[11px] text-slate-400 mt-0.5" numberOfLines={1}>{item.details}</Text>
        )}
      </View>
      <Text className="text-[10px] text-slate-400 ml-2 mt-0.5 shrink-0">{formatTimestamp(item.createdAt)}</Text>
    </View>
  );
});

// ── Main Screen ───────────────────────────────────────────────

export default function AuditLogScreen() {
  const router = useRouter();

  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState('');

  const PAGE_SIZE = 20;

  const load = useCallback(async (pg: number, cat: string, replace: boolean) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await adminService.getActivity(pg, PAGE_SIZE, cat || undefined);
      setTotal(res.total);
      setItems((prev) => replace ? res.items : [...prev, ...res.items]);
      setPage(pg);
    } catch {
      // silently keep current list
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(1, category, true);
  }, [category, load]);

  const handleCategoryChange = useCallback((cat: string) => {
    setCategory(cat);
  }, []);

  const handleRefresh = useCallback(() => {
    load(1, category, true);
  }, [category, load]);

  const handleLoadMore = useCallback(() => {
    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (!loadingMore && page < totalPages) {
      load(page + 1, category, false);
    }
  }, [loadingMore, page, total, category, load]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-4 gap-3">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ArrowLeft size={22} color="#0B1B3D" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-xl font-bold tracking-tight text-midnight">Audit Log</Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            {total > 0 ? `${total} total entries` : 'Activity tracking'}
          </Text>
        </View>
        <Pressable
          onPress={handleRefresh}
          className="w-9 h-9 rounded-full bg-white items-center justify-center"
          style={Shadows.card}
        >
          <RefreshCw size={15} color={Colors.primary} />
        </Pressable>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 12 }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => handleCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-full ${isActive ? 'bg-primary' : 'bg-white'}`}
              style={isActive ? undefined : Shadows.card}
            >
              <Text className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Log List */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text className="text-slate-400 text-sm mt-3">Loading activity...</Text>
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Activity size={40} color="#CBD5E1" />
          <Text className="text-slate-400 text-sm mt-3 text-center">No activity found{category ? ` for "${category}"` : ''}.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LogRow item={item} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          className="bg-white mx-5 rounded-2xl overflow-hidden"
          style={Shadows.card}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore
              ? <View className="py-4 items-center"><ActivityIndicator size="small" color={Colors.primary} /></View>
              : page * PAGE_SIZE < total
                ? <Pressable onPress={handleLoadMore} className="py-4 items-center">
                    <Text className="text-primary text-xs font-bold">Load more</Text>
                  </Pressable>
                : <View className="py-3 items-center">
                    <Text className="text-slate-300 text-[10px] font-medium">End of log</Text>
                  </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
