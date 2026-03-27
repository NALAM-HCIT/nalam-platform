import { CustomAlert } from '@/components/CustomAlert';
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows, Colors } from '@/constants/theme';
import {
  Bell, Users, Shield, UserPlus, Settings,
  Building2, ClipboardList, ChevronRight, X, Check, AlertTriangle,
  Server, Calendar, Database, Wifi,
  FileText, Stethoscope, Clock,
} from 'lucide-react-native';
import { api, isAuthError } from '@/services/api';

/* ───── Types ───── */

interface AuditLogItem {
  id: string;
  action: string;
  user: string;
  category: string;
  severity: string;
  time: string;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
}

/* ───── Data ───── */

const QUICK_ACTIONS = [
  { icon: UserPlus, label: 'Create User', color: '#FFFFFF', bg: Colors.primary, actionId: 'create-user' },
  { icon: Stethoscope, label: 'Doctors', color: '#1D4ED8', bg: '#EFF6FF', actionId: 'manage-doctors' },
  { icon: Settings, label: 'Settings', color: '#64748B', bg: '#F1F5F9', actionId: 'system-settings' },
  { icon: ClipboardList, label: 'Audit Logs', color: '#059669', bg: '#ECFDF5', actionId: 'audit-logs' },
];

/* ───── Sub-components ───── */

const OverviewCard = React.memo(function OverviewCard({
  label, value, icon: Icon, color, onPress,
}: { label: string; value: string; icon: React.ElementType; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-1 bg-white rounded-2xl p-3 items-center active:opacity-80" style={Shadows.card}>
      <View className="w-8 h-8 rounded-lg items-center justify-center mb-1.5" style={{ backgroundColor: color + '12' }}>
        <Icon size={14} color={color} />
      </View>
      <Text className="text-base font-extrabold text-midnight">{value}</Text>
      <Text className="text-[9px] text-slate-400 font-medium">{label}</Text>
    </Pressable>
  );
});

const StatCard = React.memo(function StatCard({
  label, value, subLabel, icon: Icon, color, onPress,
}: { label: string; value: string; subLabel?: string; icon: React.ElementType; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="w-[48%] bg-white rounded-2xl p-4 active:opacity-80" style={Shadows.card}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: color + '15' }}>
          <Icon size={18} color={color} />
        </View>
        {subLabel ? (
          <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50">
            <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <Text className="text-[9px] font-bold text-emerald-600">{subLabel}</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-3xl font-extrabold text-midnight">{value}</Text>
      <Text className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">{label}</Text>
    </Pressable>
  );
});

const AuditRow = React.memo(function AuditRow({
  item, isLast,
}: { item: AuditLogItem; isLast: boolean }) {
  const severityColor = item.severity === 'critical' ? '#EF4444' : item.severity === 'warning' ? '#F59E0B' : Colors.primary;
  return (
    <View
      className="px-4 py-3 flex-row items-center gap-3"
      style={!isLast ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : undefined}
    >
      <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: severityColor + '12' }}>
        <Text className="font-extrabold text-xs" style={{ color: severityColor }}>
          {item.user.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-[12px] text-midnight" numberOfLines={1}>{item.action}</Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          <View className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: severityColor + '12' }}>
            <Text className="text-[8px] font-bold uppercase tracking-wider" style={{ color: severityColor }}>{item.category}</Text>
          </View>
          <Text className="text-slate-400 text-[10px]">{item.user} · {item.time}</Text>
        </View>
      </View>
    </View>
  );
});

/* ───── Main Screen ───── */

