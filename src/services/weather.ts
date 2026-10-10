// Real weather from Open-Meteo (no API key). Cached in localStorage for config.weatherCacheMinutes.
import { CITIES, config } from '../config'
import { dateKey } from '../lib/dates'
import type { WeatherSnapshot } from '../skincare/engine/types'

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'
const CACHE_KEY = 'humanos.weather'

export type Place = { label: string; source: 'gps' | 'city'; lat: number; lon: number }

export type WeatherData = WeatherSnapshot & { date: string; fetchedAt: number; place: Place }

export function cityPlace(name: string): Place {
  const city = CITIES.find((c) => c.name === name) ?? config.fallbackCity
  return { label: city.name, source: 'city', lat: city.lat, lon: city.lon }
}

type OpenMeteoResponse = {
  current?: { relative_humidity_2m?: number; temperature_2m?: number; uv_index?: number }
  hourly?: { time?: string[]; uv_index?: (number | null)[]; relative_humidity_2m?: (number | null)[] }
}

const round1 = (n: number) => Math.round(n * 10) / 10

// forecast_days=1 + timezone=auto returns exactly "today" in the location's own time zone,
// which may differ from the device's (e.g. the Milan fallback used from New York).
export function parseForecast(json: OpenMeteoResponse, place: Place, now = new Date()): WeatherData {
  const times = json.hourly?.time ?? []
  const hourly = times.map((time, i) => ({
    hour: Number(time.slice(11, 13)),
    uv: round1(json.hourly?.uv_index?.[i] ?? 0),
    humidity: Math.round(json.hourly?.relative_humidity_2m?.[i] ?? 0),
  }))

  const current = json.current ?? {}
  if (current.relative_humidity_2m === undefined || hourly.length === 0) throw new Error('Incomplete forecast')

  return {
    date: times[0]?.slice(0, 10) ?? dateKey(now),
    fetchedAt: now.getTime(),
    place,
    current: {
      humidity: Math.round(current.relative_humidity_2m),
      temperature: Math.round(current.temperature_2m ?? 0),
      uv: round1(current.uv_index ?? 0),
    },
    hourly,
    uvMax: round1(Math.max(...hourly.map((h) => h.uv))),
  }
}

function cacheId(place: Place) {
  return `${place.lat.toFixed(2)},${place.lon.toFixed(2)}`
}

type CacheEntry = { id: string; data: WeatherData }

export function readCache(place: Place): WeatherData | null {
  try {
    const entry = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as CacheEntry | null
    return entry && entry.id === cacheId(place) ? entry.data : null
  } catch {
    return null
  }
}

function writeCache(data: WeatherData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ id: cacheId(data.place), data }))
  } catch {
    // Storage full or blocked: the next load just refetches.
  }
}

export function isFresh(data: WeatherData, now = Date.now()) {
  const sameDay = dateKey(new Date(data.fetchedAt)) === dateKey(new Date(now))
  return sameDay && now - data.fetchedAt < config.weatherCacheMinutes * 60_000
}

// Fresh cache wins; otherwise fetch. Throws on network failure (the caller decides about stale data).
export async function loadWeather(place: Place, signal?: AbortSignal): Promise<WeatherData> {
  const cached = readCache(place)
  if (cached && isFresh(cached)) return cached

  const params = new URLSearchParams({
    latitude: String(place.lat),
    longitude: String(place.lon),
    current: 'relative_humidity_2m,temperature_2m,uv_index',
    hourly: 'uv_index,relative_humidity_2m',
    forecast_days: '1',
    timezone: 'auto',
  })
  const response = await fetch(`${ENDPOINT}?${params}`, { signal })
  if (!response.ok) throw new Error(`Weather ${response.status}`)
  const data = parseForecast((await response.json()) as OpenMeteoResponse, place)
  writeCache(data)
  return data
}

export function getPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unsupported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (error) => reject(error),
      // Coarse is enough for weather, and faster / kinder on battery.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 30 * 60_000 },
    )
  })
}

export function ageLabel(fetchedAt: number, now = Date.now()) {
  const minutes = Math.round((now - fetchedAt) / 60_000)
  if (minutes < 2) return 'Updated just now'
  if (minutes < 60) return `Updated ${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `Updated ${hours}h ago` : 'Updated over a day ago'
}
