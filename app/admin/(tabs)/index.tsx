import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { Shadows, Colors } from '@/constants/theme';
import {
  Bell, Users, Shield, UserPlus, Settings, Activity, Building2,
  ClipboardList, ChevronRight, X, Check, Clock, AlertTriangle,
  TrendingUp, Server, Wifi, Database, Calendar, BarChart3,
  FileText, Zap, ArrowUpRight, ArrowDownRight, Stethoscope,
} from 'lucide-react-native';
import { api } from '@/services/api';

/* ───── Types ───── */

interface ActivityItem {
  id: string;
  action: string;
  user: string;
  category: string;
  categoryColor: string;
  time: string;
  read: boolean;
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

const INITIAL_ACTIVITIES: ActivityItem[] = [
  { id: '1', action: 'New doctor registered', user: 'Dr. Priya Sharma', category: 'User', categoryColor: Colors.primary, time: '10 min ago', read: false },
  { id: '2', action: 'User role updated', user: 'Priya Sharma', category: 'Role', categoryColor: '#8B5CF6', time: '25 min ago', read: false },
  { id: '3', action: 'New receptionist added', user: 'Ravi Kumar', category: 'User', categoryColor: Colors.primary, time: '1 hour ago', read: true },
  { id: '4', action: 'System backup completed', user: 'System', category: 'System', categoryColor: '#22C55E', time: '2 hours ago', read: true },
  { id: '5', action: 'Password reset requested', user: 'Dr. Rajesh Kumar', category: 'Security', categoryColor: '#EF4444', time: '3 hours ago', read: true },
  { id: '6', action: 'New pharmacist onboarded', user: 'Sathish Patel', category: 'User', categoryColor: Colors.primary, time: '5 hours ago', read: true },
  { id: '7', action: 'Department updated', user: 'Admin User', category: 'System', categoryColor: '#22C55E', time: 'Yesterday', read: true },
  { id: '8', action: 'Access revoked', user: 'Former Staff M.', category: 'Security', categoryColor: '#EF4444', time: 'Yesterday', read: true },
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'New User Pending Approval', body: 'Dr. Meena Krishnan has requested admin access. Review and approve in the Users tab.', time: '5 min ago', type: 'warning', read: false },
  { id: '2', title: 'System Backup Complete', body: 'Daily automated backup completed successfully. 2.4 GB stored.', time: '1 hour ago', type: 'success', read: false },
  { id: '3', title: 'Security Alert', body: '3 failed login attempts detected from IP 192.168.1.45. Account temporarily locked.', time: '3 hours ago', type: 'error', read: false },
  { id: '4', title: 'Scheduled Maintenance', body: 'Server maintenance scheduled for Sunday 2:00 AM - 4:00 AM IST.', time: '1 day ago', type: 'info', read: true },
];

const STAT_CARDS = [
  { label: 'Total Users', value: '124', icon: Users, color: Colors.primary, trend: '+4%', trendUp: true },
  { label: 'Active Staff', value: '86', icon: Activity, color: '#22C55E', trend: 'Online', trendUp: true },
  { label: 'Pending', value: '5', icon: ClipboardList, color: '#F59E0B', trend: 'Urgent', trendUp: false },
  { label: 'Uptime', value: '99%', icon: Server, color: '#8B5CF6', trend: 'Stable', trendUp: true },
];

const QUICK_ACTIONS = [
  { icon: UserPlus, label: 'Create User', color: '#FFFFFF', bg: Colors.primary, actionId: 'create-user' },
  { icon: Stethoscope, label: 'Doctors', color: '#1D4ED8', bg: '#1D4ED812', actionId: 'manage-doctors' },
  { icon: Settings, label: 'Settings', color: '#64748B', bg: '#64748B12', actionId: 'system-settings' },
  { icon: ClipboardList, label: 'Audit Logs', color: '#059669', bg: '#05966912', actionId: 'audit-logs' },
];

const SYSTEM_HEALTH_ITEMS = [
  { label: 'API Server', status: 'Operational', icon: Server, color: '#22C55E' },
  { label: 'Database', status: 'Operational', icon: Database, color: '#22C55E' },
  { label: 'Network', status: 'Operational', icon: Wifi, color: '#22C55E' },
  { label: 'Auth Service', status: 'Operational', icon: Shield, color: '#22C55E' },
  { label: 'Response Time', status: '45ms avg', icon: TrendingUp, color: Colors.primary },
];

