import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface ReminderSettings {
  reminder_enabled: boolean;
  reminder_interval_h: number;
  reminder_start_time: string; // "HH:mm"
  reminder_end_time: string;   // "HH:mm"
  daily_goal_ml: number;
}

/**
 * Request permission for local notifications (call once on first setup).
 * Returns true if granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Cancel all existing water reminders and schedule new ones based on settings.
 * Safe to call after every settings change — idempotent via full cancel + reschedule.
 */
export async function scheduleWaterReminders(settings: ReminderSettings): Promise<void> {
  // Always cancel first so we start clean
  await cancelWaterReminders();

  if (!settings.reminder_enabled) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const [startH] = settings.reminder_start_time.split(':').map(Number);
  const [endH]   = settings.reminder_end_time.split(':').map(Number);

  if (isNaN(startH) || isNaN(endH) || startH >= endH) return;

  const intervalH = Math.max(1, Math.min(12, settings.reminder_interval_h));
  const slots: number[] = [];

  for (let h = startH; h <= endH; h += intervalH) {
    slots.push(h);
  }

  // Expo local notifications — one daily repeating trigger per hour slot
  for (const hour of slots) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '💧 Time to hydrate!',
        body: `Log your water intake — stay on track with your ${settings.daily_goal_ml} ml goal today.`,
        data: { action: 'water_reminder' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
      },
    });
  }
}

/**
 * Cancel all scheduled notifications that relate to water reminders.
 * Uses the DAILY trigger category prefix to identify them.
 */
export async function cancelWaterReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const waterNotifIds = scheduled
      .filter(n => n.content.data?.action === 'water_reminder')
      .map(n => n.identifier);

    for (const id of waterNotifIds) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch {
    // Ignore errors — not critical
  }
}

/**
 * Set the global notification handler. Call once at app startup (e.g. in _layout.tsx).
 */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
