import { useState } from 'react'
import { Chip } from '../../components/Chip'
import { HintCard } from '../../components/HintCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { addDays, daysBetween, fromKey, parseClock, weekdayName } from '../../lib/dates'
import type { SleepActive, SleepCheckIn } from '../../state/appState'
import { TabIntro } from '../../skincare/tabs/TabIntro'
import { bestRestedBefore, PATTERN_NIGHTS } from '../patterns'
import { checkInMinutes, formatDuration, nightKeyFor, tonightLightsOut } from '../plan'
import { TAGS } from '../rules'

type MorningsTabProps = {
  active: SleepActive
  // The calendar date of this morning.
  today: string
  onSave: (checkIn: SleepCheckIn) => void
}

const RESTED = ['Wrecked', 'Tired', 'Okay', 'Good', 'Great'] as const
const MAX_ROWS = 14

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

function RestedDots({ value }: { value: number }) {
  return (
    <span className="flex gap-1" role="img" aria-label={`Rested ${value} of 5, ${RESTED[value - 1]}`}>
      {RESTED.map((label, i) => (
        <span key={label} className={['h-2 w-2 rounded-full', i < value ? 'bg-accent' : 'bg-border'].join(' ')} />
      ))}
    </span>
  )
}

function TimeField({ label, value, edited, onChange }: { label: string; value: string; edited: boolean; onChange: (v: string) => void }) {
  return (
    <label
      className={[
        'relative flex flex-col gap-1 rounded-[16px] border bg-surface p-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
        edited ? 'border-[1.5px] border-accent' : 'border-border',
      ].join(' ')}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        {edited && <span className="rounded-full bg-tint px-1.5 py-0.5 text-[10px] font-bold tracking-[1px] text-accent-text">EDITED</span>}
      </span>
      <span className="text-[22px] leading-tight font-bold text-text tabular-nums">{value}</span>
      {/* The native input covers the field, so a tap opens the phone's own time wheel. */}
      <input
        type="time"
        aria-label={label}
        value={value}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        onClick={(event) => {
          try {
            event.currentTarget.showPicker?.()
          } catch {
            // Already open, or not allowed here; the native control still works.
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  )
}

function CheckInForm({ active, today, morning, initial, onSave }: { active: SleepActive; today: string; morning: number; initial?: SleepCheckIn; onSave: (c: SleepCheckIn) => void }) {
  const planned = { lightsOut: tonightLightsOut(active, addDays(today, -1)), wake: active.wake }
  const [lightsOut, setLightsOut] = useState(initial?.lightsOut ?? planned.lightsOut)
  const [wake, setWake] = useState(initial?.wake ?? planned.wake)
  const [rested, setRested] = useState<SleepCheckIn['rested'] | null>(initial?.rested ?? null)
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])

  const loEdited = lightsOut !== planned.lightsOut
  const wakeEdited = wake !== planned.wake
  // Signed minutes against the plan, on whichever time was changed (lights out first).
  const shift = (() => {
    const [actual, plan] = loEdited ? [lightsOut, planned.lightsOut] : [wake, planned.wake]
    let diff = parseClock(actual) - parseClock(plan)
    if (diff > 720) diff -= 1440
    if (diff < -720) diff += 1440
    return diff
  })()
  const inBed = formatDuration(checkInMinutes({ lightsOut, wake }))

  return (
    <div className="flex flex-col gap-5">
      <TabIntro
        eyebrow={`${weekdayName(today)} · ${morning === 1 ? 'your first morning' : `morning ${morning}`}`}
        title="How did you sleep?"
        subtitle="Ten seconds. It's what makes your plan smarter."
      />

      <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
        <Eyebrow>Last night</Eyebrow>
        <div className="grid grid-cols-2 gap-3">
          <TimeField label="Lights out" value={lightsOut} edited={loEdited} onChange={setLightsOut} />
          <TimeField label="Woke up" value={wake} edited={wakeEdited} onChange={setWake} />
        </div>
        <p className="text-sm text-muted">
          {loEdited || wakeEdited
            ? `${inBed} in bed · ${shift === 0 ? 'as planned' : `${Math.abs(shift)} minutes ${shift > 0 ? 'later' : 'earlier'} than planned`}`
            : 'Filled in from your plan. Tap a time to correct it.'}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>How rested do you feel?</Eyebrow>
          <span className="text-xs text-muted">Required</span>
        </div>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="How rested do you feel?">
          {RESTED.map((label, i) => {
            const value = (i + 1) as SleepCheckIn['rested']
            const selected = rested === value
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRested(value)}
                className={[
                  'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-[14px] border transition-transform duration-[120ms] motion-safe:active:scale-[0.96]',
                  focusRing,
                  selected ? 'border-accent bg-accent text-on-accent' : 'border-border bg-surface text-text',
                ].join(' ')}
              >
                <span className="text-lg font-bold">{value}</span>
                <span className={['text-[11px]', selected ? '' : 'text-muted'].join(' ')}>{label}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>Anything about last night?</Eyebrow>
          <span className="text-xs text-muted">{tags.length ? `${tags.length} picked` : 'Optional'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <Chip
              key={tag}
              variant="soft"
              label={tag}
              selected={tags.includes(tag)}
              onClick={() => setTags((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]))}
            />
          ))}
        </div>
      </section>

      <div className="flex flex-col items-center gap-2 pt-1">
        <PrimaryButton disabled={rested === null} onClick={() => rested && onSave({ lightsOut, wake, rested, tags, source: 'checkin' })}>
          Save this morning
        </PrimaryButton>
        {rested === null && <p className="text-sm text-muted">Pick how rested you feel to save.</p>}
      </div>
    </div>
  )
}