const TODAY_OVERVIEW = [
  { label: 'Appointments', value: '142', icon: Calendar, color: Colors.primary },
  { label: 'New Patients', value: '18', icon: UserPlus, color: '#059669' },
  { label: 'Prescriptions', value: '96', icon: FileText, color: '#8B5CF6' },
  { label: 'Revenue', value: '₹2.4L', icon: BarChart3, color: '#F59E0B' },
];

/* ───── Sub-components ───── */

const StatCard = React.memo(function StatCard({
  stat, onPress,
}: { stat: typeof STAT_CARDS[0]; onPress: () => void }) {
  const Icon = stat.icon;
  const TrendIcon = stat.trendUp ? ArrowUpRight : ArrowDownRight;
  return (
    <Pressable onPress={onPress} className="w-[48%] bg-white rounded-2xl p-4 active:opacity-80" style={Shadows.card}>
      <View className="flex-row items-center justify-between mb-3">
        <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: stat.color + '15' }}>
          <Icon size={18} color={stat.color} />
        </View>
        <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: stat.trendUp ? '#05966912' : '#EF444412' }}>
          <TrendIcon size={10} color={stat.trendUp ? '#059669' : '#EF4444'} />
          <Text className="text-[9px] font-bold" style={{ color: stat.trendUp ? '#059669' : '#EF4444' }}>{stat.trend}</Text>
        </View>
      </View>
      <Text className="text-3xl font-extrabold text-midnight">{stat.value}</Text>
      <Text className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">{stat.label}</Text>
    </Pressable>
  );
});