export default function AdminDashboard() {
  const router = useRouter();
  const userName = useAuthStore((s) => s.userName);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSystemHealth, setShowSystemHealth] = useState(false);
  const [systemHealthChecking, setSystemHealthChecking] = useState(false);
  const [systemHealthStatus, setSystemHealthStatus] = useState<{ api: boolean; db: boolean; network: boolean } | null>(null);

  // Dashboard data
  const [totalUsers, setTotalUsers] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [totalDepartments, setTotalDepartments] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [newPatientsToday, setNewPatientsToday] = useState(0);
  const [todayPrescriptions, setTodayPrescriptions] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await api.get('/admin/dashboard');
      const d = res.data;
      setTotalUsers(d.totalUsers ?? 0);
      setOnlineUsers(d.onlineUsers ?? 0);
      setTotalDepartments(d.totalDepartments ?? 0);
      setTodayAppointments(d.todayAppointments ?? 0);
      setNewPatientsToday(d.newPatientsToday ?? 0);
      setTodayPrescriptions(d.todayPrescriptions ?? 0);
      const logs = (d.recentAuditLogs ?? []).map((a: any) => ({
        id: a.id,
        action: a.action,
        user: a.userName ?? 'System',
        category: a.category,
        severity: a.severity,
        time: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setAuditLogs(logs);
    } catch (error) {
      if (!isAuthError(error)) console.log('Failed to fetch dashboard data', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/admin/notifications');
      const items = (res.data ?? []).map((n: any) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        time: new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: (n.type ?? 'info') as 'info' | 'warning' | 'success' | 'error',
        read: false,
      }));
      setNotifications(items);
    } catch (error) {
      if (!isAuthError(error)) console.log('Failed to fetch notifications', error);
    }
  }, []);

  const checkSystemHealth = useCallback(async () => {
    setSystemHealthChecking(true);
    setSystemHealthStatus(null);
    let apiOk = false, dbOk = false, networkOk = false;
    try {
      const res = await api.get('/admin/dashboard');
      apiOk = res.status === 200;
      dbOk = res.status === 200; // If dashboard loads, DB is reachable
      networkOk = true;
    } catch {
      networkOk = false;
    }
    setSystemHealthStatus({ api: apiOk, db: dbOk, network: networkOk });
    setSystemHealthChecking(false);
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
    fetchNotifications();
    checkSystemHealth();
  }, [fetchDashboardData, fetchNotifications, checkSystemHealth]);

  const unreadNotifCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchDashboardData(), fetchNotifications()]);
    setRefreshing(false);
  }, [fetchDashboardData, fetchNotifications]);

  const handleQuickAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'create-user':
        router.push('/admin/create-user');
        break;
      case 'manage-doctors':
        router.push('/admin/manage-doctors');
        break;
      case 'system-settings':
        router.push('/admin/(tabs)/settings' as any);
        break;
      case 'audit-logs':
        if (auditLogs.length === 0) {
          CustomAlert.alert('Audit Logs', 'No audit logs recorded today.');
        } else {
          CustomAlert.alert(
            'Today\'s Audit Logs',
            auditLogs.map((a, i) => `${i + 1}. ${a.action}\n   ${a.user} · ${a.time}`).join('\n\n')
          );
        }
        break;
    }
  }, [router, auditLogs]);

  const handleNotificationPress = useCallback((notif: Notification) => {
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    const actions: any[] = [{ text: 'Dismiss', style: 'cancel' }];
    if (notif.type === 'warning') actions.push({ text: 'Review', onPress: () => { setShowNotifications(false); router.push('/admin/(tabs)/users' as any); } });
    CustomAlert.alert(notif.title, notif.body, actions);
  }, [router]);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAllNotifications = useCallback(() => {
    CustomAlert.alert('Clear All', 'Remove all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => setNotifications([]) },
    ]);
  }, []);

  const notifTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'warning': return { icon: AlertTriangle, color: '#F59E0B' };
      case 'success': return { icon: Check, color: '#22C55E' };
      case 'error': return { icon: AlertTriangle, color: '#DC2626' };
      default: return { icon: Bell, color: Colors.primary };
    }
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-5">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-xl bg-primary items-center justify-center" style={Shadows.focus}>
                <Building2 size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-lg font-bold tracking-tight text-midnight">Arun Priya Hospital</Text>
                <Text className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Admin Portal</Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2.5">
              <Pressable
                onPress={() => setShowNotifications(true)}
                className="w-10 h-10 rounded-full bg-white items-center justify-center active:opacity-70"
                style={Shadows.card}
              >
                <Bell size={18} color="#64748B" />
                {unreadNotifCount > 0 && (
                  <View className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full border-2 border-[#F8FAFC] items-center justify-center">
                    <Text className="text-white text-[9px] font-bold">{unreadNotifCount}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable onPress={() => router.push('/admin/(tabs)/profile' as any)} className="active:opacity-70">
                <View className="w-10 h-10 rounded-full border-2 border-primary/20 bg-primary/10 items-center justify-center">
                  <Text className="text-primary font-bold text-sm">{(userName || 'A')[0].toUpperCase()}</Text>
                </View>
              </Pressable>
            </View>
          </View>

          <Text className="text-2xl font-extrabold tracking-tight text-midnight">
            {greeting}, {userName || 'Admin'}
          </Text>
          <Text className="text-sm text-slate-400 mt-0.5">
            Here's what's happening today.
          </Text>
        </View>

        {/* Today's Overview (3 cards — no Revenue) */}
        <View className="px-6 mb-4">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Today's Overview</Text>
          <View className="flex-row gap-2.5">
            <OverviewCard label="Appointments" value={todayAppointments.toString()} icon={Calendar} color={Colors.primary} onPress={() =>
              CustomAlert.alert("Today's Appointments", `Total: ${todayAppointments}`)
            } />
            <OverviewCard label="New Patients" value={newPatientsToday.toString()} icon={UserPlus} color="#059669" onPress={() =>
              CustomAlert.alert('New Patients Today', `Total: ${newPatientsToday}`)
            } />
            <OverviewCard label="Prescriptions" value={todayPrescriptions.toString()} icon={FileText} color="#8B5CF6" onPress={() =>
              CustomAlert.alert('Prescriptions Today', `Total: ${todayPrescriptions}`)
            } />
          </View>
        </View>

        {/* System Health (2 cards: Total Users + System Health) */}
        <View className="px-6 mb-4">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">System Health</Text>
          <View className="flex-row flex-wrap gap-3">
            <StatCard
              label="Total Users"
              value={totalUsers.toString()}
              subLabel={`${onlineUsers} online`}
              icon={Users}
              color={Colors.primary}
              onPress={() => router.push('/admin/(tabs)/users' as any)}
            />
            <StatCard
              label="System Health"
              value={systemHealthStatus ? `${[systemHealthStatus.api, systemHealthStatus.db, systemHealthStatus.network].filter(Boolean).length}/3` : '--'}
              icon={Server}
              color="#8B5CF6"
              onPress={() => { setShowSystemHealth(true); checkSystemHealth(); }}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 mb-4">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</Text>
          <View className="flex-row gap-2.5">
            {QUICK_ACTIONS.map((a, i) => {
              const Icon = a.icon;
              const isPrimary = a.actionId === 'create-user';
              return (
                <Pressable
                  key={i}
                  onPress={() => handleQuickAction(a.actionId)}
                  className="flex-1 rounded-2xl p-3.5 items-center active:opacity-80"
                  style={[{ backgroundColor: isPrimary ? Colors.primary : a.bg }, isPrimary ? Shadows.focus : Shadows.card]}
                >
                  <View className={`w-10 h-10 rounded-xl items-center justify-center mb-2 ${isPrimary ? 'bg-white/20' : ''}`}
                    style={!isPrimary ? { backgroundColor: a.bg } : undefined}>
                    <Icon size={18} color={a.color} />
                  </View>
                  <Text className={`text-[10px] font-bold text-center ${isPrimary ? 'text-white' : 'text-midnight'}`}>{a.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Recent Audit Logs (real data from DB) */}
        <View className="px-6 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit Logs</Text>
              <View className="flex-row items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100">
                <Clock size={8} color="#94A3B8" />
                <Text className="text-[8px] text-slate-400 font-medium">Today</Text>
              </View>
            </View>
            {auditLogs.length > 0 && (
              <Pressable
                onPress={() => handleQuickAction('audit-logs')}
                className="flex-row items-center gap-1 active:opacity-70"
              >
                <Text className="text-primary text-xs font-semibold">View All</Text>
                <ChevronRight size={12} color={Colors.primary} />
              </Pressable>
            )}
          </View>
          <View className="bg-white rounded-2xl overflow-hidden" style={Shadows.card}>
            {auditLogs.length === 0 ? (
              <View className="items-center py-8">
                <Shield size={28} color="#CBD5E1" />
                <Text className="text-slate-400 mt-2 text-xs">No audit logs today</Text>
              </View>
            ) : (
              auditLogs.map((log, i) => (
                <AuditRow key={log.id} item={log} isLast={i === auditLogs.length - 1} />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Notifications Modal */}
      <Modal visible={showNotifications} transparent animationType="slide" onRequestClose={() => setShowNotifications(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShowNotifications(false)}>
          <Pressable onPress={() => {}} className="bg-white rounded-t-3xl max-h-[75%]">
            <View className="w-12 h-1.5 bg-slate-300/60 rounded-full self-center mt-3 mb-2" />
            <View className="flex-row items-center justify-between px-6 py-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-midnight text-lg font-bold">Notifications</Text>
                {unreadNotifCount > 0 && (
                  <View className="px-2 py-0.5 rounded-full bg-primary">
                    <Text className="text-[10px] font-bold text-white">{unreadNotifCount}</Text>
                  </View>
                )}
              </View>
              <View className="flex-row items-center gap-3">
                {unreadNotifCount > 0 && (
                  <Pressable onPress={markAllNotificationsRead} className="active:opacity-70">
                    <Text className="text-primary text-xs font-semibold">Mark all read</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setShowNotifications(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70">
                  <X size={16} color="#64748B" />
                </Pressable>
              </View>
            </View>
            <ScrollView className="px-6 pb-10">
              {notifications.length === 0 ? (
                <View className="items-center py-12">
                  <Bell size={40} color="#CBD5E1" />
                  <Text className="text-slate-400 mt-3 text-sm">No notifications today</Text>
                </View>
              ) : (
                <>
                  {notifications.map((notif) => {
                    const { icon: NIcon, color } = notifTypeIcon(notif.type);
                    return (
                      <Pressable
                        key={notif.id}
                        onPress={() => handleNotificationPress(notif)}
                        className={`flex-row gap-3 p-4 rounded-2xl mb-2 active:opacity-80 ${notif.read ? 'bg-slate-50' : 'bg-primary/5'}`}
                      >
                        <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: `${color}12` }}>
                          <NIcon size={16} color={color} />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2">
                            <Text className="font-bold text-[13px] text-midnight flex-1">{notif.title}</Text>
                            {!notif.read && <View className="w-2 h-2 rounded-full bg-primary" />}
                          </View>
                          <Text className="text-slate-500 text-xs mt-1 leading-relaxed" numberOfLines={2}>{notif.body}</Text>
                          <Text className="text-slate-400 text-[10px] mt-1.5">{notif.time}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                  <Pressable onPress={clearAllNotifications} className="items-center py-4 active:opacity-70">
                    <Text className="text-rose-500 text-sm font-semibold">Clear All Notifications</Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      {/* System Health Modal */}
      <Modal visible={showSystemHealth} transparent animationType="slide" onRequestClose={() => setShowSystemHealth(false)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShowSystemHealth(false)}>
          <Pressable onPress={() => {}} className="bg-white rounded-t-3xl">
            <View className="w-12 h-1.5 bg-slate-300/60 rounded-full self-center mt-3 mb-2" />
            <View className="flex-row items-center justify-between px-6 py-3">
              <Text className="text-midnight text-lg font-bold">System Health</Text>
              <Pressable onPress={() => setShowSystemHealth(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70">
                <X size={16} color="#64748B" />
              </Pressable>
            </View>
            <View className="px-6 pb-10">
              {systemHealthChecking ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text className="text-slate-400 mt-3 text-sm">Checking system status...</Text>
                </View>
              ) : systemHealthStatus ? (
                <View className="gap-3">
                  {[
                    { label: 'API Server', icon: Server, ok: systemHealthStatus.api },
                    { label: 'Database', icon: Database, ok: systemHealthStatus.db },
                    { label: 'Network', icon: Wifi, ok: systemHealthStatus.network },
                  ].map((item) => (
                    <View key={item.label} className="flex-row items-center gap-3 p-4 rounded-2xl bg-slate-50">
                      <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: item.ok ? '#ECFDF5' : '#FEF2F2' }}>
                        <item.icon size={18} color={item.ok ? '#059669' : '#DC2626'} />
                      </View>
                      <View className="flex-1">
                        <Text className="font-semibold text-midnight text-sm">{item.label}</Text>
                        <Text className="text-xs mt-0.5" style={{ color: item.ok ? '#059669' : '#DC2626' }}>
                          {item.ok ? 'Operational' : 'Unreachable'}
                        </Text>
                      </View>
                      <View className="w-3 h-3 rounded-full" style={{ backgroundColor: item.ok ? '#22C55E' : '#EF4444' }} />
                    </View>
                  ))}
                  <Pressable onPress={checkSystemHealth} className="items-center py-3 active:opacity-70">
                    <Text className="text-primary text-sm font-semibold">Re-check</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
