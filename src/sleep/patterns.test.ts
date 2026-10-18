import { describe, expect, it } from 'vitest'
import type { SleepCheckIn } from '../state/appState'
import { bestRestedBefore, consistency, factors, lastNights, sessionCounts, sessionWeek, shortNights, weekTrend } from './patterns'

const night = (lightsOut: string, rested: SleepCheckIn['rested']): SleepCheckIn => ({
  lightsOut,
  wake: '06:30',
  rested,
  tags: [],
  source: 'checkin',
})

const log = (nights: SleepCheckIn[]) => Object.fromEntries(nights.map((n, i) => [`2026-10-${String(i + 1).padStart(2, '0')}`, n]))

describe('bestRestedBefore', () => {
  it('needs 7 check ins', () => {
    expect(bestRestedBefore(log([night('23:00', 5), night('23:00', 5), night('23:00', 5), night('00:30', 2)]))).toBeNull()
  })

  it('finds the lights out the rested mornings follow, across midnight', () => {
    const nights = [night('23:00', 5), night('23:10', 4), night('22:50', 4), night('00:10', 2), night('23:55', 3), night('00:20', 2), night('23:40', 3)]
    expect(bestRestedBefore(log(nights))).toBe('23:00')
  })

  it('stays quiet when lights out makes no difference', () => {
    const nights = [night('23:00', 5), night('23:30', 4), night('23:10', 4), night('23:05', 2), night('23:20', 3), night('23:15', 2), night('23:25', 3)]
    expect(bestRestedBefore(log(nights))).toBeNull()
  })
})

const at = (lightsOut: string, wake: string, rested: SleepCheckIn['rested'] = 3, tags: string[] = []): SleepCheckIn => ({
  lightsOut,
  wake,
  rested,
  tags,
  source: 'checkin',
})

// Mornings ending on 2026-10-18, newest last.
const run = (nights: (SleepCheckIn | null)[]) => {
  const out: Record<string, SleepCheckIn> = {}
  nights.forEach((n, i) => {
    if (!n) return
    const d = new Date(2026, 9, 18 - (nights.length - 1 - i), 12)
    out[`2026-10-${String(d.getDate()).padStart(2, '0')}`] = n
  })
  return out
}

describe('lastNights', () => {
  it('keeps missing mornings as empty nights', () => {
    const nights = lastNights(run([at('23:00', '07:00'), null, at('23:00', '07:00')]), '2026-10-18')
    expect(nights).toHaveLength(7)
    expect(nights[6].checkIn).toBeDefined()
    expect(nights[5].checkIn).toBeUndefined()
  })
})

describe('weekTrend', () => {
  it('holds back the minute delta before 14 nights', () => {
    expect(weekTrend(run(Array(7).fill(at('23:00', '07:00', 4))), '2026-10-18')).toEqual({ title: 'Holding steady', deltaMinutes: null })
  })

  it('compares with the week before', () => {
    const before = Array(7).fill(at('23:30', '06:30'))
    const week = Array(7).fill(at('23:00', '06:30'))
    expect(weekTrend(run([...before, ...week]), '2026-10-18')).toEqual({ title: 'Steadier, and longer', deltaMinutes: 30 })
    expect(weekTrend(run([...week, ...before]), '2026-10-18').title).toBe('A rougher week')
  })
})

describe('consistency', () => {
  it('counts nights within 30 minutes of the plan and the current run', () => {
    const nights = run([at('23:10', '07:00'), at('00:10', '07:00'), at('22:50', '07:00'), at('23:20', '07:00')])
    expect(consistency(nights, '2026-10-18', () => '23:00')).toEqual({ within: 3, streak: 2 })
  })
})

describe('factors', () => {
  it('needs 3 nights each way and 10 minutes', () => {
    const nights = run([
      at('23:00', '07:00', 3, ['Late coffee']),
      at('23:30', '07:00', 3, ['Late coffee']),
      at('23:40', '07:00', 3, ['Late coffee']),
      at('22:40', '07:00'),
      at('22:50', '07:00'),
      at('22:30', '07:00'),
      at('22:45', '07:00', 3, ['Noise']),
    ])
    const sessions = [{ id: 'bodyScan', at: '2026-10-16T21:00:00' }]
    const { helps, costs } = factors(nights, sessions, (iso) => iso.slice(0, 10))
    expect(costs).toEqual([{ label: 'Late coffee', minutes: 42 }])
    expect(helps).toEqual([])
  })
})

describe('sessions', () => {
  it('counts the most used first', () => {
    const s = [{ id: 'box', at: '' }, { id: 'bodyScan', at: '' }, { id: 'bodyScan', at: '' }]
    expect(sessionCounts(s)).toEqual([{ id: 'bodyScan', count: 2 }, { id: 'box', count: 1 }])
  })

  it('maps this week from Monday', () => {
    // 2026-10-18 is a Sunday.
    const s = [
      { id: 'box', at: new Date(2026, 9, 12, 21).toISOString() },
      { id: 'box', at: new Date(2026, 9, 14, 21).toISOString() },
      { id: 'box', at: new Date(2026, 9, 8, 21).toISOString() },
    ]
    const week = sessionWeek(s, '2026-10-18')
    expect(week.todayIndex).toBe(6)
    expect(week.done).toEqual([true, false, true, false, false, false, false])
    expect(week.thisWeek).toBe(2)
    expect(week.lastWeek).toBe(1)
  })

  it('counts short nights', () => {
    expect(shortNights(run([at('01:00', '06:30'), at('23:00', '07:00')]), '2026-10-18')).toBe(1)
  })
})
