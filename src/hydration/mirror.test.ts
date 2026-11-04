import { describe, expect, it } from 'vitest'
import { initialHydration, type HydrationSetup } from '../state/appState'
import { recommendTarget } from './target'
import { buildMirror, createHydrationActive } from './mirror'
import { weekSummary } from './week'
import { welcomeBack } from './tuning'

const at = (h: number, m = 0) => new Date(2026, 10, 4, h, m)
const setup = (patch: Partial<HydrationSetup>): HydrationSetup => ({ ...initialHydration, ...patch })

describe('buildMirror', () => {
  it('(A) 65 kg, low, tracks, water and tea', () => {
    const m = buildMirror(setup({ anchor: 'track', drinks: ['water', 'tea'], targetMl: recommendTarget('65', 'low').ml }), { now: at(9) })
    expect(m.headline).toBe('Your target is 2 L.')
    expect(m.sub).toBe('About 8 glasses a day. Built from your answers.')
    expect(m.strength).toContain('You already keep count')
    expect(m.firstStep).toMatchObject({ time: '15:00', a: 'Halfway check.', cta: 'Remind me at 15:00', tomorrow: false })
    expect(m.hint).toBe("We'll nudge you at 15:00. Nothing after 20:00.")
  })

  it('(C) 82 kg, high, not at all, coffee and sports drink', () => {
    const m = buildMirror(setup({ anchor: 'notAtAll', drinks: ['coffee', 'sports'], targetMl: recommendTarget('82', 'high').ml }), { now: at(7, 45) })
    expect(m.headline).toBe('Your target is 3 L.')
    expect(m.strength).toBe("Your coffee counts too. Most people don't know that.")
    expect(m.gap).toBe('Most of what you drink is sweet. Swapping one a day for water is an easy first win.')
    expect(m.firstStep).toMatchObject({ time: '08:00', a: 'A glass of coffee.' })
    expect(m.hint).toBe("We'll nudge you at 08:00, 13:00 and 16:30. Nothing after 20:00.")
  })

  it('(G) everything skipped, no weight', () => {
    const m = buildMirror(setup({ targetMl: recommendTarget('', null).ml }), { now: at(9) })
    expect(m.headline).toBe('Your target is 2 L.')
    expect(m.strength).toBe("Here's your starting point.")
    expect(m.gap).toBe('Your first week shows when in the day you drink, and when you go quiet.')
    expect(m.firstStep.a).toBe('A glass of water.')
  })

  it('(I) set up at 21:30 starts tomorrow', () => {
    const s = setup({ anchor: 'roughly', drinks: ['water'], targetMl: 2000 })
    const m = buildMirror(s, { now: at(21, 30) })
    expect(m.firstStep).toMatchObject({ time: '11:00', a: 'First glass, tomorrow morning.', cta: 'Set for tomorrow', tomorrow: true })
    expect(createHydrationActive(s, true, at(21, 30)).startedAt).toBe('2026-11-05')
    expect(createHydrationActive(s, true, at(9)).startedAt).toBe('2026-11-04')
  })

  it("(H) a doctor's 1.2 L limit gets one 18:00 status", () => {
    const s = setup({ anchor: 'roughly', doctorLimit: true, targetMl: 1200, targetSource: 'doctor' })
    const m = buildMirror(s, { now: at(9) })
    expect(m.headline).toBe('Your limit is 1.2 L.')
    expect(m.gapLabel).toBe('How we help')
    expect(m.firstStep).toMatchObject({ time: '18:00', a: 'A daily status, not a nudge to drink more.' })
    expect(createHydrationActive(s, true, at(9)).slots).toEqual([{ time: '18:00', on: true }])
  })

  it('uses Apple Health history when connected', () => {
    const s = setup({ anchor: 'track', health: 'connected', healthAvgMl: 1400, targetMl: 2000 })
    const m = buildMirror(s, { now: at(9), importedDays: 26 })
    expect(m.sub).toBe('About 8 glasses a day. Built from 26 days and your answers.')
    expect(m.strength).toBe('You logged water on 26 of the last 28 days. You already keep count.')
    expect(m.gap).toBe('You average 1.4 L. About two more glasses a day closes the gap.')
    expect(Object.keys(createHydrationActive(s, true, at(9)).imported)).toHaveLength(26)
  })
})

describe('starting from empty', () => {
  const active = createHydrationActive(setup({ targetMl: 2000 }), true, new Date(2026, 10, 2, 9))

  it('has no week on day 3 without Apple Health', () => {
    expect(weekSummary(active, '2026-11-04')).toBeNull()
  })

  it('shows a week from Apple Health history alone', () => {
    const connected = createHydrationActive(setup({ targetMl: 2000, health: 'connected' }), true, new Date(2026, 10, 2, 9))
    const week = weekSummary(connected, '2026-11-04')
    expect(week?.days).toHaveLength(7)
    expect(week?.quiet).toBeNull()
  })

  it('welcomes back after 3 days off, once per gap', () => {
    const log = { id: '1', at: '', drinkId: 'water', name: 'Water', ml: 250, counts: true }
    const away = { ...active, startedAt: '2026-10-25', logs: { '2026-10-30': [log] } }
    expect(welcomeBack(away, '2026-11-04')).toEqual({ days: 4, key: '2026-10-31' })
    expect(welcomeBack({ ...away, asked: { drop: [], welcomeBackFor: '2026-10-31' } }, '2026-11-04')).toBeNull()
    expect(welcomeBack(active, '2026-11-04')).toBeNull()
  })
})
