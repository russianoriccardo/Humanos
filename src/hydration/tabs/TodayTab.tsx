import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Bell, Plus, Sun } from 'lucide-react'
import { addDays, daysBetween, formatClock, weekdayName } from '../../lib/dates'
import type { AppState, Drink, HydrationActive } from '../../state/appState'
import { useWeather } from '../../state/weather'
import { lastHourMl } from '../day'
import { drinkIcon } from '../drinkIcons'
import { formatLitres } from '../target'
import { dropCandidate, offerFewer, PAUSED_AWAY, welcomeBack } from '../tuning'
import type { HydrationToday } from '../useHydrationToday'
import { weekSummary } from '../week'
import type { HydrationSheet } from './sheets'
import { SwipeRow } from './SwipeRow'
import { forYouNow } from '../forYou'
import { WATER } from '../drinks'
import { BookmarkButton, CardTile } from './GuideBits'

type TodayTabProps = {
  state: AppState
  today: HydrationToday
  onLog: (drink: Drink, ml: number) => void
  onDelete: (id: string) => void
  onActiveChange: (fn: (active: HydrationActive) => HydrationActive) => void
  onToggleReminder: (on: boolean) => void
  onOpenSheet: (sheet: HydrationSheet) => void
  onToggleSaved: (cardId: string) => void
  onReadCard: (cardId: string) => void
}

const HOLD_MS = 500
const BIG_HOUR_ML = 1000
const SHOW_RECENT = 3
const COLLAPSE_OVER = 5

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

const clockOf = (d: Date) => formatClock(d.getHours() * 60 + d.getMinutes())

function PromptCard({ title, body, yes, no, onYes, onNo, tone = 'tint' }: {
  title: string
  body: string
  yes: string
  no: string
  onYes: () => void
  onNo: () => void
  tone?: 'tint' | 'warning'
}) {
  return (
    <section
      className={[
        'flex flex-col gap-3 rounded-[20px] p-4',
        tone === 'warning' ? 'border-[1.5px] border-warning bg-warning-tint' : 'border-[1.5px] border-accent bg-tint',
      ].join(' ')}
    >
      <div className="flex flex-col gap-1">
        <p className={['text-[15px] font-semibold', tone === 'warning' ? 'text-warning' : 'text-text'].join(' ')}>{title}</p>
        <p className="text-sm leading-normal text-text">{body}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onYes} className={`h-10 rounded-full bg-cta px-4 text-sm font-semibold text-cta-text ${focusRing}`}>
          {yes}
        </button>
        <button type="button" onClick={onNo} className={`h-10 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-text ${focusRing}`}>
          {no}
        </button>
      </div>
    </section>
  )
}

// Tap logs; holding for half a second opens the log sheet instead.
function QuickChip({ drink, onTap, onHold }: { drink: Drink; onTap: () => void; onHold: () => void }) {
  const timer = useRef<number | undefined>(undefined)
  const held = useRef(false)
  const Icon = drinkIcon(drink)
  const cancel = () => window.clearTimeout(timer.current)
  return (
    <button
      type="button"
      onPointerDown={() => {
        held.current = false
        timer.current = window.setTimeout(() => {
          held.current = true
          onHold()
        }, HOLD_MS)
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (!held.current) onTap()
      }}
      aria-label={`Log ${drink.name}, ${drink.ml} ml. Hold to change the size.`}
      className={`inline-flex h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-text select-none transition-transform duration-[120ms] motion-safe:active:scale-[0.96] ${focusRing}`}
    >
      <Icon size={15} className="text-accent" aria-hidden />
      {drink.name}
      <span className={['text-xs', drink.counts ? 'text-muted' : 'text-warning'].join(' ')}>{drink.counts ? `${drink.ml} ml` : 'not counted'}</span>
    </button>
  )
}

