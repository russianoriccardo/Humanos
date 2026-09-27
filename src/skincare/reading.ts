import type { SkinReading, SkincareSetup } from '../state/appState'
import { branchOf } from './catalog'
import type { FrameStats } from './scan/sampler'

/*
 * PROTOTYPE HEURISTIC — NOT A DIAGNOSIS.
 *
 * Face detection and photo-quality checks in this app are real. Clinical skin analysis is not
 * something a browser can do reliably, so this reading is a deterministic rule set built from the
 * user's answers plus two simple frame statistics (T-zone vs cheek brightness, cheek tone spread).
 * It must be replaced by a validated, clinically reviewed model before launch, and must never be
 * presented to users as medical advice.
 */

// T-zone noticeably brighter than cheeks under the same light reads as surface shine.
const SHINE_RATIO = 1.12
// T-zone darker than or close to the cheeks reads as a matte / drier surface.
const MATTE_RATIO = 0.98
// Luminance standard deviation across both cheek patches (0–255 scale).
const UNEVEN_TONE = 14

const GOAL_BASE_TYPE: Record<string, string> = {
  acne: 'Oily-leaning',
  sensitivity: 'Sensitive',
  'anti-age': 'Normal to dry',
  glow: 'Normal',
  maintain: 'Normal',
}

function has(list: string[], item: string) {
  return list.some((entry) => entry.toLowerCase() === item.toLowerCase())
}

export function ownedOrPicked(setup: SkincareSetup) {
  return branchOf(setup.hasRoutine) === 'A' ? setup.products : setup.wantsToStart
}

function skinType(setup: SkincareSetup, stats: FrameStats | null) {
  const base = GOAL_BASE_TYPE[setup.goal ?? 'maintain']
  if (!stats || stats.cheeks <= 0) return base
  const shine = stats.tZone / stats.cheeks
  if (shine >= SHINE_RATIO) return setup.goal === 'acne' ? 'Oily' : 'Combination'
  if (shine <= MATTE_RATIO) return 'Dry'
  return base === 'Oily-leaning' ? 'Combination' : base
}

function notesFor(type: string, setup: SkincareSetup, stats: FrameStats | null) {
  const notes: string[] = []
  const shine = stats && stats.cheeks > 0 ? stats.tZone / stats.cheeks : null

  if (type === 'Combination' || type === 'Normal to dry') notes.push('mild dryness')
  if (type === 'Dry') notes.push('a tight, matte surface')
  if (shine !== null && shine >= SHINE_RATIO) notes.push('shine in the T-zone')
  if (setup.goal === 'acne') notes.push('occasional breakouts')
  if (setup.goal === 'sensitivity') notes.push('reacts easily')
  if (setup.goal === 'glow') notes.push('dullness to lift')
  if (setup.goal === 'anti-age') notes.push('early fine lines')
  if (stats) notes.push(stats.evenness >= UNEVEN_TONE ? 'uneven tone' : 'even tone')
  if (notes.length === 0) notes.push('well balanced')

  return [...new Set(notes)].slice(0, 3)
}

function strengthFor(setup: SkincareSetup) {
  if (branchOf(setup.hasRoutine) === 'B') return 'A clear goal and a clean slate — nothing to undo, nothing conflicting.'
  const products = setup.products
  if (setup.noProducts || products.length === 0) {
    return 'Starting from zero means nothing to undo — every step we add will count.'
  }
  const treats = ['Serum', 'Retinol', 'Toner', 'Exfoliant'].some((p) => has(products, p))
  if (products.length >= 3 && has(products, 'Cleanser') && has(products, 'Moisturizer') && treats) {
    return 'Three products is a real starting point — you already cleanse, treat and moisturise.'
  }
  if (products.length >= 3) {
    return `${products.length} products is a real starting point — the routine exists, we'll tune the order.`
  }
  return `You already have a habit (${products.join(' and ').toLowerCase()}) — and the habit is the hard part.`
}

