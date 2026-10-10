export type City = { name: string; lat: number; lon: number }

export const CITIES: City[] = [
  { name: 'Milan', lat: 45.4642, lon: 9.19 },
  { name: 'Rome', lat: 41.9028, lon: 12.4964 },
  { name: 'London', lat: 51.5072, lon: -0.1276 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  { name: 'Berlin', lat: 52.52, lon: 13.405 },
  { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
  { name: 'New York', lat: 40.7128, lon: -74.006 },
]

export const config = {
  // Used when location is denied or not yet granted.
  fallbackCity: CITIES[0],
  weatherCacheMinutes: 30,
  // Product alternatives / sponsored picks. Off until partnerships exist; see Verdict.alternatives.
  partnerships: false,
  // Where the Netlify Function lives. Empty = same origin (Netlify). Set VITE_API_BASE to call it from
  // another host (e.g. the GitHub Pages build); that origin must also be in the function's ALLOWED_ORIGINS.
  apiBase: (import.meta.env.VITE_API_BASE as string | undefined) ?? '',
} as const
