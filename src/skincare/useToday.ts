import type { AppState } from '../state/appState'
import { useWeather } from '../state/weather'
import { getHealth } from '../services/health.mock'
import { dateKey, parseClock } from '../lib/dates'
import { checkInMinutes } from '../sleep/plan'
import { latestScan } from './active'
import { buildToday } from './engine/buildToday'

// One place that turns state + weather + (mock) health into today's plan, so every screen agrees.
export function useToday(state: AppState) {
  const weather = useWeather()
  // Last night's Sleep check in wins over the demo scenario; with neither, sleep rules stay quiet.
  const checkIn = state.sleepActive?.checkIns[dateKey()]
  const mock = getHealth(state.demo.scenario)
  const health = checkIn ? { ...mock, sleepMinutes: checkInMinutes(checkIn) } : mock
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
