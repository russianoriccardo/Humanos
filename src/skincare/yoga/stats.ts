import { addDays, dateKey, fromKey, normalizeKey } from '../../lib/dates'

// 60 → "1 min", 90 → "1:30", 45 → "45s"
export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m ? (s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`) : `${s}s`
}

function sessionDays(sessions: string[]) {
  return new Set(sessions.map(normalizeKey))
}

// Consecutive days with a session, ending today — or yesterday, so the streak survives until tonight.
export function yogaStreak(sessions: string[], today = dateKey()) {
  const days = sessionDays(sessions)
  let cursor = days.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

export type WeekDay = { key: string; label: string; done: boolean; isToday: boolean; future: boolean }

// Monday → Sunday of the current week.
export function thisWeek(sessions: string[], today = dateKey()): { days: WeekDay[]; count: number } {
  const days = sessionDays(sessions)
  const offset = (fromKey(today).getDay() + 6) % 7
  const monday = addDays(today, -offset)
  const week = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(monday, i)
    return {
      key,
      label: fromKey(key).toLocaleDateString('en-GB', { weekday: 'narrow' }),
      done: days.has(key),
      isToday: key === today,
      future: key > today,
    }
  })
  return { days: week, count: week.filter((d) => d.done).length }
}
