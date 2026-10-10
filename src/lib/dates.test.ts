import { describe, expect, it } from 'vitest'
import { addDays, dateKey, daysBetween, formatClock, keysBetween, normalizeKey, parseClock } from './dates'

describe('dates', () => {
  it('pads keys', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('normalizes legacy un-padded keys and ISO timestamps', () => {
    expect(normalizeKey('2026-9-27')).toBe('2026-09-27')
    expect(normalizeKey(new Date(2026, 9, 10, 15).toISOString())).toBe('2026-10-10')
  })

  it('does day arithmetic across month ends and DST', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    // Europe DST ends on 2026-10-25; still exactly one day apart.
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
    expect(addDays('2026-10-10', -13)).toBe('2026-09-27')
  })

  it('lists keys inclusively', () => {
    expect(keysBetween('2026-10-08', '2026-10-10')).toEqual(['2026-10-08', '2026-10-09', '2026-10-10'])
  })

  it('round-trips clock times', () => {
    expect(parseClock('12:30')).toBe(750)
    expect(formatClock(735)).toBe('12:15')
  })
})
