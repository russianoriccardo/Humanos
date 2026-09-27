import { PrimaryButton } from '../components/PrimaryButton'
import { SelectableRow } from '../components/SelectableRow'
import { SkincareStepScreen } from './SkincareStepScreen'
import { StepTitle } from './StepTitle'
import type { SkincareStepProps } from './types'

export function RoutineStep({ setup, onChange, onNext, onBack, onSkip }: SkincareStepProps) {
  return (
    <SkincareStepScreen
      step={1}
      onBack={onBack}
      onSkip={onSkip}
      footer={
        <PrimaryButton onClick={onNext} disabled={setup.hasRoutine === null}>
          Continue
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-6">
        <StepTitle title="Do you already have a skincare routine?" subtitle="No wrong answer — we build from where you are." />
        <div className="flex flex-col gap-3">
          <SelectableRow
            tone="tinted"
            title="Yes, I have a routine"
            description="We'll fine-tune what you already do"
            selected={setup.hasRoutine === true}
            onClick={() => onChange({ hasRoutine: true })}
          />
          <SelectableRow
            tone="tinted"
            title="No, starting fresh"
            description="We'll build a simple one, step by step"
            selected={setup.hasRoutine === false}
            onClick={() => onChange({ hasRoutine: false })}
          />
        </div>
      </div>
    </SkincareStepScreen>
  )
}
