import { describe, expect, it } from 'vitest'
import { ageLabel, isFresh, parseForecast, type Place } from './weather'

const milan: Place = { label: 'Milan', source: 'city', lat: 45.46, lon: 9.19 }

// Trimmed real Open-Meteo response (Milan, 2026-10-10).
const response = {
  current: { relative_humidity_2m: 73, temperature_2m: 19.8, uv_index: 1.55 },
  hourly: {
    time: Array.from({ length: 24 }, (_, h) => `2026-10-10T${String(h).padStart(2, '0')}:00`),
    uv_index: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.4, 1.15, 2.05, 2.6, 2.0, 1.6, 1.65, 2.1, 1.45, 0.7, 0.1, 0, 0, 0, 0],
    relative_humidity_2m: [95, 96, 96, 99, 100, 100, 100, 100, 100, 100, 100, 85, 82, 78, 76, 79, 74, 73, 75, 80, 87, 89, 90, 91],
  },
}

describe('parseForecast', () => {
  it('extracts current values, local hours and the UV peak', () => {
    const data = parseForecast(response, milan, new Date(2026, 9, 10, 16, 30))
    expect(data.date).toBe('2026-10-10')
    expect(data.current).toEqual({ humidity: 73, temperature: 20, uv: 1.6 })
    expect(data.hourly).toHaveLength(24)
    expect(data.hourly[12]).toEqual({ hour: 12, uv: 2.6, humidity: 82 })
    expect(data.uvMax).toBe(2.6)
  })

  it("uses the location's date, not the device's (fallback city from another time zone)", () => {
    // Device clock is already the 11th, but the forecast is Milan's 10th.
    const data = parseForecast(response, milan, new Date(2026, 9, 11, 1, 0))
    expect(data.date).toBe('2026-10-10')
    expect(data.hourly).toHaveLength(24)
  })

  it('throws on an incomplete response instead of returning garbage', () => {
    expect(() => parseForecast({ hourly: response.hourly }, milan)).toThrow()
    expect(() => parseForecast({ current: response.current }, milan)).toThrow()
  })
})

describe('cache helpers', () => {
  const at = new Date(2026, 9, 10, 12, 0).getTime()
  const data = parseForecast(response, milan, new Date(at))

  it('is fresh for 30 minutes on the same day', () => {
    expect(isFresh(data, at + 29 * 60_000)).toBe(true)
    expect(isFresh(data, at + 31 * 60_000)).toBe(false)
  })

  it('labels age', () => {
    expect(ageLabel(at, at + 30_000)).toBe('Updated just now')
    expect(ageLabel(at, at + 2 * 3_600_000)).toBe('Updated 2h ago')
  })
})
