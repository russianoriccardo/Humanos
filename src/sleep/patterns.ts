// Patterns in the user's own nights. Pure functions over check ins and sessions.
import { addDays, dateKey, formatClock, fromKey, parseClock } from '../lib/dates'
import type { SleepCheckIn } from '../state/appState'

// Seven nights is what it takes to tell a pattern from a coincidence.
export const PATTERN_NIGHTS = 7
const DAY = 24 * 60

// Minutes since 18:00, so a lights out at 00:30 sorts after one at 23:00.
const eveningMinutes = (clock: string) => (parseClock(clock) - 18 * 60 + DAY) % DAY
const fromEvening = (minutes: number) => formatClock((minutes + 18 * 60) % DAY)
const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length

// "Your best rested mornings come after lights out before {time}." Only when the rested mornings
// (4 or 5) clearly follow earlier nights than the rest: 3+ nights each way, 15+ minutes apart.
export function bestRestedBefore(checkIns: Record<string, SleepCheckIn>): string | null {
  const all = Object.values(checkIns)
  if (all.length < PATTERN_NIGHTS) return null
  const good = all.filter((c) => c.rested >= 4).map((c) => eveningMinutes(c.lightsOut))
  const rest = all.filter((c) => c.rested <= 3).map((c) => eveningMinutes(c.lightsOut))
  if (good.length < 3 || rest.length < 3) return null
  const goodAvg = average(good)
  if (average(rest) - goodAvg < 15) return null
  return fromEvening(Math.ceil(goodAvg / 15) * 15)
}

type Sessions = { id: string; at: string }[]
type Night = { key: string; checkIn?: SleepCheckIn }

const minutesOf = (c: SleepCheckIn) => (parseClock(c.wake) - parseClock(c.lightsOut) + DAY) % DAY

// The `days` mornings ending today, oldest first; a missing check in stays in as an empty night.
export function lastNights(checkIns: Record<string, SleepCheckIn>, today: string, days = 7): Night[] {
  return Array.from({ length: days }, (_, i) => {
    const key = addDays(today, i - days + 1)
    return { key, checkIn: checkIns[key] }
  })
}

const logged = (nights: Night[]) => nights.flatMap((n) => (n.checkIn ? [n.checkIn] : []))

export type Trend = { title: string; deltaMinutes: number | null }

// This week against the one before. The minute delta only once there are 14+ nights to compare.
export function weekTrend(checkIns: Record<string, SleepCheckIn>, today: string): Trend {
  const week = logged(lastNights(checkIns, today))
  const before = logged(lastNights(checkIns, addDays(today, -7)))
  const total = Object.keys(checkIns).length
  const deltaMinutes =
    total >= 14 && week.length && before.length ? Math.round(average(week.map(minutesOf)) - average(before.map(minutesOf))) : null
  const rested = week.length ? average(week.map((c) => c.rested)) : 3
  const title =
    deltaMinutes !== null && deltaMinutes >= 10
      ? 'Steadier, and longer'
      : (deltaMinutes !== null && deltaMinutes <= -10) || rested < 2.5
        ? 'A rougher week'
        : 'Holding steady'
  return { title, deltaMinutes }
}

// Nights in the last 7 within 30 minutes of the planned lights out, and the current run of them.
export function consistency(checkIns: Record<string, SleepCheckIn>, today: string, plannedFor: (night: string) => string) {
  const within = (n: Night) => {
    if (!n.checkIn) return false
    let diff = Math.abs(parseClock(n.checkIn.lightsOut) - parseClock(plannedFor(addDays(n.key, -1))))
    if (diff > DAY / 2) diff = DAY - diff
    return diff <= 30
  }
  const nights = lastNights(checkIns, today)
  let streak = 0
  for (let i = nights.length - 1; i >= 0 && within(nights[i]); i--) streak++
  return { within: nights.filter(within).length, streak }
}

export type Factor = { label: string; minutes: number }

// For each tag, and for doing a wind down session, average time asleep with vs without. Shown only
// with 3+ nights each way and a 10+ minute difference.
export function factors(checkIns: Record<string, SleepCheckIn>, sessions: Sessions, nightKeyOf: (at: string) => string) {
  const entries = Object.entries(checkIns)
  const sessionNights = new Set(sessions.map((s) => nightKeyOf(s.at)))
  const tests: { label: string; has: (key: string, c: SleepCheckIn) => boolean }[] = [
    ...[...new Set(entries.flatMap(([, c]) => c.tags))].map((tag) => ({ label: tag, has: (_: string, c: SleepCheckIn) => c.tags.includes(tag) })),
    { label: 'Wind down session', has: (key: string) => sessionNights.has(addDays(key, -1)) },
  ]
  const helps: Factor[] = []
  const costs: Factor[] = []
  for (const { label, has } of tests) {
    const yes = entries.filter(([k, c]) => has(k, c)).map(([, c]) => minutesOf(c))
    const no = entries.filter(([k, c]) => !has(k, c)).map(([, c]) => minutesOf(c))
    if (yes.length < 3 || no.length < 3) continue
    const diff = Math.round(average(yes) - average(no))
    if (diff >= 10) helps.push({ label, minutes: diff })
    else if (diff <= -10) costs.push({ label, minutes: -diff })
  }
  return { helps: helps.sort((a, b) => b.minutes - a.minutes), costs: costs.sort((a, b) => b.minutes - a.minutes) }
}

// Mornings in the last `days` after under 6 hours.
export const shortNights = (checkIns: Record<string, SleepCheckIn>, today: string, days = 14) =>
  logged(lastNights(checkIns, today, days)).filter((c) => minutesOf(c) < 6 * 60).length

// Most used sessions first.
export function sessionCounts(sessions: Sessions) {
  const counts = new Map<string, number>()
  for (const s of sessions) counts.set(s.id, (counts.get(s.id) ?? 0) + 1)
  return [...counts.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count)
}

// Monday to Sunday of the current week: which days had a session, plus this and last week's totals.
export function sessionWeek(sessions: Sessions, today: string) {
  const todayIndex = (fromKey(today).getDay() + 6) % 7
  const monday = addDays(today, -todayIndex)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const keys = sessions.map((s) => dateKey(new Date(s.at)))
  return {
    todayIndex,
    done: days.map((d) => keys.includes(d)),
    thisWeek: keys.filter((k) => k >= monday && k <= today).length,
    lastWeek: keys.filter((k) => k >= addDays(monday, -7) && k < monday).length,
  }
}
