import type { SkinReading, SkincareGoal } from '../../state/appState'
import type { Active, RoutineStep } from '../routine'

export type HealthScenario = 'none' | 'restful' | 'shortSleepTrained' | 'stressed'

export type HealthSnapshot = {
  scenario: HealthScenario
  // null = no data (a new user with no wearable / health access): rules that need it don't fire.
  sleepMinutes: number | null
  trainedYesterday: boolean | null
  restingHr: number | null
  restingHrBaseline: number | null
}

// What the engine needs from the weather service: today's values in local time.
export type WeatherSnapshot = {
  current: { humidity: number; temperature: number; uv: number }
  hourly: { hour: number; uv: number; humidity: number }[]
  uvMax: number
}

export type TodayContext = {
  weather: WeatherSnapshot | null
  health: HealthSnapshot
  routine: RoutineStep[]
  reading: SkinReading | null
  goal: SkincareGoal | null
  now: Date
  // Minutes since midnight.
  outdoorWindow: { start: number; end: number }
}

export type TipIcon = 'sun' | 'moon' | 'humidity' | 'heart' | 'check'
export type TipPriority = 'safety' | 'barrier' | 'comfort' | 'info'

export type Tip = {
  id: string
  icon: TipIcon
  priority: TipPriority
  metric: string
  source: string
  body: string
  action?: { kind: 'reminder'; label: string; at: string }
  routineChanged: boolean
}

export type AdjustedStep = RoutineStep & { status: 'planned' | 'moved' | 'skipped'; note?: string }

export type TodayPlan = { tips: Tip[]; tonight: AdjustedStep[] }

export type VerdictLevel = 'good' | 'care' | 'not-now'

export type VerdictReason = { kind: 'match' | 'warn'; text: string }

export type ProductAlternative = {
  name: string
  reason: string
  // Must render a visible "Sponsored" label whenever true. See config.partnerships.
  sponsored: boolean
}

export type Verdict = {
  level: VerdictLevel
  actives: Active[]
  reasons: VerdictReason[]
  fit: string
  // What "Add to routine" does: the new step, plus existing steps moved to other nights.
  plan: { step: RoutineStep; reschedule: { stepId: string; days: number[] }[] } | null
  basis: 'ingredients' | 'name'
  // Partnership slot. Only populated and rendered when config.partnerships is true.
  alternatives?: ProductAlternative[]
}

export type ProductSource = 'photo' | 'barcode' | 'text'

export type ProductCheck = {
  id: string
  date: string
  source: ProductSource
  productName: string
  ingredients: string[]
  verdict: Verdict
  demo: boolean
  added?: boolean
  thread?: { question: string; answer: string }[]
}
