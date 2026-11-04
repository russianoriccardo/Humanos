// "This week": 7 days against the target, and the quiet stretch of the day.
import { addDays, daysBetween, formatClock } from '../lib/dates'
import type { HydrationActive } from '../state/appState'
import { dayTotal } from './day'

const QUIET_FROM = 9
const QUIET_TO = 20

export type WeekSummary = {
  days: { key: string; ml: number; hit: boolean }[]
  hit: number
  quiet: { from: string; to: string } | null
}

// Null until there's a real week: 7 days since day 1, or 7 days of Apple Health history.
export function weekSummary(active: HydrationActive, today: string): WeekSummary | null {
  const imported = Object.keys(active.imported).length
  if (daysBetween(active.startedAt, today) < 7 && imported < 7) return null

  const keys = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const days = keys.map((key) => {
    const logged = (active.logs[key] ?? []).length > 0
    const ml = logged ? dayTotal(active.logs, key) : (active.imported[key] ?? 0)
    return { key, ml, hit: ml >= active.targetMl }
  })
  return { days, hit: days.filter((d) => d.hit).length, quiet: quietStretch(active, keys) }
}

// The longest stretch of 3+ hours between 09:00 and 20:00 holding under 10% of the week's volume.
function quietStretch(active: HydrationActive, week: string[]) {
  const loggedDays = Object.values(active.logs).filter((l) => l.length > 0).length
  if (loggedDays < 7) return null
  const entries = week.flatMap((k) => active.logs[k] ?? [])
  const total = entries.reduce((s, l) => s + l.ml, 0)
  if (!total) return null
  const byHour = new Array(24).fill(0)
  for (const l of entries) byHour[new Date(l.at).getHours()] += l.ml

  let best: { from: number; to: number } | null = null
  for (let from = QUIET_FROM; from < QUIET_TO; from++) {
    let sum = 0
    for (let to = from + 1; to <= QUIET_TO; to++) {
      sum += byHour[to - 1]
      if (sum >= total * 0.1) break
      if (to - from >= 3 && (!best || to - from > best.to - best.from)) best = { from, to }
    }
  }
  return best ? { from: formatClock(best.from * 60), to: formatClock(best.to * 60) } : null
}
