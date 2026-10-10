import { Check, Flame, Play } from 'lucide-react'
import { HintCard } from '../../components/HintCard'
import type { SkincareActive } from '../../state/appState'
import { sessionSeconds, todaysSession } from '../yoga/faceYoga.content'
import { formatDuration, thisWeek, yogaStreak } from '../yoga/stats'
import { TabIntro } from './TabIntro'

type FaceYogaTabProps = {
  active: SkincareActive
  onStart: () => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

export function FaceYogaTab({ active, onStart }: FaceYogaTabProps) {
  const session = todaysSession
  const streak = yogaStreak(active.yoga.sessions)
  const week = thisWeek(active.yoga.sessions)
  const minutes = Math.round(sessionSeconds(session) / 60)
  const first = active.yoga.sessions.length === 0

  return (
    <div className="flex flex-col gap-5">
      <TabIntro title="Six minutes that make your routine work harder" />

      <section className="flex flex-col gap-4 rounded-[20px] bg-cta p-5 text-cta-text">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-[1.5px] uppercase">{first ? `Your first session · ${minutes} min` : `Today's session · ${minutes} min`}</p>
          <p className="text-[22px] leading-tight font-bold">{session.title}</p>
          <p className="text-sm">{session.bestTime}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onStart}
            className={`inline-flex h-12 items-center gap-2 rounded-full bg-cta-text px-5 text-sm font-semibold text-cta transition-transform duration-[120ms] motion-safe:active:scale-[0.97] ${focusRing}`}
          >
            <Play size={16} fill="currentColor" aria-hidden />
            {first ? 'Start your first session' : 'Start session'}
          </button>
          {streak >= 2 && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Flame size={16} aria-hidden />
              {streak}-day streak
            </span>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <Eyebrow>This week</Eyebrow>
          <span className="text-sm text-muted">
            {week.count} of {session.weeklyGoal} sessions
          </span>
        </div>
        <ol className="grid grid-cols-7 gap-1.5" aria-label={`${week.count} sessions this week`}>
          {week.days.map((day) => (
            <li key={day.key} className="flex flex-col items-center gap-1.5">
              <span className="text-xs text-muted" aria-hidden>
                {day.label}
              </span>
              <span
                aria-label={`${day.key}${day.done ? ', done' : ''}${day.isToday ? ', today' : ''}`}
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full',
                  day.done
                    ? 'bg-accent text-on-accent'
                    : day.isToday
                      ? 'border-[1.5px] border-accent'
                      : day.future
                        ? 'border border-dashed border-border'
                        : 'border border-border',
                ].join(' ')}
              >
                {day.done && <Check size={15} strokeWidth={3} aria-hidden />}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <Eyebrow>In this session</Eyebrow>
        <ol className="flex flex-col divide-y divide-border rounded-[20px] border border-border bg-surface">
          {session.exercises.map((ex, i) => (
            <li key={ex.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint text-sm font-semibold text-text">
                {i + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-base font-semibold text-text">{ex.name}</span>
                <span className="text-sm text-muted">{ex.target}</span>
              </span>
              <span className="shrink-0 text-sm font-medium text-text">{formatDuration(ex.seconds)}</span>
            </li>
          ))}
        </ol>
      </section>

      <HintCard>{session.tip}</HintCard>
    </div>
  )
}
