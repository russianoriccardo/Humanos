import { describe, expect, it } from 'vitest'
import type { SkincareActive } from '../state/appState'
import { stepFromName } from './routine'
import { betweenScans, compareReadings } from './progress'

const reading = (type: string, notes: string[]) => ({ type, notes, strength: '', gap: '' })

function active(patch: Partial<SkincareActive> = {}): SkincareActive {
  return {
    startedAt: '2026-09-20',
    routine: ['Cleanser', 'Serum', 'Moisturizer'].map(stepFromName),
    baselineScan: { date: '2026-09-20', reading: reading('Combination', ['mild dryness']), fromPhoto: true },
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

describe('compareReadings', () => {
  it('reports resolved, new and type changes', () => {
    expect(compareReadings(reading('Combination', ['mild dryness', 'uneven tone']), reading('Normal', ['even tone']))).toEqual([
      'Combination → Normal',
      'Mild dryness → None detected',
      'Uneven tone → None detected',
    ])
    expect(compareReadings(reading('Normal', []), reading('Normal', ['shine in the T-zone']))).toEqual([
      'None → Shine in the T-zone',
    ])
  })

  it('is empty when nothing changed', () => {
    expect(compareReadings(reading('Dry', ['mild dryness']), reading('Dry', ['mild dryness']))).toEqual([])
  })
})

describe('betweenScans', () => {
  it('counts from the latest scan, SPF only on sunny days', () => {
    const a = active({
      scans: [{ date: '2026-10-08', reading: reading('Normal', []) }],
      routineLog: { '2026-10-07': ['cleanser', 'serum', 'moisturizer'], '2026-10-08': ['cleanser', 'serum'], '2026-10-09': ['cleanser'] },
      spfLog: { '2026-10-08': true, '2026-10-09': true },
      yoga: { sessions: ['2026-10-01T08:00:00.000Z', '2026-10-09T08:00:00.000Z'] },
    })
    const weatherLog = { '2026-10-08': { uvMax: 4, rhMin: 50 }, '2026-10-09': { uvMax: 1, rhMin: 50 }, '2026-10-10': { uvMax: 3.5, rhMin: 50 } }
    expect(betweenScans(a, weatherLog, '2026-10-10')).toEqual({
      nights: { done: 1, of: 3 },
      spf: { done: 1, of: 2 },
      yoga: { done: 1, of: 10 },
    })
  })
})
