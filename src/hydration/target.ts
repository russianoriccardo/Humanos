// The daily target: 30 ml per kg plus activity, rounded to a glass. Food covers the rest.
import type { Activity } from '../onboarding/types'

export const DEFAULT_TARGET = 2000
export const GLASS_ML = 250

const ACTIVITY_ML: Record<Activity, number> = { low: 0, moderate: 250, high: 500 }

export const STEP = {
  normal: { step: 250, min: 1000, max: 5000 },
  doctor: { step: 100, min: 500, max: 5000 },
}

// 2000 → "2 L", 1750 → "1.75 L", 650 → "0.65 L".
export const formatLitres = (ml: number) => `${parseFloat((ml / 1000).toFixed(2))} L`

export const glasses = (ml: number) => Math.round(ml / GLASS_ML)

// "about 8 glasses", "about 1 glass".
export function glassesLabel(ml: number) {
  const n = glasses(ml)
  return `about ${n} ${n === 1 ? 'glass' : 'glasses'}`
}

export type Recommendation = { ml: number; source: 'recommended' | 'default'; why: string }

export function recommendTarget(weight: string, activity: Activity | null): Recommendation {
  const kg = Number(weight.trim().replace(',', '.'))
  if (!weight.trim() || !Number.isFinite(kg) || kg < 30 || kg > 300) return { ml: DEFAULT_TARGET, source: 'default', why: '' }

  const base = kg * 30
  const extra = ACTIVITY_ML[activity ?? 'low']
  const ml = Math.min(3500, Math.max(1500, Math.round((base + extra) / GLASS_ML) * GLASS_ML))

  const level = activity ?? 'low'
  const raw = base + extra
  const why = [
    `${kg} kg × 30 ml is ${formatLitres(base)}`,
    extra ? `. A ${level} activity day adds ${extra} ml, so ${formatLitres(raw)}` : '',
    raw === ml ? '.' : `, rounded to ${formatLitres(ml)}.`,
    extra ? '' : ` A ${level} activity day adds nothing.`,
    ' Food covers the rest.',
  ].join('')
  return { ml, source: 'recommended', why }
}

// Gentle checks on a target the user set by hand. Never in doctor mode: that number is theirs.
export function softCheck(ml: number, doctor: boolean): 'low' | 'high' | null {
  if (doctor) return null
  if (ml < 1500) return 'low'
  if (ml > 4000) return 'high'
  return null
}
