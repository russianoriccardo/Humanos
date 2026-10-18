import { initialAnswers, type Answers } from '../onboarding/types'
import type { HealthScenario, ProductCheck } from '../skincare/engine/types'
import type { RoutineStep } from '../skincare/routine'
import { config } from '../config'
import { dateKey, normalizeKey } from '../lib/dates'

export type SkincareGoal = 'glow' | 'acne' | 'anti-age' | 'sensitivity' | 'maintain'

export type SkinReading = { type: string; notes: string[]; strength: string; gap: string }

export type SkincareSetup = {
  hasRoutine: boolean | null
  products: string[]
  wantsToStart: string[]
  buildForMe: boolean
  noProducts: boolean
  goal: SkincareGoal | null
  scan: { status: 'skipped' | 'ok'; reading?: SkinReading } | null
  completedAt?: string
}

export type ScanRecord = {
  date: string
  reading: SkinReading
  // IndexedDB key of the photo, only when keepScanPhotos was on at capture time.
  photoId?: string
}

// Everything the live Skincare module tracks after setup.
export type SkincareActive = {
  // Day 1 of the routine ('YYYY-MM-DD'). Separate from the scan dates so a rescan doesn't reset it.
  startedAt: string
  routine: RoutineStep[]
  baselineScan: ScanRecord & { fromPhoto: boolean }
  scans: ScanRecord[]
  keepScanPhotos: boolean
  routineLog: Record<string, string[]>
  spfLog: Record<string, boolean>
  yoga: { sessions: string[] }
  productChecks: ProductCheck[]
  seenCoachMark: boolean
}

export type SleepAnchor = 'well' | 'fine' | 'badly'
export type SleepIntent = 'energy' | 'fallAsleep' | 'fewerWakeups' | 'mornings'
export type SleepSetup = {
  anchor: SleepAnchor | null
  intents: SleepIntent[]          // max 2
  bedtime: string | null          // 'HH:MM', 24h
  wake: string | null
  health: 'notNow' | 'connected' | 'denied' | 'noData' | null
  completedAt?: string
}
export type SleepCheckIn = {
  lightsOut: string; wake: string; rested: 1 | 2 | 3 | 4 | 5; tags: string[]; source: 'checkin' | 'health'
}
export type SleepActive = {
  startedAt: string               // date of night 1 (setup day)
  planStart: string               // lights out at setup, 'HH:MM'
  goal: string                    // target lights out, 'HH:MM'
  wake: string
  checkIns: Record<string, SleepCheckIn>   // key = date of the MORNING
  windDown: Record<string, string[]>       // key = date of the night, ticked step ids
  sessions: { id: string; at: string }[]
  reminderOn: boolean
  seenCoachMark: boolean
}

export type Reminder = { id: string; at: string; title: string; body: string }

export type UiState = {
  skincareTab: 'today' | 'yoga' | 'progress' | 'ask'
  locationChoice: 'unset' | 'gps' | 'city'
  city: string
  reminders: Reminder[]
}

export type DemoState = {
  scenario: HealthScenario
  outdoorWindow: { start: string; end: string }
}

export type AppState = {
  onboarding: Answers
  onboardingDone: boolean
  modulesSetUp: string[]
  skincare: SkincareSetup
  skincareActive: SkincareActive | null
  sleep: SleepSetup
  sleepActive: SleepActive | null
  // Daily UV peak / humidity low, recorded whenever weather loads. Feeds "SPF on sunny days".
  weatherLog: Record<string, { uvMax: number; rhMin: number }>
  demo: DemoState
  ui: UiState
}

export const STATE_KEY = 'humanos.state'
const LEGACY_ONBOARDING_KEY = 'humanos.onboarding'

export const initialSkincare: SkincareSetup = {
  hasRoutine: null,
  products: [],
  wantsToStart: [],
  buildForMe: false,
  noProducts: false,
  goal: null,
  scan: null,
}

export const initialDemo: DemoState = {
  scenario: 'none',
  outdoorWindow: { start: '12:30', end: '13:30' },
}

const initialUi: UiState = {
  skincareTab: 'today',
  locationChoice: 'unset',
  city: config.fallbackCity.name,
  reminders: [],
}

export const initialSleep: SleepSetup = {
  anchor: null,
  intents: [],
  bedtime: null,
  wake: null,
  health: null,
}

export const initialAppState: AppState = {
  onboarding: initialAnswers,
  onboardingDone: false,
  modulesSetUp: [],
  skincare: initialSkincare,
  skincareActive: null,
  sleep: initialSleep,
  sleepActive: null,
  weatherLog: {},
  demo: initialDemo,
  ui: initialUi,
}

type LegacyUi = { coachMarkSeen?: boolean; tonight?: { date: string; done: string[] } }

const REMINDER_MODULES = ['skincare', 'sleep']

// `createActive` is injected to keep this module free of the reading/routine logic.

export function loadAppState(createActive: (setup: SkincareSetup) => SkincareActive): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState> & { ui?: Partial<UiState> & LegacyUi }
      const state: AppState = {
        ...initialAppState,
        ...parsed,
        onboarding: { ...initialAnswers, ...parsed.onboarding },
        skincare: { ...initialSkincare, ...parsed.skincare },
        skincareActive: parsed.skincareActive ?? null,
        sleep: { ...initialSleep, ...parsed.sleep },
        sleepActive: parsed.sleepActive ?? null,
        weatherLog: parsed.weatherLog ?? {},
        demo: { ...initialDemo, ...parsed.demo },
        ui: {
          skincareTab: parsed.ui?.skincareTab ?? initialUi.skincareTab,
          locationChoice: parsed.ui?.locationChoice ?? initialUi.locationChoice,
          city: parsed.ui?.city ?? initialUi.city,
          // Ids from before module prefixes were all skincare.
          reminders: (parsed.ui?.reminders ?? []).map((r) =>
            REMINDER_MODULES.some((m) => r.id.startsWith(`${m}:`)) ? r : { ...r, id: `skincare:${r.id}` },
          ),
        },
      }
      // Set up before SkincareActive existed: build it, carrying over tonight's ticks and the coach mark.
      if (state.modulesSetUp.includes('skincare') && !state.skincareActive) {
        const active = createActive(state.skincare)
        const legacy: LegacyUi = parsed.ui ?? {}
        const tonight = legacy.tonight
        const nameToId = new Map(active.routine.map((step) => [step.name, step.id]))
        if (tonight?.date && tonight.done.length) {
          active.routineLog[normalizeKey(tonight.date)] = tonight.done.map((name) => nameToId.get(name) ?? name)
        }
        active.seenCoachMark = legacy.coachMarkSeen ?? false
        state.skincareActive = active
      }
      return state
    }
    const legacyOnboarding = localStorage.getItem(LEGACY_ONBOARDING_KEY)
    if (legacyOnboarding) {
      localStorage.removeItem(LEGACY_ONBOARDING_KEY)
      return { ...initialAppState, onboarding: { ...initialAnswers, ...JSON.parse(legacyOnboarding) } }
    }
  } catch {
    // Unreadable or blocked storage: start fresh rather than crash.
  }
  return initialAppState
}

export function saveAppState(state: AppState) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    // Private mode / quota: the app keeps working from memory.
  }
}

export function clearDemoStorage() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('humanos.'))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // Nothing to clear.
  }
}

export function todayKey() {
  return dateKey()
}
