import { Screen } from '../components/Screen'
import { PrimaryButton } from '../components/PrimaryButton'
import type { AppState, UiState } from '../state/appState'

export type DashboardMode = 'day0' | 'skincare-live'

type DashboardProps = {
  mode: DashboardMode
  state: AppState
  justSetUp: boolean
  onToastDone: () => void
  onUiChange: (patch: Partial<UiState>) => void
  onStartModule: (moduleId: string) => void
  onOpenModule: (moduleId: string) => void
  onReset: () => void
}

export function Dashboard({ mode, onStartModule, onReset }: DashboardProps) {
  return (
    <Screen footer={<PrimaryButton onClick={() => onStartModule('skincare')}>Start skincare</PrimaryButton>}>
      <p>Dashboard ({mode}) — TODO</p>
      <button type="button" onClick={onReset}>
        Reset demo
      </button>
    </Screen>
  )
}
