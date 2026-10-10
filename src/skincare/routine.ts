import type { SkincareSetup } from '../state/appState'
import { branchOf } from './catalog'

// Ingredient-level actives the engine reasons about.
export type Active =
  | 'retinoid'
  | 'aha'
  | 'bha'
  | 'bpo'
  | 'vitamin-c'
  | 'niacinamide'
  | 'peptides'
  | 'hydrator'
  | 'ceramides'
  | 'spf'
  | 'oil'
  | 'fragrance'
  | 'alcohol'

export type StepKind = 'cleanser' | 'toner' | 'serum' | 'treatment' | 'moisturizer' | 'oil' | 'spf'

export type RoutineStep = {
  id: string
  name: string
  when: 'am' | 'pm' | 'both'
  active: Active[]
  kind: StepKind
  // Weekdays (0 = Sunday) for steps that aren't nightly; absent = every day.
  days?: number[]
}

// Application order within a routine.
export const KIND_ORDER: StepKind[] = ['cleanser', 'toner', 'serum', 'treatment', 'moisturizer', 'oil', 'spf']

type ProductInfo = { kind: StepKind; active: Active[]; when: RoutineStep['when'] }

const KNOWN: Record<string, ProductInfo> = {
  cleanser: { kind: 'cleanser', active: [], when: 'both' },
  toner: { kind: 'toner', active: [], when: 'both' },
  serum: { kind: 'serum', active: [], when: 'both' },
  retinol: { kind: 'treatment', active: ['retinoid'], when: 'pm' },
  exfoliant: { kind: 'treatment', active: ['aha'], when: 'pm' },
  moisturizer: { kind: 'moisturizer', active: ['hydrator'], when: 'both' },
  'face oil': { kind: 'oil', active: ['oil'], when: 'pm' },
  spf: { kind: 'spf', active: ['spf'], when: 'am' },
}

// Custom product names: infer the step from keywords.
const KEYWORD_KIND: [RegExp, StepKind][] = [
  [/clean|wash|micellar/i, 'cleanser'],
  [/toner|essence|mist/i, 'toner'],
  [/spf|sunscreen|sun cream|sunblock/i, 'spf'],
  [/oil/i, 'oil'],
  [/retin|peel|exfoli|acid|aha|bha/i, 'treatment'],
  [/cream|moistur|balm|lotion|gel/i, 'moisturizer'],
]

export function slug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'step'
}

export function stepFromName(name: string): RoutineStep {
  const known = KNOWN[name.toLowerCase().trim()]
  if (known) return { id: slug(name), name, ...known, active: [...known.active] }
  const kind = KEYWORD_KIND.find(([re]) => re.test(name))?.[1] ?? 'serum'
  const when: RoutineStep['when'] = kind === 'spf' ? 'am' : kind === 'treatment' || kind === 'oil' ? 'pm' : 'both'
  return { id: slug(name), name, kind, when, active: kind === 'spf' ? ['spf'] : kind === 'oil' ? ['oil'] : [] }
}

export function timingLabel(when: RoutineStep['when']) {
  return when === 'am' ? 'Morning' : when === 'pm' ? 'Evening' : 'Morning & evening'
}

export function byApplicationOrder(a: RoutineStep, b: RoutineStep) {
  return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
}

// The routine is three evening-capable steps (what "Tonight · x of 3" counts), plus any morning-only
// products they own or picked (SPF) as extra morning steps. Owned actives rank high so the engine has
// something real to adjust (e.g. skipping retinol on a barrier night).
const EVENING_PRIORITY = ['cleanser', 'retinol', 'moisturizer', 'serum', 'exfoliant', 'toner', 'face oil']
// Fill order matters: an active (e.g. retinol) should never ship without a moisturizer.
const DEFAULT_EVENING = ['Cleanser', 'Moisturizer', 'Serum']

export function buildRoutine(setup: SkincareSetup): RoutineStep[] {
  const source =
    setup.noProducts || setup.buildForMe ? [] : branchOf(setup.hasRoutine) === 'A' ? setup.products : setup.wantsToStart
  const steps = source.map(stepFromName)
  const rank = (step: RoutineStep) => {
    const i = EVENING_PRIORITY.indexOf(step.name.toLowerCase())
    return i === -1 ? EVENING_PRIORITY.length : i
  }
  const evening = steps
    .filter((step) => step.when !== 'am')
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 3)
  for (const fallback of DEFAULT_EVENING) {
    if (evening.length >= 3) break
    if (!evening.some((step) => step.id === slug(fallback))) evening.push(stepFromName(fallback))
  }
  const morningOnly = steps.filter((step) => step.when === 'am')
  return [...evening, ...morningOnly].sort(byApplicationOrder)
}

export function isScheduledOn(step: RoutineStep, weekday: number) {
  return !step.days || step.days.includes(weekday)
}

export function eveningSteps(routine: RoutineStep[], weekday: number) {
  return routine.filter((step) => step.when !== 'am' && isScheduledOn(step, weekday)).sort(byApplicationOrder)
}
