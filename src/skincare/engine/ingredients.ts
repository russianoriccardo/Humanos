// INCI ingredient names → the actives the engine reasons about.
import type { Active } from '../routine'

// `common`: in almost every formula, so it never counts as a goal match on its own.
type Entry = { active: Active; label: string; match: RegExp; common?: boolean }

// Order matters only for labels: the first entry that matches an ingredient names it.
const DICTIONARY: Entry[] = [
  { active: 'retinoid', label: 'Retinol', match: /^(retinol|retinal|retinaldehyde|retinyl (palmitate|acetate|propionate|retinoate)|hydroxypinacolone retinoate|tretinoin|adapalene)$/ },
  { active: 'aha', label: 'Glycolic acid (AHA)', match: /^glycolic acid$/ },
  { active: 'aha', label: 'Lactic acid (AHA)', match: /^lactic acid$/ },
  { active: 'aha', label: 'Mandelic acid (AHA)', match: /^(mandelic|malic|tartaric) acid$/ },
  { active: 'bha', label: 'Salicylic acid (BHA)', match: /^(salicylic acid|betaine salicylate|salix (alba|nigra) bark extract)$/ },
  { active: 'bpo', label: 'Benzoyl peroxide', match: /^benzoyl peroxide$/ },
  { active: 'vitamin-c', label: 'Vitamin C', match: /^((3-o-)?ethyl ascorbic acid|ascorbic acid|(sodium|magnesium) ascorbyl phosphate|ascorbyl glucoside|tetrahexyldecyl ascorbate)$/ },
  { active: 'niacinamide', label: 'Niacinamide', match: /^niacinamide$/ },
  { active: 'peptides', label: 'Peptides', match: /peptide/ },
  { active: 'ceramides', label: 'Ceramides', match: /^ceramide/ },
  { active: 'hydrator', label: 'Hyaluronic acid', match: /^(hyaluronic acid|sodium hyaluronate|hydrolyzed hyaluronic acid)$/ },
  { active: 'hydrator', label: 'Glycerin', match: /^(glycerin|glycerol|panthenol|urea|betaine)$/, common: true },
  { active: 'spf', label: 'UV filters', match: /^(zinc oxide|titanium dioxide|avobenzone|butyl methoxydibenzoylmethane|octocrylene|homosalate|ethylhexyl (methoxycinnamate|salicylate|triazone)|bis-ethylhexyloxyphenol methoxyphenyl triazine|diethylamino hydroxybenzoyl hexyl benzoate|tinosorb [sm])$/ },
  { active: 'oil', label: 'Plant oils', match: /\b(seed|kernel|fruit|nut) oil$|^squalane$/ },
  { active: 'fragrance', label: 'Fragrance', match: /^(parfum|fragrance|aroma|linalool|limonene|citronellol|geraniol|eugenol|coumarin|citral)$/ },
  // Only drying alcohols. Fatty alcohols (cetyl, stearyl, cetearyl) are emollients and don't count.
  { active: 'alcohol', label: 'Denatured alcohol', match: /^(alcohol denat|alcohol|denatured alcohol|sd alcohol( \d+[a-z-]*)?|ethanol)$/ },
]

export const ACTIVE_LABEL: Record<Active, string> = {
  retinoid: 'Retinol',
  aha: 'AHA',
  bha: 'BHA',
  bpo: 'Benzoyl peroxide',
  'vitamin-c': 'Vitamin C',
  niacinamide: 'Niacinamide',
  peptides: 'Peptides',
  ceramides: 'Ceramides',
  hydrator: 'Hydrators',
  spf: 'UV filters',
  oil: 'Plant oils',
  fragrance: 'Fragrance',
  alcohol: 'Denatured alcohol',
}

export type FoundActive = { active: Active; label: string; ingredient: string; position: number; common?: boolean }

// "Aqua (Water)", "PARFUM*", "Glycerin." → comparable names.
export function normalizeIngredient(raw: string) {
  return raw
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\d+(\.\d+)?\s*%/g, ' ')
    .replace(/[*.†‡]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Splits a pasted / OCR'd INCI list into names.
export function parseIngredientList(text: string): string[] {
  const body = text.replace(/^[\s\S]*?\bingredients?\s*[:：]/i, '').replace(/\bmay contain\b[\s\S]*$/i, '')
  return body
    .split(/[,;\n•·]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1 && part.length < 80)
}

export function findActives(ingredients: string[]): FoundActive[] {
  const found: FoundActive[] = []
  ingredients.forEach((raw, position) => {
    const name = normalizeIngredient(raw)
    const entry = DICTIONARY.find((e) => e.match.test(name))
    if (entry) found.push({ active: entry.active, label: entry.label, ingredient: raw.trim(), position, common: entry.common })
  })
  return found
}

// Without an ingredient list: read actives off the product name ("Glow toner · 7% glycolic acid").
const NAME_HINTS: [RegExp, Active, string][] = [
  [/retin(ol|al|oid)|tretinoin|adapalene/i, 'retinoid', 'Retinol'],
  [/glycolic/i, 'aha', 'Glycolic acid (AHA)'],
  [/lactic|mandelic|\baha\b/i, 'aha', 'AHA'],
  [/salicylic|\bbha\b/i, 'bha', 'Salicylic acid (BHA)'],
  [/benzoyl/i, 'bpo', 'Benzoyl peroxide'],
  [/vitamin\s*c|ascorb/i, 'vitamin-c', 'Vitamin C'],
  [/niacinamide/i, 'niacinamide', 'Niacinamide'],
  [/peptide/i, 'peptides', 'Peptides'],
  [/hyaluronic/i, 'hydrator', 'Hyaluronic acid'],
  [/ceramide/i, 'ceramides', 'Ceramides'],
  [/\bspf\b|sunscreen|sun cream/i, 'spf', 'UV filters'],
  [/\boil\b/i, 'oil', 'Plant oils'],
]

export function activesFromName(name: string): FoundActive[] {
  const found: FoundActive[] = []
  for (const [re, active, label] of NAME_HINTS) {
    if (re.test(name) && !found.some((f) => f.active === active)) found.push({ active, label, ingredient: label, position: 0 })
  }
  return found
}
