import { useRef, useState } from 'react'
import { ArrowUp, Camera, Image as ImageIcon, Paperclip, ScanBarcode, Type, X } from 'lucide-react'
import { SkeletonCard } from '../../components/Skeleton'
import type { AppState, SkincareActive } from '../../state/appState'
import { useWeather } from '../../state/weather'
import { lookupBarcode } from '../../services/productLookup'
import { askFollowUp, ProductAiError, readProductPhoto } from '../../services/productAi'
import { analyzeProduct, applyPlan } from '../engine/analyzeProduct'
import { parseIngredientList } from '../engine/ingredients'
import type { ProductCheck, ProductSource } from '../engine/types'
import { BarcodeScanner } from '../ask/BarcodeScanner'
import { VerdictCard } from '../ask/VerdictCard'
import { LEVEL_COPY } from '../ask/levels'
import { TabIntro } from './TabIntro'

type AskTabProps = {
  state: AppState
  onActiveChange: (fn: (active: SkincareActive) => SkincareActive) => void
  onToast: (message: string) => void
}

type Busy = null | { label: string }
type Notice = null | { text: string; action?: { label: string; run: () => void } }

const MAX_CHECKS = 20
const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

function Tile({ icon: Icon, title, sub, onClick }: { icon: typeof Camera; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-[20px] border border-border bg-surface p-4 text-left transition-transform duration-[120ms] motion-safe:active:scale-[0.98] ${focusRing}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
        <Icon size={19} strokeWidth={1.8} aria-hidden />
      </span>
      <span className="flex flex-col">
        <span className="text-base font-semibold text-text">{title}</span>
        <span className="text-sm text-muted">{sub}</span>
      </span>
    </button>
  )
}

