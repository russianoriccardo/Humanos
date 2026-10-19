import { AudioLines, Check, CloudRain, Footprints, PersonStanding, Play, Scan, Square, Wind, type LucideIcon } from 'lucide-react'
import { TabIntro } from '../../skincare/tabs/TabIntro'
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
const ICONS: Record<string, LucideIcon> = {
  breath478: Wind,
  box: Square,
  yoga: PersonStanding,
  bodyScan: Scan,
  legsUp: Footprints,
  rain: CloudRain,
  brownNoise: AudioLines,
}
const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const FIRST_SESSION = 'breath478'

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

function SessionRow({ session, detail, onOpen }: { session: SleepSession; detail?: string; onOpen: () => void }) {
  const Icon = ICONS[session.id] ?? Wind
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 rounded-[16px] border border-border bg-surface px-3.5 py-3 text-left transition-transform duration-[120ms] motion-safe:active:scale-[0.98] ${focusRing}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
        <Icon size={18} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-[15px] font-semibold text-text">{session.title}</span>
        <span className="truncate text-[13px] text-muted">{detail ?? session.blurb}</span>
      </span>
      <span className="shrink-0 text-[13px] font-semibold text-muted">{session.lengthLabel ?? `${session.minutes} min`}</span>
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
      <TabIntro eyebrow="Wind down" title="Slow down before lights out" subtitle="Short sessions for the last 30 minutes of your day." />

      {favourite ? (
        <section className="flex flex-col gap-3.5 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>{`Tonight's pick · ${favourite.minutes} min`}</Eyebrow>
            <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold tracking-[1px] text-on-accent uppercase">Works for you</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[22px] font-bold tracking-[-0.3px] text-text">{favourite.title}</p>
            <p className="text-[15px] leading-normal text-text">
              You've done this {counts[0].count} times. Best right after screens go away at {screensAway}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onStart(favourite.id)}
            className={`flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-cta px-5 text-[15px] font-semibold text-cta-text transition-transform duration-[120ms] motion-safe:active:scale-[0.98] ${focusRing}`}
          >
            <Play size={16} fill="currentColor" aria-hidden />
            Start
          </button>
        </section>
      ) : (
        <section className="flex flex-col gap-3.5 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
          <Eyebrow>{`Start here · ${first.minutes} min`}</Eyebrow>
          <div className="flex flex-col gap-1.5">
            <p className="text-[22px] font-bold tracking-[-0.3px] text-text">{first.title}</p>
            <p className="text-[15px] leading-normal text-text">
              The easiest one to learn. In for 4, hold for 7, out for 8. Most people feel calmer by round three.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onStart(first.id)}
            className={`flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-cta px-5 text-[15px] font-semibold text-cta-text transition-transform duration-[120ms] motion-safe:active:scale-[0.98] ${focusRing}`}
          >
            <Play size={16} fill="currentColor" aria-hidden />
            {active.sessions.length === 0 ? 'Start your first session' : 'Start'}
          </button>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>This week</Eyebrow>
          <span className="text-sm text-muted">
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
              <li
                key={i}
                className="flex flex-col items-center gap-1.5"
                aria-label={`${letter}${done ? ', session done' : ''}${isToday ? ', today' : ''}`}
              >
                <span
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full border-[1.5px]',
                    done ? 'border-accent bg-accent text-on-accent' : isToday ? 'border-text' : 'border-border',
                  ].join(' ')}
                  aria-hidden
                >
                  {done && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="text-[11px] font-semibold text-muted" aria-hidden>
                  {letter}
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
          {SESSIONS.filter((s) => s.group === group && !s.situational).map((session) => (
            <SessionRow key={session.id} session={session} onOpen={() => open(session)} />
          ))}
        </section>
      ))}
    </div>
  )
}
