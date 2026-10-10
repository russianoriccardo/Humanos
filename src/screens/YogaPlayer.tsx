import { useEffect, useRef } from 'react'
import { Check, Pause, Play, SkipForward, X } from 'lucide-react'
import { Screen } from '../components/Screen'
import { PrimaryButton } from '../components/PrimaryButton'
import { todaysSession } from '../skincare/yoga/faceYoga.content'
import { useSessionTimer } from '../skincare/yoga/useSessionTimer'

type YogaPlayerProps = {
  streak: number
  weekCount: number
  onComplete: () => void
  onExit: () => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const SIZE = 220
const STROKE = 8

function Ring({ progress, children }: { progress: number; children: React.ReactNode }) {
  const r = (SIZE - STROKE) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" strokeWidth={STROKE} className="stroke-tint" />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={r}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * progress}
          className="stroke-accent transition-[stroke-dashoffset] duration-200 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function YogaPlayer({ streak, weekCount, onComplete, onExit }: YogaPlayerProps) {
  const session = todaysSession
  const timer = useSessionTimer(session, onComplete)
  const lockRef = useRef<WakeLockSentinel | null>(null)

  // Keep the screen on during the session where supported.
  useEffect(() => {
    let cancelled = false
    navigator.wakeLock
      ?.request('screen')
      .then((lock) => {
        if (cancelled) lock.release()
        else lockRef.current = lock
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      lockRef.current?.release().catch(() => undefined)
    }
  }, [])

  const header = (
    <header className="grid shrink-0 grid-cols-[44px_1fr_44px] items-center px-6 pt-4 pb-2">
      <button
        type="button"
        onClick={onExit}
        aria-label={timer.finished ? 'Close' : 'End session'}
        className={`-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full text-text ${focusRing}`}
      >
        <X size={22} />
      </button>
      <p className="text-center text-sm font-semibold text-muted">
        {timer.finished ? session.title : `${timer.segment.exIndex + 1} of ${session.exercises.length} · ${session.title}`}
      </p>
      <span />
    </header>
  )

  if (timer.finished) {
    return (
      <Screen header={header} footer={<PrimaryButton onClick={onExit}>Done</PrimaryButton>}>
        <div className="flex h-full flex-col items-center justify-center gap-5 text-center" role="status">
          <span className="flex h-24 w-24 items-center justify-center rounded-full border-[1.5px] border-accent">
            <span className="flex h-16 w-16 animate-pop items-center justify-center rounded-full bg-tint text-accent">
              <Check size={30} strokeWidth={2.5} />
            </span>
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] leading-tight font-bold text-text">Session done</h1>
            <p className="text-base text-muted">
              {streak}-day streak · {weekCount} of {session.weeklyGoal} this week
            </p>
          </div>
        </div>
      </Screen>
    )
  }

  const prep = timer.segment.phase === 'prep'

  return (
    <Screen
      header={header}
      footer={
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={timer.paused ? timer.resume : timer.pause}
            aria-label={timer.paused ? 'Resume' : 'Pause'}
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-cta text-cta-text transition-transform duration-[120ms] motion-safe:active:scale-[0.97] ${focusRing}`}
          >
            {timer.paused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={timer.skip}
            aria-label={prep ? 'Start now' : 'Skip exercise'}
            className={`flex h-12 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-text ${focusRing}`}
          >
            <SkipForward size={16} aria-hidden />
            {prep ? 'Start now' : 'Skip'}
          </button>
        </div>
      }
    >
      <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{prep ? 'Get ready' : 'Now'}</p>
          <h1 className="text-[28px] leading-tight font-bold text-text">{timer.exercise.name}</h1>
        </div>
        <Ring progress={timer.progress}>
          <span className="text-[44px] leading-none font-bold text-text tabular-nums" aria-live="off">
            {clock(timer.remaining)}
          </span>
          <span className="mt-1 text-sm text-muted">{timer.paused ? 'Paused' : prep ? 'Starting soon' : 'Keep going'}</span>
        </Ring>
        <p className="max-w-[300px] text-base leading-relaxed text-text">{timer.exercise.instruction}</p>
      </div>
    </Screen>
  )
}
