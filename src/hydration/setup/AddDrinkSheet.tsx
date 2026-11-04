import { useState } from 'react'
import { HintCard } from '../../components/HintCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { Sheet } from '../../components/Sheet'
import type { Drink } from '../../state/appState'
import { checkCustomName, isAlcohol, makeCustom, NAME_MAX } from '../drinks'

type AddDrinkSheetProps = {
  // Drinks already on the list (built ins are always checked too).
  existing: Drink[]
  onAdd: (drink: Drink) => void
  onClose: () => void
}

const SIZES = [150, 250, 330, 500]
// The character counter appears from here.
const COUNTER_FROM = 18

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function AddDrinkSheet({ existing, onAdd, onClose }: AddDrinkSheetProps) {
  const [name, setName] = useState('')
  // 250 ml is the only default in the setup flow.
  const [ml, setMl] = useState(250)
  const [counts, setCounts] = useState(true)
  const problem = checkCustomName(name, existing)
  const alcohol = isAlcohol(name)

  function rename(next: string) {
    // Typing an alcohol name flips the switch off and drops to a small glass; the user can flip it back.
    if (isAlcohol(next) && !isAlcohol(name)) {
      setCounts(false)
      setMl(150)
    }
    setName(next)
  }

  return (
    <Sheet title="Add a drink" subtitle="Name it the way you'd say it." onClose={onClose}>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="drink-name" className="text-xs font-medium tracking-wide text-muted uppercase">
            Name
          </label>
          {name.length >= COUNTER_FROM && (
            <span className={['text-xs', name.length >= NAME_MAX ? 'text-warning' : 'text-muted'].join(' ')}>
              {name.length} / {NAME_MAX}
            </span>
          )}
        </div>
        <input
          id="drink-name"
          autoFocus
          value={name}
          maxLength={NAME_MAX}
          onChange={(event) => rename(event.target.value)}
          placeholder="e.g. Oat milk"
          aria-invalid={problem === 'duplicate' ? true : undefined}
          aria-describedby={problem === 'duplicate' ? 'drink-name-error' : undefined}
          className={[
            'h-14 w-full rounded-[14px] border bg-surface px-4 text-base text-text placeholder:text-muted focus:ring-1 focus:outline-none',
            problem === 'duplicate' ? 'border-warning focus:border-warning focus:ring-warning' : 'border-border focus:border-accent focus:ring-accent',
          ].join(' ')}
        />
        {problem === 'duplicate' && (
          <p id="drink-name-error" className="text-sm text-warning">
            {name.trim()} is already on your list.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Usual size</p>
        <div role="radiogroup" aria-label="Usual size" className="flex gap-1 rounded-full bg-tint p-1">
          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={ml === size}
              onClick={() => setMl(size)}
              className={[
                'h-11 flex-1 rounded-full text-sm font-semibold transition-colors duration-150',
                focusRing,
                ml === size ? 'border border-border bg-surface text-text' : 'border border-transparent text-muted',
              ].join(' ')}
            >
              {size} ml
            </button>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[20px] border border-border bg-surface p-4">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-semibold text-text">Counts toward my target</span>
          <span className="text-sm text-muted">{counts ? 'Every non alcoholic drink does.' : 'Off for this drink.'}</span>
        </span>
        <input type="checkbox" role="switch" checked={counts} onChange={(e) => setCounts(e.target.checked)} className="peer sr-only" />
        <span
          aria-hidden
          className={[
            'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
            counts ? 'bg-cta' : 'bg-border',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none',
              counts ? 'translate-x-[22px]' : 'translate-x-[2px]',
            ].join(' ')}
          />
        </span>
      </label>

      {alcohol && <HintCard>Alcohol doesn't count toward your target. You can still log it.</HintCard>}

      <div className="flex flex-col items-center gap-2">
        <PrimaryButton disabled={problem !== null} onClick={() => onAdd(makeCustom(name, ml, counts))}>
          Add drink
        </PrimaryButton>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
      </div>
    </Sheet>
  )
}
