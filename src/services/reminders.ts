// Local reminders. A web app can't schedule a notification while it's closed (no Notification
// Triggers on any browser, and push needs a server), so reminders fire while HUMANOS is open or in
// the background: a system notification when permitted, plus an in-app banner. Ones missed while
// the app was closed are shown on the next open if they're under MISSED_GRACE_MS old.
import type { Reminder } from '../state/appState'
import { parseClock } from '../lib/dates'

export const MISSED_GRACE_MS = 2 * 60 * 60_000

export type PermissionState = NotificationPermission | 'unsupported'

export function notificationPermission(): PermissionState {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

// Must be called from a user gesture (iOS requires it, and only for installed web apps).
export async function requestPermission(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

// Today at HH:MM, as an ISO string.
export function todayAt(clock: string, now = new Date()) {
  const minutes = parseClock(clock)
  const at = new Date(now)
  at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  return at.toISOString()
}

// One reminder per tip per day. The module prefix lets a module reset clear only its own reminders.
export function reminderIdFor(moduleId: string, tip: { id: string }, day: string) {
  return `${moduleId}:${tip.id}:${day}`
}

export const isModuleReminder = (moduleId: string, id: string) => id.startsWith(`${moduleId}:`)

export function makeReminder(id: string, at: string, title: string, body: string): Reminder {
  return { id, at, title, body }
}

// System notification if allowed. Returns whether one was shown.
export async function showSystemNotification(reminder: Reminder): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false
  const options = { body: reminder.body, tag: reminder.id, icon: `${import.meta.env.BASE_URL}icons/icon-192.png` }
  try {
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) {
      await registration.showNotification(reminder.title, options)
      return true
    }
    new Notification(reminder.title, options)
    return true
  } catch {
    return false
  }
}

export function splitDue(reminders: Reminder[], now = Date.now()) {
  const due = reminders.filter((r) => Date.parse(r.at) <= now)
  return {
    due: due.filter((r) => now - Date.parse(r.at) <= MISSED_GRACE_MS),
    expired: due.filter((r) => now - Date.parse(r.at) > MISSED_GRACE_MS),
    upcoming: reminders.filter((r) => Date.parse(r.at) > now),
  }
}
