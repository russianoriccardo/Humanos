import { describe, expect, it } from 'vitest'
import { initialHydration, initialSleep, type HydrationSetup } from '../state/appState'
import { createSleepActive } from '../sleep/plan'
import { createHydrationActive } from './mirror'
import { CHECK_IN_SUFFIX, defaultSlots, hydrationReminders, mergeWithCheckIn, nextSlot, quietAfter, shouldFire, weeklyRecap } from './nudges'

const DAY = '2026-11-04'
const at = (h: number, m = 0) => new Date(2026, 10, 4, h, m)
const setup = (patch: Partial<HydrationSetup>): HydrationSetup => ({ ...initialHydration, targetMl: 2000, ...patch })
const opts = { target: 2000, quiet: '20:00', hot: false }

describe('slots', () => {
  it('depends on how closely the user keeps count', () => {
    expect(defaultSlots('notAtAll', '07:30')).toEqual(['08:00', '13:00', '16:30'])
    expect(defaultSlots('roughly', '07:30')).toEqual(['11:00', '15:30'])
    expect(defaultSlots(null, '07:30')).toEqual(['11:00', '15:30'])
    expect(defaultSlots('track', '07:30')).toEqual(['15:00'])
    expect(defaultSlots('track', '07:30', true)).toEqual(['18:00'])
  })

  it('goes quiet at 20:00, or 2 hours before an early lights out', () => {
    expect(quietAfter(null, DAY)).toBe('20:00')
    const early = createSleepActive({ ...initialSleep, bedtime: '21:45', wake: '06:00' }, true, DAY)
    expect(quietAfter(early, DAY)).toBe('19:45')
    const late = createSleepActive({ ...initialSleep, bedtime: '23:50', wake: '06:30' }, true, DAY)
    expect(quietAfter(late, DAY)).toBe('20:00')
  })

  it('finds the next enabled slot', () => {
    const slots = [
      { time: '11:00', on: true },
      { time: '15:30', on: false },
      { time: '16:30', on: true },
    ]
    expect(nextSlot(slots, at(9))).toBe('11:00')
    expect(nextSlot(slots, at(12))).toBe('16:30')
    expect(nextSlot(slots, at(17))).toBeNull()
    expect(nextSlot(slots, at(2))).toBeNull()
  })
})

describe('hydrationReminders', () => {
  const active = createHydrationActive(setup({ anchor: 'roughly' }), true, at(9))

  it('schedules the day ahead with copy by slot order', () => {
    const rs = hydrationReminders(active, DAY, at(9), opts)
    expect(rs.map((r) => r.id)).toEqual([`hydration:nudge:${DAY}:11:00`, `hydration:nudge:${DAY}:15:30`])
    expect(rs[0]).toMatchObject({ title: 'A glass now keeps you on track', body: '0 L of 2 L so far.' })
    expect(rs[1]).toMatchObject({ title: '2 L to go', body: 'Two glasses does it.' })
    expect(hydrationReminders(active, DAY, at(12), opts).map((r) => r.title)).toEqual(['2 L to go'])
  })

  it('moves the next nudge earlier on a hot day, never adds one', () => {
    const rs = hydrationReminders(active, DAY, at(9), { ...opts, hot: true })
    expect(rs.map((r) => r.id)).toEqual([`hydration:nudge:${DAY}:10:30`, `hydration:nudge:${DAY}:15:30`])
  })

  it('respects quiet hours, the switch and a pause', () => {
    expect(hydrationReminders(active, DAY, at(9), { ...opts, quiet: '13:00' })).toHaveLength(1)
    expect(hydrationReminders({ ...active, reminderOn: false }, DAY, at(9), opts)).toEqual([])
    expect(hydrationReminders({ ...active, pausedUntil: '2026-11-10' }, DAY, at(9), opts)).toEqual([])
  })

  it('sends one daily status in doctor mode', () => {
    const doctor = createHydrationActive(setup({ doctorLimit: true, targetMl: 1200 }), true, at(9))
    const rs = hydrationReminders(doctor, DAY, at(9), { ...opts, target: 1200 })
    expect(rs).toHaveLength(1)
    expect(rs[0]).toMatchObject({ id: `hydration:status:${DAY}`, title: 'Your water today', body: '0 L of your 1.2 L limit.' })
  })
})

describe('shouldFire', () => {
  const nudge = { id: `hydration:nudge:${DAY}:11:00`, at: '', title: '', body: '' }
  it('fires nudges only when behind', () => {
    expect(shouldFire(nudge, { pace: 'behind' })).toBe(true)
    expect(shouldFire(nudge, { pace: 'on' })).toBe(false)
    expect(shouldFire(nudge, { pace: 'done' })).toBe(false)
    expect(shouldFire({ ...nudge, id: `hydration:status:${DAY}` }, { pace: 'limitLeft' })).toBe(true)
    expect(shouldFire({ ...nudge, id: `sleep:checkin:${DAY}` }, { pace: 'on' })).toBe(true)
  })
})

describe('mergeWithCheckIn', () => {
  const checkIn = { id: `sleep:checkin:${DAY}`, at: at(7, 45).toISOString(), title: 'How did you sleep?', body: 'Ten seconds.' }
  const nudge = (h: number) => ({ id: `hydration:nudge:${DAY}:${h}:00`, at: at(h).toISOString(), title: 'x', body: 'y' })

  it('folds the first nudge into a nearby check in', () => {
    const { hydration, sleep } = mergeWithCheckIn([nudge(8), nudge(13)], [checkIn])
    expect(hydration.map((h) => h.at)).toEqual([at(13).toISOString()])
    expect(sleep[0].body).toBe('Ten seconds.' + CHECK_IN_SUFFIX)
  })

  it('leaves them apart when more than an hour away', () => {
    const { hydration, sleep } = mergeWithCheckIn([nudge(11)], [checkIn])
    expect(hydration).toHaveLength(1)
    expect(sleep[0].body).toBe('Ten seconds.')
  })
})

describe('weeklyRecap', () => {
  it('waits for 3 logged days', () => {
    const active = createHydrationActive(setup({}), true, at(9))
    expect(weeklyRecap(active, DAY)).toBeNull()
    const log = { id: '1', at: '', drinkId: 'water', name: 'Water', ml: 2000, counts: true }
    const logged = { ...active, logs: { '2026-11-02': [log], '2026-11-03': [log], '2026-11-04': [{ ...log, ml: 500 }] } }
    // 2026-11-04 is a Wednesday: the recap goes out on Sunday the 8th.
    expect(weeklyRecap(logged, DAY)).toMatchObject({ id: 'hydration:recap:2026-11-08', body: 'Target hit 2 of 7 days.' })
  })
})
