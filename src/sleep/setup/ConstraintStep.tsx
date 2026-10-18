import { useState, type ComponentType } from 'react'
import { Moon, Sun } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { Sheet } from '../../components/Sheet'
import { parseClock } from '../../lib/dates'
import { StepTitle } from '../../skincare/StepTitle'
import { checkWindow, formatDuration, windowMinutes } from '../plan'
import { SleepStepScreen } from './SleepStepScreen'
import type { SleepStepProps } from './types'

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

// The window bar runs from 18:00 to 12:00 the next day.
const AXIS_START = 18 * 60
const AXIS_SPAN = 18 * 60
const AXIS_LABELS = ['18:00', '00:00', '06:00', '12:00']

function TimeRow({
  icon: Icon,
  label,
  value,
  error,
  onChange,
}: {
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  value: string | null
  error: boolean
  onChange: (value: string) => void
}) {
  return (
    <label
      className={[
        'relative flex h-16 items-center gap-3 rounded-[20px] border bg-surface px-4 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent',
        error ? 'border-[1.5px] border-warning' : 'border-border',
      ].join(' ')}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
        <Icon size={18} aria-hidden />
      </span>
      <span className="flex-1 text-base font-semibold text-text">{label}</span>
      <span className={['text-base', value ? 'font-semibold text-text' : 'text-muted'].join(' ')}>{value ?? 'Set time'}</span>
      {/* The native input sits on top of the row, so a tap opens the phone's own time wheel. */}
      <input
        type="time"
        aria-label={label}
        value={value ?? ''}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        onClick={(event) => {
          try {
            event.currentTarget.showPicker?.()
          } catch {
            // Already open, or not allowed here; the native control still works.
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  )
}

export function ConstraintStep({ setup, onChange, onNext, onBack }: SleepStepProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const { bedtime, wake } = setup
  const check = bedtime && wake ? checkWindow(bedtime, wake) : null
  const odd = check === 'short' || check === 'long'
  const window = bedtime && wake ? windowMinutes(bedtime, wake) : 0

  const start = bedtime ? Math.min((((parseClock(bedtime) - AXIS_START) % 1440) + 1440) % 1440, AXIS_SPAN) / AXIS_SPAN : 0
  const width = Math.min(window / AXIS_SPAN, 1 - start)

  return (
    <SleepStepScreen
      step={3}
      onBack={onBack}
      footer={
        <PrimaryButton onClick={onNext} disabled={!check || check === 'same'}>
          {odd ? "Yes, that's right" : 'Continue'}
        </PrimaryButton>
      }
      overlay={
        sheetOpen && (
          <Sheet
            title="Use this week's times for now"
            subtitle="Your plan adapts as you log mornings, and you can change the times anytime in Sleep."
            onClose={() => setSheetOpen(false)}
          >
            <PrimaryButton onClick={() => setSheetOpen(false)}>Got it</PrimaryButton>
          </Sheet>
        )
      }
    >
      <div className="flex flex-col gap-6">
        <StepTitle title="Bedtime and wake time on a normal weekday." subtitle="Roughly is fine. Your nights will sharpen it." />

        <div className="flex flex-col gap-3">
          <TimeRow icon={Moon} label="Bedtime" value={bedtime} error={check === 'same'} onChange={(v) => onChange({ bedtime: v })} />
          <TimeRow icon={Sun} label="Wake time" value={wake} error={check === 'same'} onChange={(v) => onChange({ wake: v })} />
          {check === 'same' && (
            <p role="alert" className="text-sm text-warning">
              Bedtime and wake time can't be the same. Change one of them.
            </p>
          )}
        </div>

        {check && check !== 'same' ? (
          <section
            className={[
              'flex flex-col gap-3 rounded-[20px] border p-4',
              odd ? 'border-[1.5px] border-warning bg-warning-tint' : 'border-border bg-surface',
            ].join(' ')}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">Your sleep window</p>
              <p className="text-sm text-text">
                <span className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">In bed </span>
                <span className="font-bold">{formatDuration(window)}</span>
              </p>
            </div>
            <div className="flex flex-col gap-1.5" aria-hidden>
              <div className="relative h-3 rounded-full bg-tint">
                <span
                  className={['absolute inset-y-0 rounded-full', odd ? 'bg-warning' : 'bg-accent'].join(' ')}
                  style={{ left: `${start * 100}%`, width: `${width * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted">
                {AXIS_LABELS.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </div>
            </div>
            {odd && (
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-warning">
                  {check === 'short' ? "That's a short night. Is it right?" : "That's a long night. Is it right?"}
                </p>
                <p className="text-sm text-text">Night shifts and early starts happen. If it's a slip, tap a time to fix it.</p>
              </div>
            )}
          </section>
        ) : (
          <section className="flex flex-col gap-1 rounded-[20px] border border-dashed border-border p-4">
            <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">Your sleep window</p>
            <p className="text-sm text-muted">Set both times and your window shows up here.</p>
          </section>
        )}

        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`-my-2 h-11 self-start text-sm font-semibold text-text underline underline-offset-2 ${focusRing}`}
        >
          My hours change week to week
        </button>
      </div>
    </SleepStepScreen>
  )
}
