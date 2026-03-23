import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, Alert, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search, User, UserPlus, X, Phone, Mail, Shield, MoreVertical,
  Calendar, Building2, UserCheck, UserX, Users, Key, Trash2,
  ArrowUpRight, ChevronRight,
} from 'lucide-react-native';
import { Shadows, Colors } from '@/constants/theme';
import { StatusChip } from '@/components';
import { api } from '@/services/api';

/* ───── Types ───── */

type UserItem = {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  phone: string;
  email: string;
  employeeId: string;
  joinDate: string;
};

/* ───── Constants ───── */

const INITIAL_USERS: UserItem[] = [];

const ROLE_FILTERS = ['All', 'Doctor', 'Receptionist', 'Pharmacist', 'Admin'];

const ROLE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Doctor: { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' },
  Receptionist: { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' },
  Pharmacist: { bg: '#FAF5FF', text: '#7E22CE', dot: '#A855F7' },
  Admin: { bg: '#FEF2F2', text: '#B91C1C', dot: '#EF4444' },
};

/* ───── Sub-components ───── */

const SummaryCard = React.memo(function SummaryCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <View className="flex-1 bg-white rounded-2xl px-3 py-2.5 border border-slate-50 flex-row items-center gap-2.5" style={Shadows.card}>
      <View className="w-7 h-7 rounded-lg items-center justify-center" style={{ backgroundColor: color + '15' }}>
        <Icon size={12} color={color} />
      </View>
      <View>
        <Text className="text-base font-extrabold text-midnight leading-tight">{value}</Text>
        <Text className="text-[9px] text-slate-400 font-medium">{label}</Text>
      </View>
    </View>
  );
});

