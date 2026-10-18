import type { SleepSetup } from '../../state/appState'

export type SleepStepProps = {
  setup: SleepSetup
  onChange: (patch: Partial<SleepSetup>) => void
  onNext: () => void
  onBack: () => void
}
