// The hydration day (04:00 to 04:00), totals and pace. Pace runs from wake to 20:00.
import { addDays, dateKey, formatClock, parseClock } from '../lib/dates'
import type { DrinkLog } from '../state/appState'
import { formatLitres, GLASS_ML } from './target'

export const DAY_START_HOUR = 4
export const DEFAULT_WAKE = '07:30'
export const PACE_END = '20:00'

type Logs = Record<string, DrinkLog[]>

// Before 04:00 it's still yesterday.
export function hydrationDay(now = new Date()) {
  const key = dateKey(now)
  return now.getHours() < DAY_START_HOUR ? addDays(key, -1) : key
}

// Counted drinks only: alcohol is logged but never counts.
export const dayTotal = (logs: Logs, day: string) =>
  (logs[day] ?? []).filter((l) => l.counts).reduce((sum, l) => sum + l.ml, 0)

// Everything drunk in the last hour, whatever day it was logged under.
export function lastHourMl(logs: Logs, now = new Date()) {
  const from = now.getTime() - 60 * 60_000
  return Object.values(logs)
    .flat()
    .filter((l) => {
      const t = Date.parse(l.at)
      return t > from && t <= now.getTime()
    })
    .reduce((sum, l) => sum + l.ml, 0)
}

export const paceWindow = (wake = DEFAULT_WAKE) => ({ start: parseClock(wake), end: parseClock(PACE_END) })

const minutesOf = (now: Date) => now.getHours() * 60 + now.getMinutes()

// How much should be in by now: the target spread evenly from wake to 20:00.
export function expectedBy(now: Date, target: number, wake = DEFAULT_WAKE) {
  if (now.getHours() < DAY_START_HOUR) return target
  const { start, end } = paceWindow(wake)
  const m = minutesOf(now)
  if (m <= start) return 0
  if (m >= end || end <= start) return target
  return (target * (m - start)) / (end - start)
}

export type PaceStatus = 'start' | 'ahead' | 'on' | 'behind' | 'done' | 'limitLeft' | 'limitReached'

type PaceInput = { total: number; target: number; now: Date; wake?: string; doctor: boolean; isDay1: boolean }

export function paceStatus({ total, target, now, wake, doctor, isDay1 }: PaceInput): PaceStatus {
  // A doctor's limit is a ceiling: never "behind", never a push to drink more.
  if (doctor) return total >= target ? 'limitReached' : 'limitLeft'
  if (total >= target) return 'done'
  if (total === 0 && (isDay1 || (now.getHours() >= DAY_START_HOUR && now.getHours() < 10))) return 'start'
  const expected = expectedBy(now, target, wake)
  if (total < expected - GLASS_ML) return 'behind'
  if (total >= expected + GLASS_ML) return 'ahead'
  return 'on'
}

const COUNT_WORDS = ['One glass', 'Two glasses', 'Three glasses']
const CHECKPOINTS = ['14:00', '18:00', '20:00']

// The first checkpoint at least an hour away (20:00 when none is).
function nextCheckpoint(now: Date) {
  const m = minutesOf(now)
  return CHECKPOINTS.find((c) => parseClock(c) - m >= 60) ?? PACE_END
}

export function paceLine(status: PaceStatus, ctx: PaceInput): { a: string; b: string } {
  const { total, target, now, wake } = ctx
  switch (status) {
    case 'start':
      return ctx.isDay1
        ? { a: 'Day 1.', b: 'Your first glass starts it.' }
        : { a: 'Early in the day.', b: 'A glass with breakfast is a good start.' }
    case 'on':
      return { a: 'On pace.', b: 'Right where you should be.' }
    case 'ahead': {
      const n = Math.max(1, Math.round((total - expectedBy(now, target, wake)) / GLASS_ML))
      return { a: 'On pace.', b: `About ${n} ${n === 1 ? 'glass' : 'glasses'} ahead for ${formatClock(now.getHours() * 60)}.` }
    }
    case 'behind': {
      const checkpoint = nextCheckpoint(now)
      const at = new Date(now)
      at.setHours(Math.floor(parseClock(checkpoint) / 60), parseClock(checkpoint) % 60, 0, 0)
      const n = Math.min(3, Math.max(1, Math.ceil((expectedBy(at, target, wake) - total) / GLASS_ML)))
      return { a: 'Behind pace.', b: `${COUNT_WORDS[n - 1]} before ${checkpoint} and you're close.` }
    }
    case 'done':
      return { a: 'Done for today.', b: "Nothing more needed. Sip if you're thirsty." }
    case 'limitLeft':
      return { a: `${formatLitres(Math.max(0, target - total))} left today.`, b: 'We show where you are, never ask for more.' }
    case 'limitReached':
      return { a: "You've reached today's limit.", b: 'Keep logging anything else you drink so the count stays true.' }
  }
}
