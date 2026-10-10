import { useState } from 'react'
import { Bell, Check, MapPin, RefreshCw } from 'lucide-react'
import { CITIES, config } from '../../config'
import { Chip } from '../../components/Chip'
import { SkeletonCard } from '../../components/Skeleton'
import { dateKey, weekdayName } from '../../lib/dates'
import { ageLabel } from '../../services/weather'
import { reminderIdFor } from '../../services/reminders'
import type { AppState, SkincareActive } from '../../state/appState'
import { routineDay } from '../active'
import type { AdjustedStep, Tip } from '../engine/types'
import { TipIcon } from '../TipIcon'
import { useToday } from '../useToday'
import { TabIntro } from './TabIntro'

type TodayTabProps = {
  state: AppState
  onActiveChange: (fn: (active: SkincareActive) => SkincareActive) => void
  onRemind: (tip: Tip) => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

function TipCard({ tip, reminderSet, onRemind }: { tip: Tip; reminderSet: boolean; onRemind: () => void }) {
  const action = tip.action
  const passed = action ? new Date().toTimeString().slice(0, 5) >= action.at : false
  return (
    <article className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <TipIcon icon={tip.icon} />
        <div className="min-w-0">
          <p className="text-base font-bold text-text">{tip.metric}</p>
          <p className="text-xs text-muted">{tip.source}</p>
        </div>
      </div>
      <p className="text-[15px] leading-relaxed text-text">{tip.body}</p>
      {action ? (
        reminderSet ? (
          <span className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-tint px-4 text-sm font-semibold text-text">
            <Check size={15} strokeWidth={2.5} className="text-accent" aria-hidden />
            Reminder set · {action.at}
          </span>
        ) : passed ? (
          <span className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-tint px-4 text-sm font-semibold text-text">
            <Bell size={15} strokeWidth={2} className="text-accent" aria-hidden />
            Time to reapply
          </span>
        ) : (
          <button
            type="button"
            onClick={onRemind}
            className={`inline-flex h-11 items-center gap-2 self-start rounded-full border-[1.5px] border-accent px-4 text-sm font-semibold text-text transition-transform duration-[120ms] motion-safe:active:scale-[0.97] ${focusRing}`}
          >
            <Bell size={15} strokeWidth={2} className="text-accent" aria-hidden />
            {action.label}
          </button>
        )
      ) : tip.routineChanged ? (
        <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-tint px-3 py-1.5 text-xs font-semibold text-text">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Tonight's routine updated
        </span>
      ) : null}
    </article>
  )
}

function TonightCard({ steps, done, onToggle }: { steps: AdjustedStep[]; done: string[]; onToggle: (id: string) => void }) {
  const adjusted = steps.some((s) => s.status !== 'planned')
  const live = steps.filter((s) => s.status !== 'skipped')
  let number = 0
  return (
    <section className="flex flex-col gap-1 rounded-[20px] border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3 pb-1">
        <Eyebrow>{adjusted ? 'Tonight · adjusted' : 'Tonight · as planned'}</Eyebrow>
        <span className="text-xs text-muted">
          {done.length} of {live.length} done
        </span>
      </div>
      <ol className="flex flex-col">
        {steps.map((step) => {
          const skipped = step.status === 'skipped'
          const isDone = done.includes(step.id)
          if (!skipped) number++
          const content = (
            <>
              <span
                className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  skipped ? 'text-muted' : 'bg-tint text-text',
                ].join(' ')}
                aria-hidden
              >
                {skipped ? '–' : number}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={['text-base', skipped ? 'text-muted line-through' : 'font-semibold text-text'].join(' ')}>
                  {step.name}
                </span>
                {step.note && (
                  <span className={['text-xs font-medium', skipped ? 'text-muted' : 'text-accent-text'].join(' ')}>{step.note}</span>
                )}
              </span>
              {!skipped && (
                <span
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-[120ms]',
                    isDone ? 'border-accent bg-accent text-on-accent' : 'border-muted',
                  ].join(' ')}
                  aria-hidden
                >
                  {isDone && <Check size={13} strokeWidth={3} className="animate-pop" />}
                </span>
              )}
            </>
          )
          return (
            <li key={step.id}>
              {skipped ? (
                <div className="flex min-h-11 items-center gap-3 py-2" aria-label={`${step.name}, skipped tonight`}>
                  {content}
                </div>
              ) : (
                <button
                  type="button"
                  aria-pressed={isDone}
                  onClick={() => onToggle(step.id)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-[12px] py-2 text-left transition-transform duration-[120ms] motion-safe:active:scale-[0.98] ${focusRing}`}
                >
                  {content}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function LocationChooser({ onGps, onCity, current }: { onGps: () => void; onCity: (name: string) => void; current?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onGps}
        className={`inline-flex h-11 items-center gap-1.5 rounded-full bg-cta px-4 text-sm font-semibold text-cta-text ${focusRing}`}
      >
        <MapPin size={15} aria-hidden />
        Use my location
      </button>
      {CITIES.map((city) => (
        <Chip key={city.name} variant="soft" label={city.name} selected={city.name === current} onClick={() => onCity(city.name)} />
      ))}
    </div>
  )
}

export function TodayTab({ state, onActiveChange, onRemind }: TodayTabProps) {
  const { plan, weather } = useToday(state)
  const [changing, setChanging] = useState(false)
  const active = state.skincareActive
  if (!active || !plan) return null

  const today = dateKey()
  const done = (active.routineLog[today] ?? []).filter((id) => plan.tonight.some((s) => s.id === id && s.status !== 'skipped'))
  const reminderIds = new Set(state.ui.reminders.map((r) => r.id))
  const waiting = (weather.status === 'loading' || weather.status === 'locating') && !weather.data

  function toggle(id: string) {
    onActiveChange((a) => {
      const current = a.routineLog[today] ?? []
      const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id]
      return { ...a, routineLog: { ...a.routineLog, [today]: next } }
    })
  }

  const statusLine = (() => {
    if (weather.status === 'needs-choice') return null
    const bits: string[] = []
    if (weather.status === 'unavailable') bits.push('Weather unavailable')
    if (weather.status === 'stale' && weather.data) bits.push(`${ageLabel(weather.data.fetchedAt)}`)
    const usingCity = weather.place?.source === 'city'
    return (
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted">
          {usingCity && <span>Using {weather.place?.label}</span>}
          {weather.place?.source === 'gps' && <span>Weather for your location</span>}
          {(usingCity || weather.place?.source === 'gps') && (
            <>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => setChanging((v) => !v)}
                aria-expanded={changing}
                className={`-my-3 h-11 min-w-11 px-0.5 font-semibold text-text underline underline-offset-2 ${focusRing}`}
              >
                change
              </button>
            </>
          )}
          {bits.map((bit) => (
            <span key={bit} className="flex items-center gap-1.5">
              <span aria-hidden>·</span>
              {bit}
            </span>
          ))}
          {(weather.status === 'unavailable' || weather.status === 'stale') && (
            <button
              type="button"
              onClick={weather.retry}
              aria-label="Retry weather"
              className={`-my-3 flex h-11 w-11 items-center justify-center text-text ${focusRing}`}
            >
              <RefreshCw size={14} />
            </button>
          )}
        </p>
        {changing && (
          <LocationChooser
            current={usingCity ? weather.place?.label : undefined}
            onGps={() => {
              setChanging(false)
              weather.useMyLocation()
            }}
            onCity={(name) => {
              setChanging(false)
              weather.useCity(name)
            }}
          />
        )}
      </div>
    )
  })()

  return (
    <div className="flex flex-col gap-4">
      <TabIntro
        eyebrow={`${weekdayName(today)} · Day ${routineDay(active, today)} of your routine`}
        title="Today, adjusted for you"
        subtitle="Built from your weather, sleep and training — not a generic routine."
      />

      {weather.status === 'needs-choice' && (
        <section className="flex flex-col gap-3 rounded-[20px] bg-tint p-4">
          <p className="flex items-start gap-2 text-sm text-text">
            <MapPin size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            Used only to fetch local UV and humidity, rounded to about 1 km.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={weather.useMyLocation}
              className={`inline-flex h-11 items-center rounded-full bg-cta px-4 text-sm font-semibold text-cta-text ${focusRing}`}
            >
              Use my location
            </button>
            <button
              type="button"
              onClick={() => weather.useCity(config.fallbackCity.name)}
              className={`inline-flex h-11 items-center rounded-full border border-border bg-surface px-4 text-sm font-semibold text-text ${focusRing}`}
            >
              Use {config.fallbackCity.name}
            </button>
          </div>
        </section>
      )}

      {statusLine}

      <div className="flex flex-col gap-3" aria-busy={waiting}>
        {waiting ? (
          <>
            <SkeletonCard />
            <SkeletonCard lines={3} />
          </>
        ) : (
          plan.tips.map((tip) => (
            <TipCard
              key={tip.id}
              tip={tip}
              reminderSet={reminderIds.has(reminderIdFor(tip, today))}
              onRemind={() => onRemind(tip)}
            />
          ))
        )}
      </div>

      <section className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-surface p-4">
        <div>
          <Eyebrow>This morning</Eyebrow>
          <p className="text-sm text-text">Logged your SPF?</p>
        </div>
        <Chip
          variant="step"
          label="SPF on"
          selected={!!active.spfLog[today]}
          onClick={() => onActiveChange((a) => ({ ...a, spfLog: { ...a.spfLog, [today]: !a.spfLog[today] } }))}
        />
      </section>

      <TonightCard steps={plan.tonight} done={done} onToggle={toggle} />
    </div>
  )
}
