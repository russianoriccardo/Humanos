// One place that turns state + weather into today's water: the dashboard card and the Today tab agree.
import { useEffect, useState } from 'react'
import type { AppState } from '../state/appState'
import { useWeather } from '../state/weather'
import { adjustments, effectiveTarget } from './adjust'
import { dayTotal, DEFAULT_WAKE, expectedBy, hydrationDay, paceLine, paceStatus } from './day'
import { nextSlot, quietAfter } from './nudges'

// Re-render once a minute so pace and "next at" follow the clock.
function useMinute() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

export function useHydrationToday(state: AppState) {
  const weather = useWeather()
  const now = useMinute()
  const active = state.hydrationActive
  if (!active) return null

  const day = hydrationDay(now)
  const logs = [...(active.logs[day] ?? [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  const total = dayTotal(active.logs, day)
  // Heat needs a chosen location and fresh weather; stale or missing weather just means no adjustment.
  const realTemp = state.ui.locationChoice !== 'unset' && weather.status === 'ready' ? (weather.data?.tempMax ?? null) : null
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

export type HydrationToday = NonNullable<ReturnType<typeof useHydrationToday>>
