import { Screen } from '../../components/Screen'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SkincareBadge } from '../SkincareBadge'
import type { SkincareStepProps } from '../types'

export function ScanStep({ onNext, onBack, onSkip }: SkincareStepProps) {
  return (
    <Screen
      center={<SkincareBadge label="Skincare · 4 of 4" />}
      showThemeToggle={false}
      onBack={onBack}
      onSkip={onSkip}
      footer={<PrimaryButton onClick={onNext}>Take photo</PrimaryButton>}
    >
      <p>Scan — TODO</p>
    </Screen>
  )
}
