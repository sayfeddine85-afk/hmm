// Rappel quotidien de pesée (notification locale, sans serveur).

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'rappel-pesee';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const ensurePermission = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rappel de pesée',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
};

// Remplace tout rappel existant par un rappel quotidien à hour:minute.
// Retourne false si la permission est refusée.
export const scheduleDailyReminder = async (hour, minute) => {
  const ok = await ensurePermission();
  if (!ok) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Pesée du jour ⚖️',
      body: "N'oublie pas de noter ton poids aujourd'hui.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    },
  });
  return true;
};

export const cancelReminder = () => Notifications.cancelAllScheduledNotificationsAsync();
