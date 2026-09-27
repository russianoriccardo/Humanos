import type { ReactNode } from 'react'
import { Screen } from '../components/Screen'
import { SkincareBadge } from './SkincareBadge'

type SkincareStepScreenProps = {
  step: number
  onBack: () => void
  onSkip?: () => void
  footer: ReactNode
  children: ReactNode
}

export function SkincareStepScreen({ step, onBack, onSkip, footer, children }: SkincareStepScreenProps) {
  return (
    <Screen
      center={<SkincareBadge label={`Skincare · ${step} of 4`} />}
      showThemeToggle={false}
      onBack={onBack}
      onSkip={onSkip}
      footer={footer}
    >
      {children}
    </Screen>
  )
}
