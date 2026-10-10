import type { SkincareGoal } from '../../state/appState'
import type { RoutineStep } from '../routine'
import { analyzeProduct, type TodayConditions } from '../engine/analyzeProduct'
import type { Verdict } from '../engine/types'

// Typed name, no ingredient list: anything mentioning glycolic or toner is treated as a glycolic-acid
// toner (the demo case: goal match, retinol clash, start 2× a week); everything else is read from the
// name alone, which for most names means a generic "Good fit".
export function typedNameVerdict(name: string, goal: SkincareGoal | null, routine: RoutineStep[], today: TodayConditions): Verdict {
  if (!/glycolic|toner/i.test(name)) {
    return analyzeProduct({ productName: name, ingredients: [] }, { goal }, routine, today)
  }
  const realDry = today.humidity !== null && today.humidity < 40
  const verdict = analyzeProduct(
    { productName: name, ingredients: ['Glycolic Acid'] },
    { goal },
    routine,
    { ...today, humidity: realDry ? today.humidity : 35 },
  )
  // Don't show a humidity number we didn't measure.
  const reasons = realDry
    ? verdict.reasons
    : verdict.reasons.map((r) =>
        r.text.startsWith('Your skin is tight') ? { ...r, text: 'Acids dry skin out at first. Start at 2× a week.' } : r,
      )
  return { ...verdict, reasons, basis: 'name' }
}
