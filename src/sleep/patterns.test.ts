import { describe, expect, it } from 'vitest'
import type { SleepCheckIn } from '../state/appState'
import { bestRestedBefore } from './patterns'

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