export function AskTab({ state, onActiveChange, onToast }: AskTabProps) {
  const active = state.skincareActive
  const weather = useWeather()
  const usableWeather = weather.status === 'ready' || weather.status === 'stale' ? weather.data : null
  const fileRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [typing, setTyping] = useState(false)
  const [name, setName] = useState('')
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState<Busy>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [composer, setComposer] = useState('')
  const [asking, setAsking] = useState(false)
  if (!active) return null

  const checks = active.productChecks
  const current = checks.find((c) => c.id === focusId) ?? checks[0]
  const earlier = checks.filter((c) => c.id !== current?.id)

  function runCheck(source: ProductSource, productName: string, ingredients: string[], demo: boolean) {
    const verdict = analyzeProduct(
      { productName, ingredients },
      { goal: state.skincare.goal },
      active!.routine,
      { humidity: usableWeather?.current.humidity ?? null, uvMax: usableWeather?.uvMax ?? null },
    )
    const check: ProductCheck = { id: `check-${Date.now()}`, date: new Date().toISOString(), source, productName, ingredients, verdict, demo }
    onActiveChange((a) => ({ ...a, productChecks: [check, ...a.productChecks].slice(0, MAX_CHECKS) }))
    setFocusId(check.id)
    setNotice(null)
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    setBusy({ label: 'Reading the label…' })
    setNotice(null)
    try {
      const result = await readProductPhoto(file)
      if (!result.productName && result.ingredients.length === 0) {
        setNotice({ text: "That doesn't look like a product label. Try a closer photo of the ingredient list.", action: { label: 'Try another photo', run: () => fileRef.current?.click() } })
      } else {
        runCheck('photo', result.productName || 'Unnamed product', result.ingredients, result.demo)
      }
    } catch (error) {
      setNotice({
        text: error instanceof ProductAiError ? error.message : "Couldn't read that photo.",
        action: { label: 'Type the name instead', run: () => setTyping(true) },
      })
    } finally {
      setBusy(null)
    }
  }

  async function onBarcode(code: string) {
    setScanning(false)
    setBusy({ label: 'Looking it up…' })
    setNotice(null)
    try {
      const found = await lookupBarcode(code)
      if (found) runCheck('barcode', found.productName, found.ingredients, false)
      else {
        setNotice({
          text: "We don't know this one yet — snap the ingredient list instead.",
          action: { label: 'Snap the ingredient list', run: () => fileRef.current?.click() },
        })
      }
    } catch {
      setNotice({ text: "Couldn't reach the product database. Snap the ingredient list instead.", action: { label: 'Snap the ingredient list', run: () => fileRef.current?.click() } })
    } finally {
      setBusy(null)
    }
  }

  function submitTyped() {
    const productName = name.trim()
    if (!productName) return
    runCheck('text', productName, pasted.trim() ? parseIngredientList(pasted) : [], false)
    setTyping(false)
    setName('')
    setPasted('')
  }

  function addToRoutine(check: ProductCheck) {
    const plan = check.verdict.plan
    if (!plan) return
    onActiveChange((a) => ({
      ...a,
      routine: applyPlan(a.routine, plan),
      productChecks: a.productChecks.map((c) => (c.id === check.id ? { ...c, added: true } : c)),
    }))
    onToast('Added to your routine')
  }

  async function sendComposer() {
    const text = composer.trim()
    if (!text || asking) return
    // No product yet: treat it as a product name to check.
    if (!current) {
      setComposer('')
      runCheck('text', text, [], false)
      return
    }
    setAsking(true)
    setComposer('')
    const target = current
    try {
      const { answer } = await askFollowUp(text, {
        productName: target.productName,
        ingredients: target.ingredients,
        verdict: { level: target.verdict.level, reasons: target.verdict.reasons.map((r) => r.text), fit: target.verdict.fit },
        goal: state.skincare.goal,
        routine: active!.routine.map((s) => s.name),
      })
      onActiveChange((a) => ({
        ...a,
        productChecks: a.productChecks.map((c) =>
          c.id === target.id ? { ...c, thread: [...(c.thread ?? []), { question: text, answer }] } : c,
        ),
      }))
    } catch (error) {
      setNotice({ text: error instanceof ProductAiError ? error.message : "Couldn't answer that right now." })
      setComposer(text)
    } finally {
      setAsking(false)
    }
  }

  const input =
    'w-full rounded-[14px] border border-border bg-surface px-4 text-base text-text placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none'

  return (
    <div className="flex min-h-full flex-col gap-5">
      <TabIntro
        title="Will it work for my skin?"
        subtitle="Show us any product — we'll check it against your skin, your goal and tonight's routine."
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Product photo"
        onChange={(event) => {
          onPhoto(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      <section className="flex flex-col gap-2.5">
        <Tile icon={ImageIcon} title="Upload a photo" sub="From a reel or ad" onClick={() => fileRef.current?.click()} />
        <p className="px-1 text-xs text-muted">Product photos are sent to our AI to read the label. Face photos never are.</p>
        <Tile icon={ScanBarcode} title="Scan barcode" sub="In a store" onClick={() => setScanning(true)} />
        <Tile icon={Type} title="Type a name" sub="Plus an ingredient list, if you have it" onClick={() => setTyping((v) => !v)} />
        {typing && (
          <form
            className="flex flex-col gap-2 rounded-[20px] border border-border bg-surface p-4"
            onSubmit={(event) => {
              event.preventDefault()
              submitTyped()
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
              Product name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. Glycolic acid toner" className={`${input} h-12`} autoFocus />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
              Ingredient list (optional)
              <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} maxLength={4000} rows={3} placeholder="Paste the INCI list from the box or the website" className={`${input} py-3`} />
            </label>
            <button
              type="submit"
              disabled={!name.trim()}
              className={`mt-1 h-11 rounded-full bg-cta text-sm font-semibold text-cta-text disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 ${focusRing}`}
            >
              Check it
            </button>
          </form>
        )}
      </section>

      {busy && (
        <div aria-live="polite" aria-busy="true" className="flex flex-col gap-2">
          <p className="text-sm font-medium text-text">{busy.label}</p>
          <SkeletonCard lines={4} />
        </div>
      )}

      {notice && !busy && (
        <div role="alert" className="flex flex-col gap-3 rounded-[16px] bg-warning-tint p-4">
          <p className="text-sm text-text">{notice.text}</p>
          <div className="flex flex-wrap gap-2">
            {notice.action && (
              <button type="button" onClick={notice.action.run} className={`h-11 rounded-full bg-surface px-4 text-sm font-semibold text-text ${focusRing}`}>
                {notice.action.label}
              </button>
            )}
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className={`flex h-11 w-11 items-center justify-center rounded-full text-text ${focusRing}`}>
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {current && !busy && (
        <section className="flex flex-col gap-3">
          <Eyebrow>Last check</Eyebrow>
          <VerdictCard
            check={current}
            onAdd={() => addToRoutine(current)}
            onDismiss={() => {
              setFocusId(null)
              onToast('Saved in your checks')
            }}
          />
          {(current.thread ?? []).map((turn, i) => (
            <div key={i} className="flex flex-col gap-2">
              <p className="self-end rounded-[16px] rounded-br-[6px] bg-cta px-4 py-2.5 text-sm text-cta-text">{turn.question}</p>
              <p className="self-start rounded-[16px] rounded-bl-[6px] border border-border bg-surface px-4 py-2.5 text-sm text-text">{turn.answer}</p>
            </div>
          ))}
          {asking && <SkeletonCard lines={2} />}
        </section>
      )}

      {earlier.length > 0 && (
        <section className="flex flex-col gap-2">
          <Eyebrow>Earlier checks</Eyebrow>
          <ul className="flex flex-col divide-y divide-border rounded-[20px] border border-border bg-surface">
            {earlier.map((check) => (
              <li key={check.id}>
                <button
                  type="button"
                  onClick={() => setFocusId(check.id)}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left ${focusRing}`}
                >
                  <span className="min-w-0 truncate text-sm font-semibold text-text">{check.productName}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${LEVEL_COPY[check.verdict.level].badge}`}>
                    {LEVEL_COPY[check.verdict.level].label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-center text-xs text-muted">Guidance, not medical advice. Patch-test anything new for 24 hours.</p>

      {/* Sticky so it stays reachable while the tab scrolls. */}
      <form
        className="sticky bottom-0 mt-auto -mx-1 flex items-center gap-2 bg-bg px-1 pt-2 pb-1"
        onSubmit={(event) => {
          event.preventDefault()
          sendComposer()
        }}
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Attach a product photo"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text ${focusRing}`}
        >
          <Paperclip size={18} />
        </button>
        <input
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          maxLength={500}
          placeholder={current ? 'Ask about this product…' : 'Ask about any product…'}
          aria-label={current ? 'Ask a follow-up question' : 'Product name to check'}
          className={`${input} h-12 min-w-0 flex-1 rounded-full`}
        />
        <button
          type="submit"
          disabled={!composer.trim() || asking}
          aria-label="Send"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cta text-cta-text disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 ${focusRing}`}
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>
      </form>

      {scanning && (
        <BarcodeScanner
          onCode={onBarcode}
          onCancel={() => setScanning(false)}
          onUsePhoto={() => {
            setScanning(false)
            fileRef.current?.click()
          }}
        />
      )}
    </div>
  )
}
