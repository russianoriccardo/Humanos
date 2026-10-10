import type { ScanRecord, SkincareActive, SkincareSetup } from '../state/appState'
import { dateKey, daysBetween, normalizeKey } from '../lib/dates'
import { buildReading } from './reading'
import { buildRoutine } from './routine'

export const SCAN_CYCLE_DAYS = 14

export function createSkincareActive(setup: SkincareSetup): SkincareActive {
  const day = setup.completedAt ? normalizeKey(setup.completedAt) : dateKey()
  const fromPhoto = setup.scan?.status === 'ok' && !!setup.scan.reading
  return {
    startedAt: day,
    routine: buildRoutine(setup),
    baselineScan: { date: day, reading: setup.scan?.reading ?? buildReading(setup, null), fromPhoto },
    scans: [],
    keepScanPhotos: false,
    routineLog: {},
    spfLog: {},
    yoga: { sessions: [] },
    productChecks: [],
    seenCoachMark: false,
  }
}

export function latestScan(active: SkincareActive): ScanRecord {
  return active.scans.at(-1) ?? active.baselineScan
}

// Day 1 = the day the routine started.
export function routineDay(active: SkincareActive, today = dateKey()) {
  return Math.max(1, daysBetween(active.startedAt, today) + 1)
}

// Day 1..14 of the current scan cycle; ≥ 14 means the rescan is unlocked.
export function cycleDay(active: SkincareActive, today = dateKey()) {
  return Math.max(1, daysBetween(latestScan(active).date, today) + 1)
}

export function daysUntilScan(active: SkincareActive, today = dateKey()) {
  return Math.max(0, SCAN_CYCLE_DAYS - cycleDay(active, today))
}
