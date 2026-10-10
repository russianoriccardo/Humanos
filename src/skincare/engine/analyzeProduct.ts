/*
 * "Will it work for my skin?" — deterministic, on-device. The AI only ever reads a label; the verdict
 * always comes from these rules. Guidance, not medical advice.
 */
import type { SkincareGoal } from '../../state/appState'
import { byApplicationOrder, slug, stepFromName, type Active, type RoutineStep, type StepKind } from '../routine'
import { activesFromName, findActives, type FoundActive } from './ingredients'
import { rules } from './rules.config'
import type { Verdict, VerdictLevel, VerdictReason } from './types'

export type ProductInput = { productName: string; ingredients: string[] }
export type Profile = { goal: SkincareGoal | null }
export type TodayConditions = { humidity: number | null; uvMax: number | null }

const P = rules.product

const GOAL_ACTIVES: Record<SkincareGoal, Active[]> = {
  glow: ['aha', 'vitamin-c'],
  acne: ['bha', 'bpo', 'niacinamide'],
  'anti-age': ['retinoid', 'peptides'],
  sensitivity: ['ceramides'],
  maintain: ['hydrator', 'ceramides', 'spf'],
}

const GOAL_LABEL: Record<SkincareGoal, string> = {
  glow: 'glow',
  acne: 'clearer skin',
  'anti-age': 'anti-aging',
  sensitivity: 'calmer skin',
  maintain: 'keeping your skin balanced',
}

const EXFOLIANTS: Active[] = ['aha', 'bha']
const STRONG: Active[] = ['retinoid', 'aha', 'bha']

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function joinDays(days: number[]) {
  const names = days.map((d) => DAY_NAMES[d])
  return names.length <= 2 ? names.join(' & ') : `${names.slice(0, -1).join(', ')} & ${names.at(-1)}`
}

const has = (found: FoundActive[], ...actives: Active[]) => found.some((f) => actives.includes(f.active))

function routineWith(routine: RoutineStep[], ...actives: Active[]) {
  return routine.find((step) => step.active.some((a) => actives.includes(a)))
}

const POSITION_PHRASE: Record<StepKind, string> = {
  cleanser: 'as your first step',
  toner: 'after cleanser',
  serum: 'after cleanser',
  treatment: 'after cleanser',
  moisturizer: 'after serum',
  oil: 'as the last step',
  spf: 'as the last step',
}

export function analyzeProduct(input: ProductInput, profile: Profile, routine: RoutineStep[], today: TodayConditions): Verdict {
  const basis = input.ingredients.length ? 'ingredients' : 'name'
  const found = basis === 'ingredients' ? findActives(input.ingredients) : activesFromName(input.productName)
  const actives = [...new Set(found.map((f) => f.active))]
  const reasons: VerdictReason[] = []
  let blocking = false

  // ✓ Goal match
  const goal = profile.goal
  if (goal) {
    const wanted = GOAL_ACTIVES[goal]
    const hit = found.find((f) => wanted.includes(f.active) && !f.common)
    if (hit) reasons.push({ kind: 'match', text: `${hit.label} works toward your goal: ${GOAL_LABEL[goal]}.` })
    else if (goal === 'sensitivity' && basis === 'ingredients' && !has(found, 'fragrance')) {
      reasons.push({ kind: 'match', text: 'Fragrance-free — the safest kind of formula for sensitive skin.' })
    }
  }

  // ! Conflicts with what's already in the routine
  const routineRetinoid = routineWith(routine, 'retinoid')
  const routineAcid = routineWith(routine, ...EXFOLIANTS)
  if (has(found, 'retinoid') && routineRetinoid) {
    reasons.push({ kind: 'warn', text: `You already use ${routineRetinoid.name.toLowerCase()}. Two retinoids at once is too much — pick one.` })
    blocking = true
  } else if (has(found, ...EXFOLIANTS) && routineRetinoid) {
    reasons.push({ kind: 'warn', text: `Clashes with ${routineRetinoid.name.toLowerCase()}. Never the same night — alternate them.` })
  } else if (has(found, 'retinoid') && routineAcid) {
    reasons.push({ kind: 'warn', text: `Clashes with your ${routineAcid.name.toLowerCase()}. Never the same night — alternate them.` })
  }
  if (has(found, ...EXFOLIANTS) && routineAcid) {
    reasons.push({ kind: 'warn', text: `You already exfoliate with ${routineAcid.name.toLowerCase()}. Doubling up thins your barrier — swap, don't add.` })
    blocking = true
  }
  if (has(found, 'bpo') && routineRetinoid) {
    reasons.push({ kind: 'warn', text: `Benzoyl peroxide deactivates ${routineRetinoid.name.toLowerCase()}. Mornings for this, nights for that.` })
  }
  if (has(found, 'vitamin-c') && (routineAcid || routineRetinoid)) {
    reasons.push({ kind: 'warn', text: 'Vitamin C works best away from acids and retinol — keep it to mornings.' })
  }

  // ! Today's conditions
  if (has(found, ...STRONG) && today.humidity !== null && today.humidity < rules.today.dryHumidityBelow) {
    reasons.push({ kind: 'warn', text: `Your skin is tight this week (${today.humidity}% humidity). Start at 2× a week.` })
  }
  if (has(found, ...STRONG) && today.uvMax !== null && today.uvMax >= rules.today.uvReapplyMin) {
    reasons.push({ kind: 'warn', text: `UV is high today (${Math.round(today.uvMax)}). This makes skin sun-sensitive — evenings only, and never skip SPF.` })
  }

  // ! Sensitive skin + irritants high on the list
  if (goal === 'sensitivity') {
    const high = (a: Active) => found.some((f) => f.active === a && f.position < P.highInListTop)
    if (high('fragrance')) reasons.push({ kind: 'warn', text: 'Fragrance is high on the list — a common trigger for sensitive skin.' })
    if (high('alcohol')) reasons.push({ kind: 'warn', text: 'Denatured alcohol is high on the list — it can sting and dry sensitive skin.' })
    if ((high('fragrance') || high('alcohol')) && has(found, ...STRONG)) blocking = true
  }

  if (!reasons.some((r) => r.kind === 'warn') && !reasons.some((r) => r.kind === 'match')) {
    reasons.push({ kind: 'match', text: "Nothing in it clashes with your routine or today's conditions." })
  }

  const warnings = reasons.filter((r) => r.kind === 'warn').length
  const matched = reasons.some((r) => r.kind === 'match' && !r.text.startsWith('Nothing in it'))
  const level: VerdictLevel =
    warnings === 0 ? 'good' : blocking || (warnings >= P.notNowWarnings && !matched) ? 'not-now' : 'care'

  const { fit, plan } = schedule(input.productName, found, routine, today, level)
  return { level, actives, reasons, fit, plan, basis }
}

