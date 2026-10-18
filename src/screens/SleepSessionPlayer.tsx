import { useEffect, useRef, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'
import { Screen } from '../components/Screen'
import { SegmentBar } from '../components/SegmentBar'
import { BREATH_ROUNDS, sessionSeconds, type SleepSession } from '../sleep/sessions'

type SleepSessionPlayerProps = {
  session: SleepSession
  onComplete: () => void
  onExit: () => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

// Where we are in a breathing pattern after `elapsed` seconds.
function breathAt(session: SleepSession, elapsed: number) {
  const pattern = session.pattern!
  const cycle = pattern.reduce((sum, p) => sum + p.seconds, 0)
  let t = elapsed % cycle
  for (const phase of pattern) {
    if (t < phase.seconds) return { phase, left: phase.seconds - t }
    t -= phase.seconds
  }
  return { phase: pattern[0], left: pattern[0].seconds }
}

// Which body step we're on after `elapsed` seconds.
function stepAt(session: SleepSession, elapsed: number) {
  const steps = session.steps!
  let t = elapsed
  for (let i = 0; i < steps.length; i++) {
    if (t < steps[i].seconds) return { index: i, left: steps[i].seconds - t }
    t -= steps[i].seconds
  }
  return { index: steps.length - 1, left: 0 }
}

function BreathingCircle({ size, seconds }: { size: 'big' | 'small'; seconds: number }) {
  return (
    <div className="relative flex h-60 w-60 items-center justify-center" aria-hidden>
      <span className="absolute inset-0 rounded-full border border-border" />
      <span className="absolute inset-6 rounded-full bg-tint" />
      {/* Grows over the inhale, shrinks over the exhale; still under reduced motion. */}
      <span
        className="absolute inset-12 rounded-full bg-accent/70 ease-in-out motion-reduce:!transform-none motion-reduce:!transition-none"
        style={{ transform: `scale(${size === 'big' ? 1.3 : 0.7})`, transition: `transform ${seconds}s` }}
      />
    </div>
  )
}

export function SleepSessionPlayer({ session, onComplete, onExit }: SleepSessionPlayerProps) {
  const total = sessionSeconds(session)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const finished = elapsed >= total
  const lockRef = useRef<WakeLockSentinel | null>(null)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  useEffect(() => {
    if (paused || finished) return
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => window.clearInterval(id)
  }, [paused, finished])

  useEffect(() => {
    if (finished) completeRef.current()
  }, [finished])

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
        aria-label="End session"
        className={`-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full text-text ${focusRing}`}
      >
        <X size={22} />
      </button>
      <p className="text-center text-sm font-semibold text-muted">{session.title}</p>
      <span />
    </header>
  )

  const footer = (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? 'Resume' : 'Pause'}
        className={`flex h-16 w-16 items-center justify-center rounded-full bg-cta text-cta-text transition-transform duration-[120ms] motion-safe:active:scale-[0.97] ${focusRing}`}
      >
        {paused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
      </button>
    </div>
  )

  if (session.pattern) {
    const { phase, left } = breathAt(session, elapsed)
    const roundLength = total / BREATH_ROUNDS
    const round = Math.min(BREATH_ROUNDS, Math.floor(elapsed / roundLength) + 1)
    return (
      <Screen header={header} footer={footer}>
        <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
          <BreathingCircle size={paused ? 'small' : phase.size} seconds={paused ? 0.3 : phase.seconds} />
          <div className="flex flex-col gap-1" aria-live="polite">
            <p className="text-[28px] leading-tight font-bold text-text">{paused ? 'Paused' : phase.word}</p>
            <p className="text-base text-muted tabular-nums">{left}s</p>
          </div>
          <div className="flex w-full max-w-[240px] flex-col gap-2">
            <p className="text-sm font-semibold text-text">
              Round {round} of {BREATH_ROUNDS}
            </p>
            <SegmentBar total={BREATH_ROUNDS} filled={round} label="Rounds" />
          </div>
          <p className="max-w-[280px] text-sm text-muted">Lips closed, shoulders down. Count slowly.</p>
        </div>
      </Screen>
    )
  }

  const steps = session.steps!
  const { index, left } = stepAt(session, elapsed)
  return (
    <Screen header={header} footer={footer}>
      <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
        <div className="flex w-full max-w-[280px] flex-col gap-2">
          <p className="text-sm font-semibold text-text">
            Step {index + 1} of {steps.length}
          </p>
          <SegmentBar total={steps.length} filled={index + 1} label="Steps" />
        </div>
        <p key={index} className="max-w-[320px] animate-fade text-[22px] leading-snug font-semibold text-text" aria-live="polite">
          {steps[index].text}
        </p>
        <p className="text-base text-muted tabular-nums">{paused ? 'Paused' : `${left}s`}</p>
      </div>
    </Screen>
  )
}
