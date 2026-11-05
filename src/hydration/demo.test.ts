import { describe, expect, it } from 'vitest'
import { initialHydration } from '../state/appState'
import { createHydrationActive } from './mirror'
import { simulateHydration } from './demo'
import { dayTotal } from './day'
import { weekSummary } from './week'

describe('simulateHydration', () => {
  const now = new Date(2026, 10, 5, 13, 0)
  const fresh = createHydrationActive({ ...initialHydration, targetMl: 2000, drinks: ['water', 'coffee'] }, true, now)
  const demo = simulateHydration(fresh, now)

  it('builds the investor state from a fresh account', () => {
    expect(demo.startedAt).toBe('2026-10-25')
    expect(demo.heat).toBe('on')
    expect(Object.keys(demo.logs)).toHaveLength(11)
    expect(demo.logs['2026-11-02']).toBeUndefined()
    expect(demo.drinks.map((d) => d.id)).toContain('guide:meal-ginger')
  })

  it("logs today's Figma entries up to now", () => {
    expect(demo.logs['2026-11-05'].map((l) => l.ml)).toEqual([250, 150, 250, 330, 250])
    expect(dayTotal(demo.logs, '2026-11-05')).toBe(1230)
    const early = simulateHydration(fresh, new Date(2026, 10, 5, 9, 0))
    expect(early.logs['2026-11-05']).toHaveLength(2)
  })

  it('shows 4 of 7 and the afternoon quiet stretch', () => {
    const week = weekSummary(demo, '2026-11-05')
    expect(week?.hit).toBe(4)
    expect(week?.quiet).toEqual({ from: '14:00', to: '18:00' })
    const totals = Object.keys(demo.logs).map((d) => dayTotal(demo.logs, d))
    expect(Math.min(...totals.filter((t) => t > 1230))).toBeGreaterThanOrEqual(1100)
    expect(Math.max(...totals)).toBeLessThanOrEqual(2400)
  })
})
