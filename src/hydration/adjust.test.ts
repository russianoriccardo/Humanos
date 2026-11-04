import { describe, expect, it } from 'vitest'
import { adjustments, effectiveTarget } from './adjust'

const base = { tempMax: null, heat: 'on' as const, workoutMinutes: 0, healthConnected: false, doctor: false, notToday: false }

describe('adjustments', () => {
  it('adds for heat only when opted in and the temperature is known', () => {
    expect(adjustments({ ...base, tempMax: 28 }).heatMl).toBe(250)
    expect(adjustments({ ...base, tempMax: 33 }).items).toEqual([{ label: 'Hot day', sub: '33°C near you this afternoon', ml: 500 }])
    expect(adjustments({ ...base, tempMax: 26 }).heatMl).toBe(0)
    expect(adjustments({ ...base, tempMax: 33, heat: 'unasked' }).heatMl).toBe(0)
    expect(adjustments({ ...base, tempMax: null }).heatMl).toBe(0)
  })

  it('never adds a workout without Apple Health', () => {
    expect(adjustments({ ...base, workoutMinutes: 90 }).workoutMl).toBe(0)
    expect(adjustments({ ...base, workoutMinutes: 45, healthConnected: true }).workoutMl).toBe(250)
    expect(adjustments({ ...base, workoutMinutes: 300, healthConnected: true }).workoutMl).toBe(750)
  })

  it('caps the day at 4 L, and leaves a doctor limit alone', () => {
    const hot = adjustments({ ...base, tempMax: 33, workoutMinutes: 90, healthConnected: true })
    expect(effectiveTarget(3500, hot)).toBe(4000)
    expect(effectiveTarget(2000, hot)).toBe(3250)
    const doctor = adjustments({ ...base, tempMax: 33, workoutMinutes: 90, healthConnected: true, doctor: true })
    expect(effectiveTarget(1200, doctor)).toBe(1200)
    expect(adjustments({ ...base, tempMax: 33, notToday: true }).items).toEqual([])
  })
})
