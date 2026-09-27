import { Screen } from '../components/Screen'
import { PrimaryButton } from '../components/PrimaryButton'
import { SkincareBadge } from './SkincareBadge'
import type { SkincareStepProps } from './types'

export function RoutineStep({ onNext, onBack, onSkip }: SkincareStepProps) {
  return (
    <Screen
      center={<SkincareBadge label="Skincare · 1 of 4" />}
      showThemeToggle={false}
      onBack={onBack}
      onSkip={onSkip}
      footer={<PrimaryButton onClick={onNext}>Continue</PrimaryButton>}
    >
      <p>Routine — TODO</p>
    </Screen>
  )
}
