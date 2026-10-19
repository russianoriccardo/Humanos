import { Bell, Check } from 'lucide-react'
import { HintCard } from '../../components/HintCard'
import { SegmentBar } from '../../components/SegmentBar'
import { weekdayName } from '../../lib/dates'
import { getHealth } from '../../services/health.mock'
import type { AppState, SleepActive } from '../../state/appState'
import { TipIcon } from '../../skincare/TipIcon'
import { TabIntro } from '../../skincare/tabs/TabIntro'
import {
  formatDuration,
  minutesFromGoal,
  nightNumber,
  PLAN_STEP_MINUTES,
  planWeekFor,
  planWeeks,
  shiftClock,
  tonightLightsOut,
  WIND_DOWN_MINUTES,
  windowMinutes,
} from '../plan'
import { buildTonight, TIPS_FROM_NIGHT, type SleepTip } from '../rules'

type TonightTabProps = {
  state: AppState
  active: SleepActive
  night: string
  onActiveChange: (fn: (active: SleepActive) => SleepActive) => void
  onRemind: (tip: SleepTip) => void
  onToggleReminder: (on: boolean) => void
  onComingSoon: () => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

export function TonightTab({ state, active, night, onActiveChange, onRemind, onToggleReminder, onComingSoon }: TonightTabProps) {
  const n = nightNumber(active, night)
  const lightsOut = tonightLightsOut(active, night)
  const totalWeeks = planWeeks(active)
  const week = Math.min(planWeekFor(n), totalWeeks)
  const toGoal = minutesFromGoal(lightsOut, active.goal)
  const plan = buildTonight({
    lightsOut,
    night: n,
    reminderOn: active.reminderOn,
    trainedLate: getHealth(state.demo.scenario).trainedYesterday === true,
    checkIns: active.checkIns,
    today: night,
  })
  const ticked = (active.windDown[night] ?? []).filter((id) => plan.steps.some((s) => s.id === id))
  const reminderIds = new Set(state.ui.reminders.map((r) => r.id))
  const early = n < TIPS_FROM_NIGHT

  function toggle(id: string) {
    onActiveChange((a) => {
      const current = a.windDown[night] ?? []
      const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id]
      return { ...a, windDown: { ...a.windDown, [night]: next } }
    })
  }

  const progress =
    toGoal === 0
      ? "you're at your goal"
      : toGoal < PLAN_STEP_MINUTES
        ? `${toGoal} minutes from your goal`
        : `moving 15 minutes a week toward ${active.goal}`

  return (
    <div className="flex flex-col gap-4">
      <TabIntro
        eyebrow={n === 1 ? `${weekdayName(night)} · night 1 of your plan` : `${weekdayName(night)} · night ${n}`}
        title={early ? 'Tonight, planned for you' : 'Tonight, adjusted for you'}
        subtitle={early ? 'Built from your answers. Your nights will sharpen it.' : 'From your last two weeks.'}
      />

      <section className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Eyebrow>Lights out</Eyebrow>
            <p className="text-[44px] leading-none font-bold tracking-[-1px] text-text">{lightsOut}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-text">Up at {active.wake}</p>
            <p className="text-sm text-muted">{formatDuration(windowMinutes(lightsOut, active.wake))} in bed</p>
          </div>
        </div>
        <SegmentBar total={totalWeeks} filled={week} label="Plan weeks" />
        <p className="text-sm leading-normal text-text">
          Week {week} of {totalWeeks} · <span className="text-muted">{progress}</span>
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>Your wind down</Eyebrow>
          <span className="text-sm text-muted">
            {ticked.length} of {plan.steps.length} done
          </span>
        </div>
        <ul className="flex flex-col divide-y divide-tint">
          {plan.steps.map((step) => {
            const isDone = ticked.includes(step.id)
            return (
              <li key={step.id}>
                <button
                  type="button"
                  aria-pressed={isDone}
                  onClick={() => toggle(step.id)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-[12px] py-2.5 text-left transition-transform duration-[120ms] motion-safe:active:scale-[0.98] ${focusRing}`}
                >
                  <span className="w-[46px] shrink-0 text-sm font-semibold text-text tabular-nums">{step.at}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="text-[15px] text-text">{step.label}</span>
                    {step.note && <span className="text-xs font-medium text-accent-text">{step.note}</span>}
                  </span>
                  <span
                    className={[
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-[120ms]',
                      isDone ? 'border-accent bg-accent text-on-accent' : 'border-muted',
                    ].join(' ')}
                    aria-hidden
                  >
                    {isDone && <Check size={13} strokeWidth={3} className="animate-pop" />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {early ? (
        <HintCard>Tips for your nights start on night 3, once we know how you sleep. Tomorrow's morning check in gets it going.</HintCard>
      ) : (
        plan.tips.map((tip) => {
          const set = reminderIds.has(`sleep:${tip.id}:${night}`)
          return (
            <article key={tip.id} className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
              <div className="flex items-center gap-3">
                <TipIcon icon={tip.icon} />
                <div className="min-w-0">
                  <p className="text-base font-bold text-text">{tip.metric}</p>
                  <p className="text-xs text-muted">{tip.source}</p>
                </div>
              </div>
              <p className="text-[15px] leading-relaxed text-text">{tip.body}</p>
              {tip.action &&
                (set ? (
                  <span className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-tint px-4 text-sm font-semibold text-text">
                    <Check size={15} strokeWidth={2.5} className="text-accent" aria-hidden />
                    Reminder set · {tip.action.at}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRemind(tip)}
                    className={`inline-flex h-11 items-center gap-2 self-start rounded-full border-[1.5px] border-accent px-4 text-sm font-semibold text-text transition-transform duration-[120ms] motion-safe:active:scale-[0.97] ${focusRing}`}
                  >
                    <Bell size={15} className="text-accent" aria-hidden />
                    {tip.action.label}
                  </button>
                ))}
            </article>
          )
        })
      )}

      {plan.partnerPick !== null && (
        <article className="flex flex-col gap-2 rounded-[20px] border border-border bg-surface p-4">
          <span className="self-start rounded-full bg-tint px-2.5 py-1 text-[10px] font-bold tracking-[1px] text-accent-text">PARTNER PICK</span>
          <p className="text-base font-bold text-text">Screens after lights out on {plan.partnerPick} of 7 nights</p>
          <p className="text-[15px] leading-relaxed text-text">
            Amber lens glasses filter the blue light that keeps you alert. Worth a try for your last hour.
          </p>
          <button
            type="button"
            onClick={onComingSoon}
            className={`h-9 self-start rounded-full border-[1.5px] border-accent px-4 text-sm font-semibold text-text ${focusRing}`}
          >
            See the pick
          </button>
          <p className="text-xs text-muted">Shown because of your data. HUMANOS may earn a commission.</p>
        </article>
      )}

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[20px] border border-border bg-surface p-4">
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
            <Bell size={18} aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-semibold text-text">Wind down reminder</span>
            <span className="text-sm text-muted">Tonight at {shiftClock(lightsOut, -WIND_DOWN_MINUTES)}</span>
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={active.reminderOn}
          onChange={(event) => onToggleReminder(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={[
            'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
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
  )
}
