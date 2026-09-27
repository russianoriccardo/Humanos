import { Screen } from '../components/Screen'
import { PrimaryButton } from '../components/PrimaryButton'
import type { SkincareSetup } from '../state/appState'

type ResultScreenProps = {
  setup: SkincareSetup
  onBack: () => void
  onDone: () => void
}

export function ResultScreen({ onBack, onDone }: ResultScreenProps) {
  return (
    <Screen onBack={onBack} showThemeToggle={false} footer={<PrimaryButton onClick={onDone}>Go to my hub</PrimaryButton>}>
      <p>Result — TODO</p>
    </Screen>
  )
}
