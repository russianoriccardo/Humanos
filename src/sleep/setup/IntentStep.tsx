import { useState } from 'react'
import { AlertCircle, BedDouble, Check, Sunrise, Timer, Zap } from 'lucide-react'
import { HintCard } from '../../components/HintCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { StepTitle } from '../../skincare/StepTitle'
import type { SleepIntent } from '../../state/appState'
import { INTENTS } from '../plan'
import { SleepStepScreen } from './SleepStepScreen'
import type { SleepStepProps } from './types'

const MAX = 2

const ICONS: Record<SleepIntent, typeof Zap> = {
  energy: Zap,
  fallAsleep: Timer,
  fewerWakeups: BedDouble,
  mornings: Sunrise,
}

export function IntentStep({ setup, onChange, onNext, onBack }: SleepStepProps) {
  const picked = setup.intents
  const full = picked.length >= MAX
  const [shaking, setShaking] = useState<SleepIntent | null>(null)
  const [limitHit, setLimitHit] = useState(false)

  function toggle(id: SleepIntent) {
    if (picked.includes(id)) {
      setLimitHit(false)
      onChange({ intents: picked.filter((i) => i !== id) })
    } else if (full) {
      setLimitHit(true)
      setShaking(id)
      window.setTimeout(() => setShaking(null), 120)
    } else {
      setLimitHit(false)
      onChange({ intents: [...picked, id] })
    }
  }

  return (
    <SleepStepScreen
      step={2}
      onBack={onBack}
      onSkip={() => {
        onChange({ intents: [] })
        onNext()
      }}
      footer={
        <PrimaryButton onClick={onNext} disabled={picked.length === 0}>
          Continue · {picked.length} picked
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-6">
        <StepTitle
          title="What would you like sleep to do for you?"
          subtitle="Pick up to two."
          aside={
            <span className={['shrink-0 text-sm font-semibold', full ? 'text-accent-text' : 'text-muted'].join(' ')} aria-live="polite">
              {picked.length} / {MAX}
            </span>
          }
        />

        <div className="flex flex-col gap-3">
          {INTENTS.map((intent) => {
            const Icon = ICONS[intent.id]
            const selected = picked.includes(intent.id)
            const dimmed = full && !selected
            return (
              <button
                key={intent.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggle(intent.id)}
                className={[
                  'flex w-full items-center gap-3 rounded-[20px] border px-4 py-4 text-left transition-all duration-[120ms] motion-safe:active:scale-[0.97]',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  selected ? 'border-[1.5px] border-accent bg-tint' : 'border-border bg-surface',
                  dimmed ? 'opacity-40' : '',
                  shaking === intent.id ? 'animate-shake' : '',
                ].join(' ')}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
                  <Icon size={18} aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-base font-semibold text-text">{intent.title}</span>
                  <span className="text-sm text-muted">{intent.description}</span>
                </span>
                <span
                  className={[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-accent bg-accent text-on-accent' : 'border-border',
                  ].join(' ')}
                >
                  {selected && <Check size={14} strokeWidth={2.5} className="animate-pop" />}
                </span>
              </button>
            )
          })}
        </div>

        {limitHit && full ? (
          <p role="status" className="flex items-start gap-2 rounded-[16px] bg-warning-tint p-4 text-sm text-warning">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            Two is the limit. Tap one of your picks to free a spot.
          </p>
        ) : (
          <HintCard>We ask what you want, not how you sleep. The how comes from your nights.</HintCard>
        )}
      </div>
    </SleepStepScreen>
  )
}
