import { describe, expect, it } from 'vitest'
import { stepFromName, type RoutineStep } from '../routine'
import { getHealth } from '../../services/health.mock'
import { buildToday, formatSleep, peakUvInWindow } from './buildToday'
import type { TodayContext, WeatherSnapshot } from './types'

// Saturday 10 Oct 2026, 09:00 — before the default 12:30–13:30 outdoor window.
const MORNING = new Date(2026, 9, 10, 9, 0)

function weather(opts: { rh?: number; uvPeak?: number; peakHour?: number } = {}): WeatherSnapshot {
  const { rh = 55, uvPeak = 4, peakHour = 13 } = opts
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    uv: Math.max(0, Math.round((uvPeak - Math.abs(hour - peakHour) * 1.2) * 10) / 10),
    humidity: rh,
  }))
  return { current: { humidity: rh, temperature: 20, uv: 2 }, hourly, uvMax: uvPeak }
}

const routine = (...names: string[]): RoutineStep[] => names.map(stepFromName)
const RETINOL_ROUTINE = routine('Cleanser', 'Serum', 'Retinol', 'Moisturizer', 'SPF')

function ctx(patch: Partial<TodayContext> = {}): TodayContext {
  return {
    weather: weather(),
    health: getHealth('restful'),
    routine: RETINOL_ROUTINE,
    reading: null,
    goal: 'glow',
    now: MORNING,
    outdoorWindow: { start: 12 * 60 + 30, end: 13 * 60 + 30 },
    ...patch,
  }
}

const ids = (c: TodayContext) => buildToday(c).tips.map((t) => t.id)
const tonight = (c: TodayContext) =>
  buildToday(c).tonight.map((s) => `${s.name}${s.status === 'planned' ? '' : ` [${s.status}${s.note ? `: ${s.note}` : ''}]`}`)

describe('helpers', () => {
  it('formats sleep like the design', () => {
    expect(formatSleep(310)).toBe('5h10')
    expect(formatSleep(480)).toBe('8h')
  })

  it('reads the UV peak only inside the outdoor window', () => {
    const w = weather({ uvPeak: 8, peakHour: 15 })
    expect(peakUvInWindow(w.hourly, 750, 810)).toBe(5.6)
    expect(peakUvInWindow(w.hourly, 900, 960)).toBe(8)
  })
})

describe('UV reapply (safety)', () => {
  it('fires when UV peaks ≥ 6 during the outdoor window, with a reminder action', () => {
    const tip = buildToday(ctx({ weather: weather({ uvPeak: 7 }) })).tips[0]
    expect(tip).toMatchObject({
      id: 'uv-reapply',
      icon: 'sun',
      metric: 'UV 7',
      source: "Weather · you're outside 12:30–13:30",
      body: "UV is 7 and you're outside at lunch. Reapply SPF around 13:00.",
      action: { kind: 'reminder', label: 'Remind me at 13:00', at: '13:00' },
      routineChanged: false,
    })
  })

  it('does not fire when the high UV is outside the window', () => {
    expect(ids(ctx({ weather: weather({ uvPeak: 8, peakHour: 17 }) }))).not.toContain('uv-reapply')
  })

  it('does not fire once the window is over', () => {
    expect(ids(ctx({ weather: weather({ uvPeak: 7 }), now: new Date(2026, 9, 10, 16, 0) }))).not.toContain('uv-reapply')
  })
})

