import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Heart, Loader2, Lock } from 'lucide-react'
import { HintCard } from '../../components/HintCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { Sheet } from '../../components/Sheet'
import { addDays } from '../../lib/dates'
import { StepTitle } from '../../skincare/StepTitle'
import type { HealthConnectDemo, HydrationSetup } from '../../state/appState'
import { hydrationDay } from '../day'
import { HEALTH_AVG_ML, importedHealth } from '../demo'
import { formatLitres } from '../target'
import { HydrationStepScreen } from './HydrationStepScreen'
import type { HydrationStepProps } from './steps'

// A web app can't read Apple Health, so "Connect" plays out the outcome picked in the Demo panel.
const WAIT_MS = 1200

type Phase = 'idle' | 'waiting' | HealthConnectDemo

const READS = ['Water logged each day', 'What time you logged it']
const SETTINGS_STEPS = ['Open Settings, then Health.', 'Tap Data Access, then HUMANOS.', 'Turn on Water and come back.']

const TITLES: Partial<Record<Phase, [string, string]>> = {
  connected: ['Apple Health is connected.', 'Your target starts from your real days.'],
  denied: ['Water access is off.', "Apple Health didn't share your water. You can still go on with your answers."],
  noData: ['Connected, no water logged yet.', 'Nothing to import for now. We start from your answers and learn from today.'],
}

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

// The last 28 days as thin bars, oldest first; a missing day is a dashed stub.
function HistoryBars() {
  const days = useMemo(() => {
    const today = hydrationDay()
    const data = importedHealth(today)
    return Array.from({ length: 28 }, (_, i) => data[addDays(today, i - 28)] ?? null)
  }, [])
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-14 items-end gap-[3px]" role="img" aria-label="Water logged over the last 4 weeks">
        {days.map((ml, i) => (
          <span
            key={i}
            className={['flex-1 rounded-[2px]', ml === null ? 'h-2 border border-dashed border-border-strong' : 'bg-accent'].join(' ')}
            style={ml === null ? undefined : { height: `${Math.min(100, (ml / 2000) * 100)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>4 weeks ago</span>
        <span>Yesterday</span>
      </div>
    </div>
  )
}

export function HealthStep({ setup, onChange, onNext, onBack, outcome }: HydrationStepProps & { outcome: HealthConnectDemo }) {
  const [phase, setPhase] = useState<Phase>(() =>
    setup.health === 'connected' ? 'connected' : setup.health === 'noData' ? 'noData' : 'idle',
  )
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  function connect() {
    if (phase === 'waiting') return
    setPhase('waiting')
    timer.current = window.setTimeout(() => setPhase(outcome), WAIT_MS)
  }

  function finish(health: HydrationSetup['health']) {
    onChange({ health, healthAvgMl: health === 'connected' ? HEALTH_AVG_ML : null })
    onNext()
  }

  const linked = phase === 'connected' || phase === 'noData'
  const denied = phase === 'denied'
  const [title, subtitle] = TITLES[phase] ?? ['Bring in your water history.', 'You already log it. Your real days beat a best guess.']

  const footer = denied ? (
    <div className="flex flex-col items-center gap-2">
      <PrimaryButton onClick={() => setPhase('idle')}>Open Settings</PrimaryButton>
      <SecondaryButton onClick={() => finish('denied')}>Continue without it</SecondaryButton>
    </div>
  ) : linked ? (
    <PrimaryButton onClick={() => finish(phase)}>Continue</PrimaryButton>
  ) : (
    <div className="flex flex-col items-center gap-2">
      <PrimaryButton onClick={connect} aria-busy={phase === 'waiting'}>
        {phase === 'waiting' ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden />
            Waiting for Apple Health
          </span>
        ) : (
          'Connect Apple Health'
        )}
      </PrimaryButton>
      <SecondaryButton onClick={() => finish('notNow')} disabled={phase === 'waiting'}>
        Not now
      </SecondaryButton>
    </div>
  )

  return (
    <HydrationStepScreen
      step={3}
      total={4}
      onBack={onBack}
      footer={footer}
      overlay={
        phase === 'unavailable' && (
          <Sheet title="Apple Health needs the HUMANOS iPhone app." subtitle="We'll start from your answers." onClose={() => setPhase('idle')}>
            <PrimaryButton onClick={() => finish('notNow')}>Continue</PrimaryButton>
          </Sheet>
        )
      }
    >
      <div className="flex flex-col gap-6">
        <StepTitle title={title} subtitle={subtitle} />

        {denied ? (
          <ol className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
            {SETTINGS_STEPS.map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint text-sm font-semibold text-text">
                  {index + 1}
                </span>
                <span className="text-base text-text">{step}</span>
              </li>
            ))}
          </ol>
        ) : phase === 'connected' ? (
          <section className="flex flex-col gap-4 rounded-[20px] border-[1.5px] border-accent bg-tint p-5" role="status">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-surface text-accent">
                <Check size={20} strokeWidth={2.5} aria-hidden />
              </span>
              <div>
                <p className="text-base font-semibold text-text">26 days found</p>
                <p className="text-sm text-muted">The last 4 weeks</p>
              </div>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <Eyebrow>Daily average</Eyebrow>
              <span className="text-lg font-bold text-text">{formatLitres(HEALTH_AVG_ML)}</span>
            </div>
            <HistoryBars />
          </section>
        ) : (
          <section
            className={[
              'flex flex-col gap-4 rounded-[20px] border p-5',
              phase === 'noData' ? 'border-[1.5px] border-accent bg-tint' : 'border-border bg-surface',
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
                <Heart size={20} aria-hidden />
              </span>
              <div>
                <p className="text-base font-semibold text-text">Apple Health</p>
                <p className="text-sm text-muted">Up to 30 past days</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Eyebrow>What we read</Eyebrow>
              <ul className="flex flex-col gap-2">
                {READS.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-base text-text">
                    <Check size={16} strokeWidth={2.5} className="text-accent" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="h-px bg-border" />
            <p className="flex items-center gap-2 text-sm text-muted">
              <Lock size={14} aria-hidden />
              Read only. Nothing is written back or shared.
            </p>
          </section>
        )}

        {phase === 'noData' ? (
          <HintCard>If you log water in another app, check that it saves to Apple Health. It shows up here on its own.</HintCard>
        ) : (
          !denied && phase !== 'connected' && <HintCard>Most water apps save to Apple Health, so this picks up those too.</HintCard>
        )}
      </div>
    </HydrationStepScreen>
  )
}
