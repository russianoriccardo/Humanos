import { useEffect } from 'react'
import type { UiState } from '../state/appState'
import { useWeather } from '../state/weather'

// Reports today's max temperature up to App (which sits outside the weather context) for reminders.
// Null without a chosen location or fresh weather: no hot day adjustment then.
export function WeatherTemp({ locationChoice, onChange }: { locationChoice: UiState['locationChoice']; onChange: (t: number | null) => void }) {
  const weather = useWeather()
  const temp = locationChoice !== 'unset' && weather.status === 'ready' ? (weather.data?.tempMax ?? null) : null
  useEffect(() => onChange(temp), [temp, onChange])
  return null
}
