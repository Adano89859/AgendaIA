import * as Notifications from 'expo-notifications';

export async function scheduleEventNotifications(
  eventId: number,
  title: string,
  date: string,
  time: string
) {
  const [hours, minutes] = time.split(':').map(Number);
  const eventDate = new Date(date + 'T00:00:00');
  eventDate.setHours(hours, minutes, 0, 0);

  const minus12h = new Date(eventDate.getTime() - 12 * 60 * 60 * 1000);
  const minus30m = new Date(eventDate.getTime() - 30 * 60 * 1000);
  const now = new Date();

  if (minus12h > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Recordatorio (12h)',
        body: `"${title}" en 12 horas`,
        data: { eventId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: minus12h },
    });
  }

  if (minus30m > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Recordatorio (30 min)',
        body: `"${title}" en 30 minutos`,
        data: { eventId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: minus30m },
    });
  }
}

export async function cancelEventNotifications(eventId: number) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data?.eventId === eventId) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}