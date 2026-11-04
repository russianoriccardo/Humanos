import type { HydrationSetup } from '../../state/appState'

export type HydrationStepProps = {
  setup: HydrationSetup
  onChange: (patch: Partial<HydrationSetup>) => void
  onNext: () => void
  onBack: () => void
}

// Trackers get one extra step (Apple Health).
export const totalSteps = (setup: HydrationSetup) => (setup.anchor === 'track' ? 4 : 3)
