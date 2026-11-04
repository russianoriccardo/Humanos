// Reminders: up to 3 nudges a day that fire only when behind pace, or one daily status in doctor mode.
import { addDays, formatClock, fromKey, parseClock } from '../lib/dates'
import { makeReminder } from '../services/reminders'
import type { HydrationActive, HydrationAnchor, Reminder, SleepActive } from '../state/appState'
import { shiftClock, tonightLightsOut } from '../sleep/plan'
import { dayTotal, PACE_END, type PaceStatus } from './day'
import { formatLitres } from './target'

export const MAX_SLOTS = 3
export const DOCTOR_STATUS = '18:00'
const MERGE_WINDOW_MS = 60 * 60_000
export const CHECK_IN_SUFFIX = ' Then start the day with a glass of water.'

type Slot = { time: string; on: boolean }

export function defaultSlots(anchor: HydrationAnchor | null, wake: string, doctor = false): string[] {
  if (doctor) return [DOCTOR_STATUS]
  if (anchor === 'notAtAll') return [shiftClock(wake, 30), '13:00', '16:30']
  if (anchor === 'track') return ['15:00']
  return ['11:00', '15:30']
}

// Minutes from noon, so a lights out after midnight sorts after the evening.
const fromNoon = (clock: string) => (parseClock(clock) - 12 * 60 + 1440) % 1440

// 20:00, or 2 hours before Sleep's lights out tonight when that's earlier.
export function quietAfter(sleepActive: SleepActive | null, day: string) {
  if (!sleepActive) return PACE_END
  const early = shiftClock(tonightLightsOut(sleepActive, day), -120)
  return fromNoon(early) < fromNoon(PACE_END) ? early : PACE_END
}

const minutesOf = (now: Date) => now.getHours() * 60 + now.getMinutes()

// The first enabled slot still ahead today (before 04:00 nothing is: that's still last night).
export function nextSlot(slots: Slot[], now: Date): string | null {
  if (now.getHours() < 4) return null
  const m = minutesOf(now)
  return (
    slots
      .filter((s) => s.on)
      .map((s) => s.time)
      .sort()
      .find((t) => parseClock(t) > m) ?? null
  )
}

const atOn = (day: string, time: string) => {
  const d = fromKey(day)
  d.setHours(Math.floor(parseClock(time) / 60), parseClock(time) % 60, 0, 0)
  return d
}

type ReminderOpts = {
  target: number
  // Last moment a nudge may fire ('HH:MM').
  quiet: string
  // A hot day adjustment is active: the next nudge comes 30 minutes earlier.
  hot: boolean
}

export function hydrationReminders(active: HydrationActive, day: string, now: Date, { target, quiet, hot }: ReminderOpts): Reminder[] {
  if (!active.reminderOn || (active.pausedUntil && active.pausedUntil > day)) return []
  const done = dayTotal(active.logs, day)

  if (active.doctorLimit) {
    const slot = active.slots.find((s) => s.on)
    if (!slot) return []
    const at = atOn(day, slot.time)
    return at > now
      ? [makeReminder(`hydration:status:${day}`, at.toISOString(), 'Your water today', `${formatLitres(done)} of your ${formatLitres(target)} limit.`)]
      : []
  }

  const times = active.slots
    .filter((s) => s.on)
    .map((s) => s.time)
    .sort()
    .filter((t) => parseClock(t) <= parseClock(quiet))
    .slice(0, MAX_SLOTS)

  const left = Math.max(0, target - done)
  let movedNext = !hot
  const out: Reminder[] = []
  times.forEach((time, index) => {
    let at = atOn(day, time)
    if (at <= now) return
    if (!movedNext) {
      movedNext = true
      const earlier = new Date(at.getTime() - 30 * 60_000)
      if (earlier > now) at = earlier
    }
    const clock = formatClock(at.getHours() * 60 + at.getMinutes())
    out.push(
      index === 0
        ? makeReminder(`hydration:nudge:${day}:${clock}`, at.toISOString(), 'A glass now keeps you on track', `${formatLitres(done)} of ${formatLitres(target)} so far.`)
        : makeReminder(`hydration:nudge:${day}:${clock}`, at.toISOString(), `${formatLitres(left)} to go`, 'Two glasses does it.'),
    )
  })
  return out
}

// Checked at fire time: a nudge only when behind pace; the doctor status and anything else always.
export function shouldFire(reminder: Reminder, ctx: { pace: PaceStatus }) {
  if (!reminder.id.startsWith('hydration:nudge:')) return true
  return ctx.pace === 'behind'
}

// Sunday 09:30, only once there's something to recap (3 of the last 7 days logged).
export function weeklyRecap(active: HydrationActive, today: string): Reminder | null {
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -i))
  if (last7.filter((d) => (active.logs[d] ?? []).length > 0).length < 3) return null
  const hit = last7.filter((d) => dayTotal(active.logs, d) >= active.targetMl).length
  const sunday = addDays(today, (7 - fromKey(today).getDay()) % 7)
  return makeReminder(`hydration:recap:${sunday}`, atOn(sunday, '09:30').toISOString(), 'Your week in water', `Target hit ${hit} of 7 days.`)
}

// When Sleep's morning check in lands within an hour of the day's first water nudge, send one
// notification: the nudge goes, and the check in gains a line about water.
export function mergeWithCheckIn(hydration: Reminder[], sleep: Reminder[]) {
  let keptHydration = hydration
  const mergedSleep = sleep.map((r) => {
    if (!r.id.startsWith('sleep:checkin:')) return r
    const day = r.id.slice('sleep:checkin:'.length)
    const first = keptHydration
      .filter((h) => h.id.startsWith(`hydration:nudge:${day}:`))
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0]
    if (!first || Math.abs(Date.parse(first.at) - Date.parse(r.at)) > MERGE_WINDOW_MS) return r
    keptHydration = keptHydration.filter((h) => h !== first)
    return r.body.endsWith(CHECK_IN_SUFFIX) ? r : { ...r, body: r.body + CHECK_IN_SUFFIX }
  })
  return { hydration: keptHydration, sleep: mergedSleep }
}