const FilterChip = React.memo(function FilterChip({ label, isActive, onPress }: {
  label: string; isActive: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-3.5 py-1.5 rounded-full ${isActive ? 'bg-primary' : 'bg-white border border-slate-100'}`}
    >
      <Text className={`text-[11px] font-semibold ${isActive ? 'text-white' : 'text-slate-500'}`}>{label}</Text>
    </Pressable>
  );
});

const UserCard = React.memo(function UserCard({ user, onPress, onActionPress }: {
  user: UserItem; onPress: () => void; onActionPress: () => void;
}) {
  const roleColor = ROLE_COLORS[user.role] || ROLE_COLORS.Admin;
  const initials = useMemo(() => {
    const parts = user.name.replace(/^Dr\.\s*/i, '').split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
  }, [user.name]);

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-3 border border-slate-50 active:opacity-90"
      style={Shadows.card}
    >
      <View className="flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: roleColor.bg }}>
          <Text className="font-extrabold text-sm" style={{ color: roleColor.text }}>{initials}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-bold text-sm text-midnight">{user.name}</Text>
          <View className="flex-row items-center gap-2 mt-1">
            <View className="flex-row items-center gap-1">
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: roleColor.dot }} />
              <Text className="text-xs font-medium" style={{ color: roleColor.text }}>{user.role}</Text>
            </View>
            <Text className="text-slate-300">|</Text>
            <Text className="text-xs text-slate-400">{user.department}</Text>
          </View>
        </View>
        <StatusChip
          label={user.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
          variant={user.status === 'active' ? 'success' : 'neutral'}
        />
        <Pressable
          onPress={onActionPress}
          className="w-8 h-8 rounded-full items-center justify-center active:bg-slate-100"
        >
          <MoreVertical size={16} color="#94A3B8" />
        </Pressable>
      </View>
      <View className="flex-row items-center gap-4 mt-3 pt-3 border-t border-slate-50">
        <View className="flex-row items-center gap-1.5">
          <Shield size={11} color="#94A3B8" />
          <Text className="text-[10px] text-slate-400">{user.employeeId}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Calendar size={11} color="#94A3B8" />
          <Text className="text-[10px] text-slate-400">Joined {user.joinDate}</Text>
        </View>
      </View>
    </Pressable>
  );
});

const DetailRow = React.memo(function DetailRow({ icon: Icon, label, value, color, onPress }: {
  icon: React.ElementType; label: string; value: string; color: string; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} className="flex-row items-center gap-3 py-3 border-b border-slate-50 last:border-b-0">
      <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: color + '12' }}>
        <Icon size={15} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</Text>
        <Text className={`text-sm font-medium mt-0.5 ${onPress ? 'text-primary' : 'text-midnight'}`}>{value}</Text>
      </View>
      {onPress && <ArrowUpRight size={14} color={Colors.primary} />}
    </Pressable>
  );
});

const ActionButton = React.memo(function ActionButton({ icon: Icon, label, color, bgColor, onPress }: {
  icon: React.ElementType; label: string; color: string; bgColor: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-1 flex-row items-center justify-center gap-2 py-3.5 rounded-2xl active:opacity-80" style={{ backgroundColor: bgColor }}>
      <Icon size={15} color={color} />
      <Text className="font-semibold text-xs" style={{ color }}>{label}</Text>
    </Pressable>
  );
});

/* ───── Main Screen ───── */

export default function UsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/admin/users');
      const apiUsers = res.data.users.map((u: any) => ({
        id: u.id,
        name: u.fullName,
        role: u.role.charAt(0).toUpperCase() + u.role.slice(1),
        department: u.department || 'General',
        status: u.status,
        phone: u.mobileNumber,
        email: u.email || 'N/A',
        employeeId: u.employeeId || 'N/A',
        joinDate: new Date(u.createdAt).toISOString().split('T')[0]
      }));
      setUsers(apiUsers);
    } catch (e) {
      console.log('Failed to fetch users', e);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    let result = users;
    if (selectedFilter !== 'All') {
      result = result.filter((u) => u.role === selectedFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q) ||
          u.employeeId.toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, selectedFilter, searchQuery]);

  const activeCount = useMemo(() => users.filter((u) => u.status === 'active').length, [users]);
  const inactiveCount = useMemo(() => users.filter((u) => u.status === 'inactive').length, [users]);

  const handleUserPress = useCallback((user: UserItem) => {
    setSelectedUser(user);
    setShowUserDetail(true);
  }, []);

  const handleToggleStatus = useCallback((userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    Alert.alert(
      `${newStatus === 'active' ? 'Activate' : 'Deactivate'} User`,
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newStatus === 'inactive' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
              setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
              setSelectedUser((prev) => prev?.id === userId ? { ...prev, status: newStatus } : prev);
              Alert.alert('Success', `${user.name} has been ${newStatus === 'active' ? 'activated' : 'deactivated'}.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to update user status.');
            }
          },
        },
      ]
    );
  }, [users]);

  const handleDeleteUser = useCallback((user: UserItem) => {
    Alert.alert(
      'Remove User',
      `Are you sure you want to remove ${user.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/users/${user.id}`);
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
              setShowUserDetail(false);
              setSelectedUser(null);
              Alert.alert('Removed', `${user.name} has been removed from the system.`);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to remove user.');
            }
          },
        },
      ]
    );
  }, []);

  const handleEditRole = useCallback((user: UserItem) => {
    Alert.alert(
      'Change Role',
      `Current role: ${user.role}\n\nSelect new role for ${user.name}:`,
      [
        ...['Doctor', 'Receptionist', 'Pharmacist', 'Admin']
          .filter((r) => r !== user.role)
          .map((role) => ({
            text: role,
            onPress: async () => {
              try {
                await api.patch(`/admin/users/${user.id}/role`, { role: role.toLowerCase() });
                setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
                setSelectedUser((prev) => prev?.id === user.id ? { ...prev, role } : prev);
                Alert.alert('Role Updated', `${user.name} is now a ${role}.`);
              } catch (error: any) {
                Alert.alert('Error', 'Failed to change role.');
              }
            },
          })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const handleResetPassword = useCallback((user: UserItem) => {
    Alert.alert(
      'Reset Password',
      `Send a password reset link to ${user.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reset',
          onPress: () => Alert.alert('Email Sent', `Password reset link sent to ${user.email}.`),
        },
      ]
    );
  }, []);

  const handleUserActions = useCallback((user: UserItem) => {
    Alert.alert(user.name, `${user.role} | ${user.department}`, [
      { text: 'View Details', onPress: () => handleUserPress(user) },
      { text: 'Change Role', onPress: () => handleEditRole(user) },
      { text: 'Reset Password', onPress: () => handleResetPassword(user) },
      {
        text: user.status === 'active' ? 'Deactivate' : 'Activate',
        onPress: () => handleToggleStatus(user.id),
        style: user.status === 'active' ? 'destructive' : 'default',
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [handleUserPress, handleEditRole, handleResetPassword, handleToggleStatus]);

  const handleCall = useCallback((phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
  }, []);

  const handleEmail = useCallback((email: string) => {
    Linking.openURL(`mailto:${email}`);
  }, []);

  const closeDetail = useCallback(() => {
    setShowUserDetail(false);
    setSelectedUser(null);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-midnight tracking-tight">Users</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            {filteredUsers.length} of {users.length} users
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/admin/create-user')}
          className="flex-row items-center gap-2 bg-primary px-4 py-2.5 rounded-full active:opacity-80"
          style={Shadows.focus}
        >
          <UserPlus size={15} color="#FFFFFF" />
          <Text className="text-white text-xs font-bold">Add User</Text>
        </Pressable>
      </View>

      {/* Summary Cards */}
      <View className="flex-row gap-3 px-6 mt-2 mb-3">
        <SummaryCard label="Total" value={users.length} icon={Users} color={Colors.primary} />
        <SummaryCard label="Active" value={activeCount} icon={UserCheck} color="#059669" />
        <SummaryCard label="Inactive" value={inactiveCount} icon={UserX} color="#DC2626" />
      </View>

      {/* Search Bar */}
      <View className="px-6 mb-3">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 border border-slate-100" style={Shadows.card}>
          <Search size={18} color="#94A3B8" />
          <TextInput
            className="flex-1 ml-3 text-midnight text-sm"
            placeholder="Search by name, role, department, ID..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} className="active:opacity-70">
              <X size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View className="mb-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 24 }}>
          {ROLE_FILTERS.map((filter) => (
            <FilterChip
              key={filter}
              label={filter}
              isActive={selectedFilter === filter}
              onPress={() => setSelectedFilter(filter)}
            />
          ))}
        </ScrollView>
      </View>

      {/* User List */}
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 120 }}>
        {filteredUsers.length === 0 ? (
          <View className="items-center py-16">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
              <User size={28} color="#CBD5E1" />
            </View>
            <Text className="text-slate-500 font-semibold text-base">No Users Found</Text>
            <Text className="text-slate-400 mt-1 text-xs text-center px-8">
              {searchQuery ? `No results for "${searchQuery}"` : 'No users in this category'}
            </Text>
            <Pressable
              onPress={() => { setSearchQuery(''); setSelectedFilter('All'); }}
              className="mt-4 px-5 py-2.5 bg-primary/10 rounded-full active:opacity-70"
            >
              <Text className="text-primary font-semibold text-xs">Clear Filters</Text>
            </Pressable>
          </View>
        ) : (
          filteredUsers.map((u) => (
            <UserCard
              key={u.id}
              user={u}
              onPress={() => handleUserPress(u)}
              onActionPress={() => handleUserActions(u)}
            />
          ))
        )}
      </ScrollView>

      {/* User Detail Modal */}
      <Modal visible={showUserDetail} transparent animationType="slide" onRequestClose={closeDetail}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={closeDetail}>
          <Pressable onPress={() => {}} className="bg-white rounded-t-3xl" style={{ maxHeight: '85%' }}>
            <View className="w-12 h-1.5 bg-slate-300/60 rounded-full self-center mt-3 mb-2" />
            {selectedUser && (
              <ScrollView className="px-6 pb-10" showsVerticalScrollIndicator={false}>
                {/* User Header */}
                <View className="items-center py-5">
                  <View className="w-20 h-20 rounded-full items-center justify-center mb-3"
                    style={{ backgroundColor: (ROLE_COLORS[selectedUser.role] || ROLE_COLORS.Admin).bg }}
                  >
                    <Text className="font-extrabold text-2xl" style={{ color: (ROLE_COLORS[selectedUser.role] || ROLE_COLORS.Admin).text }}>
                      {selectedUser.name.replace(/^Dr\.\s*/i, '').charAt(0)}
                    </Text>
                  </View>
                  <Text className="text-xl font-extrabold text-midnight">{selectedUser.name}</Text>
                  <View className="flex-row items-center gap-2 mt-1.5">
                    <View className="px-3 py-1 rounded-full" style={{ backgroundColor: (ROLE_COLORS[selectedUser.role] || ROLE_COLORS.Admin).bg }}>
                      <Text className="text-xs font-bold" style={{ color: (ROLE_COLORS[selectedUser.role] || ROLE_COLORS.Admin).text }}>
                        {selectedUser.role}
                      </Text>
                    </View>
                    <StatusChip
                      label={selectedUser.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                      variant={selectedUser.status === 'active' ? 'success' : 'neutral'}
                    />
                  </View>
                </View>

                {/* Info Section */}
                <View className="bg-slate-50/80 rounded-2xl p-4 mb-4">
                  <DetailRow icon={Shield} label="Employee ID" value={selectedUser.employeeId} color="#64748B" />
                  <DetailRow icon={Building2} label="Department" value={selectedUser.department} color="#8B5CF6" />
                  <DetailRow icon={Calendar} label="Joined" value={selectedUser.joinDate} color="#F59E0B" />
                  <DetailRow
                    icon={Phone} label="Phone" value={selectedUser.phone} color="#059669"
                    onPress={() => handleCall(selectedUser.phone)}
                  />
                  <DetailRow
                    icon={Mail} label="Email" value={selectedUser.email} color="#0EA5E9"
                    onPress={() => handleEmail(selectedUser.email)}
                  />
                </View>

                {/* Action Buttons */}
                <View className="gap-3 mb-6">
                  <View className="flex-row gap-3">
                    <ActionButton icon={Shield} label="Change Role" color={Colors.primary} bgColor="#EFF6FF" onPress={() => handleEditRole(selectedUser)} />
                    <ActionButton icon={Key} label="Reset Pass" color="#F59E0B" bgColor="#FFFBEB" onPress={() => handleResetPassword(selectedUser)} />
                  </View>
                  <View className="flex-row gap-3">
                    <ActionButton
                      icon={selectedUser.status === 'active' ? UserX : UserCheck}
                      label={selectedUser.status === 'active' ? 'Deactivate' : 'Activate'}
                      color={selectedUser.status === 'active' ? '#64748B' : '#059669'}
                      bgColor={selectedUser.status === 'active' ? '#F1F5F9' : '#F0FDF4'}
                      onPress={() => handleToggleStatus(selectedUser.id)}
                    />
                    <ActionButton icon={Trash2} label="Remove" color="#DC2626" bgColor="#FEF2F2" onPress={() => handleDeleteUser(selectedUser)} />
                  </View>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
