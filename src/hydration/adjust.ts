// Today's adjustments to the target: a hot afternoon and a workout. Never in doctor mode.
export const MAX_ADJUSTED = 4000

export type AdjustmentItem = { label: string; sub: string; ml: number }
export type Adjustments = { heatMl: number; workoutMl: number; items: AdjustmentItem[] }

type AdjustInput = {
  // Today's max temperature in °C; null or undefined when there's no usable weather.
  tempMax: number | null | undefined
  heat: 'unasked' | 'on' | 'off'
  workoutMinutes: number
  // Workouts come only from Apple Health (or later Fitness). No Health, no workout adjustment.
  healthConnected: boolean
  doctor: boolean
  notToday: boolean
}

const NONE: Adjustments = { heatMl: 0, workoutMl: 0, items: [] }

export function adjustments({ tempMax, heat, workoutMinutes, healthConnected, doctor, notToday }: AdjustInput): Adjustments {
  if (doctor || notToday) return NONE
  // The daily max, not "feels like": fine for the MVP.
  const t = typeof tempMax === 'number' ? Math.round(tempMax) : null
  const heatMl = heat === 'on' && t !== null ? (t >= 32 ? 500 : t >= 27 ? 250 : 0) : 0
  const workoutMl = healthConnected ? Math.min(750, Math.floor(workoutMinutes / 30) * 250) : 0
  const items: AdjustmentItem[] = []
  if (heatMl) items.push({ label: 'Hot day', sub: `${t}°C near you this afternoon`, ml: heatMl })
  if (workoutMl) items.push({ label: `Workout · ${workoutMinutes} min`, sub: 'From Apple Health', ml: workoutMl })
  return { heatMl, workoutMl, items }
}

// Adjusted target, capped at 4 L (a higher base target the user chose stays as it is).
export function effectiveTarget(base: number, adj: Adjustments) {
  const extra = adj.heatMl + adj.workoutMl
  return extra ? Math.max(base, Math.min(MAX_ADJUSTED, base + extra)) : base
}