describe('barrier night', () => {
  it('skips retinol after short sleep + training', () => {
    const c = ctx({ health: getHealth('shortSleepTrained') })
    const tip = buildToday(c).tips.find((t) => t.id === 'barrier-night')
    expect(tip?.body).toBe('You slept 5h10 and trained yesterday. Skip the retinol tonight. Give your barrier a night off.')
    expect(tip?.routineChanged).toBe(true)
    expect(tonight(c)).toEqual(['Cleanser', 'Serum', 'Retinol [skipped: Skipped · barrier night off]', 'Moisturizer'])
  })

  it('skips the exfoliant when there is no retinol', () => {
    const c = ctx({ health: getHealth('shortSleepTrained'), routine: routine('Cleanser', 'Exfoliant', 'Moisturizer') })
    expect(buildToday(c).tips[0].body).toContain('Skip the exfoliant tonight')
    expect(tonight(c)[1]).toBe('Exfoliant [skipped: Skipped · barrier night off]')
  })

  it('gives gentle advice without touching a routine that has no actives', () => {
    const c = ctx({ health: getHealth('shortSleepTrained'), routine: routine('Cleanser', 'Serum', 'Moisturizer') })
    const tip = buildToday(c).tips[0]
    expect(tip.body).toContain('Keep tonight gentle')
    expect(tip.routineChanged).toBe(false)
    expect(tonight(c)).toEqual(['Cleanser', 'Serum', 'Moisturizer'])
  })

  it('needs both short sleep and training', () => {
    expect(ids(ctx({ health: { ...getHealth('shortSleepTrained'), trainedYesterday: false } }))).not.toContain('barrier-night')
    expect(ids(ctx({ health: getHealth('stressed') }))).not.toContain('barrier-night')
  })
})

describe('humidity', () => {
  it('dry air moves moisturizer before serum, with notes on both', () => {
    const c = ctx({ weather: weather({ rh: 32 }) })
    expect(buildToday(c).tips.find((t) => t.id === 'dry-air')?.body).toBe(
      'Humidity dropped to 32%. Your skin will feel tight. Moisturizer before serum tonight, not after.',
    )
    expect(tonight(c)).toEqual([
      'Cleanser',
      'Moisturizer [moved: Moved up · dry air]',
      'Serum [moved: After moisturizer tonight]',
      'Retinol',
    ])
  })

  it('humid skips the face oil', () => {
    const c = ctx({ weather: weather({ rh: 82 }), routine: routine('Cleanser', 'Moisturizer', 'Face oil') })
    expect(buildToday(c).tips[0].body).toBe("It's humid (82%). Go lighter tonight. Skip the face oil.")
    expect(tonight(c)).toEqual(['Cleanser', 'Moisturizer', 'Face oil [skipped: Skipped · humid tonight]'])
  })

  it('leaves 40–75% alone', () => {
    expect(ids(ctx({ weather: weather({ rh: 40 }) }))).toEqual(['calm'])
    expect(ids(ctx({ weather: weather({ rh: 75 }) }))).toEqual(['calm'])
  })
})

describe('low UV and stress', () => {
  it('low UV day', () => {
    expect(buildToday(ctx({ weather: weather({ uvPeak: 2.6 }) })).tips[0].body).toBe(
      'Low UV today (2.6). Morning SPF is still enough.',
    )
  })

  it('elevated resting heart rate', () => {
    expect(buildToday(ctx({ health: getHealth('stressed') })).tips[0]).toMatchObject({ id: 'stress', icon: 'heart' })
  })
})

describe('selection', () => {
  it('orders safety → barrier → comfort and caps at 3 (dropping the lowest)', () => {
    const c = ctx({
      weather: weather({ uvPeak: 7, rh: 32 }),
      health: { ...getHealth('shortSleepTrained'), restingHr: 75 },
    })
    expect(ids(c)).toEqual(['uv-reapply', 'barrier-night', 'dry-air'])
  })

  it('applies routine changes only from tips that are shown', () => {
    const c = ctx({ weather: weather({ uvPeak: 7, rh: 32 }), health: getHealth('shortSleepTrained') })
    expect(tonight(c)).toEqual([
      'Cleanser',
      'Moisturizer [moved: Moved up · dry air]',
      'Serum [moved: After moisturizer tonight]',
      'Retinol [skipped: Skipped · barrier night off]',
    ])
  })

  it('shows one calm card when nothing fires', () => {
    const plan = buildToday(ctx())
    expect(plan.tips).toHaveLength(1)
    expect(plan.tips[0].body).toBe('Nothing unusual today. Your routine as planned.')
    expect(plan.tonight.every((s) => s.status === 'planned')).toBe(true)
  })

  it('still gives health tips without weather', () => {
    expect(ids(ctx({ weather: null, health: getHealth('shortSleepTrained') }))).toEqual(['barrier-night'])
  })

  it('leaves morning-only steps out of tonight', () => {
    expect(buildToday(ctx()).tonight.map((s) => s.name)).not.toContain('SPF')
  })
})
