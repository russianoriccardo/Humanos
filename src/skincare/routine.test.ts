import { describe, expect, it } from 'vitest'
import { initialSkincare, type SkincareSetup } from '../state/appState'
import { buildRoutine, eveningSteps, stepFromName } from './routine'

const setup = (patch: Partial<SkincareSetup>): SkincareSetup => ({ ...initialSkincare, ...patch })
const names = (s: SkincareSetup) => buildRoutine(s).map((step) => `${step.name}:${step.when}`)

describe('buildRoutine', () => {
  it('keeps an owned retinol in the evening three and SPF as a morning extra', () => {
    expect(names(setup({ hasRoutine: true, products: ['Cleanser', 'Retinol', 'Moisturizer', 'SPF'] }))).toEqual([
      'Cleanser:both',
      'Retinol:pm',
      'Moisturizer:both',
      'SPF:am',
    ])
  })

  it('always gives three evening steps, filling from the default routine', () => {
    const routine = buildRoutine(setup({ hasRoutine: false, wantsToStart: ['SPF', 'Retinol'] }))
    expect(eveningSteps(routine, 1).map((s) => s.name)).toEqual(['Cleanser', 'Retinol', 'Moisturizer'])
    expect(routine.some((s) => s.name === 'SPF' && s.when === 'am')).toBe(true)
  })

  it('uses Cleanser → Serum → Moisturizer when nothing was picked', () => {
    expect(names(setup({ hasRoutine: false, buildForMe: true }))).toEqual([
      'Cleanser:both',
      'Serum:both',
      'Moisturizer:both',
    ])
    expect(names(setup({ hasRoutine: true, noProducts: true }))).toEqual(['Cleanser:both', 'Serum:both', 'Moisturizer:both'])
  })

  it('maps known products to actives', () => {
    expect(stepFromName('Retinol').active).toEqual(['retinoid'])
    expect(stepFromName('Exfoliant').active).toEqual(['aha'])
    expect(stepFromName('Face oil')).toMatchObject({ kind: 'oil', when: 'pm' })
  })

  it('infers custom products from keywords', () => {
    expect(stepFromName('Glow toner')).toMatchObject({ kind: 'toner', when: 'both' })
    expect(stepFromName('Mineral sunscreen')).toMatchObject({ kind: 'spf', when: 'am' })
    expect(stepFromName('Eye cream')).toMatchObject({ kind: 'moisturizer', id: 'eye-cream' })
  })

  it('respects weekday schedules', () => {
    const routine = [{ ...stepFromName('Exfoliant'), days: [2, 6] }, stepFromName('Cleanser')]
    expect(eveningSteps(routine, 2).map((s) => s.name)).toEqual(['Cleanser', 'Exfoliant'])
    expect(eveningSteps(routine, 3).map((s) => s.name)).toEqual(['Cleanser'])
  })
})
