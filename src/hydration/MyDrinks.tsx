import { useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronUp, GripVertical, Info, Plus, Trash2 } from 'lucide-react'
import { Screen } from '../components/Screen'
import type { Drink, HydrationActive } from '../state/appState'
import { drinkIcon } from './drinkIcons'
import { BUILT_IN, QUICK_LOG_MAX } from './drinks'
import { AddDrinkSheet } from './setup/AddDrinkSheet'

type MyDrinksProps = {
  active: HydrationActive
  onBack: () => void
  // The new quick log, and an undo message when something was removed.
  onDrinksChange: (drinks: Drink[], removed?: Drink) => void
}

// Roughly one row: dragging this far moves the drink by one place.
const ROW_PX = 64

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Switch({ on, label, disabled, onToggle }: { on: boolean; label: string; disabled?: boolean; onToggle: (on: boolean) => void }) {
  return (
    <label className={['shrink-0', disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'].join(' ')}>
      <span className="sr-only">{label}</span>
      <input type="checkbox" role="switch" checked={on} disabled={disabled} onChange={(e) => onToggle(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={[
          'relative block h-[31px] w-[51px] rounded-full transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          on ? 'bg-cta' : 'bg-border',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none',
            on ? 'translate-x-[22px]' : 'translate-x-[2px]',
          ].join(' ')}
        />
      </span>
    </label>
  )
}

export function MyDrinks({ active, onBack, onDrinksChange }: MyDrinksProps) {
  const [adding, setAdding] = useState(false)
  const drag = useRef<{ index: number; y: number } | null>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  const drinks = active.drinks
  const hidden = BUILT_IN.filter((b) => !drinks.some((d) => d.id === b.id))
  const full = drinks.length >= QUICK_LOG_MAX

  const move = (from: number, to: number) => {
    if (to < 0 || to >= drinks.length || from === to) return
    const next = [...drinks]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onDrinksChange(next)
  }

  function row(drink: Drink, index: number | null) {
    const Icon = drinkIcon(drink)
    const builtin = drink.source === 'builtin'
    const inList = index !== null
    return (
      <li
        key={drink.id}
        className={['flex items-center gap-2 py-2.5', dragging === index && inList ? 'rounded-[12px] bg-tint' : ''].join(' ')}
      >
        {inList ? (
          <span
            role="presentation"
            onPointerDown={(e) => {
              drag.current = { index, y: e.clientY }
              setDragging(index)
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              const d = drag.current
              if (!d) return
              const steps = Math.trunc((e.clientY - d.y) / ROW_PX)
              if (steps !== 0) {
                const to = Math.max(0, Math.min(drinks.length - 1, d.index + steps))
                move(d.index, to)
                drag.current = { index: to, y: e.clientY }
                setDragging(to)
              }
            }}
            onPointerUp={() => {
              drag.current = null
              setDragging(null)
            }}
            onPointerCancel={() => {
              drag.current = null
              setDragging(null)
            }}
            style={{ touchAction: 'none' }}
            className="flex h-11 w-7 shrink-0 cursor-grab items-center justify-center text-muted"
          >
            <GripVertical size={18} aria-hidden />
          </span>
        ) : (
          <span className="w-7 shrink-0" />
        )}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent">
          <Icon size={16} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-semibold text-text">{drink.name}</span>
          <span className="text-[13px] text-muted">
            {drink.ml} ml
            {drink.source === 'guide' && ' · From Guide'}
            {!drink.counts && <span className="text-warning"> · Not counted</span>}
          </span>
        </span>
        {inList && (
          <>
            {/* For keyboard users: visible when focused. */}
            <button
              type="button"
              onClick={() => move(index, index - 1)}
              disabled={index === 0}
              aria-label={`Move ${drink.name} up`}
              className={`sr-only flex h-11 w-9 items-center justify-center text-text focus:not-sr-only disabled:opacity-40 ${focusRing}`}
            >
              <ChevronUp size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => move(index, index + 1)}
              disabled={index === drinks.length - 1}
              aria-label={`Move ${drink.name} down`}
              className={`sr-only flex h-11 w-9 items-center justify-center text-text focus:not-sr-only disabled:opacity-40 ${focusRing}`}
            >
              <ChevronDown size={18} aria-hidden />
            </button>
          </>
        )}
        {builtin ? (
          <Switch
            on={inList}
            label={`Show ${drink.name} in Today`}
            disabled={!inList && full}
            onToggle={(on) => onDrinksChange(on ? [...drinks, drink] : drinks.filter((d) => d.id !== drink.id))}
          />
        ) : (
          <button
            type="button"
            onClick={() => onDrinksChange(drinks.filter((d) => d.id !== drink.id), drink)}
            aria-label={`Delete ${drink.name}`}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted ${focusRing}`}
          >
            <Trash2 size={18} aria-hidden />
          </button>
        )}
      </li>
    )
  }

  const header = (
    <header className="grid shrink-0 grid-cols-[44px_1fr_44px] items-center px-6 pt-4 pb-2">
      <button type="button" onClick={onBack} aria-label="Back" className={`-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full text-text ${focusRing}`}>
        <ChevronLeft size={22} />
      </button>
      <h1 className="text-center text-lg font-bold text-text">My drinks</h1>
      <span />
    </header>
  )

  return (
    <Screen
      header={header}
      overlay={
        adding && (
          <AddDrinkSheet
            existing={drinks.filter((d) => d.source !== 'builtin')}
            onClose={() => setAdding(false)}
            onAdd={(drink) => {
              setAdding(false)
              onDrinksChange([...drinks, drink])
            }}
          />
        )
      }
    >
      <div className="flex flex-col gap-4 pt-1 pb-4">
        <p className="text-[15px] text-muted">The order here is the order in Today. Hold and drag to move.</p>

        <section className="flex flex-col rounded-[20px] border border-border bg-surface px-3 py-2">
          <p className="px-1 py-2 text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">
            Quick log · {drinks.length} of {QUICK_LOG_MAX}
          </p>
          <ul className="flex flex-col divide-y divide-tint">{drinks.map((d, i) => row(d, i))}</ul>
          {hidden.length > 0 && <ul className="flex flex-col divide-y divide-tint border-t border-border">{hidden.map((d) => row(d, null))}</ul>}
        </section>

        <button
          type="button"
          disabled={full}
          onClick={() => setAdding(true)}
          className={`flex h-12 items-center justify-center gap-1.5 rounded-[16px] border-[1.5px] border-dashed border-border-strong text-sm font-semibold text-text disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`}
        >
          <Plus size={16} aria-hidden />
          Add a drink
        </button>

        <p className="flex items-start gap-2.5 rounded-[16px] bg-tint p-4 text-sm leading-normal text-text">
          <Info size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          Built in drinks can be hidden but not deleted. Your own drinks and Guide drinks can be deleted; past logs keep their numbers.
        </p>
      </div>
    </Screen>
  )
}
