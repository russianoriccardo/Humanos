import type { AppState } from '../state/appState'
import { useWeather } from '../state/weather'
import { getHealth } from '../services/health.mock'
import { parseClock } from '../lib/dates'
import { latestScan } from './active'
import { buildToday } from './engine/buildToday'

// One place that turns state + weather + (mock) health into today's plan, so every screen agrees.
export function useToday(state: AppState) {
  const weather = useWeather()
  const health = getHealth(state.demo.scenario)
  const active = state.skincareActive
  const usableWeather = weather.status === 'ready' || weather.status === 'stale' ? weather.data : null

  const plan = active
    ? buildToday({
        weather: usableWeather,
        health,
        routine: active.routine,
        reading: latestScan(active).reading,
        goal: state.skincare.goal,
        now: new Date(),
        outdoorWindow: {
          start: parseClock(state.demo.outdoorWindow.start),
          end: parseClock(state.demo.outdoorWindow.end),
        },
      })
    : null

  return { plan, weather, usableWeather, health }
}
