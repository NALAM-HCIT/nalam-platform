import { CustomAlert } from '@/components/CustomAlert';
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Building, Clock, Shield, Database, Bell, Globe, ChevronRight, X, Save, ArrowLeft } from 'lucide-react-native';
import { Shadows } from '@/constants/theme';
import { api } from '@/services/api';
type SettingPanel = null | 'hospital' | 'hours' | 'security' | 'data' | 'notifications' | 'integration';

const settingsItems: { icon: any; label: string; desc: string; color: string; panel: SettingPanel }[] = [
  { icon: Building, label: 'Hospital Information', desc: 'Name, address, contact details', color: '#1A73E8', panel: 'hospital' },
  { icon: Clock, label: 'Working Hours', desc: 'Manage hospital operating hours', color: '#8B5CF6', panel: 'hours' },
  { icon: Shield, label: 'Security Settings', desc: 'Access control and permissions', color: '#EF4444', panel: 'security' },
  { icon: Database, label: 'Data Management', desc: 'Backup, export, and storage', color: '#059669', panel: 'data' },
  { icon: Bell, label: 'Notification Settings', desc: 'Configure alerts and notifications', color: '#F59E0B', panel: 'notifications' },
  { icon: Globe, label: 'Integration', desc: 'Third-party services and APIs', color: '#06B6D4', panel: 'integration' },
];

