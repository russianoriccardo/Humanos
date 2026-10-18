// Patterns in the user's own nights. Pure functions over check ins and sessions.
import { formatClock, parseClock } from '../lib/dates'
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
