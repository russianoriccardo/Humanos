import { Lock } from 'lucide-react'
import { SegmentBar } from '../../components/SegmentBar'
import { addDays, weekdayName } from '../../lib/dates'
import type { SleepActive } from '../../state/appState'
import { TabIntro } from '../../skincare/tabs/TabIntro'
import { consistency, factors, lastNights, PATTERN_NIGHTS, shortNights, weekTrend, type Factor } from '../patterns'
import {
  checkInMinutes,
  lightsOutFor,
  nightKeyFor,
  nightNumber,
  planWeekFor,
  planWeeks,
  SLEEP_NEED_MINUTES,
  tonightLightsOut,
} from '../plan'

type PatternsTabProps = {
  active: SleepActive
  today: string
  night: string
  skincareLive: boolean
  onOpenSkincare: () => void
}

// The chart's top is 10 hours.
const CHART_MAX = 10 * 60

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

function PlanCard({ active, night }: { active: SleepActive; night: string }) {
  const total = planWeeks(active)
  const week = Math.min(planWeekFor(nightNumber(active, night)), total)
  const start = Math.max(1, week - 3)
  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
      <Eyebrow>Your plan</Eyebrow>
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => {
          const w = start + i
          const current = w === week
          return (
            <div
              key={w}
              className={[
                'flex flex-col items-center gap-0.5 rounded-[12px] py-2',
                current ? 'border-[1.5px] border-accent bg-tint' : 'border border-border',
                w > total ? 'opacity-50' : '',
              ].join(' ')}
            >
              <span className="text-[11px] text-muted">Week {w}</span>
              <span className="text-sm font-semibold text-text tabular-nums">{lightsOutFor(active, w)}</span>
            </div>
          )
        })}
      </div>
      <p className="text-sm text-text">Lights out moves 15 minutes earlier each week. If a week goes badly, we hold it instead of pushing on.</p>
    </section>
  )
}

