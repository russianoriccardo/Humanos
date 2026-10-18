import { Screen } from '../../components/Screen'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { Field } from '../../components/Field'
import { Chip } from '../../components/Chip'
import type { Activity, Answers } from '../types'

type AboutYouProps = {
  answers: Answers
  onChange: (patch: Partial<Answers>) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

const SEX_OPTIONS = [
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
]

const ACTIVITY_OPTIONS: { label: string; value: Activity }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'High', value: 'high' },
]

const BOUNDS = {
  age: { min: 13, max: 100, noun: 'an age' },
  height: { min: 100, max: 250, noun: 'a height in cm' },
  weight: { min: 30, max: 300, noun: 'a weight in kg' },
}

// Only once something is typed: an empty field just keeps Continue disabled.
function rangeError(value: string, field: keyof typeof BOUNDS) {
  const { min, max, noun } = BOUNDS[field]
  const n = Number(value.trim().replace(',', '.'))
  if (value.trim() === '' || (Number.isFinite(n) && n >= min && n <= max)) return undefined
  return `Enter ${noun} between ${min} and ${max}.`
}

export function AboutYou({ answers, onChange, onNext, onBack, onSkip }: AboutYouProps) {
  const errors = {
    age: rangeError(answers.age, 'age'),
    height: rangeError(answers.height, 'height'),
    weight: rangeError(answers.weight, 'weight'),
  }
  const isValid =
    answers.name.trim() !== '' &&
    answers.age.trim() !== '' &&
    answers.sex.trim() !== '' &&
    answers.height.trim() !== '' &&
    answers.weight.trim() !== '' &&
    answers.activity !== null &&
    !errors.age &&
    !errors.height &&
    !errors.weight

  return (
    <Screen
      step={1}
      totalSteps={5}
      onBack={onBack}
      onSkip={onSkip}
      footer={
        <div className="flex flex-col items-center gap-2">
          <PrimaryButton onClick={onNext} disabled={!isValid}>
            Continue
          </PrimaryButton>
          <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-tight font-bold text-text">Tell us about you</h1>
          <p className="text-base text-muted">So your hub can adapt to your body, not the other way around.</p>
          <p className="text-xs text-muted">All fields are required.</p>
        </div>

        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            // Enter moves to the next text field ("next"); on the last one ("done") it closes the keyboard.
            const target = event.target as HTMLElement
            if (event.key !== 'Enter' || !(target instanceof HTMLInputElement)) return
            event.preventDefault()
            const inputs = [...event.currentTarget.querySelectorAll('input')]
            const next = inputs[inputs.indexOf(target) + 1]
            if (next) next.focus()
            else target.blur()
          }}
        >
          <Field
            label="Name"
            required
            value={answers.name}
            onChange={(value) => onChange({ name: value })}
            placeholder="Your name"
            enterKeyHint="next"
          />

          <div className="grid grid-cols-2 items-start gap-4">
            <Field
              label="Age"
              required
              type="number"
              value={answers.age}
              onChange={(value) => onChange({ age: value })}
              placeholder="27"
              inputMode="numeric"
              enterKeyHint="next"
              error={errors.age}
            />
            <Field
              label="Sex"
              required
              type="select"
              value={answers.sex}
              onChange={(value) => onChange({ sex: value })}
              placeholder="Select"
              options={SEX_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-2 items-start gap-4">
            <Field
              label="Height"
              required
              suffix="cm"
              value={answers.height}
              onChange={(value) => onChange({ height: value })}
              placeholder="168"
              inputMode="numeric"
              enterKeyHint="next"
              error={errors.height}
            />
            <Field
              label="Weight"
              required
              suffix="kg"
              value={answers.weight}
              onChange={(value) => onChange({ weight: value })}
              placeholder="58"
              inputMode="numeric"
              enterKeyHint="done"
              error={errors.weight}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium tracking-wide text-muted uppercase">
              Activity level<span className="text-accent-text"> *</span>
            </label>
            <div className="flex gap-2">
              {ACTIVITY_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={answers.activity === option.value}
                  onClick={() => onChange({ activity: option.value })}
                />
              ))}
            </div>
          </div>
        </form>
      </div>
    </Screen>
  )
}
