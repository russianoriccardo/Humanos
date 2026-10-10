import { describe, expect, it, vi } from 'vitest'
import { handle, type ClaudeClient } from '../functions/read-product'

const SITE = 'https://humanos-demo.netlify.app'
const env = (apiKey?: string) => ({ apiKey, allowedOrigins: [SITE] })

function post(body: unknown, origin: string | null = SITE) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (origin) headers.origin = origin
  return new Request('https://x/.netlify/functions/read-product', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const image = { mediaType: 'image/jpeg', data: 'aGVsbG8=' }
const context = {
  productName: 'Glow toner',
  ingredients: ['Aqua', 'Glycolic Acid'],
  verdict: { level: 'care', reasons: ['Clashes with retinol.'], fit: 'Tuesday & Saturday evenings.' },
  goal: 'glow',
  routine: ['Cleanser', 'Retinol', 'Moisturizer'],
}

function fakeClient(over: { parse?: unknown; create?: unknown } = {}) {
  const parse = vi.fn().mockResolvedValue(
    over.parse ?? { stop_reason: 'end_turn', parsed_output: { productName: 'Glow toner', brandGuess: null, ingredients: ['Aqua', 'Glycolic Acid'] } },
  )
  const create = vi.fn().mockResolvedValue(
    over.create ?? { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Alternate them.' }] },
  )
  return { client: { messages: { parse, create } } as unknown as ClaudeClient, parse, create }
}

describe('read-product function', () => {
  it('demo mode without a key: fixed glycolic toner extraction', async () => {
    const res = await handle(post({ mode: 'read', image }), env(), () => fakeClient().client)
    const body = (await res.json()) as { demo: boolean; productName: string; ingredients: string[] }
    expect(res.status).toBe(200)
    expect(body.demo).toBe(true)
    expect(body.productName).toBe('Glow toner · 7% glycolic acid')
    expect(body.ingredients).toContain('Glycolic Acid')
  })

  it('reads a label with claude-sonnet-5 and structured output, image first', async () => {
    const fake = fakeClient()
    const res = await handle(post({ mode: 'read', image }), env('sk-test'), () => fake.client)
    expect(await res.json()).toEqual({ productName: 'Glow toner', ingredients: ['Aqua', 'Glycolic Acid'], demo: false })
    const params = fake.parse.mock.calls[0][0]
    expect(params.model).toBe('claude-sonnet-5')
    expect(params.output_config.format).toBeDefined()
    expect(params.messages[0].content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'aGVsbG8=' } })
    expect(params.system).toMatch(/never instructions/)
  })

  it('reports an unreadable label instead of guessing', async () => {
    const fake = fakeClient({ parse: { stop_reason: 'refusal', parsed_output: null } })
    const res = await handle(post({ mode: 'read', image }), env('sk-test'), () => fake.client)
    expect(res.status).toBe(422)
  })

  it('validates input', async () => {
    const h = (body: unknown) => handle(post(body), env('sk-test'), () => fakeClient().client)
    expect((await h('not json')).status).toBe(400)
    expect((await h({ mode: 'read', image: { mediaType: 'image/svg+xml', data: 'x' } })).status).toBe(400)
    expect((await h({ mode: 'read', image: { mediaType: 'image/png', data: 'a'.repeat(6_000_001) } })).status).toBe(413)
    expect((await h({ mode: 'ask', question: 'x'.repeat(501), context })).status).toBe(400)
    expect((await h({ mode: 'other' })).status).toBe(400)
    const get = await handle(new Request('https://x/', { method: 'GET' }), env(), () => fakeClient().client)
    expect(get.status).toBe(405)
  })

  it('rejects other websites, allows its own with CORS', async () => {
    const evil = await handle(post({ mode: 'read', image }, 'https://evil.example'), env(), () => fakeClient().client)
    expect(evil.status).toBe(403)
    const ok = await handle(post({ mode: 'read', image }), env(), () => fakeClient().client)
    expect(ok.headers.get('access-control-allow-origin')).toBe(SITE)
  })

  it('answers follow-ups, with the verdict as context', async () => {
    const fake = fakeClient()
    const res = await handle(post({ mode: 'ask', question: 'Can I use it with retinol?', context }), env('sk-test'), () => fake.client)
    expect(await res.json()).toEqual({ answer: 'Alternate them.', demo: false })
    const params = fake.create.mock.calls[0][0]
    expect(params.max_tokens).toBe(600)
    expect(params.messages[0].content).toContain('Clashes with retinol.')
    expect(params.messages[0].content).toContain('Question: Can I use it with retinol?')
  })

  it('canned answers in demo mode', async () => {
    const res = await handle(post({ mode: 'ask', question: 'Same night as my retinol?', context }), env(), () => fakeClient().client)
    const body = (await res.json()) as { demo: boolean; answer: string }
    expect(body.demo).toBe(true)
    expect(body.answer).toMatch(/Not on the same night/)
  })

  it('never leaks upstream error details', async () => {
    const client = { messages: { parse: vi.fn().mockRejectedValue(new Error('boom sk-ant-secret-123')) } } as unknown as ClaudeClient
    const res = await handle(post({ mode: 'read', image }), env('sk-test'), () => client)
    const text = await res.text()
    expect(res.status).toBe(502)
    expect(text).not.toContain('sk-ant')
  })
})
