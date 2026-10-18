import { Check, CircleAlert } from 'lucide-react'
import { config } from '../../config'
import type { ProductCheck } from '../engine/types'
import { LEVEL_COPY } from './levels'

type VerdictCardProps = {
  check: ProductCheck
  onAdd: () => void
  onDismiss: () => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const SOURCE_LABEL = { photo: 'From a photo', barcode: 'From a barcode', text: 'From the name' } as const

export function VerdictCard({ check, onAdd, onDismiss }: VerdictCardProps) {
  const { verdict } = check
  const level = LEVEL_COPY[verdict.level]

  return (
    <article className="flex flex-col gap-4 rounded-[20px] border border-border bg-surface p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${level.badge}`}>{level.label}</span>
          {check.demo && (
            <span className="rounded-full border border-dashed border-muted px-2.5 py-0.5 text-xs font-semibold text-text">
              Demo mode
            </span>
          )}
        </div>
        <h3 className="text-lg leading-snug font-bold text-text">{check.productName}</h3>
        <p className="text-xs text-muted">
          {SOURCE_LABEL[check.source]}
          {verdict.basis === 'name' ? ' · based on the name only. Add the ingredient list for a precise check' : ` · ${check.ingredients.length} ingredients read`}
        </p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {verdict.reasons.map((reason) => (
          <li key={reason.text} className="flex items-start gap-2.5 text-sm leading-relaxed text-text">
            {reason.kind === 'match' ? (
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent" aria-label="Good">
                <Check size={12} strokeWidth={3} aria-hidden />
              </span>
            ) : (
              <CircleAlert size={20} className="mt-0.5 shrink-0 text-warning" aria-label="Caution" />
            )}
            {reason.text}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 rounded-[14px] bg-tint p-3">
        <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">How it would fit</p>
        <p className="text-sm text-text">{verdict.fit}</p>
      </div>

      {/*
        Partnership slot — switched off. When config.partnerships is turned on, EVERY item with
        sponsored: true must carry a visible "Sponsored" label next to its name. No exceptions.
      */}
      {config.partnerships && verdict.alternatives?.length ? (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">Alternatives</p>
          {verdict.alternatives.map((alt) => (
            <div key={alt.name} className="rounded-[14px] border border-border p-3 text-sm text-text">
              <span className="font-semibold">{alt.name}</span>
              {alt.sponsored && <span className="ml-2 rounded bg-tint px-1.5 py-0.5 text-xs font-semibold">Sponsored</span>}
              <p className="text-muted">{alt.reason}</p>
            </div>
          ))}
        </div>
      ) : null}

      {check.added ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-text">
          <Check size={16} strokeWidth={2.5} className="text-accent" aria-hidden />
          Added to your routine
        </p>
      ) : (
        <div className="flex gap-2">
          {verdict.plan && (
            <button
              type="button"
              onClick={onAdd}
              className={`h-11 flex-1 rounded-full bg-cta px-4 text-sm font-semibold text-cta-text transition-transform duration-[120ms] motion-safe:active:scale-[0.97] ${focusRing}`}
            >
              Add to routine
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className={`h-11 flex-1 rounded-full border border-border px-4 text-sm font-semibold text-text ${focusRing}`}
          >
            Not now
          </button>
        </div>
      )}
    </article>
  )
}