function schedule(name: string, found: FoundActive[], routine: RoutineStep[], today: TodayConditions, level: VerdictLevel) {
  const base = stepFromName(name)
  const strong = has(found, ...STRONG)
  const kind = base.kind
  const actives = [...new Set(found.filter((f) => f.active !== 'fragrance' && f.active !== 'alcohol').map((f) => f.active))]
  let id = slug(name)
  while (routine.some((s) => s.id === id)) id = `${id}-new`
  const step: RoutineStep = { id, name, kind, active: actives, when: base.when }
  const reschedule: { stepId: string; days: number[] }[] = []
  const where = POSITION_PHRASE[kind]
  let fit: string

  if (has(found, 'spf') || kind === 'spf') {
    step.when = 'am'
    fit = 'Every morning, as the last step.'
  } else if (has(found, 'bpo')) {
    step.when = routineWith(routine, 'retinoid') ? 'am' : 'pm'
    fit = step.when === 'am' ? `Mornings, ${where} — away from your retinol at night.` : `Evenings, ${where}.`
  } else if (has(found, 'vitamin-c')) {
    step.when = 'am'
    fit = `Mornings, ${where} and before SPF.`
  } else if (strong) {
    step.when = 'pm'
    const clash = has(found, 'retinoid') ? routineWith(routine, ...EXFOLIANTS) : routineWith(routine, 'retinoid')
    const dry = today.humidity !== null && today.humidity < rules.today.dryHumidityBelow
    const days: number[] = clash || dry ? [...P.gentleDays] : [...P.regularDays]
    step.days = days
    fit = `${joinDays(days)} evenings, ${where}.`
    if (clash) {
      const other = [0, 1, 2, 3, 4, 5, 6].filter((d) => !days.includes(d))
      reschedule.push({ stepId: clash.id, days: other })
      fit += ` ${clash.name} moves to the other nights.`
    }
  } else if (step.when === 'pm') {
    fit = `Every evening, ${where}.`
  } else {
    fit = kind === 'cleanser' ? 'Morning and evening, as your first step.' : `Morning and evening, ${where}.`
  }

  return { fit, plan: level === 'not-now' ? null : { step, reschedule } }
}

// What "Add to routine" does to the routine.
export function applyPlan(routine: RoutineStep[], plan: NonNullable<Verdict['plan']>): RoutineStep[] {
  const moved = routine.map((s) => {
    const change = plan.reschedule.find((r) => r.stepId === s.id)
    return change ? { ...s, days: change.days } : s
  })
  return [...moved, plan.step].sort(byApplicationOrder)
}
