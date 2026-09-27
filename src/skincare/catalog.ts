import type { SkincareGoal } from '../state/appState'

export const PRODUCT_CHIPS = ['Cleanser', 'Moisturizer', 'SPF', 'Serum', 'Toner', 'Retinol', 'Face oil', 'Exfoliant']

export const MAX_STARTER_PICKS = 3

export const GOAL_OPTIONS: { id: SkincareGoal; label: string }[] = [
  { id: 'glow', label: 'Glow' },
  { id: 'acne', label: 'Acne' },
  { id: 'anti-age', label: 'Anti-age' },
  { id: 'sensitivity', label: 'Sensitivity' },
  { id: 'maintain', label: 'Just maintain' },
]

// Skip on S1 leaves hasRoutine null; treat that as "starting fresh" so later screens always have a branch.
export function branchOf(hasRoutine: boolean | null): 'A' | 'B' {
  return hasRoutine === true ? 'A' : 'B'
}
