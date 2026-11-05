// One place that turns state + weather into today's water: the dashboard card and the Today tab agree.
import { useEffect, useState } from 'react'
import type { AppState } from '../state/appState'
import { useWeather } from '../state/weather'
import { hydrationToday } from './today'

export type { HydrationToday } from './today'

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
  // Heat needs a chosen location and fresh weather; stale or missing weather just means no adjustment.
  const realTemp = state.ui.locationChoice !== 'unset' && weather.status === 'ready' ? (weather.data?.tempMax ?? null) : null
  return hydrationToday(state, now, realTemp)
}
