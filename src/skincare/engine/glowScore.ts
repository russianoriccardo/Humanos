/*
 * Glow score: a motivational number, not a measurement of skin.
 *
 *   score = baseline (64)
 *         + 1   per routine night logged since the routine started   (max +12)
 *         + 0.5 per day SPF was logged on a sunny day (UV peak ≥ 3)  (max +4)
 *         + 0.5 per face-yoga session                                (max +4)
 *
 * A night counts when at most one of that evening's planned steps was left out (barrier nights
 * still count). Rounded, clamped to 0–100. Thresholds live in rules.config.ts.
 */
import type { SkincareActive } from '../../state/appState'
import { fromKey, keysBetween } from '../../lib/dates'
import { eveningSteps } from '../routine'
import { rules } from './rules.config'
import type { HealthSnapshot, WeatherSnapshot } from './types'

const G = rules.glow

export type GlowInputs = {
  active: SkincareActive
  weatherLog: Record<string, { uvMax: number; rhMin: number }>
  today: string
}

export function nightComplete(active: SkincareActive, day: string) {
  const planned = eveningSteps(active.routine, fromKey(day).getDay()).length
  const logged = active.routineLog[day]?.length ?? 0
  return planned > 0 && logged >= Math.max(1, planned - G.nightTolerance)
}

export function glowBreakdown({ active, weatherLog, today }: GlowInputs) {
  const days = keysBetween(active.startedAt, today)
  const nights = days.filter((day) => nightComplete(active, day)).length
  const sunnyDays = days.filter((day) => (weatherLog[day]?.uvMax ?? 0) >= G.sunnyUvMin)
  const spfSunny = sunnyDays.filter((day) => active.spfLog[day]).length
  const yoga = active.yoga.sessions.filter((iso) => iso.slice(0, 10) >= active.startedAt).length

  const delta =
    Math.min(nights * G.perRoutineNight, G.routineNightsCap) +
    Math.min(spfSunny * G.perSpfSunnyDay, G.spfCap) +
    Math.min(yoga * G.perYogaSession, G.yogaCap)
  const score = Math.max(0, Math.min(100, Math.round(G.baseline + delta)))
  return { score, delta: score - G.baseline, nights, nightsPossible: days.length, sunnyDays: sunnyDays.length, spfSunny, yoga }
}

export function glowReason(delta: number, weather: WeatherSnapshot | null, health: HealthSnapshot) {
  if (delta <= 0) return "Same as your baseline. Log tonight's routine to move it."
  const lead = `+${delta} since your baseline.`
  if (weather && weather.current.humidity < rules.today.dryHumidityBelow) return `${lead} Holding up despite the dry air.`
  if (weather && weather.uvMax >= rules.today.uvReapplyMin) return `${lead} Keep the SPF going — UV is high today.`
  if (health.sleepMinutes < rules.today.barrierSleepMinutes) return `${lead} Holding steady after a short night.`
  return `${lead} Consistency is doing the work.`
}
