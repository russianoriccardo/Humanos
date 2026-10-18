import { describe, expect, it } from 'vitest'
import { stepFromName } from '../routine'
import { analyzeProduct, applyPlan } from './analyzeProduct'
import { findActives, normalizeIngredient, parseIngredientList } from './ingredients'

const routine = (...names: string[]) => names.map(stepFromName)
const GLOW_TONER = {
  productName: 'Glow toner',
  ingredients: ['Aqua', 'Glycolic Acid', 'Glycerin', 'Aloe Barbadensis Leaf Juice', 'Sodium Hydroxide', 'Parfum'],
}
const DRY = { humidity: 32, uvMax: 3 }
const NORMAL = { humidity: 60, uvMax: 3 }

describe('ingredient parsing', () => {
  it('normalizes INCI names', () => {
    expect(normalizeIngredient('Aqua (Water)')).toBe('aqua')
    expect(normalizeIngredient('PARFUM*')).toBe('parfum')
    expect(normalizeIngredient('Glycolic Acid 7%')).toBe('glycolic acid')
  })

  it('splits a pasted label', () => {
    expect(parseIngredientList('INGREDIENTS: Aqua, Glycerin; Niacinamide\nParfum. May contain: CI 77491')).toEqual([
      'Aqua',
      'Glycerin',
      'Niacinamide',
      'Parfum.',
    ])
  })

  it('finds actives with their position, and ignores fatty alcohols', () => {
    const found = findActives(['Aqua', 'Alcohol Denat.', 'Cetearyl Alcohol', 'Retinol', 'Sodium Hyaluronate'])
    expect(found.map((f) => `${f.active}@${f.position}`)).toEqual(['alcohol@1', 'retinoid@3', 'hydrator@4'])
  })
})

describe('analyzeProduct', () => {
  it('glycolic toner + retinol in the routine + dry air → Use with care, with the three reasons', () => {
    const verdict = analyzeProduct(GLOW_TONER, { goal: 'glow' }, routine('Cleanser', 'Retinol', 'Moisturizer'), DRY)
    expect(verdict.level).toBe('care')
    expect(verdict.reasons).toEqual([
      { kind: 'match', text: 'Glycolic acid (AHA) works toward your goal: glow.' },
      { kind: 'warn', text: 'Clashes with retinol. Never the same night. Alternate them.' },
      { kind: 'warn', text: 'Your skin is tight this week (32% humidity). Start at 2× a week.' },
    ])
    expect(verdict.fit).toBe('Tuesday & Saturday evenings, after cleanser. Retinol moves to the other nights.')
    expect(verdict.plan?.reschedule).toEqual([{ stepId: 'retinol', days: [0, 1, 3, 4, 5] }])
  })

  it('a gentle hydrator is a good fit', () => {
    const v = analyzeProduct(
      { productName: 'Barrier cream', ingredients: ['Aqua', 'Glycerin', 'Ceramide NP', 'Sodium Hyaluronate'] },
      { goal: 'maintain' },
      routine('Cleanser', 'Retinol', 'Moisturizer'),
      NORMAL,
    )
    expect(v.level).toBe('good')
    expect(v.fit).toBe('Morning and evening, after serum.')
  })

  it('a second retinoid is not for you right now, and offers no plan', () => {
    const v = analyzeProduct(
      { productName: 'Night serum', ingredients: ['Aqua', 'Squalane', 'Retinal'] },
      { goal: 'anti-age' },
      routine('Cleanser', 'Retinol', 'Moisturizer'),
      NORMAL,
    )
    expect(v.level).toBe('not-now')
    expect(v.plan).toBeNull()
  })

  it('two warnings and no goal benefit → not for you right now', () => {
    expect(analyzeProduct(GLOW_TONER, { goal: 'maintain' }, routine('Cleanser', 'Retinol', 'Moisturizer'), DRY).level).toBe(
      'not-now',
    )
  })

  it('flags fragrance and alcohol high on the list for sensitive skin', () => {
    const v = analyzeProduct(
      { productName: 'Fresh toner', ingredients: ['Aqua', 'Alcohol Denat.', 'Parfum', 'Glycerin'] },
      { goal: 'sensitivity' },
      routine('Cleanser', 'Moisturizer'),
      NORMAL,
    )
    expect(v.reasons.filter((r) => r.kind === 'warn').map((r) => r.text)).toEqual([
      'Fragrance is high on the list, a common trigger for sensitive skin.',
      'Denatured alcohol is high on the list. It can sting and dry sensitive skin.',
    ])
    expect(v.level).toBe('not-now')
  })

  it('without conflicts an AHA goes three nights a week', () => {
    const v = analyzeProduct(GLOW_TONER, { goal: 'glow' }, routine('Cleanser', 'Moisturizer'), NORMAL)
    expect(v.level).toBe('good')
    expect(v.fit).toBe('Monday, Wednesday & Friday evenings, after cleanser.')
  })

  it('vitamin C goes to mornings', () => {
    const v = analyzeProduct({ productName: 'Vitamin C serum', ingredients: [] }, { goal: 'glow' }, routine('Cleanser'), NORMAL)
    expect(v.basis).toBe('name')
    expect(v.fit).toBe('Mornings, after cleanser and before SPF.')
  })

  it('reads actives from the name when there is no ingredient list', () => {
    const v = analyzeProduct({ productName: 'Glow toner · 7% glycolic acid', ingredients: [] }, { goal: 'glow' }, [], NORMAL)
    expect(v.actives).toEqual(['aha'])
  })

  it('Add to routine inserts the step and moves the clashing active', () => {
    const r = routine('Cleanser', 'Retinol', 'Moisturizer')
    const v = analyzeProduct(GLOW_TONER, { goal: 'glow' }, r, DRY)
    const next = applyPlan(r, v.plan!)
    expect(next.map((s) => `${s.name}${s.days ? ` [${s.days.join('')}]` : ''}`)).toEqual([
      'Cleanser',
      'Glow toner [26]',
      'Retinol [01345]',
      'Moisturizer',
    ])
  })
})
