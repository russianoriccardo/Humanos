import { AudioLines, Check, ChevronRight, Footprints, Wind } from 'lucide-react'
import { dateKey } from '../../lib/dates'
import { getHealth } from '../../services/health.mock'
import type { AppState, SleepActive } from '../../state/appState'
import { sessionCounts, sessionWeek } from '../patterns'
import { shiftClock, tonightLightsOut, WIND_DOWN_MINUTES } from '../plan'
import { SESSIONS, sessionById, type SessionGroup, type SleepSession } from '../sessions'

type WindDownTabProps = {
  state: AppState
  active: SleepActive
  night: string
  onStart: (sessionId: string) => void
  onComingSoon: () => void
}

const GROUPS: SessionGroup[] = ['Breathing', 'Body', 'Sound']
const GROUP_ICONS = { Breathing: Wind, Body: Footprints, Sound: AudioLines }
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const FIRST_SESSION = 'breath478'

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

function SessionRow({ session, detail, onOpen }: { session: SleepSession; detail?: string; onOpen: () => void }) {
  const Icon = GROUP_ICONS[session.group]
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex min-h-16 w-full items-center gap-3 rounded-[16px] border border-border bg-surface px-4 py-3 text-left transition-transform duration-[120ms] motion-safe:active:scale-[0.98] ${focusRing}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
        <Icon size={18} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base font-semibold text-text">{session.title}</span>
        <span className="truncate text-sm text-muted">{detail ?? session.blurb}</span>
      </span>
      <span className="shrink-0 text-sm text-muted">{session.minutes ? `${session.minutes} min` : 'Sound'}</span>
      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
    </button>
  )
}

export function WindDownTab({ state, active, night, onStart, onComingSoon }: WindDownTabProps) {
  const counts = sessionCounts(active.sessions).filter((c) => sessionById(c.id))
  const week = sessionWeek(active.sessions, dateKey())
  const trainedLate = getHealth(state.demo.scenario).trainedYesterday === true
  const screensAway = shiftClock(tonightLightsOut(active, night), -WIND_DOWN_MINUTES)
  const open = (session: SleepSession) => (session.group === 'Sound' ? onComingSoon() : onStart(session.id))

  const favourite = active.sessions.length >= 3 ? sessionById(counts[0].id) : undefined
  const first = sessionById(FIRST_SESSION)!

  return (
    <div className="flex flex-col gap-4">

      {favourite ? (
        <section className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>{`Tonight's pick · ${favourite.minutes} min`}</Eyebrow>
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold tracking-[1px] text-on-accent uppercase">Works for you</span>
          </div>
          <p className="text-[22px] leading-tight font-bold text-text">{favourite.title}</p>
          <p className="text-[15px] leading-relaxed text-text">
            You've done this {counts[0].count} times. Best right after screens go away at {screensAway}.
          </p>
          <button
            type="button"
            onClick={() => onStart(favourite.id)}
            className={`h-12 rounded-full bg-cta px-5 text-base font-semibold text-cta-text ${focusRing}`}
          >
            Start
          </button>
        </section>
      ) : (
        <section className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
          <Eyebrow>{`Start here · ${first.minutes} min`}</Eyebrow>
          <p className="text-[22px] leading-tight font-bold text-text">{first.title}</p>
          <p className="text-[15px] leading-relaxed text-text">
            The easiest one to learn. In for 4, hold for 7, out for 8. Most people feel calmer by round three.
          </p>
          <button
            type="button"
            onClick={() => onStart(first.id)}
            className={`h-12 rounded-full bg-cta px-5 text-base font-semibold text-cta-text ${focusRing}`}
          >
            {active.sessions.length === 0 ? 'Start your first session' : 'Start'}
          </button>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>This week</Eyebrow>
          <span className="text-xs text-muted">
            {week.lastWeek > 0
              ? `${week.thisWeek} so far · ${week.lastWeek} last week`
              : `${week.thisWeek} ${week.thisWeek === 1 ? 'session' : 'sessions'}`}
          </span>
        </div>
        <ol className="flex justify-between" aria-label="Sessions this week">
          {DAY_LETTERS.map((letter, i) => {
            const done = week.done[i]
            const isToday = i === week.todayIndex
            return (
              <li key={i} className="flex flex-col items-center gap-1.5">
                <span
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold',
                    done ? 'bg-accent text-on-accent' : isToday ? 'border-[1.5px] border-accent text-text' : 'bg-tint text-muted',
                  ].join(' ')}
                  aria-label={`${letter}${done ? ', session done' : ''}${isToday ? ', today' : ''}`}
                >
                  {done ? <Check size={15} strokeWidth={3} aria-hidden /> : letter}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      {trainedLate && (
        <section className="flex flex-col gap-2">
          <Eyebrow>For tonight · you trained late</Eyebrow>
          <SessionRow session={sessionById('legsUp')!} onOpen={() => onStart('legsUp')} />
        </section>
      )}

      {counts.length > 0 && (
        <section className="flex flex-col gap-2">
          <Eyebrow>Your go to sessions</Eyebrow>
          {counts.slice(0, 3).map(({ id, count }) => (
            <SessionRow
              key={id}
              session={sessionById(id)!}
              detail={`Done ${count} ${count === 1 ? 'time' : 'times'}`}
              onOpen={() => open(sessionById(id)!)}
            />
          ))}
        </section>
      )}

      {GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-2">
          <Eyebrow>{group}</Eyebrow>
          {SESSIONS.filter((s) => s.group === group).map((session) => (
            <SessionRow key={session.id} session={session} onOpen={() => open(session)} />
          ))}
        </section>
      ))}
    </div>
  )
}