const ActivityRow = React.memo(function ActivityRow({
  item, isLast, onPress,
}: { item: ActivityItem; isLast: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-3.5 flex-row items-center gap-3 active:bg-slate-50 ${!item.read ? 'bg-primary/[0.03]' : ''}`}
      style={!isLast ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : undefined}
    >
      <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: item.categoryColor + '12' }}>
        <Text className="font-extrabold text-xs" style={{ color: item.categoryColor }}>{item.user.charAt(0)}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-bold text-[13px] text-midnight flex-1" numberOfLines={1}>{item.action}</Text>
          {!item.read && <View className="w-2 h-2 rounded-full bg-primary" />}
        </View>
        <View className="flex-row items-center gap-2 mt-1">
          <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: item.categoryColor + '12' }}>
            <Text className="text-[8px] font-bold uppercase tracking-wider" style={{ color: item.categoryColor }}>{item.category}</Text>
          </View>
          <Text className="text-slate-400 text-[10px]">{item.user} · {item.time}</Text>
        </View>
      </View>
      <ChevronRight size={14} color="#CBD5E1" />
    </Pressable>
  );
});

const OverviewCard = React.memo(function OverviewCard({
  item, onPress,
}: { item: typeof TODAY_OVERVIEW[0]; onPress: () => void }) {
  const Icon = item.icon;
  return (
    <Pressable onPress={onPress} className="flex-1 bg-white rounded-2xl p-3 items-center active:opacity-80" style={Shadows.card}>
      <View className="w-8 h-8 rounded-lg items-center justify-center mb-1.5" style={{ backgroundColor: item.color + '12' }}>
        <Icon size={14} color={item.color} />
      </View>
      <Text className="text-base font-extrabold text-midnight">{item.value}</Text>
      <Text className="text-[9px] text-slate-400 font-medium">{item.label}</Text>
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function AdminDashboard() {
  const router = useRouter();
  const userName = useAuthStore((s) => s.userName);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [stats, setStats] = useState(STAT_CARDS);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSystemHealth, setShowSystemHealth] = useState(false);
  
  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await api.get('/admin/dashboard');
      const data = res.data;
      setStats([
        { label: 'Total Users', value: data.totalUsers.toString(), icon: Users, color: Colors.primary, trend: '+4%', trendUp: true },
        { label: 'Active Staff', value: data.activeUsers.toString(), icon: Activity, color: '#22C55E', trend: 'Online', trendUp: true },
        { label: 'Pending', value: data.inactiveUsers.toString(), icon: ClipboardList, color: '#F59E0B', trend: 'Urgent', trendUp: false },
        { label: 'Departments', value: data.totalDepartments.toString(), icon: Server, color: '#8B5CF6', trend: 'Stable', trendUp: true },
      ]);
      const mappedActivity = data.recentActivity.map((a: any) => ({
        id: a.id, action: a.action, user: a.user, category: a.category, 
        categoryColor: a.severity === 'critical' ? '#EF4444' : a.severity === 'warning' ? '#F59E0B' : Colors.primary,
        time: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        read: true
      }));
      if (mappedActivity.length > 0) setActivities(mappedActivity);
    } catch (error) {
      console.log('Failed to fetch dashboard data', error);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const unreadNotifCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const unreadActivityCount = useMemo(() => activities.filter((a) => !a.read).length, [activities]);
  const displayActivities = useMemo(() => activities.slice(0, 4), [activities]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  const handleStatPress = useCallback((index: number) => {
    switch (index) {
      case 0:
        router.push('/admin/(tabs)/users' as any);
        break;
      case 1:
        Alert.alert('Active Staff — 86', 'Doctors: 32\nReceptionists: 22\nPharmacists: 18\nAdmins: 14', [
          { text: 'View Users', onPress: () => router.push('/admin/(tabs)/users' as any) },
          { text: 'OK' },
        ]);
        break;
      case 2:
        Alert.alert('Pending Approvals — 5', '3 New user registrations\n1 Role change request\n1 Access permission request', [
          { text: 'Review Now', onPress: () => router.push('/admin/(tabs)/users' as any) },
          { text: 'Later' },
        ]);
        break;
      case 3:
        setShowSystemHealth(true);
        break;
    }
  }, [router]);

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
        Alert.alert('Audit Logs', 'Recent Trail:\n\n- [10:32] Admin viewed user list\n- [10:15] Dr. Priya Sharma registered\n- [09:48] Role updated for Priya Sharma\n- [09:30] Ravi Kumar added\n- [08:00] System backup triggered\n- [07:55] Admin logged in\n\nLogs retained for 90 days.', [
          { text: 'OK' },
          { text: 'Export', onPress: () => Alert.alert('Exported', 'Audit logs sent to admin email.\nFormat: CSV | Period: 30 days') },
        ]);
        break;
    }
  }, [router]);

  const handleActivityPress = useCallback((item: ActivityItem) => {
    setActivities((prev) => prev.map((a) => (a.id === item.id ? { ...a, read: true } : a)));
    Alert.alert(item.action, `User: ${item.user}\nCategory: ${item.category}\nTime: ${item.time}`, [
      { text: 'Dismiss', style: 'cancel' },
      {
        text: 'View Details',
        onPress: () => {
          if (item.category === 'User' || item.category === 'Role') router.push('/admin/(tabs)/users' as any);
          else if (item.category === 'System') router.push('/admin/(tabs)/settings' as any);
          else if (item.category === 'Security') Alert.alert('Security', 'Security event details would open.\n\nIP: 192.168.1.45\nAction: Failed login attempt\nStatus: Account locked');
        },
      },
    ]);
  }, [router]);

  const handleNotificationPress = useCallback((notif: Notification) => {
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    const actions: any[] = [{ text: 'Dismiss', style: 'cancel' }];
    if (notif.type === 'warning') actions.push({ text: 'Review', onPress: () => { setShowNotifications(false); router.push('/admin/(tabs)/users' as any); } });
    else if (notif.type === 'error') actions.push({ text: 'View Security', onPress: () => { setShowNotifications(false); router.push('/admin/(tabs)/settings' as any); } });
    Alert.alert(notif.title, notif.body, actions);
  }, [router]);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAllNotifications = useCallback(() => {
    Alert.alert('Clear All', 'Remove all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => setNotifications([]) },
    ]);
  }, []);

  const handleOverviewPress = useCallback((label: string) => {
    switch (label) {
      case 'Appointments':
        Alert.alert('Today\'s Appointments', 'Total: 142\n\nCompleted: 98\nIn Progress: 12\nUpcoming: 24\nCancelled: 8\n\nBusiest Dept: Cardiology (28)');
        break;
      case 'New Patients':
        Alert.alert('New Patients Today', 'Total: 18\n\nOPD: 12\nEmergency: 4\nReferral: 2\n\nPeak Hour: 10-11 AM (6 registrations)');
        break;
      case 'Prescriptions':
        Alert.alert('Prescriptions Today', 'Total: 96\n\nDispensed: 78\nPending: 12\nClarification: 6\n\nTop Drug: Amlodipine 5mg');
        break;
      case 'Revenue':
        Alert.alert('Today\'s Revenue', 'Total: ₹2,42,500\n\nConsultations: ₹1,28,000\nPharmacy: ₹68,500\nLab Tests: ₹32,000\nOthers: ₹14,000\n\nGrowth vs Yesterday: +8%');
        break;
    }
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

        {/* Today's Overview */}
        <View className="px-6 mb-4">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Today's Overview</Text>
          <View className="flex-row gap-2.5">
            {TODAY_OVERVIEW.map((item, idx) => (
              <OverviewCard key={idx} item={item} onPress={() => handleOverviewPress(item.label)} />
            ))}
          </View>
        </View>

        {/* Stats Grid */}
        <View className="px-6 mb-4">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">System Stats</Text>
          <View className="flex-row flex-wrap gap-3">
            {stats.map((s, i) => (
              <StatCard key={i} stat={s} onPress={() => handleStatPress(i)} />
            ))}
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

        {/* Recent Activities */}
        <View className="px-6 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Activity</Text>
              {unreadActivityCount > 0 && (
                <View className="px-1.5 py-0.5 rounded-full bg-primary">
                  <Text className="text-[8px] font-bold text-white">{unreadActivityCount}</Text>
                </View>
              )}
            </View>
            <Pressable
              onPress={() => {
                Alert.alert('All Activities', activities.map((a, i) => `${i + 1}. ${a.action}\n   ${a.user} · ${a.time}`).join('\n\n'));
              }}
              className="flex-row items-center gap-1 active:opacity-70"
            >
              <Text className="text-primary text-xs font-semibold">View All</Text>
              <ChevronRight size={12} color={Colors.primary} />
            </Pressable>
          </View>
          <View className="bg-white rounded-2xl overflow-hidden" style={Shadows.card}>
            {displayActivities.map((a, i) => (
              <ActivityRow
                key={a.id}
                item={a}
                isLast={i === displayActivities.length - 1}
                onPress={() => handleActivityPress(a)}
              />
            ))}
          </View>
        </View>

        {/* System Health Quick View */}
        <View className="px-6">
          <Pressable
            onPress={() => setShowSystemHealth(true)}
            className="bg-white rounded-2xl p-4 flex-row items-center active:opacity-80"
            style={Shadows.card}
          >
            <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center mr-3">
              <Zap size={18} color="#059669" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-[13px] text-midnight">System Health</Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">All services operational · 45ms avg response</Text>
            </View>
            <View className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50">
              <View className="w-2 h-2 rounded-full bg-emerald-500" />
              <Text className="text-[10px] font-bold text-emerald-600">99%</Text>
            </View>
          </Pressable>
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
                  <Text className="text-slate-400 mt-3 text-sm">No notifications</Text>
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
      <Modal visible={showSystemHealth} transparent animationType="fade" onRequestClose={() => setShowSystemHealth(false)}>
        <Pressable className="flex-1 bg-black/40 items-center justify-center px-6" onPress={() => setShowSystemHealth(false)}>
          <Pressable onPress={() => {}} className="bg-white rounded-3xl w-full p-6" style={Shadows.presence}>
            <View className="flex-row items-center justify-between mb-5">
              <View className="flex-row items-center gap-2">
                <Text className="text-midnight text-lg font-bold">System Health</Text>
                <View className="flex-row items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50">
                  <View className="w-2 h-2 rounded-full bg-emerald-500" />
                  <Text className="text-[10px] font-bold text-emerald-600">All OK</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowSystemHealth(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70">
                <X size={16} color="#64748B" />
              </Pressable>
            </View>

            {SYSTEM_HEALTH_ITEMS.map((item, i) => {
              const Icon = item.icon;
              return (
                <View key={i} className="flex-row items-center gap-3 py-3.5" style={i < SYSTEM_HEALTH_ITEMS.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : undefined}>
                  <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: `${item.color}12` }}>
                    <Icon size={16} color={item.color} />
                  </View>
                  <Text className="flex-1 font-semibold text-midnight text-sm">{item.label}</Text>
                  <View className="flex-row items-center gap-1.5">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <Text className="text-xs font-medium" style={{ color: item.color }}>{item.status}</Text>
                  </View>
                </View>
              );
            })}

            <View className="mt-4 pt-3 border-t border-slate-100 flex-row items-center justify-between">
              <Text className="text-slate-400 text-[10px]">Last checked: 2 minutes ago</Text>
              <Pressable onPress={() => { setShowSystemHealth(false); Alert.alert('Refreshed', 'System health check completed. All services operational.'); }} className="active:opacity-70">
                <Text className="text-primary text-xs font-bold">Refresh</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
