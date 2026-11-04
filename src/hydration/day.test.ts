import { describe, expect, it } from 'vitest'
import type { DrinkLog } from '../state/appState'
import { dayTotal, expectedBy, hydrationDay, lastHourMl, paceLine, paceStatus } from './day'

const at = (h: number, m = 0) => new Date(2026, 10, 4, h, m)
const log = (time: Date, ml: number, counts = true): DrinkLog => ({
  id: String(time.getTime()),
  at: time.toISOString(),
  drinkId: 'water',
  name: 'Water',
  ml,
  counts,
})

describe('hydrationDay', () => {
  it('starts at 04:00', () => {
    expect(hydrationDay(at(3, 59))).toBe('2026-11-03')
    expect(hydrationDay(at(4, 0))).toBe('2026-11-04')
  })
})

describe('totals', () => {
  it('counts everything but alcohol', () => {
    const logs = { '2026-11-04': [log(at(9), 250), log(at(10), 330, false), log(at(11), 150)] }
    expect(dayTotal(logs, '2026-11-04')).toBe(400)
    expect(dayTotal({}, '2026-11-04')).toBe(0)
    expect(lastHourMl(logs, at(11, 30))).toBe(150)
    // Alcohol is still fluid in the last hour.
    expect(lastHourMl(logs, at(10, 30))).toBe(330)
  })

  it('spreads the target from wake to 20:00', () => {
    expect(expectedBy(at(7), 2000, '07:30')).toBe(0)
    expect(expectedBy(at(13, 45), 2000, '07:30')).toBe(1000)
    expect(expectedBy(at(21), 2000, '07:30')).toBe(2000)
  })
})

describe('paceStatus and paceLine', () => {
  const base = { target: 2000, wake: '07:30', doctor: false, isDay1: false }

  it('covers every status', () => {
    expect(paceStatus({ ...base, total: 0, now: at(8), isDay1: false })).toBe('start')
    expect(paceStatus({ ...base, total: 0, now: at(15), isDay1: true })).toBe('start')
    expect(paceStatus({ ...base, total: 1000, now: at(13, 45) })).toBe('on')
    expect(paceStatus({ ...base, total: 1500, now: at(13, 45) })).toBe('ahead')
    expect(paceStatus({ ...base, total: 500, now: at(13, 45) })).toBe('behind')
    expect(paceStatus({ ...base, total: 2000, now: at(13, 45) })).toBe('done')
    expect(paceStatus({ ...base, doctor: true, total: 900, now: at(13) })).toBe('limitLeft')
    expect(paceStatus({ ...base, doctor: true, total: 2000, now: at(13) })).toBe('limitReached')
  })

  it('never says behind in doctor mode', () => {
    expect(paceStatus({ ...base, doctor: true, total: 0, now: at(19) })).toBe('limitLeft')
  })

  it('writes the lines', () => {
    const ctx = { ...base, now: at(13, 45) }
    expect(paceLine('start', { ...ctx, total: 0, isDay1: true })).toEqual({ a: 'Day 1.', b: 'Your first glass starts it.' })
    expect(paceLine('ahead', { ...ctx, total: 1500 }).b).toBe('About 2 glasses ahead for 13:00.')
    // Next checkpoint at least an hour away is 18:00: 1680 ml expected by then.
    expect(paceLine('behind', { ...ctx, total: 500 })).toEqual({ a: 'Behind pace.', b: "Three glasses before 18:00 and you're close." })
    expect(paceLine('behind', { ...ctx, now: at(11), total: 600 }).b).toBe("Two glasses before 14:00 and you're close.")
    expect(paceLine('limitLeft', { ...ctx, doctor: true, target: 1200, total: 550 }).a).toBe('0.65 L left today.')
  })
})