export function TodayTab({
  state,
  today,
  onLog,
  onDelete,
  onActiveChange,
  onToggleReminder,
  onOpenSheet,
  onToggleSaved,
  onReadCard,
}: TodayTabProps) {
  const weather = useWeather()
  const [showAll, setShowAll] = useState(false)
  const [askedLocation, setAskedLocation] = useState(false)
  const { active, now, day, logs, total, target, adj, pace, line, expected, isDay1, next, quiet, wake } = today
  const doctor = active.doctorLimit
  const reached = pace === 'done' || pace === 'limitReached'

  // Prompts: at most one, welcome back first.
  const back = welcomeBack(active, day)
  const drop = back ? null : dropCandidate(active, day, wake)
  const fewer = back || drop ? false : offerFewer(active, day)

  // Welcome back pauses reminders the moment it first shows.
  useEffect(() => {
    if (back && !active.pausedUntil) onActiveChange((a) => ({ ...a, pausedUntil: PAUSED_AWAY }))
  }, [back, active.pausedUntil, onActiveChange])

  const heatAsk = !doctor && active.heat === 'unasked' && daysBetween(active.startedAt, day) >= 2
  const locationSet = state.ui.locationChoice !== 'unset'
  // We asked for location and the browser said no (the weather falls back to a city).
  const locationDenied = askedLocation && state.ui.locationChoice === 'city'

  const hourMl = doctor ? 0 : lastHourMl(active.logs, now)
  const recentIds = new Set(
    hourMl > BIG_HOUR_ML ? logs.filter((l) => now.getTime() - Date.parse(l.at) <= 60 * 60_000).map((l) => l.id) : [],
  )
  const shown = logs.length > COLLAPSE_OVER && !showAll ? logs.slice(0, SHOW_RECENT) : logs
  const week = weekSummary(active, day)
  const weekMax = week ? Math.max(target, ...week.days.map((d) => d.ml)) * 1.1 : 1

  const forYou = forYouNow(state, today)

  const lastSlot = active.slots.filter((s) => s.on).map((s) => s.time).sort().pop()
  const remindersSub = doctor
    ? 'One status at 18:00 · no other reminders'
    : !active.reminderOn
      ? 'Off'
      : active.pausedUntil && active.pausedUntil > day
        ? active.pausedUntil === PAUSED_AWAY
          ? 'Paused while you were away'
          : `Paused until ${weekdayName(active.pausedUntil)}`
        : pace === 'done'
          ? 'Off for today · target reached'
          : next
            ? `Next at ${next} · only if you're behind`
            : `${lastSlot ?? '20:00'} sent · quiet after ${quiet}`

  const eyebrow = [weekdayName(day), isDay1 ? 'day 1' : clockOf(now), ...(adj.heatMl && today.tempMax !== null ? [`${today.tempMax}°C`] : [])].join(' · ')
  const heroTone = doctor && reached ? 'border-[1.5px] border-warning bg-warning-tint' : reached ? 'border-[1.5px] border-accent bg-tint' : 'border border-border bg-surface'
  const dotTone = pace === 'behind' || (doctor && reached) ? 'bg-warning' : 'bg-accent'

  return (
    <div className="flex flex-col gap-4">
      {back ? (
        <PromptCard
          title="Welcome back"
          body={`${back.days} days off. Nothing to catch up on, today starts fresh. We paused reminders while you were away.`}
          yes="Turn reminders on"
          no="Not now"
          onYes={() => onActiveChange((a) => ({ ...a, pausedUntil: undefined, asked: { ...a.asked, welcomeBackFor: back.key } }))}
          onNo={() => onActiveChange((a) => ({ ...a, asked: { ...a.asked, welcomeBackFor: back.key } }))}
        />
      ) : drop ? (
        <PromptCard
          title={`You haven't needed the ${drop} nudge`}
          body={`You were on pace by ${drop} on each of the last 5 days. Turn it off?`}
          yes="Turn it off"
          no="Keep it"
          onYes={() =>
            onActiveChange((a) => ({
              ...a,
              slots: a.slots.map((s) => (s.time === drop ? { ...s, on: false } : s)),
              asked: { ...a.asked, drop: [...a.asked.drop, drop] },
            }))
          }
          onNo={() => onActiveChange((a) => ({ ...a, asked: { ...a.asked, drop: [...a.asked.drop, drop] } }))}
        />
      ) : fewer ? (
        <PromptCard
          title="Fewer reminders?"
          body={`You've let the last 3 pass. We can keep just one, at ${lastSlot}, or pause them for a week.`}
          yes="Keep one"
          no="Pause a week"
          onYes={() =>
            onActiveChange((a) => ({
              ...a,
              slots: a.slots.map((s) => ({ ...s, on: s.time === lastSlot })),
              asked: { ...a.asked, fewerAt: new Date().toISOString() },
            }))
          }
          onNo={() => onActiveChange((a) => ({ ...a, pausedUntil: addDays(day, 7), asked: { ...a.asked, fewerAt: new Date().toISOString() } }))}
        />
      ) : null}

      <section className={['flex flex-col gap-3 rounded-[20px] p-5', heroTone].join(' ')}>
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>{eyebrow}</Eyebrow>
          {(doctor || pace === 'done') && (
            <span className={['rounded-full px-2.5 py-1 text-[11px] font-semibold', doctor && reached ? 'bg-surface text-warning' : 'bg-surface text-accent-text'].join(' ')}>
              {doctor ? "Doctor's limit" : 'Target reached'}
            </span>
          )}
        </div>
        <p className="flex items-baseline gap-2">
          <span className="text-[44px] leading-none font-bold tracking-[-1px] text-text tabular-nums">{formatLitres(total)}</span>
          <span className="text-lg text-muted">of {formatLitres(target)}</span>
        </p>
        <div className="relative h-1.5 rounded-full bg-tint" aria-hidden>
          <div
            className={['h-full rounded-full', doctor && reached ? 'bg-warning' : 'bg-accent'].join(' ')}
            style={{ width: `${Math.min(100, (total / target) * 100)}%` }}
          />
          {!doctor && expected > 0 && expected < target && (
            <span className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-text" style={{ left: `${(expected / target) * 100}%` }} />
          )}
        </div>
        <p className="flex items-start gap-2 text-sm leading-normal">
          <span className={['mt-1.5 h-2 w-2 shrink-0 rounded-full', dotTone].join(' ')} aria-hidden />
          <span>
            <span className="font-semibold text-text">{line.a}</span> <span className="text-muted">{line.b}</span>
          </span>
        </p>
        {adj.items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {adj.heatMl > 0 && <span className="rounded-full bg-tint px-2.5 py-1 text-xs font-semibold text-text">+{adj.heatMl} ml · hot day</span>}
            {adj.workoutMl > 0 && (
              <span className="rounded-full bg-tint px-2.5 py-1 text-xs font-semibold text-text">
                +{adj.workoutMl} ml · {state.demo.workoutMinutes} min workout
              </span>
            )}
            <button
              type="button"
              onClick={() => onOpenSheet({ kind: 'why' })}
              className={`-my-2 h-11 px-1 text-xs font-semibold text-text underline underline-offset-2 ${focusRing}`}
            >
              Why?
            </button>
          </div>
        )}
      </section>

      {heatAsk && (
          <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
                <Sun size={18} aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-[15px] font-semibold text-text">Adjust your target on hot days?</p>
                {!locationSet && (
                  <p className="text-sm leading-normal text-muted">
                    We check the temperature near you a few times a day. Rough area only, never your exact location.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!locationSet) {
                    setAskedLocation(true)
                    weather.useMyLocation()
                  }
                  onActiveChange((a) => ({ ...a, heat: 'on' }))
                }}
                className={`h-10 rounded-full bg-cta px-4 text-sm font-semibold text-cta-text ${focusRing}`}
              >
                Turn on
              </button>
              <button
                type="button"
                onClick={() => onActiveChange((a) => ({ ...a, heat: 'off' }))}
                className={`h-10 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-text ${focusRing}`}
              >
                Not now
              </button>
            </div>
          </section>
      )}

      {locationDenied && !heatAsk && active.heat === 'on' && (
        <PromptCard
          tone="warning"
          title="Location is off for HUMANOS"
          body="Hot day adjustments need your rough area. Turn it on in Settings, or set your city by hand."
          yes="Open Settings"
          no="Set my city"
          onYes={() => setAskedLocation(false)}
          onNo={() => onOpenSheet({ kind: 'city' })}
        />
      )}

      {hourMl > BIG_HOUR_ML && (
        <section className="flex items-start gap-3 rounded-[20px] border-[1.5px] border-warning bg-warning-tint p-4" role="status">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-semibold text-warning">{formatLitres(hourMl)} in the last hour</p>
            <p className="text-sm leading-normal text-text">
              Spread the rest out. Your kidneys clear about 1 L an hour, so more than that at once is not extra hydration.
            </p>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>Log a drink</Eyebrow>
          <span className="text-xs text-muted">Hold a drink to change its size</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {active.drinks.map((drink) => (
            <QuickChip
              key={drink.id}
              drink={drink}
              onTap={() => onLog(drink, drink.ml)}
              onHold={() => onOpenSheet({ kind: 'log', drinkId: drink.id })}
            />
          ))}
          <button
            type="button"
            onClick={() => onOpenSheet({ kind: 'log' })}
            className={`inline-flex h-11 items-center gap-1.5 rounded-full border border-dashed border-border-strong px-3.5 text-sm font-medium text-text ${focusRing}`}
          >
            <Plus size={15} aria-hidden />
            Other
          </button>
        </div>
      </section>

      {forYou && (
        <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
          <div className="flex items-start gap-3">
            <CardTile card={forYou.card} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Eyebrow>{now.getHours() >= 19 ? 'For you tonight' : 'For you today'}</Eyebrow>
              <p className="text-[15px] font-semibold text-text">{forYou.card.title}</p>
            </div>
            <BookmarkButton
              saved={state.hydrationSaved.includes(forYou.card.id)}
              title={forYou.card.title}
              onToggle={() => onToggleSaved(forYou.card.id)}
            />
          </div>
          <p className="text-sm leading-normal text-text">{forYou.card.why}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onReadCard(forYou.card.id)}
              className={`h-10 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-text ${focusRing}`}
            >
              Read
            </button>
            {forYou.action === 'logWater' && (
              <button
                type="button"
                onClick={() => onLog(WATER, 250)}
                className={`h-10 rounded-full bg-cta px-4 text-sm font-semibold text-cta-text ${focusRing}`}
              >
                Log a glass
              </button>
            )}
          </div>
        </section>
      )}

      {logs.length === 0 ? (
        <section className="flex flex-col gap-1.5 rounded-[20px] border-[1.5px] border-dashed border-border-strong p-[18px]">
          <p className="text-[15px] font-semibold text-text">Your first drink shows up here</p>
          <p className="text-sm text-muted">Tap a drink above. One tap, one second.</p>
        </section>
      ) : (
        <section className="flex flex-col gap-1 rounded-[20px] border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3 pb-1">
            <Eyebrow>Today's log</Eyebrow>
            <span className="text-sm text-muted">{logs.length} {logs.length === 1 ? 'drink' : 'drinks'}</span>
          </div>
          <ul className="flex flex-col divide-y divide-tint">
            {shown.map((entry) => {
              const drink = active.drinks.find((d) => d.id === entry.drinkId) ?? { id: entry.drinkId, counts: entry.counts }
              const Icon = drinkIcon(drink)
              return (
                <li key={entry.id}>
                  <SwipeRow
                    label={`${entry.name}, ${entry.ml} ml at ${clockOf(new Date(entry.at))}. Edit`}
                    action="Delete"
                    onTap={() => onOpenSheet({ kind: 'edit', id: entry.id })}
                    onAction={() => onDelete(entry.id)}
                  >
                    <span className="w-11 shrink-0 text-sm font-semibold text-muted tabular-nums">{clockOf(new Date(entry.at))}</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent">
                      <Icon size={15} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-text">{entry.name}</span>
                    <span className={['shrink-0 text-sm font-semibold tabular-nums', recentIds.has(entry.id) ? 'text-warning' : 'text-text'].join(' ')}>
                      {entry.counts ? `${entry.ml} ml` : 'not counted'}
                    </span>
                  </SwipeRow>
                </li>
              )
            })}
          </ul>
          {logs.length > COLLAPSE_OVER && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className={`-mb-1 h-11 self-start text-sm font-semibold text-text underline underline-offset-2 ${focusRing}`}
            >
              {showAll ? 'Show less' : `Show all ${logs.length}`}
            </button>
          )}
        </section>
      )}

      {week && (
        <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>This week</Eyebrow>
            <span className="text-sm text-muted">Target hit {week.hit} of 7</span>
          </div>
          <div className="relative flex h-24 items-end gap-2" role="img" aria-label={`Target hit ${week.hit} of 7 days`}>
            <span className="pointer-events-none absolute inset-x-0 h-0.5 bg-accent/60" style={{ bottom: `${(target / weekMax) * 100}%` }} aria-hidden />
            {week.days.map((d) => (
              <span
                key={d.key}
                className={['flex-1 rounded-t-[6px]', d.key === day ? 'bg-text' : d.hit ? 'bg-accent' : 'bg-accent/35'].join(' ')}
                style={{ height: `${Math.max(3, (d.ml / weekMax) * 100)}%` }}
              />
            ))}
          </div>
          <div className="flex gap-2" aria-hidden>
            {week.days.map((d) => (
              <span key={d.key} className="flex-1 text-center text-[11px] text-muted">
                {weekdayName(d.key, 'short').charAt(0)}
              </span>
            ))}
          </div>
          {week.quiet && (
            <p className="text-sm leading-normal text-text">
              You drink most before {week.quiet.from}. {week.quiet.from} to {week.quiet.to} is your quiet stretch
              {(() => {
                const slot = active.slots.find((s) => s.on && s.time >= week.quiet!.from && s.time < week.quiet!.to)
                return slot ? `, so that is where the ${slot.time} nudge sits.` : '.'
              })()}
            </p>
          )}
        </section>
      )}

      <div className="flex items-center justify-between gap-4 rounded-[20px] border border-border bg-surface p-4">
        <button
          type="button"
          onClick={() => onOpenSheet({ kind: 'reminders' })}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-[12px] text-left ${focusRing}`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
            <Bell size={18} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold text-text">Reminders</span>
            <span className="truncate text-sm text-muted">{remindersSub}</span>
          </span>
        </button>
        <label className="cursor-pointer">
          <span className="sr-only">Reminders</span>
          <input
            type="checkbox"
            role="switch"
            checked={active.reminderOn}
            onChange={(e) => onToggleReminder(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={[
              'relative block h-[31px] w-[51px] rounded-full transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
              active.reminderOn ? 'bg-cta' : 'bg-border',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none',
                active.reminderOn ? 'translate-x-[22px]' : 'translate-x-[2px]',
              ].join(' ')}
            />
          </span>
        </label>
      </div>
    </div>
  )
}
