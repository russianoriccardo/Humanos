// Today's water from state: the pure core of useHydrationToday, also used when a reminder fires.
import type { AppState } from '../state/appState'
import { adjustments, effectiveTarget } from './adjust'
import { dayTotal, DEFAULT_WAKE, expectedBy, hydrationDay, paceLine, paceStatus } from './day'
import { nextSlot, quietAfter } from './nudges'

// realTemp: today's max from fresh weather near the user, or null (no location, stale or no weather).
export function hydrationToday(state: AppState, now: Date, realTemp: number | null) {
  const active = state.hydrationActive
  if (!active) return null

  const day = hydrationDay(now)
  const logs = [...(active.logs[day] ?? [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  const total = dayTotal(active.logs, day)
  const tempMax = state.demo.heatOverride ?? realTemp
  const adj = adjustments({
    tempMax,
    heat: active.heat,
    workoutMinutes: state.demo.workoutMinutes,
    healthConnected: state.hydration.health === 'connected',
    doctor: active.doctorLimit,
    notToday: active.notToday.includes(day),
  })
  const target = effectiveTarget(active.targetMl, adj)
  const wake = state.sleepActive?.wake ?? DEFAULT_WAKE
  // Logs from before day 1 (set up after the last slot) still count as day 1.
  const isDay1 = day <= active.startedAt
  const paceInput = { total, target, now, wake, doctor: active.doctorLimit, isDay1 }
  const pace = paceStatus(paceInput)
  const quiet = quietAfter(state.sleepActive, day)
  const next = nextSlot(
    active.slots.filter((s) => s.time <= quiet || active.doctorLimit),
    now,
  )

  return {
    active,
    now,
    day,
    logs,
    total,
    adj,
    base: active.targetMl,
    target,
    tempMax,
    wake,
    isDay1,
    pace,
    line: paceLine(pace, paceInput),
    expected: expectedBy(now, target, wake),
    quiet,
    next,
  }
}

export type HydrationToday = NonNullable<ReturnType<typeof hydrationToday>>
