// "Simulate 18 nights of sleep" (Demo panel): the investor state behind the "night 18" screens.
// Deterministic, so every demo shows the same story on top of the user's own plan.
import { addDays, dateKey } from '../lib/dates'
import type { SleepActive, SleepCheckIn } from '../state/appState'
import { nightKeyFor, shiftClock } from './plan'

export const DEMO_NIGHTS = 18
// The 6th most recent morning has no check in: missing a morning breaks nothing.
const SKIPPED = 5

// Indexed by mornings ago (0 = this morning). Minutes asleep, 6h 20m to 7h 48m: the last week runs
// longer than the one before, coffee and screen nights run short, nights after a session run long.
const SLEEP = [432, 415, 412, 418, 410, 0, 405, 440, 388, 400, 385, 420, 380, 405, 455, 385, 468, 450]
const WAKE = [0, 5, -5, 0, 10, 0, -5, 0, 5, -10, 0, 5, 0, -5, 10, 0, 5, 0]
const TAGS: Record<number, string[]> = {
  0: ['Screens in bed'],
  1: ['Late coffee'],
  2: ['Screens in bed'],
  3: ['Late coffee'],
  4: ['Screens in bed'],
  6: ['Late coffee', 'Screens in bed'],
  8: ['Late coffee'],
  10: ['Woke up at night', 'Stressed'],
  12: ['Alcohol', 'Late meal'],
  15: ['Screens in bed'],
}

// Sessions before this week, by nights ago. Some nights have two, some none.
const OLDER_SESSIONS: [number, string][] = [
  [7, 'bodyScan'],
  [7, 'breath478'],
  [8, 'bodyScan'],
  [8, 'box'],
  [9, 'bodyScan'],
  [10, 'bodyScan'],
  [10, 'breath478'],
  [12, 'bodyScan'],
  [12, 'box'],
  [14, 'bodyScan'],
  [14, 'legsUp'],
  [15, 'bodyScan'],
  [15, 'box'],
  [17, 'bodyScan'],
  [17, 'breath478'],
]

function eveningOf(day: string, now: Date) {
  const at = new Date(`${day}T21:30:00`)
  // A session "tonight" that hasn't happened yet is placed just before now instead.
  return at.getTime() > now.getTime() ? new Date(now.getTime() - 30 * 60_000) : at
}

export function simulateSleep(active: SleepActive, now = new Date()): SleepActive {
  const today = dateKey(now)

  const checkIns: Record<string, SleepCheckIn> = {}
  for (let ago = 0; ago < DEMO_NIGHTS; ago++) {
    if (ago === SKIPPED) continue
    const morning = addDays(today, -ago)
    const tags = TAGS[ago] ?? []
    const minutes = SLEEP[ago]
    const wake = shiftClock(active.wake, WAKE[ago])
    // Longer nights (earlier lights out, the wake time barely moves) feel better.
    const rested: SleepCheckIn['rested'] = tags.includes('Woke up at night') ? 2 : minutes >= 440 ? 5 : minutes >= 420 ? 4 : minutes >= 400 ? 3 : 2
    checkIns[morning] = { lightsOut: shiftClock(wake, -minutes), wake, rested, tags, source: 'checkin' }
  }

  // Two sessions this week (Monday onward), the rest before it.
  const todayIndex = (now.getDay() + 6) % 7
  const thisWeek = [addDays(today, -Math.min(2, todayIndex)), today]
  const sessions = [
    ...OLDER_SESSIONS.map(([ago, id]) => ({ id, at: eveningOf(addDays(today, -ago), now).toISOString() })),
    { id: 'bodyScan', at: eveningOf(thisWeek[0], now).toISOString() },
    { id: 'legsUp', at: eveningOf(thisWeek[1], now).toISOString() },
  ]

  return {
    ...active,
    startedAt: addDays(today, -(DEMO_NIGHTS - 1)),
    checkIns,
    sessions,
    windDown: { [nightKeyFor(now)]: ['dim'] },
  }
}
