import { useEffect, useRef, useState } from 'react'
import { Check, Heart, Loader2, Lock } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { Sheet } from '../../components/Sheet'
import { StepTitle } from '../../skincare/StepTitle'
import type { HealthConnectDemo, SleepSetup } from '../../state/appState'
import { SleepStepScreen } from './SleepStepScreen'
import type { SleepStepProps } from './types'

// A web app can't read Apple Health, so "Connect" plays out the outcome picked in the Demo panel.
const WAIT_MS = 1200

type Phase = 'idle' | 'waiting' | HealthConnectDemo

const READS = ['Time asleep', 'Bed and wake times', 'Heart rate while asleep']

const SETTINGS_STEPS = ['Open Settings, then Health.', 'Tap Data Access and Devices, then HUMANOS.', 'Turn on Sleep and Heart Rate.']

export function HealthStep({ setup, onChange, onNext, onBack, outcome }: SleepStepProps & { outcome: HealthConnectDemo }) {
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

  function finish(health: SleepSetup['health']) {
    onChange({ health })
    onNext()
  }

  const linked = phase === 'connected' || phase === 'noData'
  const denied = phase === 'denied'

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
    <SleepStepScreen
      step={4}
      onBack={onBack}
      footer={footer}
      overlay={
        phase === 'unavailable' && (
          <Sheet
            title="Apple Health needs the HUMANOS iPhone app."
            subtitle="We'll start from your answers."
            onClose={() => setPhase('idle')}
          >
            <PrimaryButton onClick={() => finish('notNow')}>Continue</PrimaryButton>
          </Sheet>
        )
      }
    >
      <div className="flex flex-col gap-6">
        {denied ? (
          <StepTitle title="Sleep access is off." subtitle="Turn it on in Settings and your past nights come in." />
        ) : (
          <StepTitle title="Connect Apple Health." subtitle="Your past nights let the plan start from real data, not a best guess." />
        )}

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
        ) : (
          <section
            className={[
              'flex flex-col gap-4 rounded-[20px] border p-5',
              linked ? 'border-[1.5px] border-accent bg-tint' : 'border-border bg-surface',
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
                <Heart size={20} aria-hidden />
              </span>
              <div>
                <p className="text-base font-semibold text-text">Apple Health</p>
                <p className="text-sm text-muted">Up to 30 past nights</p>
              </div>
            </div>

            {phase === 'connected' && (
              <div className="flex items-center gap-2" role="status">
                <Check size={16} strokeWidth={2.5} className="text-accent" aria-hidden />
                <p className="text-sm text-text">
                  <span className="font-semibold">14 nights found</span>
                  <span className="text-muted"> · The last two weeks</span>
                </p>
              </div>
            )}
            {phase === 'noData' && (
              <p className="flex items-center gap-2 text-sm font-semibold text-text" role="status">
                <Check size={16} strokeWidth={2.5} className="text-accent" aria-hidden />
                Connected, no nights yet.
              </p>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">What we read</p>
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
      </div>
    </SleepStepScreen>
  )
}
