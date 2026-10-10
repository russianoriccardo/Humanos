import type { SkinReading, SkincareActive } from '../state/appState'
import { keysBetween } from '../lib/dates'
import { latestScan } from './active'
import { nightComplete } from './engine/glowScore'
import { rules } from './engine/rules.config'
import { todaysSession } from './yoga/faceYoga.content'

// What the user controls between scans, counted since the current cycle started.
export function betweenScans(
  active: SkincareActive,
  weatherLog: Record<string, { uvMax: number; rhMin: number }>,
  today: string,
) {
  const days = keysBetween(latestScan(active).date, today)
  const sunny = days.filter((day) => (weatherLog[day]?.uvMax ?? 0) >= rules.glow.sunnyUvMin)
  const cycleStart = latestScan(active).date
  return {
    nights: { done: days.filter((day) => nightComplete(active, day)).length, of: days.length },
    spf: { done: sunny.filter((day) => active.spfLog[day]).length, of: sunny.length },
    yoga: {
      done: active.yoga.sessions.filter((iso) => iso.slice(0, 10) >= cycleStart).length,
      // Five a week over a 14-day cycle.
      of: todaysSession.weeklyGoal * 2,
    },
  }
}

// Notes that describe a good state rather than something to fix.
const POSITIVE_NOTES = new Set(['even tone', 'well balanced'])

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// "Mild dryness → None detected" style changes between two readings.
export function compareReadings(before: SkinReading, after: SkinReading): string[] {
  const changes: string[] = []
  if (before.type !== after.type) changes.push(`${before.type} → ${after.type}`)
  const issues = (r: SkinReading) => r.notes.filter((n) => !POSITIVE_NOTES.has(n))
  const a = issues(before)
  const b = issues(after)
  for (const note of a) if (!b.includes(note)) changes.push(`${cap(note)} → None detected`)
  for (const note of b) if (!a.includes(note)) changes.push(`None → ${cap(note)}`)
  return changes
}
