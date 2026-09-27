import { useState } from 'react'
import { X } from 'lucide-react'
import { PrimaryButton } from '../components/PrimaryButton'
import { SelectableRow } from '../components/SelectableRow'
import { Chip } from '../components/Chip'
import { HintCard } from '../components/HintCard'
import { SkincareStepScreen } from './SkincareStepScreen'
import { StepTitle } from './StepTitle'
import { MAX_STARTER_PICKS, PRODUCT_CHIPS, branchOf } from './catalog'
import type { SkincareStepProps } from './types'

const COPY = {
  A: {
    title: 'Which products do you use today?',
    subtitle: 'Tap all that apply. Add your own too.',
    none: "I don't use any products yet",
    hint: '3 products is a great start. The AI will suggest what to add — and when.',
  },
  B: {
    title: 'What would you like to start with?',
    subtitle: "Pick up to 3 — we'll keep it simple.",
    none: 'Not sure — build it for me',
    hint: 'A three-step routine is the one people actually keep.',
  },
}

export function InventoryStep({ setup, onChange, onNext, onBack, onSkip }: SkincareStepProps) {
  const branch = branchOf(setup.hasRoutine)
  const isA = branch === 'A'
  const copy = COPY[branch]
  const selected = isA ? setup.products : setup.wantsToStart
  const noneSelected = isA ? setup.noProducts : setup.buildForMe
  const count = selected.length
  const atCap = !isA && count >= MAX_STARTER_PICKS

  const [custom, setCustom] = useState<string[]>(() =>
    [...new Set([...setup.products, ...setup.wantsToStart])].filter((label) => !PRODUCT_CHIPS.includes(label)),
  )
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const chips = [...PRODUCT_CHIPS, ...custom]

  function setSelection(next: string[]) {
    onChange(isA ? { products: next, noProducts: false } : { wantsToStart: next, buildForMe: false })
  }

  function toggle(label: string) {
    if (selected.includes(label)) setSelection(selected.filter((item) => item !== label))
    else if (!atCap) setSelection([...selected, label])
  }

  function toggleNone() {
    if (noneSelected) onChange(isA ? { noProducts: false } : { buildForMe: false })
    else onChange(isA ? { noProducts: true, products: [] } : { buildForMe: true, wantsToStart: [] })
  }

  function addCustom() {
    const label = draft.trim().replace(/\s+/g, ' ')
    if (label) {
      const existing = chips.find((chip) => chip.toLowerCase() === label.toLowerCase())
      if (!existing) setCustom((current) => [...current, label])
      const chip = existing ?? label
      if (!selected.includes(chip) && !atCap) setSelection([...selected, chip])
    }
    setDraft('')
    setAdding(false)
  }

  const ctaLabel =
    count === 0
      ? 'Continue'
      : isA
        ? `Continue · ${count} ${count === 1 ? 'product' : 'products'}`
        : `Continue · ${count} picked`

  return (
    <SkincareStepScreen
      step={2}
      onBack={onBack}
      onSkip={onSkip}
      footer={
        <PrimaryButton onClick={onNext} disabled={count === 0 && !noneSelected}>
          {ctaLabel}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-6">
        <StepTitle
          title={copy.title}
          subtitle={copy.subtitle}
          aside={
            !isA && (
              <p className="shrink-0 text-sm text-muted" aria-live="polite">
                {count} / {MAX_STARTER_PICKS}
              </p>
            )
          }
        />

        <div className="flex flex-col gap-3">
          <div role="group" aria-label={copy.title} className="flex flex-wrap gap-2">
            {chips.map((label) => {
              const isSelected = selected.includes(label)
              return (
                <Chip
                  key={label}
                  variant="soft"
                  label={label}
                  selected={isSelected}
                  disabled={!isSelected && atCap}
                  onClick={() => toggle(label)}
                />
              )
            })}
            {!adding && <Chip variant="dashed" label="Add your own" disabled={atCap} onClick={() => setAdding(true)} />}
          </div>

          {adding && (
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                addCustom()
              }}
            >
              <input
                autoFocus
                value={draft}
                maxLength={24}
                enterKeyHint="done"
                aria-label="Product name"
                placeholder="e.g. Eye cream"
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setDraft('')
                    setAdding(false)
                  }
                }}
                className="h-11 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 text-sm text-text placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="h-11 rounded-full bg-cta px-4 text-sm font-semibold text-cta-text disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Add
              </button>
              <button
                type="button"
                aria-label="Cancel adding a product"
                onClick={() => {
                  setDraft('')
                  setAdding(false)
                }}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <X size={18} />
              </button>
            </form>
          )}

          <SelectableRow tone="tinted" title={copy.none} selected={noneSelected} onClick={toggleNone} />
        </div>

        <HintCard>{copy.hint}</HintCard>
      </div>
    </SkincareStepScreen>
  )
}
