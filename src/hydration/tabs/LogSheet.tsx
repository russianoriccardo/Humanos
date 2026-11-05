import { useState } from 'react'
import { AlertCircle, Minus, Plus, Trash2 } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { Sheet } from '../../components/Sheet'
import { addDays, formatClock, fromKey, parseClock } from '../../lib/dates'
import type { Drink, DrinkLog } from '../../state/appState'
import { DAY_START_HOUR, hydrationDay } from '../day'
import { drinkIcon } from '../drinkIcons'
import { formatLitres, glassesLabel } from '../target'

const SIZES = [150, 250, 330, 500]
const MIN_ML = 50
const MAX_ML = 2000
const BIG_ML = 1000

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const clockOf = (d: Date) => formatClock(d.getHours() * 60 + d.getMinutes())

// A clock time on the hydration day it belongs to (after midnight is still the same day until 04:00).
function onDay(day: string, clock: string) {
  const key = parseClock(clock) < DAY_START_HOUR * 60 ? addDays(day, 1) : day
  const d = fromKey(key)
  d.setHours(Math.floor(parseClock(clock) / 60), parseClock(clock) % 60, 0, 0)
  return d
}

type LogSheetProps = {
  drinks: Drink[]
  // Editing an existing entry; otherwise a new log.
  entry?: DrinkLog
  initialDrinkId?: string
  // Doctor mode: today's total and limit, to confirm before going over.
  limit?: { total: number; target: number }
  onSave: (drink: Drink, ml: number, at: Date) => void
  onDelete?: () => void
  onClose: () => void
}

export function LogSheet({ drinks, entry, initialDrinkId, limit, onSave, onDelete, onClose }: LogSheetProps) {
  const [now] = useState(() => new Date())
  const picked0 = drinks.find((d) => d.id === (entry?.drinkId ?? initialDrinkId)) ?? drinks[0]
  // An edited entry keeps its own drink even if it's no longer on the quick log.
  const options =
    entry && !drinks.some((d) => d.id === entry.drinkId)
      ? [{ id: entry.drinkId, name: entry.name, ml: entry.ml, counts: entry.counts, sweet: false, source: 'custom' as const }, ...drinks]
      : drinks
  const [drinkId, setDrinkId] = useState(entry?.drinkId ?? picked0.id)
  const drink = options.find((d) => d.id === drinkId) ?? options[0]
  const [ml, setMl] = useState(entry?.ml ?? picked0.ml)
  const day = entry ? hydrationDay(new Date(entry.at)) : hydrationDay(now)
  const [time, setTime] = useState(entry ? clockOf(new Date(entry.at)) : clockOf(now))
  const [timeTouched, setTimeTouched] = useState(!!entry)
  const [confirmOver, setConfirmOver] = useState(false)

  const at = onDay(day, time)
  // Times before 04:00 belong to the end of the day; one that hasn't come yet is the day before it started.
  const early = parseClock(time) < DAY_START_HOUR * 60
  const timeError =
    at.getTime() > Date.now() + 60_000
      ? early
        ? "That's before today started at 04:00."
        : `That time hasn't happened yet. It's ${clockOf(new Date())} now.`
      : null
  const big = ml > BIG_ML
  const goesOver = !!limit && drink.counts && limit.total - (entry?.counts ? entry.ml : 0) + ml > limit.target

  function save() {
    if (goesOver && !confirmOver) {
      setConfirmOver(true)
      return
    }
    onSave(drink, ml, at)
  }

  if (confirmOver && limit) {
    return (
      <Sheet title="This goes over your limit" onClose={onClose}>
        <p className="text-sm leading-normal text-text">
          You're at {formatLitres(limit.total)} of {formatLitres(limit.target)}. If you drank it, log it: an honest count is what helps you and
          your doctor.
        </p>
        <div className="flex flex-col items-center gap-2">
          <PrimaryButton onClick={() => onSave(drink, ml, at)}>Log {ml} ml</PrimaryButton>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        </div>
      </Sheet>
    )
  }

  const stepButton = `flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text disabled:opacity-40 ${focusRing}`

  return (
    <Sheet title={entry ? 'Edit drink' : 'Log a drink'} onClose={onClose}>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Drink">
        {options.map((d) => {
          const Icon = drinkIcon(d)
          const on = d.id === drink.id
          return (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setDrinkId(d.id)
                if (!entry) setMl(d.ml)
              }}
              className={[
                'inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-text',
                focusRing,
                on ? 'border-[1.5px] border-accent bg-tint' : 'border border-border bg-surface',
              ].join(' ')}
            >
              <Icon size={15} className="text-accent" aria-hidden />
              {d.name}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface p-4">
        <button type="button" aria-label="Less" disabled={ml <= MIN_ML} onClick={() => setMl((v) => Math.max(MIN_ML, v - 50))} className={stepButton}>
          <Minus size={20} aria-hidden />
        </button>
        <div className="flex flex-col items-center">
          <span className={['text-[32px] leading-none font-bold tabular-nums', big ? 'text-warning' : 'text-text'].join(' ')}>{ml} ml</span>
          <span className="pt-1 text-sm text-muted">{glassesLabel(ml)}</span>
        </div>
        <button type="button" aria-label="More" disabled={ml >= MAX_ML} onClick={() => setMl((v) => Math.min(MAX_ML, v + 50))} className={stepButton}>
          <Plus size={20} aria-hidden />
        </button>
      </div>

      <div role="radiogroup" aria-label="Size" className="flex gap-1 rounded-full bg-tint p-1">
        {SIZES.map((size) => (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={ml === size}
            onClick={() => setMl(size)}
            className={[
              'h-10 flex-1 rounded-full text-sm font-semibold',
              focusRing,
              ml === size ? 'border border-border bg-surface text-text' : 'border border-transparent text-muted',
            ].join(' ')}
          >
            {size} ml
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          className={[
            'relative flex h-12 items-center justify-between rounded-[16px] bg-surface px-4 focus-within:outline focus-within:outline-2 focus-within:outline-accent',
            timeError ? 'border-[1.5px] border-warning' : 'border border-border',
          ].join(' ')}
        >
          <span className="text-[15px] font-semibold text-text">When</span>
          <span className={['text-[15px] font-semibold tabular-nums', timeError ? 'text-warning' : 'text-text'].join(' ')}>
            {timeTouched ? time : `Now · ${time}`}
          </span>
          <input
            type="time"
            aria-label="When"
            value={time}
            onChange={(e) => {
              if (!e.target.value) return
              setTime(e.target.value)
              setTimeTouched(true)
            }}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker?.()
              } catch {
                // The native control still works.
              }
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        {timeError && <p className="text-sm text-warning">{timeError}</p>}
      </div>

      {big && (
        <section className="flex items-start gap-3 rounded-[16px] bg-warning-tint p-4" role="status">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-warning">That's a lot in one go.</p>
            <p className="text-sm leading-normal text-text">
              If it's a big bottle, log it as you finish it, or split it in two. Is {formatLitres(ml)} right?
            </p>
          </div>
        </section>
      )}

      <div className="flex flex-col items-center gap-2">
        <PrimaryButton disabled={!!timeError} onClick={save}>
          {entry ? 'Save' : big ? `Yes, log ${formatLitres(ml)}` : `Log ${ml} ml`}
        </PrimaryButton>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        {entry && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-warning ${focusRing}`}
          >
            <Trash2 size={16} aria-hidden />
            Delete this drink
          </button>
        )}
      </div>
    </Sheet>
  )
}
