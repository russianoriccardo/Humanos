import { PrimaryButton } from '../components/PrimaryButton'
import { SelectableRow } from '../components/SelectableRow'
import { SkincareStepScreen } from './SkincareStepScreen'
import { StepTitle } from './StepTitle'
import { GOAL_OPTIONS } from './catalog'
import type { SkincareStepProps } from './types'

export function GoalStep({ setup, onChange, onNext, onBack, onSkip }: SkincareStepProps) {
  return (
    <SkincareStepScreen
      step={3}
      onBack={onBack}
      onSkip={onSkip}
      footer={
        <PrimaryButton onClick={onNext} disabled={setup.goal === null}>
          Continue
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-6">
        <StepTitle title="What is your main goal?" subtitle="Pick one." />
        <div role="group" aria-label="Main skincare goal" className="flex flex-col gap-3">
          {GOAL_OPTIONS.map((goal) => (
            <SelectableRow
              key={goal.id}
              tone="tinted"
              title={goal.label}
              selected={setup.goal === goal.id}
              onClick={() => onChange({ goal: goal.id })}
            />
          ))}
        </div>
      </div>
    </SkincareStepScreen>
  )
}
