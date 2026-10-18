// Client for the read-product Netlify Function. Product photos go there to be read; face photos never do.
// When the function can't be reached at all (local dev, the GitHub Pages build), it falls back to the
// same demo extraction the function uses without an API key, flagged `demo: true`.
import { config } from '../config'

const FUNCTION_URL = `${config.apiBase}/.netlify/functions/read-product`
const MAX_EDGE = 1600

export type ReadResult = { productName: string; ingredients: string[]; demo: boolean }
export type AskContext = {
  productName: string
  ingredients: string[]
  verdict: { level: string; reasons: string[]; fit: string }
  goal: string | null
  routine: string[]
}

export class ProductAiError extends Error {}

const DEMO_READ: ReadResult = {
  productName: 'Glow toner · 7% glycolic acid',
  ingredients: [
    'Aqua',
    'Glycolic Acid',
    'Rosa Damascena Flower Water',
    'Glycerin',
    'Aloe Barbadensis Leaf Water',
    'Sodium Hydroxide',
    'Panthenol',
    'Tasmannia Lanceolata Fruit/Leaf Extract',
    'Hexylene Glycol',
    'Fragrance',
  ],
  demo: true,
}

function demoAnswer(question: string) {
  return /same night|together|retinol|mix|layer/i.test(question)
    ? 'Not on the same night. Alternate them. The schedule above keeps them apart, so you get both benefits without the irritation.'
    : 'Start slowly with the schedule above and patch-test for 24 hours first. If your skin feels tight, skip a night and moisturize.'
}

// Downscale + re-encode on the device: smaller upload, faster read, and strips EXIF (incl. GPS).
async function toJpegBase64(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  canvas.width = canvas.height = 0
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

async function call<T>(body: unknown, signal?: AbortSignal): Promise<T | 'unreachable'> {
  let response: Response
  try {
    response = await fetch(FUNCTION_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    return 'unreachable'
  }
  // No function deployed on this host (Vite dev server, static hosting).
  if (response.status === 404 || response.status === 405) return 'unreachable'
  const json = (await response.json().catch(() => ({}))) as T & { error?: string }
  if (!response.ok) throw new ProductAiError(json.error ?? "Couldn't read that. Try again.")
  return json
}

export async function readProductPhoto(file: File, signal?: AbortSignal): Promise<ReadResult> {
  const data = await toJpegBase64(file)
  const result = await call<ReadResult>({ mode: 'read', image: { mediaType: 'image/jpeg', data } }, signal)
  return result === 'unreachable' ? DEMO_READ : result
}

export async function askFollowUp(question: string, context: AskContext, signal?: AbortSignal) {
  const result = await call<{ answer: string; demo: boolean }>({ mode: 'ask', question, context }, signal)
  return result === 'unreachable' ? { answer: demoAnswer(question), demo: true } : result
}
