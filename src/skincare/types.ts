import type { SkincareSetup } from '../state/appState'

export type SkincareStepProps = {
  setup: SkincareSetup
  onChange: (patch: Partial<SkincareSetup>) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}
