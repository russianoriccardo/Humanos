// Barcode → product name + INCI list, from Open Beauty Facts (open data, no key, CORS-enabled).
// Only the product name is used — never the `brands` field (no brand names in the app).
import { parseIngredientList } from '../skincare/engine/ingredients'

const ENDPOINT = 'https://world.openbeautyfacts.org/api/v2/product'

export type LookupResult = { productName: string; ingredients: string[] } | null

type OffResponse = {
  status?: number
  product?: { product_name?: string; product_name_en?: string; ingredients_text_en?: string; ingredients_text?: string }
}

// null = not in the database (or no ingredient list): the caller falls back to the photo flow.
// Throws on network failure so the UI can say "couldn't reach the database" instead.
export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<LookupResult> {
  const clean = code.replace(/\D/g, '')
  if (clean.length < 8) return null
  const response = await fetch(
    `${ENDPOINT}/${clean}.json?fields=product_name,product_name_en,ingredients_text_en,ingredients_text`,
    { signal },
  )
  // Unknown codes come back as HTTP 404 with a JSON body — that's "not found", not an error.
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Lookup ${response.status}`)
  const json = (await response.json()) as OffResponse
  const p = json.product
  if (json.status !== 1 || !p) return null
  const name = (p.product_name_en || p.product_name || '').trim()
  const ingredients = parseIngredientList(p.ingredients_text_en || p.ingredients_text || '')
  if (!name || ingredients.length === 0) return null
  return { productName: name, ingredients }
}
