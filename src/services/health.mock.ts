/*
 * MOCK HEALTH DATA.
 * Replaced by HealthKit (iOS) / Health Connect (Android) when the app is wrapped natively.
 * A web app cannot read them: neither platform exposes sleep or workout data to the browser.
 * Switch scenarios from the hidden Demo panel (long-press the avatar on the dashboard).
 */
import type { HealthScenario, HealthSnapshot } from '../skincare/engine/types'

const SCENARIOS: Record<HealthScenario, Omit<HealthSnapshot, 'scenario'>> = {
  none: { sleepMinutes: null, trainedYesterday: null, restingHr: null, restingHrBaseline: null },
  restful: { sleepMinutes: 8 * 60, trainedYesterday: false, restingHr: 58, restingHrBaseline: 60 },
  shortSleepTrained: { sleepMinutes: 5 * 60 + 10, trainedYesterday: true, restingHr: 63, restingHrBaseline: 60 },
  stressed: { sleepMinutes: 6 * 60, trainedYesterday: false, restingHr: 74, restingHrBaseline: 60 },
}

export const SCENARIO_LABELS: Record<HealthScenario, { title: string; detail: string }> = {
  none: { title: 'No data', detail: 'New user, nothing connected' },
  restful: { title: 'Restful', detail: '8h sleep, no training' },
  shortSleepTrained: { title: 'Short sleep, trained', detail: '5h10 sleep, trained yesterday' },
  stressed: { title: 'Stressed', detail: '6h sleep, high resting HR' },
}

export function getHealth(scenario: HealthScenario): HealthSnapshot {
  return { scenario, ...SCENARIOS[scenario] }
}