function FactorList({ title, items, tone }: { title: string; items: Factor[]; tone: 'helps' | 'costs' }) {
  return (
    <section className="flex flex-col gap-1 rounded-[20px] border border-border bg-surface p-4">
      <Eyebrow>{title}</Eyebrow>
      <ul className="flex flex-col divide-y divide-border">
        {items.map((f) => (
          <li key={f.label} className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-base text-text">{f.label}</span>
            <span className={['text-sm font-semibold', tone === 'helps' ? 'text-accent-text' : 'text-warning'].join(' ')}>
              {f.minutes}m {tone === 'helps' ? 'longer' : 'shorter'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function PatternsTab({ active, today, night, skincareLive, onOpenSkincare }: PatternsTabProps) {
  const logged = Object.keys(active.checkIns).length

  if (logged < PATTERN_NIGHTS) {
    const left = PATTERN_NIGHTS - logged
    const locked = ['Your week in sleep', 'What helps you', ...(skincareLive ? ['Sleep and skin'] : [])]
    return (
      <div className="flex flex-col gap-4">
        <TabIntro title="Your patterns are on the way" subtitle="Seven nights is what it takes to tell a pattern from a coincidence." />

        <section className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
          <Eyebrow>Nights logged</Eyebrow>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[44px] leading-none font-bold text-text">
              {logged} of {PATTERN_NIGHTS}
            </p>
            <p className="text-sm text-muted">
              Unlocks in {left} {left === 1 ? 'morning' : 'mornings'}
            </p>
          </div>
          <SegmentBar total={PATTERN_NIGHTS} filled={logged} label="Nights logged" />
          <p className="text-sm text-text">Each morning check in counts.</p>
        </section>

        <PlanCard active={active} night={night} />

        <section className="flex flex-col gap-2">
          <Eyebrow>Coming with your first week</Eyebrow>
          {locked.map((title) => (
            <div key={title} className="flex items-center justify-between gap-3 rounded-[16px] border border-dashed border-border p-4">
              <span className="text-base font-semibold text-muted">{title}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Lock size={13} aria-hidden />
                {left} {left === 1 ? 'night' : 'nights'}
              </span>
            </div>
          ))}
        </section>
      </div>
    )
  }

  const trend = weekTrend(active.checkIns, today)
  const nights = lastNights(active.checkIns, today)
  const steady = consistency(active.checkIns, today, (n) => tonightLightsOut(active, n))
  const { helps, costs } = factors(active.checkIns, active.sessions, (at) => nightKeyFor(new Date(at)))
  const total = planWeeks(active)
  const week = Math.min(planWeekFor(nightNumber(active, night)), total)
  const atGoal = week >= total
  const nextShiftDay = addDays(active.startedAt, 7 * week)
  const goalLine = (SLEEP_NEED_MINUTES / CHART_MAX) * 100

  return (
    <div className="flex flex-col gap-4">
      <TabIntro
        title={trend.title}
        subtitle={
          trend.deltaMinutes === null
            ? undefined
            : trend.deltaMinutes === 0
              ? 'Your average matches the week before.'
              : `Your average is ${trend.deltaMinutes > 0 ? 'up' : 'down'} ${Math.abs(trend.deltaMinutes)} minutes on the week before.`
        }
      />

      <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
        <Eyebrow>Last 7 nights</Eyebrow>
        <div className="relative flex h-36 items-end gap-2" role="img" aria-label="Time asleep over the last 7 nights">
          <span
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent"
            style={{ bottom: `${goalLine}%` }}
            aria-hidden
          />
          {nights.map((n, i) => (
            <span
              key={n.key}
              className={[
                'flex-1 rounded-t-[6px]',
                n.checkIn ? (i === nights.length - 1 ? 'bg-accent' : 'bg-accent/40') : 'h-full border border-dashed border-border',
              ].join(' ')}
              style={n.checkIn ? { height: `${Math.min(100, (checkInMinutes(n.checkIn) / CHART_MAX) * 100)}%` } : undefined}
            />
          ))}
        </div>
        <div className="flex gap-2" aria-hidden>
          {nights.map((n) => (
            <span key={n.key} className="flex-1 text-center text-[11px] text-muted">
              {weekdayName(addDays(n.key, -1), 'short').charAt(0)}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted">Dashed line: 7h 30m</p>
      </section>

      <section className="flex flex-col gap-2 rounded-[20px] border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>Consistency</Eyebrow>
          {steady.streak >= 2 && (
            <span className="rounded-full bg-tint px-2.5 py-1 text-xs font-semibold text-accent-text">{steady.streak} nights steady</span>
          )}
        </div>
        <p className="text-[28px] leading-none font-bold text-text">{steady.within} of 7</p>
        <p className="text-sm text-muted">nights within 30 minutes of your lights out.</p>
      </section>

      {helps.length > 0 && <FactorList title="What helps you" items={helps} tone="helps" />}
      {costs.length > 0 && <FactorList title="What costs you" items={costs} tone="costs" />}
      <p className="text-xs text-muted">Based on {logged} nights. Patterns in your data, not medical advice.</p>

      {skincareLive && (
        <section className="flex flex-col gap-2 rounded-[20px] border border-border bg-surface p-4">
          <Eyebrow>Sleep and skin</Eyebrow>
          <p className="text-[15px] leading-relaxed text-text">
            Nights under 6 hours: {shortNights(active.checkIns, today)}. After a short night with training, Skincare skips retinol to
            protect your skin barrier.
          </p>
          <button
            type="button"
            onClick={onOpenSkincare}
            className={`h-9 self-start rounded-full border-[1.5px] border-accent px-4 text-sm font-semibold text-text ${focusRing}`}
          >
            Open Skincare
          </button>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
        <Eyebrow>{`Your plan · Week ${week} of ${total}`}</Eyebrow>
        <SegmentBar total={total} filled={week} label="Plan weeks" />
        <p className="text-sm text-text">
          {atGoal
            ? `You're at your goal. Lights out stays at ${active.goal}.`
            : `Next shift on ${weekdayName(nextShiftDay)}: lights out at ${lightsOutFor(active, week + 1)}.`}
        </p>
      </section>
    </div>
  )
}
