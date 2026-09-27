import { Screen } from '../components/Screen'
import { PrimaryButton } from '../components/PrimaryButton'
import { SkincareBadge } from './SkincareBadge'
import type { SkincareStepProps } from './types'

export function InventoryStep({ onNext, onBack, onSkip }: SkincareStepProps) {
  return (
    <Screen
      center={<SkincareBadge label="Skincare · 2 of 4" />}
      showThemeToggle={false}
      onBack={onBack}
      onSkip={onSkip}
      footer={<PrimaryButton onClick={onNext}>Continue</PrimaryButton>}
    >
      <p>Products — TODO</p>
    </Screen>
  )
}