function gapFor(setup: SkincareSetup) {
  const list = branchOf(setup.hasRoutine) === 'A' ? setup.products : buildRoutine(setup).map((step) => step.product)
  if (!has(list, 'SPF')) return 'No SPF. That is the single biggest lever on how your skin ages.'
  if (!has(list, 'Moisturizer')) return 'No moisturiser yet — your skin barrier is doing all the work alone.'
  if (!has(list, 'Cleanser')) return 'No cleanser — the evening wash is what lets everything else work.'
  if (setup.goal === 'acne' && !has(list, 'Retinol') && !has(list, 'Exfoliant')) {
    return 'Nothing targets breakouts yet — one active, introduced slowly, is the next step.'
  }
  return 'Consistency. The routine is right — doing it nightly is what moves the score.'
}

export function buildReading(setup: SkincareSetup, stats: FrameStats | null): SkinReading {
  const type = skinType(setup, stats)
  return { type, notes: notesFor(type, setup, stats), strength: strengthFor(setup), gap: gapFor(setup) }
}

export function readingHeadline(reading: SkinReading) {
  return `${reading.type} skin,\n${reading.notes[0]}`
}

export type RoutineStep = { product: string; timing: 'Morning' | 'Evening' | 'Morning & evening' }

const SELECTION_PRIORITY = ['Cleanser', 'Moisturizer', 'SPF', 'Serum', 'Retinol', 'Toner', 'Exfoliant', 'Face oil']
const APPLICATION_ORDER = ['Cleanser', 'Toner', 'Serum', 'Retinol', 'Exfoliant', 'Moisturizer', 'Face oil', 'SPF']
const DEFAULT_ROUTINE = ['Cleanser', 'Serum', 'Moisturizer']

function timingOf(product: string): RoutineStep['timing'] {
  if (has(['SPF'], product)) return 'Morning'
  if (has(['Retinol', 'Exfoliant', 'Face oil'], product)) return 'Evening'
  return 'Morning & evening'
}

export function buildRoutine(setup: SkincareSetup): RoutineStep[] {
  const source = setup.noProducts || setup.buildForMe ? [] : ownedOrPicked(setup)
  const rank = (p: string) => {
    const i = SELECTION_PRIORITY.findIndex((known) => known.toLowerCase() === p.toLowerCase())
    return i === -1 ? SELECTION_PRIORITY.length : i
  }
  const chosen = [...source].sort((a, b) => rank(a) - rank(b)).slice(0, 3)
  for (const fallback of DEFAULT_ROUTINE) {
    if (chosen.length >= 3) break
    if (!has(chosen, fallback)) chosen.push(fallback)
  }
  const order = (p: string) => {
    const i = APPLICATION_ORDER.findIndex((known) => known.toLowerCase() === p.toLowerCase())
    return i === -1 ? APPLICATION_ORDER.indexOf('Moisturizer') - 0.5 : i
  }
  return chosen.sort((a, b) => order(a) - order(b)).map((product) => ({ product, timing: timingOf(product) }))
}

export function tonightSteps(setup: SkincareSetup) {
  return buildRoutine(setup)
    .filter((step) => step.timing !== 'Morning')
    .map((step) => step.product)
}

export type DetectionPill = { label: string; landmark: number }

export function detectionPills(type: string, stats: FrameStats): DetectionPill[] {
  const shine = stats.cheeks > 0 ? stats.tZone / stats.cheeks : 1
  const dryCheeks = type === 'Combination' || type.toLowerCase().includes('dry')
  return [
    { label: shine >= SHINE_RATIO ? 'T-zone · shine' : 'T-zone · balanced', landmark: 151 },
    { label: dryCheeks ? 'Cheek · dry' : 'Cheek · hydrated', landmark: 205 },
    { label: stats.evenness >= UNEVEN_TONE ? 'Jaw · uneven tone' : 'Jaw · even tone', landmark: 148 },
  ]
}
