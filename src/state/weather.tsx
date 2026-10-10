import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { cityPlace, getPosition, isFresh, loadWeather, readCache, type Place, type WeatherData } from '../services/weather'
import type { UiState } from './appState'

export type WeatherStatus = 'needs-choice' | 'locating' | 'loading' | 'ready' | 'stale' | 'unavailable'

type WeatherContextValue = {
  status: WeatherStatus
  data: WeatherData | null
  place: Place | null
  useMyLocation: () => void
  useCity: (name: string) => void
  retry: () => void
}

const WeatherContext = createContext<WeatherContextValue | null>(null)

type ProviderProps = {
  choice: UiState['locationChoice']
  city: string
  onChoice: (choice: UiState['locationChoice'], city?: string) => void
  onLog: (date: string, uvMax: number, rhMin: number) => void
  children: ReactNode
}

export function WeatherProvider({ choice, city, onChoice, onLog, children }: ProviderProps) {
  const [status, setStatus] = useState<WeatherStatus>(choice === 'unset' ? 'needs-choice' : 'loading')
  const [data, setData] = useState<WeatherData | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [attempt, setAttempt] = useState(0)
  const onLogRef = useRef(onLog)
  const onChoiceRef = useRef(onChoice)
  onLogRef.current = onLog
  onChoiceRef.current = onChoice

  useEffect(() => {
    if (choice === 'unset') {
      setStatus('needs-choice')
      setData(null)
      setPlace(null)
      return
    }

    const controller = new AbortController()
    let cancelled = false

    const load = async (target: Place) => {
      setPlace(target)
      const cached = readCache(target)
      setData(cached)
      setStatus(cached && isFresh(cached) ? 'ready' : 'loading')
      try {
        const fresh = await loadWeather(target, controller.signal)
        if (cancelled) return
        setData(fresh)
        setStatus('ready')
        onLogRef.current(fresh.date, fresh.uvMax, Math.min(...fresh.hourly.map((h) => h.humidity), fresh.current.humidity))
      } catch {
        if (cancelled) return
        setStatus(cached ? 'stale' : 'unavailable')
      }
    }

    if (choice === 'city') {
      load(cityPlace(city))
    } else {
      setStatus('locating')
      getPosition()
        .then((pos) => {
          if (!cancelled) load({ label: 'your location', source: 'gps', ...pos })
        })
        .catch((error: GeolocationPositionError | Error) => {
          if (cancelled) return
          // Denied: remember it and fall back. Timeout / unavailable: fall back for this load only.
          if ('code' in error && error.code === error.PERMISSION_DENIED) onChoiceRef.current('city')
          else load(cityPlace(city))
        })
    }

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [choice, city, attempt])

  // Coming back to the app after the cache window: refresh quietly.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && data && !isFresh(data)) setAttempt((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [data])

  const useMyLocation = useCallback(() => {
    if (choice === 'gps') setAttempt((n) => n + 1)
    else onChoiceRef.current('gps')
  }, [choice])

  const useCity = useCallback((name: string) => onChoiceRef.current('city', name), [])
  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return (
    <WeatherContext.Provider value={{ status, data, place, useMyLocation, useCity, retry }}>{children}</WeatherContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWeather() {
  const value = useContext(WeatherContext)
  if (!value) throw new Error('useWeather must be used inside <WeatherProvider>')
  return value
}
