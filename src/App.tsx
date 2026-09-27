import { useEffect, useState } from 'react'
import { OnboardingFlow } from './onboarding/OnboardingFlow'
import type { Answers } from './onboarding/types'
import { StepTransition } from './components/StepTransition'
import { Dashboard } from './screens/Dashboard'
import { ComingNext } from './screens/ComingNext'
import { RoutineStep } from './skincare/RoutineStep'
import { InventoryStep } from './skincare/InventoryStep'
import { GoalStep } from './skincare/GoalStep'
import { ScanStep } from './skincare/scan/ScanStep'
import { ResultScreen } from './skincare/ResultScreen'
import {
  clearDemoStorage,
  initialAppState,
  loadAppState,
  saveAppState,
  type AppState,
  type SkincareSetup,
  type UiState,
} from './state/appState'

type RouteName =
  | 'onboarding'
  | 'dashboard'
  | 'skincare/routine'
  | 'skincare/inventory'
  | 'skincare/goal'
  | 'skincare/scan'
  | 'skincare/result'
  | 'module/home'

type Route = { name: RouteName; moduleId?: string }

const SKINCARE_FLOW: RouteName[] = [
  'skincare/routine',
  'skincare/inventory',
  'skincare/goal',
  'skincare/scan',
  'skincare/result',
]

function App() {
  const [state, setState] = useState<AppState>(loadAppState)
  const [route, setRoute] = useState<Route>(() => ({ name: state.onboardingDone ? 'dashboard' : 'onboarding' }))
  const [direction, setDirection] = useState<1 | -1>(1)
  const [justSetUp, setJustSetUp] = useState(false)
  const [resetCount, setResetCount] = useState(0)

  useEffect(() => {
    saveAppState(state)
  }, [state])

  function go(name: RouteName, dir: 1 | -1 = 1, moduleId?: string) {
    setDirection(dir)
    setRoute({ name, moduleId })
  }

  function skincareStep(offset: 1 | -1) {
    const index = SKINCARE_FLOW.indexOf(route.name)
    const target = SKINCARE_FLOW[index + offset]
    if (target) go(target, offset)
    else go('dashboard', -1)
  }

  const updateOnboarding = (patch: Partial<Answers>) =>
    setState((current) => ({ ...current, onboarding: { ...current.onboarding, ...patch } }))

  const updateSkincare = (patch: Partial<SkincareSetup>) =>
    setState((current) => ({ ...current, skincare: { ...current.skincare, ...patch } }))

  const updateUi = (patch: Partial<UiState>) => setState((current) => ({ ...current, ui: { ...current.ui, ...patch } }))

  function completeOnboarding() {
    setState((current) => ({ ...current, onboardingDone: true }))
    go('dashboard')
  }

  function completeSkincare() {
    setState((current) => ({
      ...current,
      modulesSetUp: current.modulesSetUp.includes('skincare') ? current.modulesSetUp : [...current.modulesSetUp, 'skincare'],
      skincare: { ...current.skincare, completedAt: new Date().toISOString() },
    }))
    setJustSetUp(true)
    go('dashboard')
  }

  function resetDemo() {
    clearDemoStorage()
    document.documentElement.classList.remove('dark')
    setState(initialAppState)
    setJustSetUp(false)
    setResetCount((count) => count + 1)
    go('onboarding', -1)
  }

  const stepProps = {
    setup: state.skincare,
    onChange: updateSkincare,
    onNext: () => skincareStep(1),
    onBack: () => skincareStep(-1),
    onSkip: () => skincareStep(1),
  }

  const screen = (() => {
    switch (route.name) {
      case 'onboarding':
        return (
          <OnboardingFlow
            key={resetCount}
            answers={state.onboarding}
            onChange={updateOnboarding}
            onComplete={completeOnboarding}
          />
        )
      case 'dashboard':
        return (
          <Dashboard
            mode={state.modulesSetUp.includes('skincare') ? 'skincare-live' : 'day0'}
            state={state}
            justSetUp={justSetUp}
            onToastDone={() => setJustSetUp(false)}
            onUiChange={updateUi}
            onStartModule={(moduleId) =>
              moduleId === 'skincare' ? go('skincare/routine') : go('module/home', 1, moduleId)
            }
            onOpenModule={(moduleId) => go('module/home', 1, moduleId)}
            onReset={resetDemo}
          />
        )
      case 'skincare/routine':
        return <RoutineStep {...stepProps} />
      case 'skincare/inventory':
        return <InventoryStep {...stepProps} />
      case 'skincare/goal':
        return <GoalStep {...stepProps} />
      case 'skincare/scan':
        return <ScanStep {...stepProps} />
      case 'skincare/result':
        return <ResultScreen setup={state.skincare} onBack={() => skincareStep(-1)} onDone={completeSkincare} />
      case 'module/home':
        return <ComingNext moduleId={route.moduleId ?? 'skincare'} onBack={() => go('dashboard', -1)} />
    }
  })()

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-neutral-200 p-0 sm:p-6 dark:bg-neutral-950">
      <div className="relative h-dvh w-full overflow-hidden bg-bg sm:h-[844px] sm:max-w-[430px] sm:rounded-[40px] sm:shadow-2xl sm:ring-1 sm:ring-black/5">
        <StepTransition
          stepKey={`${route.name}:${route.moduleId ?? ''}:${resetCount}`}
          direction={direction}
          fade={route.name === 'dashboard' && direction === 1}
        >
          {screen}
        </StepTransition>
      </div>
    </div>
  )
}

export default App
