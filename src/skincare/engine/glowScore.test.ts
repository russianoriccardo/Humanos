import { describe, expect, it } from 'vitest'
import type { SkincareActive } from '../../state/appState'
import { stepFromName } from '../routine'
import { getHealth } from '../../services/health.mock'
import { glowBreakdown, glowReason, nightComplete } from './glowScore'

function active(patch: Partial<SkincareActive> = {}): SkincareActive {
  return {
    startedAt: '2026-10-01',
    routine: ['Cleanser', 'Serum', 'Moisturizer', 'SPF'].map(stepFromName),
    baselineScan: { date: '2026-10-01', reading: { type: 'Normal', notes: [], strength: '', gap: '' }, fromPhoto: false },
    scans: [],
    keepScanPhotos: false,
    routineLog: {},
    spfLog: {},
    yoga: { sessions: [] },
    productChecks: [],
    seenCoachMark: true,
    ...patch,
  }
}

describe('glow score', () => {
  it('starts at the baseline', () => {
    expect(glowBreakdown({ active: active(), weatherLog: {}, today: '2026-10-01' })).toMatchObject({ score: 64, delta: 0 })
  })

  it('counts a night with at most one step left out', () => {
    const a = active({ routineLog: { '2026-10-01': ['cleanser', 'moisturizer'], '2026-10-02': ['cleanser'] } })
    expect(nightComplete(a, '2026-10-01')).toBe(true)
    expect(nightComplete(a, '2026-10-02')).toBe(false)
  })

  it('adds nights, SPF on sunny days only, and yoga — each capped', () => {
    const routineLog = Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [`2026-10-0${i + 1}`, ['cleanser', 'serum', 'moisturizer']]),
    )
    const a = active({
      routineLog,
      spfLog: { '2026-10-01': true, '2026-10-02': true, '2026-10-03': true },
      yoga: { sessions: ['2026-10-02T08:00:00.000Z', '2026-10-04T08:00:00.000Z'] },
    })
    // Day 3 was cloudy, so its SPF earns nothing.
    const weatherLog = { '2026-10-01': { uvMax: 4, rhMin: 50 }, '2026-10-02': { uvMax: 3.2, rhMin: 50 }, '2026-10-03': { uvMax: 1.5, rhMin: 50 } }
    const g = glowBreakdown({ active: a, weatherLog, today: '2026-10-09' })
    expect(g).toMatchObject({ nights: 9, spfSunny: 2, yoga: 2 })
    expect(g.score).toBe(64 + 9 + 1 + 1)
  })

  it('caps routine nights at +12', () => {
    const routineLog = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`2026-10-${String(i + 1).padStart(2, '0')}`, ['cleanser', 'serum']]),
    )
    expect(glowBreakdown({ active: active({ routineLog }), weatherLog: {}, today: '2026-10-20' }).score).toBe(76)
  })

  it('explains the number', () => {
    const dry = { current: { humidity: 32, temperature: 20, uv: 2 }, hourly: [], uvMax: 3 }
    expect(glowReason(2, dry, getHealth('restful'))).toBe('+2 since your baseline. Holding up despite the dry air.')
    expect(glowReason(0, null, getHealth('restful'))).toBe("Same as your baseline. Log tonight's routine to move it.")
  })
})
