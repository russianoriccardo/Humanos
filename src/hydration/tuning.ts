// Suggestions to send fewer reminders. Always asked, never applied silently.
import { addDays, daysBetween, fromKey, parseClock } from '../lib/dates'
import type { HydrationActive } from '../state/appState'
import { expectedBy } from './day'
import { GLASS_ML } from './target'

const DROP_DAYS = 5

const atOn = (day: string, time: string) => {
  const d = fromKey(day)
  d.setHours(Math.floor(parseClock(time) / 60), parseClock(time) % 60, 0, 0)
  return d
}

// A slot the user reached on pace on each of the last 5 days (all logged), not asked about before.
export function dropCandidate(active: HydrationActive, today: string, wake: string): string | null {
  if (active.doctorLimit) return null
  const days = Array.from({ length: DROP_DAYS }, (_, i) => addDays(today, -(i + 1)))
  if (days.some((d) => !(active.logs[d] ?? []).length)) return null
  for (const slot of active.slots.filter((s) => s.on)) {
    if (active.asked.drop.includes(slot.time)) continue
    const onPace = days.every((d) => {
      const at = atOn(d, slot.time)
      const by = (active.logs[d] ?? []).filter((l) => l.counts && Date.parse(l.at) <= at.getTime()).reduce((s, l) => s + l.ml, 0)
      return by >= expectedBy(at, active.targetMl, wake) - GLASS_ML
    })
    if (onPace) return slot.time
  }
  return null
}

// Latest run of fired nudges with nothing logged in the hour after each.
export function ignoredStreak(active: HydrationActive) {
  const logTimes = Object.values(active.logs)
    .flat()
    .map((l) => Date.parse(l.at))
  const nudges = active.fired.filter((f) => f.id.includes(':nudge:')).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  let streak = 0
  for (const n of nudges) {
    const t = Date.parse(n.at)
    if (logTimes.some((l) => l > t && l <= t + 60 * 60_000)) break
    streak++
  }
  return streak
}

export function offerFewer(active: HydrationActive, today: string) {
  const recentlyAsked = active.asked.fewerAt && daysBetween(active.asked.fewerAt.slice(0, 10), today) < 7
  return ignoredStreak(active) >= 3 && !recentlyAsked
}

// 3+ days off (not counting today) after at least 3 days in: welcome back, once per gap.
// `key` is the first day of the gap, stored in asked.welcomeBackFor when shown.
export function welcomeBack(active: HydrationActive, today: string): { days: number; key: string } | null {
  if (daysBetween(active.startedAt, today) < 3) return null
  let days = 0
  for (let d = addDays(today, -1); d >= active.startedAt && !(active.logs[d] ?? []).length; d = addDays(d, -1)) days++
  if (days < 3) return null
  const key = addDays(today, -days)
  return active.asked.welcomeBackFor === key ? null : { days, key }
}
