import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSetting, setSetting } from './database';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'CageMind Erinnerungen',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number
): Promise<void> {
  try {
    await cancelDailyReminder();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'CageMind',
        body: 'Wie geht es dir heute? Nimm dir einen Moment für dich.',
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });

    await setSetting('reminder_hour', String(hour));
    await setSetting('reminder_minute', String(minute));
    await setSetting('reminder_enabled', 'true');
  } catch (error) {
    console.error('Fehler beim Planen der Erinnerung:', error);
  }
}

export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await setSetting('reminder_enabled', 'false');
  } catch (error) {
    console.error('Fehler beim Abbrechen der Erinnerung:', error);
  }
}

export async function getReminderSettings(): Promise<{
  enabled: boolean;
  hour: number;
  minute: number;
}> {
  try {
    const enabled = await getSetting('reminder_enabled');
    const hour = await getSetting('reminder_hour');
    const minute = await getSetting('reminder_minute');
    return {
      enabled: enabled === 'true',
      hour: hour ? parseInt(hour, 10) : 20,
      minute: minute ? parseInt(minute, 10) : 0,
    };
  } catch {
    return { enabled: false, hour: 20, minute: 0 };
  }
}