export default function SettingsScreen() {
  const [activePanel, setActivePanel] = useState<SettingPanel>(null);

  // Hospital Info state
  const [hospitalName, setHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  const [hospitalEmail, setHospitalEmail] = useState('');

  const fetchSettings = React.useCallback(async () => {
    try {
      const res = await api.get('/admin/settings');
      setHospitalName(res.data.hospitalName || 'My Hospital');
      const s = res.data.settings || [];
      const getVal = (k: string) => s.find((x: any) => x.key === k)?.value || '';
      setHospitalAddress(getVal('address'));
      setHospitalPhone(getVal('phone'));
      setHospitalEmail(getVal('email'));
    } catch(e) {
      console.log('Failed to fetch settings', e);
    }
  }, []);

  React.useEffect(() => { fetchSettings(); }, [fetchSettings]);

  // Working Hours state
  const [workingHours, setWorkingHours] = useState([
    { day: 'Monday', open: '08:00 AM', close: '08:00 PM', enabled: true },
    { day: 'Tuesday', open: '08:00 AM', close: '08:00 PM', enabled: true },
    { day: 'Wednesday', open: '08:00 AM', close: '08:00 PM', enabled: true },
    { day: 'Thursday', open: '08:00 AM', close: '08:00 PM', enabled: true },
    { day: 'Friday', open: '08:00 AM', close: '08:00 PM', enabled: true },
    { day: 'Saturday', open: '09:00 AM', close: '02:00 PM', enabled: true },
    { day: 'Sunday', open: '', close: '', enabled: false },
  ]);

  // Security settings state
  const [sessionTimeout, setSessionTimeout] = useState('15');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [loginAttemptsLimit, setLoginAttemptsLimit] = useState('5');
  const [auditLogging, setAuditLogging] = useState(true);

  // Notification settings state
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [userActivityAlerts, setUserActivityAlerts] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);

  // Integration state
  const [integrations, setIntegrations] = useState([
    { name: 'ABDM (Ayushman Bharat)', status: 'Connected', enabled: true },
    { name: 'Lab Equipment API', status: 'Connected', enabled: true },
    { name: 'Pharmacy Inventory', status: 'Connected', enabled: true },
    { name: 'Insurance Gateway', status: 'Disconnected', enabled: false },
    { name: 'SMS Provider (Twilio)', status: 'Connected', enabled: true },
  ]);

  const handleSave = async (section: string) => {
    if (section === 'Hospital Information') {
      try {
        await api.put('/admin/settings', { settings: [
          { key: 'address', value: hospitalAddress },
          { key: 'phone', value: hospitalPhone },
          { key: 'email', value: hospitalEmail }
        ]});
        CustomAlert.alert('Settings Saved', 'Hospital information has been updated successfully.', [{ text: 'OK' }]);
      } catch (e) {
        CustomAlert.alert('Error', 'Failed to save settings.');
      }
    } else {
      CustomAlert.alert('Settings Saved', `${section} settings have been updated successfully.`, [{ text: 'OK' }]);
    }
    setActivePanel(null);
  };

  const handleBackup = () => {
    CustomAlert.alert(
      'Backup Database',
      'This will create a full backup of all hospital data. The process may take a few minutes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Backup',
          onPress: () => {
            CustomAlert.alert('Backup Started', 'Database backup is in progress. You will be notified when complete.\n\nEstimated size: 2.4 GB\nEstimated time: 3-5 minutes');
          },
        },
      ]
    );
  };

  const handleExport = () => {
    CustomAlert.alert(
      'Export Data',
      'Select the data format for export:',
      [
        { text: 'CSV', onPress: () => CustomAlert.alert('Export Started', 'CSV export will be emailed to admin@arunpriya.com when ready.') },
        { text: 'JSON', onPress: () => CustomAlert.alert('Export Started', 'JSON export will be emailed to admin@arunpriya.com when ready.') },
        { text: 'PDF Report', onPress: () => CustomAlert.alert('Export Started', 'PDF report will be emailed to admin@arunpriya.com when ready.') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleClearCache = () => {
    CustomAlert.alert(
      'Clear Cache',
      'This will clear all cached data. Users may experience slower load times temporarily.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => CustomAlert.alert('Cache Cleared', 'All cached data has been cleared successfully.') },
      ]
    );
  };

  const toggleIntegration = (index: number) => {
    const item = integrations[index];
    CustomAlert.alert(
      `${item.enabled ? 'Disconnect' : 'Connect'} ${item.name}`,
      `Are you sure you want to ${item.enabled ? 'disconnect' : 'connect'} ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setIntegrations((prev) =>
              prev.map((it, i) =>
                i === index
                  ? { ...it, enabled: !it.enabled, status: it.enabled ? 'Disconnected' : 'Connected' }
                  : it
              )
            );
          },
        },
      ]
    );
  };

  const toggleDay = (index: number) => {
    setWorkingHours((prev) =>
      prev.map((h, i) => (i === index ? { ...h, enabled: !h.enabled } : h))
    );
  };

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'hospital':
        return (
          <>
            <Text className="text-lg font-bold text-midnight mb-5">Hospital Information</Text>
            {[
              { label: 'Hospital Name', value: hospitalName, setter: setHospitalName },
              { label: 'Address', value: hospitalAddress, setter: setHospitalAddress },
              { label: 'Phone', value: hospitalPhone, setter: setHospitalPhone, keyboard: 'phone-pad' as const },
              { label: 'Email', value: hospitalEmail, setter: setHospitalEmail, keyboard: 'email-address' as const },
            ].map((field, i) => (
              <View key={i} className="mb-4">
                <Text className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 ml-1">{field.label}</Text>
                <TextInput
                  className="bg-slate-50 rounded-xl px-4 py-3.5 text-midnight text-sm border border-slate-100"
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.keyboard}
                />
              </View>
            ))}
            <Pressable
              onPress={() => handleSave('Hospital Information')}
              className="bg-primary py-4 rounded-2xl items-center mt-2 active:opacity-90"
              style={Shadows.focus}
            >
              <Text className="text-white font-bold">Save Changes</Text>
            </Pressable>
          </>
        );

      case 'hours':
        return (
          <>
            <Text className="text-lg font-bold text-midnight mb-5">Working Hours</Text>
            {workingHours.map((h, i) => (
              <View
                key={i}
                className={`flex-row items-center justify-between py-3.5 ${i < workingHours.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <Switch
                    value={h.enabled}
                    onValueChange={() => toggleDay(i)}
                    trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                    thumbColor={h.enabled ? '#1A73E8' : '#94A3B8'}
                  />
                  <Text className={`font-semibold text-sm ${h.enabled ? 'text-midnight' : 'text-slate-400'}`}>{h.day}</Text>
                </View>
                {h.enabled ? (
                  <Text className="text-slate-500 text-xs">{h.open} - {h.close}</Text>
                ) : (
                  <Text className="text-rose-400 text-xs font-medium">Closed</Text>
                )}
              </View>
            ))}
            <Pressable
              onPress={() => handleSave('Working Hours')}
              className="bg-primary py-4 rounded-2xl items-center mt-5 active:opacity-90"
              style={Shadows.focus}
            >
              <Text className="text-white font-bold">Save Hours</Text>
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
                  <Text className="font-semibold text-midnight text-sm">Two-Factor Authentication</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">Require OTP for all admin logins</Text>
                </View>
                <Switch
                  value={twoFactorEnabled}
                  onValueChange={setTwoFactorEnabled}
                  trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                  thumbColor={twoFactorEnabled ? '#1A73E8' : '#94A3B8'}
                />
              </View>
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
              <View className="mb-2">
                <Text className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 ml-1">Session Timeout (minutes)</Text>
                <TextInput
                  className="bg-slate-50 rounded-xl px-4 py-3.5 text-midnight text-sm border border-slate-100"
                  value={sessionTimeout}
                  onChangeText={setSessionTimeout}
                  keyboardType="number-pad"
                />
              </View>
              <View className="mb-2">
                <Text className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 ml-1">Max Login Attempts</Text>
                <TextInput
                  className="bg-slate-50 rounded-xl px-4 py-3.5 text-midnight text-sm border border-slate-100"
                  value={loginAttemptsLimit}
                  onChangeText={setLoginAttemptsLimit}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <Pressable
              onPress={() => handleSave('Security')}
              className="bg-primary py-4 rounded-2xl items-center mt-4 active:opacity-90"
              style={Shadows.focus}
            >
              <Text className="text-white font-bold">Save Security Settings</Text>
            </Pressable>
          </>
        );

      case 'data':
        return (
          <>
            <Text className="text-lg font-bold text-midnight mb-5">Data Management</Text>
            <View className="bg-slate-50 rounded-2xl p-4 mb-4">
              <Text className="font-semibold text-midnight text-sm">Storage Overview</Text>
              <View className="mt-3 gap-2">
                <View className="flex-row justify-between">
                  <Text className="text-slate-500 text-xs">Total Storage</Text>
                  <Text className="text-midnight text-xs font-semibold">50 GB</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-500 text-xs">Used</Text>
                  <Text className="text-midnight text-xs font-semibold">12.4 GB (24.8%)</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-slate-500 text-xs">Last Backup</Text>
                  <Text className="text-midnight text-xs font-semibold">Today, 08:00 AM</Text>
                </View>
                <View className="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <View className="h-full bg-primary rounded-full" style={{ width: '25%' }} />
                </View>
              </View>
            </View>
            <View className="gap-3">
              <Pressable
                onPress={handleBackup}
                className="bg-primary py-4 rounded-2xl items-center active:opacity-90"
                style={Shadows.focus}
              >
                <Text className="text-white font-bold">Create Backup</Text>
              </Pressable>
              <Pressable
                onPress={handleExport}
                className="bg-white py-4 rounded-2xl items-center border border-primary/20 active:opacity-90"
              >
                <Text className="text-primary font-bold">Export Data</Text>
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
              onPress={() => handleSave('Notification')}
              className="bg-primary py-4 rounded-2xl items-center mt-5 active:opacity-90"
              style={Shadows.focus}
            >
              <Text className="text-white font-bold">Save Preferences</Text>
            </Pressable>
          </>
        );

      case 'integration':
        return (
          <>
            <Text className="text-lg font-bold text-midnight mb-5">Integrations</Text>
            {integrations.map((item, i) => (
              <Pressable
                key={i}
                onPress={() => toggleIntegration(i)}
                className="flex-row items-center justify-between py-4 active:opacity-80"
                style={i < integrations.length - 1 ? { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' } : undefined}
              >
                <View className="flex-1">
                  <Text className="font-semibold text-midnight text-sm">{item.name}</Text>
                  <View className="flex-row items-center gap-1.5 mt-1">
                    <View className="w-2 h-2 rounded-full" style={{ backgroundColor: item.enabled ? '#22C55E' : '#EF4444' }} />
                    <Text className="text-xs" style={{ color: item.enabled ? '#22C55E' : '#EF4444' }}>{item.status}</Text>
                  </View>
                </View>
                <Switch
                  value={item.enabled}
                  onValueChange={() => toggleIntegration(i)}
                  trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                  thumbColor={item.enabled ? '#1A73E8' : '#94A3B8'}
                />
              </Pressable>
            ))}
            <Pressable
              onPress={() => CustomAlert.alert('Add Integration', 'Contact IT to set up new integrations.\n\nEmail: it-support@arunpriya.com', [{ text: 'OK' }])}
              className="bg-white py-4 rounded-2xl items-center border border-dashed border-primary/30 mt-4 active:opacity-90"
            >
              <Text className="text-primary font-semibold">+ Add New Integration</Text>
            </Pressable>
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
