import { initialAnswers, type Answers } from '../onboarding/types'

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

export type UiState = {
  coachMarkSeen: boolean
  tonight: { date: string; done: string[] }
}

export type AppState = {
  onboarding: Answers
  onboardingDone: boolean
  modulesSetUp: string[]
  skincare: SkincareSetup
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

const initialUi: UiState = {
  coachMarkSeen: false,
  tonight: { date: '', done: [] },
}

export const initialAppState: AppState = {
  onboarding: initialAnswers,
  onboardingDone: false,
  modulesSetUp: [],
  skincare: initialSkincare,
  ui: initialUi,
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>
      return {
        ...initialAppState,
        ...parsed,
        onboarding: { ...initialAnswers, ...parsed.onboarding },
        skincare: { ...initialSkincare, ...parsed.skincare },
        ui: { ...initialUi, ...parsed.ui },
      }
    }
    const legacy = localStorage.getItem(LEGACY_ONBOARDING_KEY)
    if (legacy) {
      localStorage.removeItem(LEGACY_ONBOARDING_KEY)
      return { ...initialAppState, onboarding: { ...initialAnswers, ...JSON.parse(legacy) } }
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
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}
