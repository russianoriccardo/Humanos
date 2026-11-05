// Demo data. A web app can't read Apple Health, so the "connected" outcome imports this instead:
// 26 of the last 28 days, averaging 1.4 L. Plus "Simulate 12 days of water" for investor demos.
import { addDays, fromKey, parseClock } from '../lib/dates'
import type { Drink, DrinkLog, HydrationActive } from '../state/appState'
import { hydrationDay } from './day'
import { BUILT_IN, QUICK_LOG_MAX } from './drinks'
import { guideDrink } from './forYou'
import { cardById } from './guide.content'

export const HEALTH_AVG_ML = 1400
const MISSING = [9, 20]
// Days ago 1..28 minus the two missing ones; deltas from the average sum to zero.
const DELTAS = [-200, 200, -50, 50, 100, -100, 0, 0, -150, 150, 250, -250, -300, 300, 75, -75, 125, -125, 25, -25, 0, 0, -175, 175, 50, -50]

export function importedHealth(today: string): Record<string, number> {
  const out: Record<string, number> = {}
  let i = 0
  for (let ago = 1; ago <= 28; ago++) {
    if (MISSING.includes(ago)) continue
    out[addDays(today, -ago)] = HEALTH_AVG_ML + DELTAS[i++]
  }
  return out
}

export const DEMO_DAYS = 12
// The 4th most recent day has no logs.
const SKIPPED = 3
// Days ago that hit the target: 4 of the last 7 (today is still in progress), a mix before that.
const HITS = new Set([1, 2, 4, 6, 7, 9])
export const DEMO_SAVED = ['focus-greentea', 'meal-ginger', 'myth-coffee']

const builtin = (id: string) => BUILT_IN.find((d) => d.id === id)!

// Today as in the Figma "day 12" screens.
const TODAY: [string, string, number][] = [
  ['07:50', 'water', 250],
  ['08:30', 'coffee', 150],
  ['10:40', 'water', 250],
  ['12:30', 'sparkling', 330],
  ['12:55', 'tea', 250],
]
// Morning slots fill up first; 13:20 and 18:20 frame a quiet afternoon (14:00 to 18:00).
const MORNING: [string, string, number][] = [
  ['07:50', 'water', 250],
  ['08:30', 'coffee', 150],
  ['09:45', 'water', 250],
  ['10:40', 'water', 250],
  ['11:30', 'tea', 250],
  ['12:30', 'sparkling', 330],
  ['12:50', 'water', 250],
  ['07:20', 'water', 250],
  ['09:10', 'tea', 250],
]
const FRAME: [string, string, number][] = [
  ['13:20', 'water', 250],
  ['18:20', 'water', 250],
]

function entry(day: string, [time, drinkId, ml]: [string, string, number]): DrinkLog {
  const at = fromKey(day)
  at.setHours(Math.floor(parseClock(time) / 60), parseClock(time) % 60, 0, 0)
  const drink = builtin(drinkId)
  return { id: `demo-${day}-${time}`, at: at.toISOString(), drinkId, name: drink.name, ml, counts: true }
}

// A day adding up to about `total` ml (1.1 to 2.4 L), most of it before 13:00.
function dayOf(day: string, total: number): DrinkLog[] {
  const out = FRAME.map((e) => entry(day, e))
  let left = total - 500
  for (const [time, id, ml] of MORNING) {
    if (left <= 0) break
    const amount = Math.min(ml, Math.round(left / 50) * 50)
    if (amount > 0) out.push(entry(day, [time, id, amount]))
    left -= amount
  }
  return out
}

export function simulateHydration(active: HydrationActive, now = new Date()): HydrationActive {
  const today = hydrationDay(now)
  const target = active.targetMl
  const logs: Record<string, DrinkLog[]> = {}
  for (let ago = 1; ago < DEMO_DAYS; ago++) {
    if (ago === SKIPPED) continue
    const day = addDays(today, -ago)
    const total = HITS.has(ago) ? Math.min(2400, target + 150) : Math.max(1100, Math.min(2400, target - 450))
    logs[day] = dayOf(day, total)
  }
  logs[today] = TODAY.map((e) => entry(today, e)).filter((l) => Date.parse(l.at) <= now.getTime())

  // Ginger tea from the Guide joins the quick log.
  const ginger = guideDrink(cardById('meal-ginger')!)!
  const drinks: Drink[] = active.drinks.some((d) => d.id === ginger.id)
    ? active.drinks
    : active.drinks.length < QUICK_LOG_MAX
      ? [...active.drinks, ginger]
      : [...active.drinks.slice(0, QUICK_LOG_MAX - 1), ginger]

  return {
    ...active,
    startedAt: addDays(today, -(DEMO_DAYS - 1)),
    heat: 'on',
    logs,
    drinks,
    fired: [],
    pausedUntil: undefined,
  }
}
