import { useEffect, useState, type KeyboardEvent } from 'react'
import { AlertCircle, ChevronDown, Info, Minus, Plus, Stethoscope } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { Sheet } from '../../components/Sheet'
import type { Answers } from '../../onboarding/types'
import { StepTitle } from '../../skincare/StepTitle'
import { moreGlasses } from '../mirror'
import { formatLitres, glassesLabel, recommendTarget, softCheck, STEP } from '../target'
import { HydrationStepScreen } from './HydrationStepScreen'
import { totalSteps, type HydrationStepProps } from './steps'

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

// "2 litres", "1.75 litres": for screen readers.
const litresWords = (ml: number) => `${parseFloat((ml / 1000).toFixed(2))} ${ml === 1000 ? 'litre' : 'litres'}`

export function TargetStep({ setup, onChange, onNext, onBack, answers }: HydrationStepProps & { answers: Pick<Answers, 'weight' | 'activity'> }) {
  const rec = recommendTarget(answers.weight, answers.activity)
  const doctor = setup.doctorLimit
  const value = setup.targetMl ?? rec.ml
  const bounds = doctor ? STEP.doctor : STEP.normal
  const changed = !doctor && value !== rec.ml
  const noWeight = rec.source === 'default'
  const check = softCheck(value, doctor)
  const avg = setup.anchor === 'track' && setup.health === 'connected' ? setup.healthAvgMl : null
  const [whyOpen, setWhyOpen] = useState(true)
  const [doctorSheet, setDoctorSheet] = useState(false)

  // First visit: start from the recommendation.
  useEffect(() => {
    if (setup.targetMl === null) onChange({ targetMl: rec.ml, targetSource: rec.source })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(ml: number) {
    const next = Math.min(bounds.max, Math.max(bounds.min, ml))
    if (next === value) return
    navigator.vibrate?.(8)
    onChange({ targetMl: next, targetSource: doctor ? 'doctor' : next === rec.ml ? rec.source : 'adjusted' })
  }

  function onKeyDown(event: KeyboardEvent) {
    const delta = event.key === 'ArrowUp' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowDown' || event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    set(value + delta * bounds.step)
  }

  const tag = doctor ? "Your doctor's limit" : changed ? null : noWeight ? 'Starting point' : 'Recommended for you'
  const subtitle = doctor
    ? "The limit you were given. We'll keep you inside it."
    : noWeight
      ? "A common starting point. Add your weight in your profile and we'll make it yours."
      : 'Set from your weight and activity. Most people keep it.'
  const roundButton = `flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-border bg-surface text-text transition-transform duration-[120ms] motion-safe:active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`

  return (
    <HydrationStepScreen
      step={totalSteps(setup)}
      total={totalSteps(setup)}
      onBack={onBack}
      footer={<PrimaryButton onClick={onNext}>{check ? `Yes, keep ${formatLitres(value)}` : 'Continue'}</PrimaryButton>}
      overlay={
        doctorSheet && (
          <Sheet title="Use your doctor's number" onClose={() => setDoctorSheet(false)}>
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
                <Stethoscope size={20} aria-hidden />
              </span>
              <p className="text-sm leading-normal text-text">
                Set the limit you were given. We'll never raise it for heat or training, and we'll tell you when you reach it instead of asking
                for more.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <PrimaryButton
                onClick={() => {
                  onChange({ doctorLimit: true, targetSource: 'doctor', targetMl: Math.round(value / 100) * 100 })
                  setDoctorSheet(false)
                }}
              >
                Set my limit
              </PrimaryButton>
              <SecondaryButton onClick={() => setDoctorSheet(false)}>Cancel</SecondaryButton>
            </div>
          </Sheet>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <StepTitle title="What do you want to aim for?" subtitle={subtitle} />

        <section
          className={[
            'flex flex-col items-center gap-4 rounded-[20px] bg-surface p-5',
            check ? 'border-[1.5px] border-warning' : 'border border-border',
          ].join(' ')}
        >
          {tag && <span className="rounded-full bg-tint px-3 py-1 text-xs font-semibold text-accent-text">{tag}</span>}
          <div className="flex w-full items-center justify-between gap-3">
            <button type="button" aria-label="Less" disabled={value <= bounds.min} onClick={() => set(value - bounds.step)} className={roundButton}>
              <Minus size={22} aria-hidden />
            </button>
            <div
              role="spinbutton"
              tabIndex={0}
              aria-label={doctor ? 'Daily limit' : 'Daily target'}
              aria-valuenow={value}
              aria-valuemin={bounds.min}
              aria-valuemax={bounds.max}
              aria-valuetext={`${litresWords(value)}, ${glassesLabel(value)}`}
              onKeyDown={onKeyDown}
              className={`flex flex-col items-center rounded-[12px] px-2 ${focusRing}`}
            >
              <span className={['text-[48px] leading-none font-bold tabular-nums', check ? 'text-warning' : 'text-text'].join(' ')}>
                {formatLitres(value)}
              </span>
              <span className="pt-1 text-sm text-muted">{glassesLabel(value)}</span>
            </div>
            <button type="button" aria-label="More" disabled={value >= bounds.max} onClick={() => set(value + bounds.step)} className={roundButton}>
              <Plus size={22} aria-hidden />
            </button>
          </div>
          {changed && (
            <button type="button" onClick={() => set(rec.ml)} className={`-my-2 h-11 text-sm font-semibold text-text underline underline-offset-2 ${focusRing}`}>
              Back to {formatLitres(rec.ml)}
            </button>
          )}
        </section>

        {check && (
          <section className="flex items-start gap-3 rounded-[16px] bg-warning-tint p-4" role="status">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-warning" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-warning">
                {check === 'low' ? "That's less than most adults need from drinks." : "That's a lot to drink in a day."}
              </p>
              <p className="text-sm leading-normal text-text">
                {check === 'low'
                  ? "If a doctor set it, use the link below. If it's a slip, tap + to fix it."
                  : 'Fine on hot or heavy training days. Spread it out: more than about 1 L an hour is too much at once.'}
              </p>
            </div>
          </section>
        )}

        {avg !== null && !doctor && (
          <section className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-accent bg-tint p-4">
            <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">
              Your last 4 weeks · <span className="text-text">{formatLitres(avg)} a day</span>
            </p>
            <div className="h-1.5 rounded-full bg-surface" aria-hidden>
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (avg / value) * 100)}%` }} />
            </div>
            {avg > rec.ml ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-text">You already average {formatLitres(avg)}.</p>
                <button
                  type="button"
                  onClick={() => set(Math.round(avg / STEP.normal.step) * STEP.normal.step)}
                  className={`h-9 shrink-0 rounded-full border-[1.5px] border-accent px-4 text-sm font-semibold text-text ${focusRing}`}
                >
                  Use {formatLitres(avg)}
                </button>
              </div>
            ) : avg < value ? (
              <p className="text-sm text-text">
                About {moreGlasses(value - avg)} a day gets you to {formatLitres(value)}.
              </p>
            ) : (
              <p className="text-sm text-text">You already average {formatLitres(avg)}.</p>
            )}
          </section>
        )}

        {!doctor && !noWeight && (
          <section className="flex flex-col rounded-[20px] border border-border bg-surface">
            <button
              type="button"
              aria-expanded={whyOpen}
              onClick={() => setWhyOpen((v) => !v)}
              className={`flex h-12 items-center justify-between rounded-[20px] px-4 text-left ${focusRing}`}
            >
              <Eyebrow>How we got this</Eyebrow>
              <ChevronDown size={18} className={['text-muted transition-transform', whyOpen ? 'rotate-180' : ''].join(' ')} aria-hidden />
            </button>
            {whyOpen && <p className="px-4 pb-4 text-sm leading-normal text-text">{rec.why}</p>}
          </section>
        )}

        {doctor && (
          <p className="flex items-start gap-2.5 rounded-[16px] bg-tint p-4 text-sm leading-normal text-text">
            <Info size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            Steps are 100 ml here so you can match your doctor's number. We'll never raise it for heat or training.
          </p>
        )}

        <button
          type="button"
          onClick={() =>
            doctor ? onChange({ doctorLimit: false, targetMl: rec.ml, targetSource: rec.source }) : setDoctorSheet(true)
          }
          className={`-my-2 h-11 self-start text-sm font-semibold text-text underline underline-offset-2 ${focusRing}`}
        >
          {doctor ? "Remove doctor's limit" : 'A doctor gave me a fluid limit'}
        </button>
      </div>
    </HydrationStepScreen>
  )
}
