// Drinks: the built in list, custom drinks and the alcohol check. Alcohol is logged, never counted.
import type { Drink } from '../state/appState'

export const QUICK_LOG_MAX = 8
export const SETUP_CUSTOM_MAX = 3
export const NAME_MAX = 24

const builtin = (id: string, name: string, ml: number, sweet = false): Drink => ({ id, name, ml, counts: true, sweet, source: 'builtin' })

export const BUILT_IN: Drink[] = [
  builtin('water', 'Water', 250),
  builtin('coffee', 'Coffee', 150),
  builtin('tea', 'Tea', 250),
  builtin('sparkling', 'Sparkling water', 330),
  builtin('juice', 'Juice', 200, true),
  builtin('sports', 'Sports drink', 500, true),
]

export const WATER = BUILT_IN[0]

const ALCOHOL = new Set([
  'beer', 'wine', 'prosecco', 'spritz', 'cocktail', 'gin', 'vodka', 'rum', 'whisky', 'whiskey', 'cider', 'sake',
  'birra', 'vino', 'aperitivo', 'amaro', 'liquore',
])

// Lowercase, accents stripped, trimmed: how names are compared.
export const normalizeName = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Whole words only: "Ginger tea" isn't gin, "Red wine" is wine.
export function isAlcohol(name: string) {
  return normalizeName(name)
    .split(/[^a-z]+/)
    .some((word) => ALCOHOL.has(word))
}

export type NameProblem = 'empty' | 'tooLong' | 'duplicate'

export function checkCustomName(name: string, existing: Drink[]): NameProblem | null {
  const trimmed = name.trim()
  if (!trimmed) return 'empty'
  if (trimmed.length > NAME_MAX) return 'tooLong'
  const key = normalizeName(trimmed)
  return [...BUILT_IN, ...existing].some((d) => normalizeName(d.name) === key) ? 'duplicate' : null
}

const slug = (name: string) =>
  normalizeName(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function makeCustom(name: string, ml: number, counts: boolean): Drink {
  return { id: `custom:${slug(name)}`, name: name.trim(), ml, counts, sweet: false, source: 'custom' }
}
