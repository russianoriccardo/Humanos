import { describe, expect, it } from 'vitest'
import { checkCustomName, isAlcohol, makeCustom } from './drinks'

describe('isAlcohol', () => {
  it('matches whole words, any case or accent', () => {
    expect(isAlcohol('Red wine')).toBe(true)
    expect(isAlcohol('Birra')).toBe(true)
    expect(isAlcohol('Gin tonic')).toBe(true)
    expect(isAlcohol('Liquoré')).toBe(true)
    expect(isAlcohol('Ginger tea')).toBe(false)
    expect(isAlcohol('Rumble shake')).toBe(false)
    expect(isAlcohol('Oat milk')).toBe(false)
  })
})

describe('checkCustomName', () => {
  const oat = makeCustom('Oat milk', 250, true)

  it('flags empty, too long and duplicate names', () => {
    expect(checkCustomName('   ', [])).toBe('empty')
    expect(checkCustomName('x'.repeat(25), [])).toBe('tooLong')
    expect(checkCustomName('x'.repeat(24), [])).toBeNull()
    expect(checkCustomName('water', [])).toBe('duplicate')
    expect(checkCustomName('OAT MILK', [oat])).toBe('duplicate')
    expect(checkCustomName('Café latte', [makeCustom('Cafe latte', 250, true)])).toBe('duplicate')
    expect(checkCustomName('Kombucha', [oat])).toBeNull()
  })

  it('makes custom drinks with a slug id', () => {
    expect(makeCustom('  Café latte ', 330, true)).toEqual({
      id: 'custom:cafe-latte',
      name: 'Café latte',
      ml: 330,
      counts: true,
      sweet: false,
      source: 'custom',
    })
  })
})
