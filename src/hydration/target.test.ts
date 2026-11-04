import { describe, expect, it } from 'vitest'
import { formatLitres, glassesLabel, recommendTarget, softCheck } from './target'

describe('recommendTarget', () => {
  it.each([
    ['45', 'low', 1500],
    ['58', 'low', 1750],
    ['65', 'low', 2000],
    ['70', 'moderate', 2250],
    ['82', 'high', 3000],
    ['120', 'high', 3500],
  ] as const)('%s kg, %s activity → %i ml', (weight, activity, ml) => {
    expect(recommendTarget(weight, activity)).toMatchObject({ ml, source: 'recommended' })
  })

  it('falls back to 2 L without a usable weight', () => {
    expect(recommendTarget('', null)).toEqual({ ml: 2000, source: 'default', why: '' })
    expect(recommendTarget('12', 'low').source).toBe('default')
  })

  it('explains the number', () => {
    expect(recommendTarget('65', 'low').why).toBe(
      '65 kg × 30 ml is 1.95 L, rounded to 2 L. A low activity day adds nothing. Food covers the rest.',
    )
    expect(recommendTarget('70', 'moderate').why).toBe(
      '70 kg × 30 ml is 2.1 L. A moderate activity day adds 250 ml, so 2.35 L, rounded to 2.25 L. Food covers the rest.',
    )
  })
})

describe('formatting and checks', () => {
  it('formats litres and glasses', () => {
    expect([2000, 1750, 1200, 650, 0].map(formatLitres)).toEqual(['2 L', '1.75 L', '1.2 L', '0.65 L', '0 L'])
    expect(glassesLabel(2000)).toBe('about 8 glasses')
    expect(glassesLabel(250)).toBe('about 1 glass')
  })

  it('soft checks, never in doctor mode', () => {
    expect(softCheck(1250, false)).toBe('low')
    expect(softCheck(4250, false)).toBe('high')
    expect(softCheck(2000, false)).toBeNull()
    expect(softCheck(1200, true)).toBeNull()
  })
})
