import { useState } from 'react'
import { Check, Info, Plus, X } from 'lucide-react'
import { HintCard } from '../../components/HintCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { StepTitle } from '../../skincare/StepTitle'
import type { Drink } from '../../state/appState'
import { drinkIcon } from '../drinkIcons'
import { BUILT_IN, SETUP_CUSTOM_MAX } from '../drinks'
import { AddDrinkSheet } from './AddDrinkSheet'
import { HydrationStepScreen } from './HydrationStepScreen'
import { totalSteps, type HydrationStepProps } from './steps'

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function InfoRow({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2.5 rounded-[16px] bg-tint p-4 text-sm leading-normal text-text">
      <Info size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
      {children}
    </p>
  )
}

export function InventoryStep({ setup, onChange, onNext, onBack }: HydrationStepProps) {
  const [adding, setAdding] = useState(false)
  const picked = setup.drinks
  const customs = setup.customDrinks
  const full = customs.length >= SETUP_CUSTOM_MAX
  const notCounted = customs.find((d) => !d.counts)

  const toggle = (id: string) => onChange({ drinks: picked.includes(id) ? picked.filter((d) => d !== id) : [...picked, id] })
  const remove = (id: string) =>
    onChange({ customDrinks: customs.filter((d) => d.id !== id), drinks: picked.filter((d) => d !== id) })

  function chip(drink: Drink) {
    const Icon = drinkIcon(drink)
    const on = picked.includes(drink.id)
    const custom = drink.source === 'custom'
    return (
      <span
        key={drink.id}
        className={[
          'inline-flex h-11 items-center rounded-full transition-transform duration-[120ms] motion-safe:active:scale-[0.97]',
          on ? 'border-[1.5px] border-accent bg-tint' : 'border border-border bg-surface',
        ].join(' ')}
      >
        <button
          type="button"
          aria-pressed={on}
          onClick={() => toggle(drink.id)}
          className={`flex h-full items-center gap-1.5 rounded-full pl-3.5 text-sm font-medium text-text ${custom ? 'pr-1' : 'pr-3.5'} ${focusRing}`}
        >
          {on ? <Check size={14} strokeWidth={2.5} className="text-accent-text" aria-hidden /> : <Icon size={15} className="text-accent" aria-hidden />}
          {drink.name}
          <span className={['text-xs', drink.counts ? 'text-muted' : 'text-warning'].join(' ')}>
            {drink.counts ? `${drink.ml} ml` : 'not counted'}
          </span>
        </button>
        {custom && (
          <button
            type="button"
            onClick={() => remove(drink.id)}
            aria-label={`Delete ${drink.name}`}
            className={`-my-px flex h-11 w-11 items-center justify-center rounded-full text-muted ${focusRing}`}
          >
            <X size={14} aria-hidden />
          </button>
        )}
      </span>
    )
  }

  return (
    <HydrationStepScreen
      step={2}
      total={totalSteps(setup)}
      onBack={onBack}
      onSkip={() => {
        onChange({ drinks: [] })
        onNext()
      }}
      footer={
        <div className="flex flex-col items-center gap-2">
          {picked.length === 0 && <p className="text-[13px] text-muted">Pick at least one, or skip for now.</p>}
          <PrimaryButton onClick={onNext} disabled={picked.length === 0}>
            {picked.length ? `Continue · ${picked.length} picked` : 'Continue'}
          </PrimaryButton>
        </div>
      }
      overlay={
        adding && (
          <AddDrinkSheet
            existing={customs}
            onClose={() => setAdding(false)}
            onAdd={(drink) => {
              // Added drinks come in selected.
              onChange({ customDrinks: [...customs, drink], drinks: [...picked, drink.id] })
              setAdding(false)
            }}
          />
        )
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <StepTitle
            title="What do you drink on a normal day?"
            subtitle="Pick all that apply."
            aside={
              <span className={['shrink-0 text-sm font-semibold', picked.length ? 'text-accent-text' : 'text-muted'].join(' ')} aria-live="polite">
                {picked.length} picked
              </span>
            }
          />
          <p className="text-sm text-muted">They become your one tap shortcuts.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {BUILT_IN.map(chip)}
          {customs.map(chip)}
          <button
            type="button"
            disabled={full}
            onClick={() => setAdding(true)}
            className={[
              'inline-flex h-11 items-center gap-1.5 rounded-full border border-dashed border-border-strong px-3.5 text-sm font-medium text-text',
              focusRing,
              full ? 'cursor-not-allowed opacity-45' : '',
            ].join(' ')}
          >
            {full ? (
              `${SETUP_CUSTOM_MAX} of ${SETUP_CUSTOM_MAX} added`
            ) : (
              <>
                <Plus size={15} aria-hidden />
                Add your own
              </>
            )}
          </button>
        </div>

        {full ? (
          <InfoRow>Three of your own is the limit here. Add more later in Hydration.</InfoRow>
        ) : notCounted ? (
          <InfoRow>{`${notCounted.name} is on your list to log, but it doesn't count toward your target.`}</InfoRow>
        ) : (
          <HintCard>Coffee and tea count toward your target too. Only alcohol doesn't.</HintCard>
        )}
      </div>
    </HydrationStepScreen>
  )
}
