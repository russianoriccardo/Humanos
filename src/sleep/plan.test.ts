import { describe, expect, it } from 'vitest'
import { initialSleep, type SleepSetup } from '../state/appState'
import {
  buildMirror,
  checkWindow,
  createSleepActive,
  formatDuration,
  goalFor,
  lightsOutFor,
  planWeeks,
  nightKeyFor,
  retime,
  sleepReminders,
  tonightLightsOut,
  windowMinutes,
} from './plan'

const setup = (patch: Partial<SleepSetup>): SleepSetup => ({ ...initialSleep, ...patch })

describe('windowMinutes', () => {
  it('wraps around midnight', () => {
    expect(windowMinutes('23:50', '06:30')).toBe(400)
    expect(windowMinutes('01:00', '08:00')).toBe(420)
    expect(windowMinutes('22:00', '22:00')).toBe(0)
  })
})

describe('formatDuration', () => {
  it('drops empty parts', () => {
    expect(formatDuration(400)).toBe('6h 40m')
    expect(formatDuration(420)).toBe('7h')
    expect(formatDuration(17)).toBe('17m')
  })
})

describe('checkWindow', () => {
  it('flags same, short and long nights', () => {
    expect(checkWindow('23:00', '23:00')).toBe('same')
    expect(checkWindow('03:00', '06:30')).toBe('short')
    expect(checkWindow('20:00', '09:00')).toBe('long')
    expect(checkWindow('23:00', '07:00')).toBe('ok')
  })
})

describe('goal and lights out', () => {
  it('aims for 7h 30m before the alarm when the window is short', () => {
    expect(goalFor('23:50', '06:30')).toBe('23:00')
    expect(goalFor('22:30', '07:00')).toBe('22:30')
  })

  it('moves 15 minutes a week and stops at the goal', () => {
    const plan = { planStart: '23:50', goal: '23:00' }
    expect(lightsOutFor(plan, 0)).toBe('23:50')
    expect(lightsOutFor(plan, 1)).toBe('23:35')
    expect(lightsOutFor(plan, 3)).toBe('23:05')
    expect(lightsOutFor(plan, 4)).toBe('23:00')
    expect(lightsOutFor(plan, 9)).toBe('23:00')
    expect(planWeeks(plan)).toBe(4)
  })

  it('crosses midnight', () => {
    const plan = { planStart: '00:10', goal: '23:40' }
    expect(lightsOutFor(plan, 1)).toBe('23:55')
    expect(lightsOutFor(plan, 2)).toBe('23:40')
  })

  it('holds still when the bedtime already is the goal', () => {
    const plan = { planStart: '22:30', goal: '22:30' }
    expect(lightsOutFor(plan, 2)).toBe('22:30')
    expect(planWeeks(plan)).toBe(1)
  })
})

describe('buildMirror', () => {
  it('short window: earlier lights out tonight', () => {
    const m = buildMirror(setup({ anchor: 'badly', intents: ['energy'], bedtime: '23:50', wake: '06:30' }))
    expect(m.headline).toBe('Roughly 6h 40m on weekdays.')
    expect(m.subtitle).toBe('A rough stretch, so we start small. Built from your answers.')
    expect(m.gap).toBe('For more energy most adults need about 7h 30m. Your 06:30 alarm leaves room for 6h 40m.')
    expect(m.firstStep.time).toBe('23:35')
    expect(m.firstStep.body).toContain('until 23:00')
    expect(m.firstStep.cta).toBe('Set for tonight')
    expect(m.nudgeAt).toBe('23:05')
  })

  it('never overshoots a goal under 15 minutes away', () => {
    const m = buildMirror(setup({ bedtime: '23:00', wake: '06:20' }))
    expect(m.goal).toBe('22:50')
    expect(m.firstStep.time).toBe('22:50')
  })

  it('enough hours: daylight after waking', () => {
    const m = buildMirror(setup({ bedtime: '22:30', wake: '07:00' }))
    expect(m.short).toBe(false)
    expect(m.subtitle).toBe("Here's your starting point. Built from your answers.")
    expect(m.firstStep.time).toBe('07:30')
    expect(m.firstStep.cta).toBe('Set for tomorrow')
    expect(m.nudgeAt).toBe('22:00')
  })
})

describe('createSleepActive', () => {
  it('starts empty from the answers', () => {
    const a = createSleepActive(setup({ bedtime: '23:50', wake: '06:30' }), true, '2026-10-18')
    expect(a).toMatchObject({ startedAt: '2026-10-18', planStart: '23:50', goal: '23:00', wake: '06:30', reminderOn: true })
    expect(a.checkIns).toEqual({})
    expect(a.sessions).toEqual([])
  })
})

describe('sleepReminders', () => {
  it('schedules tonight and the next morning with prefixed ids', () => {
    const [nudge, checkIn] = sleepReminders('23:35', '06:30', new Date(2026, 9, 18, 15, 0))
    expect(nudge.id).toBe('sleep:winddown:2026-10-18')
    expect(new Date(nudge.at).getHours()).toBe(23)
    expect(checkIn.id).toBe('sleep:checkin:2026-10-19')
    expect(new Date(checkIn.at).getMinutes()).toBe(45)
  })

  it('keeps an after midnight nudge on the evening it belongs to', () => {
    const [nudge, checkIn] = sleepReminders('00:30', '08:00', new Date(2026, 9, 18, 20, 0))
    expect(nudge.id).toBe('sleep:winddown:2026-10-18')
    expect(checkIn.id).toBe('sleep:checkin:2026-10-19')
  })
})

describe('tonightLightsOut', () => {
  it('starts with the first shift and moves weekly', () => {
    const active = createSleepActive(setup({ bedtime: '23:50', wake: '06:30' }), true, '2026-10-01')
    expect(tonightLightsOut(active, '2026-10-01')).toBe('23:35')
    expect(tonightLightsOut(active, '2026-10-07')).toBe('23:35')
    expect(tonightLightsOut(active, '2026-10-08')).toBe('23:20')
  })
})

describe('nightKeyFor', () => {
  it('keeps the small hours on the previous night', () => {
    expect(nightKeyFor(new Date(2026, 9, 18, 2, 0))).toBe('2026-10-17')
    expect(nightKeyFor(new Date(2026, 9, 18, 22, 0))).toBe('2026-10-18')
  })
})

describe('retime', () => {
  it('starts tonight from the new bedtime without losing the night count', () => {
    const active = createSleepActive(setup({ bedtime: '23:50', wake: '06:30' }), true, '2026-10-01')
    const next = retime(active, '00:20', '07:00', '2026-10-15')
    expect(next.startedAt).toBe('2026-10-01')
    expect(tonightLightsOut(next, '2026-10-15')).toBe('00:05')
    expect(tonightLightsOut(next, '2026-10-22')).toBe('23:50')
  })
})
