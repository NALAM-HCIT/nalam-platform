import { CustomAlert } from '@/components/CustomAlert';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Modal, TextInput, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building, Clock, Shield, Database, Bell, Globe, ChevronRight, X, ArrowLeft } from 'lucide-react-native';
import { Shadows } from '@/constants/theme';
import { api } from '@/services/api';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

type SettingPanel = null | 'hospital' | 'hours' | 'security' | 'data' | 'notifications' | 'integration';

const settingsItems: { icon: any; label: string; desc: string; color: string; panel: SettingPanel }[] = [
  { icon: Building, label: 'Hospital Information', desc: 'Name, address, contact details', color: '#1A73E8', panel: 'hospital' },
  { icon: Clock, label: 'Working Hours', desc: 'Manage hospital operating hours', color: '#8B5CF6', panel: 'hours' },
  { icon: Shield, label: 'Security Settings', desc: 'Access control and permissions', color: '#EF4444', panel: 'security' },
  { icon: Database, label: 'Data Management', desc: 'Backup, export, and storage', color: '#059669', panel: 'data' },
  { icon: Bell, label: 'Notification Settings', desc: 'Configure alerts and notifications', color: '#F59E0B', panel: 'notifications' },
  { icon: Globe, label: 'Integration', desc: 'Third-party services and APIs', color: '#06B6D4', panel: 'integration' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SettingsScreen() {
  const [activePanel, setActivePanel] = useState<SettingPanel>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Hospital Info state ─────────────────────────────────
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalCity, setHospitalCity] = useState('');
  const [hospitalState, setHospitalState] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [hospitalEmail, setHospitalEmail] = useState('');
  const [hospitalLicenseNo, setHospitalLicenseNo] = useState('');

  // ── Working Hours state ─────────────────────────────────
  const [workingHours, setWorkingHours] = useState<
    { dayOfWeek: number; startTime: string; endTime: string; isEnabled: boolean; breakStart: string | null; breakEnd: string | null }[]
  >([]);

  // ── Security settings state ─────────────────────────────
  const [auditLogging, setAuditLogging] = useState(true);

  // ── Notification settings state ─────────────────────────
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [userActivityAlerts, setUserActivityAlerts] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);

  // ── Integration state ───────────────────────────────────
  const [integrations, setIntegrations] = useState<
    { id: string; name: string; type: string; isConnected: boolean; status: string }[]
  >([]);

  // ── Fetch helpers ───────────────────────────────────────

  const fetchHospitalInfo = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/hospital-info');
      const d = res.data;
      setHospitalName(d.name || '');
      setHospitalAddress(d.address || '');
      setHospitalCity(d.city || '');
      setHospitalState(d.state || '');
      setHospitalPhone(d.phone || '');
      setHospitalEmail(d.email || '');
      setHospitalLicenseNo(d.licenseNo || '');
    } catch (e) {
      console.log('Failed to fetch hospital info', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkingHours = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/working-hours');
      setWorkingHours(res.data.hours);
    } catch (e) {
      console.log('Failed to fetch working hours', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSecuritySettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/settings');
      const s: { key: string; value: string }[] = res.data.settings || [];
      const getVal = (k: string, fallback: string) => s.find((x) => x.key === k)?.value ?? fallback;
      setAuditLogging(getVal('audit_logging_enabled', 'true') === 'true');
    } catch (e) {
      console.log('Failed to fetch security settings', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNotificationSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/settings');
      const s: { key: string; value: string }[] = res.data.settings || [];
      const getVal = (k: string, fallback: string) => s.find((x) => x.key === k)?.value ?? fallback;
      setEmailNotif(getVal('notif_email', 'true') === 'true');
      setPushNotif(getVal('notif_push', 'true') === 'true');
      setSmsNotif(getVal('notif_sms', 'false') === 'true');
      setSecurityAlerts(getVal('alert_security', 'true') === 'true');
      setUserActivityAlerts(getVal('alert_user_activity', 'true') === 'true');
      setSystemAlerts(getVal('alert_system', 'true') === 'true');
    } catch (e) {
      console.log('Failed to fetch notification settings', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/integrations');
      setIntegrations(res.data.integrations);
    } catch (e) {
      console.log('Failed to fetch integrations', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Lazy load on panel open ─────────────────────────────
  useEffect(() => {
    if (activePanel === 'hospital') fetchHospitalInfo();
    else if (activePanel === 'hours') fetchWorkingHours();
    else if (activePanel === 'security') fetchSecuritySettings();
    else if (activePanel === 'notifications') fetchNotificationSettings();
    else if (activePanel === 'integration') fetchIntegrations();
  }, [activePanel]);

  // ── Save handlers ───────────────────────────────────────

  const saveHospitalInfo = async () => {
    setSaving(true);
    try {
      await api.put('/admin/hospital-info', {
        name: hospitalName,
        address: hospitalAddress,
        city: hospitalCity,
        state: hospitalState,
        phone: hospitalPhone,
        email: hospitalEmail,
        licenseNo: hospitalLicenseNo,
      });
      CustomAlert.alert('Saved', 'Hospital information updated successfully.', [{ text: 'OK' }]);
      setActivePanel(null);
    } catch (e) {
      CustomAlert.alert('Error', 'Failed to save hospital information.');
    } finally {
      setSaving(false);
    }
  };

  const saveWorkingHours = async () => {
    setSaving(true);
    try {
      await api.put('/admin/working-hours', { hours: workingHours });
      CustomAlert.alert('Saved', 'Working hours updated successfully.', [{ text: 'OK' }]);
      setActivePanel(null);
    } catch (e) {
      CustomAlert.alert('Error', 'Failed to save working hours.');
    } finally {
      setSaving(false);
    }
  };

  const saveSecuritySettings = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        settings: [
          { key: 'audit_logging_enabled', value: String(auditLogging) },
        ],
      });
      CustomAlert.alert('Saved', 'Security settings updated successfully.', [{ text: 'OK' }]);
      setActivePanel(null);
    } catch (e) {
      CustomAlert.alert('Error', 'Failed to save security settings.');
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        settings: [
          { key: 'notif_email', value: String(emailNotif) },
          { key: 'notif_push', value: String(pushNotif) },
          { key: 'notif_sms', value: String(smsNotif) },
          { key: 'alert_security', value: String(securityAlerts) },
          { key: 'alert_user_activity', value: String(userActivityAlerts) },
          { key: 'alert_system', value: String(systemAlerts) },
        ],
      });
      CustomAlert.alert('Saved', 'Notification preferences updated successfully.', [{ text: 'OK' }]);
      setActivePanel(null);
    } catch (e) {
      CustomAlert.alert('Error', 'Failed to save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setSaving(true);
    try {
      const res = await api.get('/admin/export-data', { responseType: 'blob' });
      const fileUri = cacheDirectory + 'hospital-export.json';
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        await writeAsStringAsync(fileUri, base64, { encoding: EncodingType.Base64 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export Hospital Data' });
        } else {
          CustomAlert.alert('Exported', `Data saved to ${fileUri}`);
        }
      };
      reader.readAsDataURL(res.data);
    } catch (e) {
      CustomAlert.alert('Error', 'Failed to export data.');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = () => {
    CustomAlert.alert(
      'Clear Cache',
      'This will clear all cached data. Users may experience slower load times temporarily.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post('/admin/clear-cache');
              CustomAlert.alert('Done', 'Cache cleared successfully.');
            } catch (e) {
              CustomAlert.alert('Error', 'Failed to clear cache.');
            }
          },
        },
      ]
    );
  };

  const toggleIntegration = (item: typeof integrations[0]) => {
    CustomAlert.alert(
      `${item.isConnected ? 'Disconnect' : 'Connect'} ${item.name}`,
      `Are you sure you want to ${item.isConnected ? 'disconnect' : 'connect'} ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const res = await api.patch(`/admin/integrations/${item.id}`, {
                isConnected: !item.isConnected,
              });
              const updated = res.data;
              setIntegrations((prev) =>
                prev.map((it) =>
                  it.id === item.id
                    ? { ...it, isConnected: updated.isConnected, status: updated.status }
                    : it
                )
              );
            } catch (e) {
              CustomAlert.alert('Error', 'Failed to update integration.');
            }
          },
        },
      ]
    );
  };

  const toggleDay = (index: number) => {
    setWorkingHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, isEnabled: !h.isEnabled } : h))
    );
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  // ── Panel renderers ─────────────────────────────────────

  const renderPanelContent = () => {
    if (loading) {
      return (
        <View className="py-20 items-center">
          <ActivityIndicator size="large" color="#1A73E8" />
        </View>
      );
    }

    switch (activePanel) {
      case 'hospital':
        return (
          <>
            <Text className="text-lg font-bold text-midnight mb-5">Hospital Information</Text>
            {[
              { label: 'Hospital Name', value: hospitalName, setter: setHospitalName },
              { label: 'Address', value: hospitalAddress, setter: setHospitalAddress },
              { label: 'City', value: hospitalCity, setter: setHospitalCity },
              { label: 'State', value: hospitalState, setter: setHospitalState },
              { label: 'Phone', value: hospitalPhone, setter: setHospitalPhone, keyboard: 'phone-pad' as const },
              { label: 'Email', value: hospitalEmail, setter: setHospitalEmail, keyboard: 'email-address' as const },
              { label: 'License No', value: hospitalLicenseNo, setter: setHospitalLicenseNo },
            ].map((field, i) => (
              <View key={i} className="mb-4">
                <Text className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 ml-1">{field.label}</Text>
                <TextInput
                  className="bg-slate-50 rounded-xl px-4 py-3.5 text-midnight text-sm border border-slate-100"
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.keyboard}
                  maxLength={field.keyboard === 'phone-pad' ? 10 : undefined}
                />
              </View>
            ))}
            <Pressable
              onPress={saveHospitalInfo}
              disabled={saving}
              className="bg-primary py-4 rounded-2xl items-center mt-2 active:opacity-90"
              style={Shadows.focus}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Save Changes</Text>}
            </Pressable>
          </>
        );

      case 'hours':
        return (
          <>
            <Text className="text-lg font-bold text-midnight mb-5">Working Hours</Text>
            {workingHours
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((h, i) => (
                <View
                  key={h.dayOfWeek}
                  className={`flex-row items-center justify-between py-3.5 ${i < workingHours.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <Switch
                      value={h.isEnabled}
                      onValueChange={() => toggleDay(i)}
                      trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                      thumbColor={h.isEnabled ? '#1A73E8' : '#94A3B8'}
                    />
                    <Text className={`font-semibold text-sm ${h.isEnabled ? 'text-midnight' : 'text-slate-400'}`}>
                      {DAY_NAMES[h.dayOfWeek]}
                    </Text>
                  </View>
                  {h.isEnabled ? (
                    <Text className="text-slate-500 text-xs">{formatTime(h.startTime)} - {formatTime(h.endTime)}</Text>
                  ) : (
                    <Text className="text-rose-400 text-xs font-medium">Closed</Text>
                  )}
                </View>
              ))}
            <Pressable
              onPress={saveWorkingHours}
              disabled={saving}
              className="bg-primary py-4 rounded-2xl items-center mt-5 active:opacity-90"
              style={Shadows.focus}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Save Hours</Text>}
            </Pressable>
          </>
        );

      case 'security':
        return (
          <>
            <Text className="text-lg font-bold text-midnight mb-5">Security Settings</Text>
            <View className="gap-4">
              <View className="flex-row items-center justify-between py-2">
                <View className="flex-1">
                  <Text className="font-semibold text-midnight text-sm">Audit Logging</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">Log all user actions for compliance</Text>
                </View>
                <Switch
                  value={auditLogging}
                  onValueChange={setAuditLogging}
                  trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                  thumbColor={auditLogging ? '#1A73E8' : '#94A3B8'}
                />
              </View>
            </View>
            <Pressable
              onPress={saveSecuritySettings}
              disabled={saving}
              className="bg-primary py-4 rounded-2xl items-center mt-4 active:opacity-90"
              style={Shadows.focus}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Save Security Settings</Text>}
            </Pressable>
          </>
        );

      case 'data':
        return (
          <>
            <Text className="text-lg font-bold text-midnight mb-5">Data Management</Text>
            <View className="gap-3">
              <Pressable
                onPress={handleExport}
                disabled={saving}
                className="bg-primary py-4 rounded-2xl items-center active:opacity-90"
                style={Shadows.focus}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Export Data (JSON)</Text>}
              </Pressable>
              <Pressable
                onPress={handleClearCache}
                className="bg-rose-50 py-4 rounded-2xl items-center active:opacity-90"
              >
                <Text className="text-rose-500 font-bold">Clear Cache</Text>
              </Pressable>
            </View>
          </>
        );

      case 'notifications':
        return (
          <>
            <Text className="text-lg font-bold text-midnight mb-5">Notification Settings</Text>
            <Text className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 ml-1">Channels</Text>
            {[
              { label: 'Email Notifications', desc: 'Receive updates via email', value: emailNotif, setter: setEmailNotif },
              { label: 'Push Notifications', desc: 'In-app push alerts', value: pushNotif, setter: setPushNotif },
              { label: 'SMS Notifications', desc: 'Text message alerts', value: smsNotif, setter: setSmsNotif },
            ].map((item, i) => (
              <View key={i} className="flex-row items-center justify-between py-3 border-b border-slate-100">
                <View className="flex-1">
                  <Text className="font-semibold text-midnight text-sm">{item.label}</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">{item.desc}</Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={item.setter}
                  trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                  thumbColor={item.value ? '#1A73E8' : '#94A3B8'}
                />
              </View>
            ))}
            <Text className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-5 mb-3 ml-1">Alert Types</Text>
            {[
              { label: 'Security Alerts', desc: 'Failed logins, suspicious activity', value: securityAlerts, setter: setSecurityAlerts },
              { label: 'User Activity', desc: 'New registrations, role changes', value: userActivityAlerts, setter: setUserActivityAlerts },
              { label: 'System Alerts', desc: 'Backups, maintenance, errors', value: systemAlerts, setter: setSystemAlerts },
            ].map((item, i) => (
              <View key={i} className="flex-row items-center justify-between py-3 border-b border-slate-100">
                <View className="flex-1">
                  <Text className="font-semibold text-midnight text-sm">{item.label}</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">{item.desc}</Text>
                </View>
                <Switch
                  value={item.value}
                  onValueChange={item.setter}
                  trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                  thumbColor={item.value ? '#1A73E8' : '#94A3B8'}
                />
              </View>
            ))}
            <Pressable
              onPress={saveNotificationSettings}
              disabled={saving}
              className="bg-primary py-4 rounded-2xl items-center mt-5 active:opacity-90"
              style={Shadows.focus}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Save Preferences</Text>}
            </Pressable>
          </>
        );

      case 'integration':
        return (
          <>
            <Text className="text-lg font-bold text-midnight mb-5">Integrations</Text>
            {integrations.map((item, i) => (
              <Pressable
                key={item.id}
                onPress={() => toggleIntegration(item)}
                className="flex-row items-center justify-between py-4 active:opacity-80"
                style={i < integrations.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : undefined}
              >
                <View className="flex-1">
                  <Text className="font-semibold text-midnight text-sm">{item.name}</Text>
                  <View className="flex-row items-center gap-1.5 mt-1">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: item.isConnected ? '#22C55E' : '#EF4444' }} />
                    <Text className="text-xs" style={{ color: item.isConnected ? '#22C55E' : '#EF4444' }}>
                      {item.isConnected ? 'Connected' : 'Disconnected'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={item.isConnected}
                  onValueChange={() => toggleIntegration(item)}
                  trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                  thumbColor={item.isConnected ? '#1A73E8' : '#94A3B8'}
                />
              </Pressable>
            ))}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-6 pt-4 pb-2">
        <Text className="text-2xl font-bold text-midnight tracking-tight">Settings</Text>
        <Text className="text-slate-400 text-xs mt-0.5">Manage hospital configuration</Text>
      </View>
      <ScrollView className="flex-1 px-6 mt-4" contentContainerStyle={{ paddingBottom: 120 }}>
        {settingsItems.map((item, i) => (
          <Pressable
            key={i}
            onPress={() => setActivePanel(item.panel)}
            className="bg-white rounded-2xl p-4 mb-3 flex-row items-center gap-4 border border-slate-50 active:opacity-90"
            style={Shadows.card}
          >
            <View className="w-12 h-12 rounded-xl items-center justify-center" style={{ backgroundColor: `${item.color}15` }}>
              <item.icon size={22} color={item.color} />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-sm text-midnight">{item.label}</Text>
              <Text className="text-slate-500 text-xs mt-0.5">{item.desc}</Text>
            </View>
            <ChevronRight size={18} color="#CBD5E1" />
          </Pressable>
        ))}
      </ScrollView>

      {/* Settings Detail Panel Modal */}
      <Modal visible={activePanel !== null} transparent animationType="slide" onRequestClose={() => setActivePanel(null)}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setActivePanel(null)}>
          <Pressable onPress={() => {}} className="bg-white rounded-t-3xl max-h-[85%]">
            <View className="w-12 h-1.5 bg-slate-300/60 rounded-full self-center mt-3 mb-2" />
            <View className="flex-row items-center justify-between px-6 py-2">
              <Pressable onPress={() => setActivePanel(null)} className="flex-row items-center gap-2 active:opacity-70">
                <ArrowLeft size={18} color="#1A73E8" />
                <Text className="text-primary font-semibold text-sm">Back</Text>
              </Pressable>
              <Pressable
                onPress={() => setActivePanel(null)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:opacity-70"
              >
                <X size={16} color="#64748B" />
              </Pressable>
            </View>
            <ScrollView className="px-6 pb-10" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {renderPanelContent()}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
