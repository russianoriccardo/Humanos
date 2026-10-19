import { useEffect, useRef, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'
import { Screen } from '../components/Screen'
import { BREATH_ROUNDS, sessionSeconds, type SleepSession } from '../sleep/sessions'

type SleepSessionPlayerProps = {
  session: SleepSession
  onComplete: () => void
  onExit: () => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
// The screen dims after this long without a touch, so it doesn't light up a dark room.
const DIM_AFTER_MS = 10_000

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

// Finished segments gold, the current one half gold, the rest empty.
function ProgressBar({ total, current, label }: { total: number; current: number; label: string }) {
  return (
    <span role="progressbar" aria-label={label} aria-valuemin={1} aria-valuemax={total} aria-valuenow={current} className="flex w-[200px] gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={['h-1.5 flex-1 rounded-full', i < current - 1 ? 'bg-accent' : i === current - 1 ? 'bg-accent/50' : 'bg-border'].join(' ')}
        />
      ))}
    </span>
  )
}

function BreathingCircle({ size, seconds, word, left }: { size: 'big' | 'small'; seconds: number; word: string; left: number }) {
  return (
    <div className="relative h-[280px] w-[280px] shrink-0">
      <span className="absolute inset-0 rounded-full bg-tint" aria-hidden />
      <span className="absolute inset-[30px] rounded-full bg-accent/25" aria-hidden />
      {/* Grows over the inhale, shrinks over the exhale; still under reduced motion. */}
      <span
        className="absolute inset-[62px] rounded-full bg-accent ease-in-out motion-reduce:!transform-none motion-reduce:!transition-none"
        style={{ transform: `scale(${size === 'big' ? 1 : 0.72})`, transition: `transform ${seconds}s` }}
        aria-hidden
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-on-accent" aria-live="polite">
        <p className="text-[22px] font-semibold">{word}</p>
        <p className="text-[56px] leading-none font-bold tabular-nums">{left}</p>
      </div>
    </div>
  )
}

export function SleepSessionPlayer({ session, onComplete, onExit }: SleepSessionPlayerProps) {
  const total = sessionSeconds(session)
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dimmed, setDimmed] = useState(false)
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

  // Dim after 10 seconds without a touch; any touch brings it back.
  useEffect(() => {
    let timer = window.setTimeout(() => setDimmed(true), DIM_AFTER_MS)
    const wake = () => {
      setDimmed(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setDimmed(true), DIM_AFTER_MS)
    }
    document.addEventListener('pointerdown', wake)
    document.addEventListener('keydown', wake)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerdown', wake)
      document.removeEventListener('keydown', wake)
    }
  }, [])

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
    <header className="grid shrink-0 grid-cols-[44px_1fr_44px] items-center px-3.5 pt-4 pb-2">
      <button
        type="button"
        onClick={onExit}
        aria-label="End session"
        className={`flex h-11 w-11 items-center justify-center rounded-full text-text ${focusRing}`}
      >
        <X size={22} />
      </button>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">Wind down · {session.minutes} min</p>
        <p className="text-[15px] font-semibold text-text">{session.title}</p>
      </div>
      <span />
    </header>
  )

  const footer = (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? 'Resume' : 'Pause'}
        className={`flex h-[72px] w-[72px] items-center justify-center rounded-full bg-cta text-cta-text transition-transform duration-[120ms] motion-safe:active:scale-[0.97] ${focusRing}`}
      >
        {paused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
      </button>
      <p className="text-xs text-muted">The screen dims after 10 seconds</p>
    </div>
  )

  const overlay = (
    <div
      aria-hidden
      className={[
        'pointer-events-none absolute inset-0 z-40 bg-black transition-opacity duration-700 motion-reduce:transition-none',
        dimmed ? 'opacity-70' : 'opacity-0',
      ].join(' ')}
    />
  )

  if (session.pattern) {
    const { phase, left } = breathAt(session, elapsed)
    const roundLength = total / BREATH_ROUNDS
    const round = Math.min(BREATH_ROUNDS, Math.floor(elapsed / roundLength) + 1)
    return (
      <Screen header={header} footer={footer} overlay={overlay}>
        <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
          <BreathingCircle
            size={paused ? 'small' : phase.size}
            seconds={paused ? 0.3 : phase.seconds}
            word={paused ? 'Paused' : phase.word}
            left={left}
          />
          <div className="flex flex-col items-center gap-2.5">
            <p className="text-[15px] font-semibold text-text">
              Round {round} of {BREATH_ROUNDS}
            </p>
            <ProgressBar total={BREATH_ROUNDS} current={round} label="Rounds" />
            <p className="text-sm text-muted">Lips closed, shoulders down. Count slowly.</p>
          </div>
        </div>
      </Screen>
    )
  }

  const steps = session.steps!
  const { index, left } = stepAt(session, elapsed)
  return (
    <Screen header={header} footer={footer} overlay={overlay}>
      <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
        <p key={index} className="max-w-[320px] animate-fade text-[22px] leading-snug font-semibold text-text" aria-live="polite">
          {steps[index].text}
        </p>
        <div className="flex flex-col items-center gap-2.5">
          <p className="text-[15px] font-semibold text-text">
            Step {index + 1} of {steps.length}
          </p>
          <ProgressBar total={steps.length} current={index + 1} label="Steps" />
          <p className="text-sm text-muted tabular-nums">{paused ? 'Paused' : `${left}s left in this step`}</p>
        </div>
      </div>
    </Screen>
  )
}
