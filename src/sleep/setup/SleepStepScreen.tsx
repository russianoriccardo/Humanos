import type { ReactNode } from 'react'
import { Screen } from '../../components/Screen'
import { SleepBadge } from './SleepBadge'

type SleepStepScreenProps = {
  step: number
  onBack: () => void
  onSkip?: () => void
  footer: ReactNode
  overlay?: ReactNode
  children: ReactNode
}

export function SleepStepScreen({ step, onBack, onSkip, footer, overlay, children }: SleepStepScreenProps) {
  return (
    <Screen
      center={<SleepBadge label={`Sleep · ${step} of 4`} />}
      showThemeToggle={false}
      onBack={onBack}
      onSkip={onSkip}
      footer={footer}
      overlay={overlay}
    >
      {children}
    </Screen>
  )
}