export function MorningsTab({ active, today, onSave }: MorningsTabProps) {
  const [editing, setEditing] = useState(false)
  const morning = daysBetween(active.startedAt, today)
  const logged = active.checkIns[today]
  const total = Object.keys(active.checkIns).length
  const insight = total >= PATTERN_NIGHTS ? bestRestedBefore(active.checkIns) : null

  // Every morning since setup, newest first; today only once it's logged.
  const keys: string[] = []
  for (let i = logged ? 0 : 1; i < morning && keys.length < MAX_ROWS; i++) keys.push(addDays(today, -i))
  const loggedCount = Object.keys(active.checkIns).filter((k) => k > active.startedAt && k <= today).length

  const lastNightSessions = active.sessions.filter((s) => nightKeyFor(new Date(s.at)) === addDays(today, -1)).length

  const mornings =
    total === 0 ? (
      <section className="flex flex-col gap-1 rounded-[20px] border border-dashed border-border p-4">
        <p className="text-base font-semibold text-text">Your mornings show up here</p>
        <p className="text-sm text-muted">Each check in adds a line. After 7 mornings your patterns unlock.</p>
      </section>
    ) : (
      <section className="flex flex-col gap-1 rounded-[20px] border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3 pb-1">
          <Eyebrow>Your mornings</Eyebrow>
          <span className="text-xs text-muted">
            {loggedCount} of {Math.max(morning, loggedCount)} logged
          </span>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {keys.map((key) => {
            const c = active.checkIns[key]
            const day = `${weekdayName(key, 'short')} ${fromKey(key).getDate()}`
            return (
              <li key={key} className="flex items-center gap-3 py-3">
                <span className="w-14 shrink-0 text-sm font-semibold text-muted">{day}</span>
                {c ? (
                  <>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-base font-semibold text-text">{formatDuration(checkInMinutes(c))}</span>
                      {c.tags.length > 0 && <span className="truncate text-xs text-muted">{c.tags.join(', ')}</span>}
                    </span>
                    <RestedDots value={c.rested} />
                  </>
                ) : (
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-base font-semibold text-muted">Not logged</span>
                    <span className="text-xs text-muted">That's fine. Missing a morning breaks nothing.</span>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    )

  if (morning < 1) {
    return (
      <div className="flex flex-col gap-4">
        <TabIntro
          eyebrow="Tomorrow · your first morning"
          title="Your first check in is tomorrow"
          subtitle="Ten seconds after you wake up. It's what makes your plan smarter."
        />
        {mornings}
      </div>
    )
  }

  if (!logged || editing) {
    return (
      <div className="flex flex-col gap-6">
        <CheckInForm
          active={active}
          today={today}
          morning={morning}
          initial={logged}
          onSave={(c) => {
            setEditing(false)
            onSave(c)
          }}
        />
        {mornings}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>Last night</Eyebrow>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={`h-9 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-text ${focusRing}`}
          >
            Edit
          </button>
        </div>
        <div>
          <p className="text-[44px] leading-none font-bold text-text">{formatDuration(checkInMinutes(logged))}</p>
          <p className="pt-1 text-sm text-muted">
            asleep · in bed {logged.lightsOut} to {logged.wake}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RestedDots value={logged.rested} />
          <span className="text-sm font-semibold text-text">{RESTED[logged.rested - 1]}</span>
        </div>
        {(logged.tags.length > 0 || lastNightSessions > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {logged.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-text">
                {tag}
              </span>
            ))}
            {lastNightSessions > 0 && (
              <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-text">
                {lastNightSessions === 1 ? 'Wind down session' : `${lastNightSessions} wind down sessions`}
              </span>
            )}
          </div>
        )}
      </section>

      {insight && <HintCard>Your best rested mornings come after lights out before {insight}.</HintCard>}

      {mornings}
    </div>
  )
}
