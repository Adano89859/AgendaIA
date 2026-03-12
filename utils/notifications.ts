// utils/notifications.ts

import * as Notifications from 'expo-notifications';
import { getPreference, setPreference } from '../database/db';

export const NOTIFICATION_ADVANCE_KEY = 'notification_advance_minutes';
export const DEFAULT_ADVANCE_MINUTES = 15;

export const ADVANCE_OPTIONS = [
  { value: 15,  label: '15 min' },
  { value: 30,  label: '30 min' },
  { value: 60,  label: '1 h' },
  { value: 120, label: '2 h' },
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export function getAdvanceMinutes(): number {
  return Number(getPreference(NOTIFICATION_ADVANCE_KEY, String(DEFAULT_ADVANCE_MINUTES)));
}

export function saveAdvanceMinutes(minutes: number): void {
  setPreference(NOTIFICATION_ADVANCE_KEY, String(minutes));
}

/**
 * Programa una notificación para el evento.
 * Devuelve el notificationId o null si la fecha ya pasó o no hay hora.
 */
export async function scheduleEventNotification(
  title: string,
  date: string,         // YYYY-MM-DD
  time: string,         // HH:MM o ''
  notifTitle: string,   // Traducido desde el componente
  notifBody: string,    // Traducido y formateado desde el componente
  advanceMinutes?: number
): Promise<string | null> {
  if (!time) return null;

  const advance = advanceMinutes ?? getAdvanceMinutes();
  const [hours, minutes] = time.split(':').map(Number);
  const eventDate = new Date(`${date}T00:00:00`);
  eventDate.setHours(hours, minutes, 0, 0);

  const triggerDate = new Date(eventDate.getTime() - advance * 60 * 1000);
  if (triggerDate <= new Date()) return null;

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: notifTitle,
      body: notifBody,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return notificationId;
}

/**
 * Cancela la notificación de un evento por su notificationId.
 */
export async function cancelEventNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Ya fue disparada o no existe
  }
}