import { useEffect, useState } from 'react'
import { OnboardingFlow } from './onboarding/OnboardingFlow'
import type { Answers } from './onboarding/types'
import { StepTransition } from './components/StepTransition'
import { Dashboard } from './screens/Dashboard'
import { ComingNext } from './screens/ComingNext'
import { HasRoutineStep } from './skincare/HasRoutineStep'
import { InventoryStep } from './skincare/InventoryStep'
import { GoalStep } from './skincare/GoalStep'
import { ScanStep } from './skincare/scan/ScanStep'
import { ResultScreen } from './skincare/ResultScreen'
import { createSkincareActive, SCAN_CYCLE_DAYS } from './skincare/active'
import { WeatherProvider } from './state/weather'
import { addDays, dateKey } from './lib/dates'
import {
  clearDemoStorage,
  initialAppState,
  loadAppState,
  saveAppState,
  type AppState,
  type DemoState,
  type SkincareActive,
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
  const [state, setState] = useState<AppState>(() => loadAppState(createSkincareActive))
  const [route, setRoute] = useState<Route>(() => ({ name: state.onboardingDone ? 'dashboard' : 'onboarding' }))
  const [direction, setDirection] = useState<1 | -1>(1)
  // Dashboard 13 lasts until the user leaves the dashboard; the toast only shows once within it.
  const [freshSetup, setFreshSetup] = useState(false)
  const [toastPending, setToastPending] = useState(false)
  const [resetCount, setResetCount] = useState(0)

  useEffect(() => {
    saveAppState(state)
  }, [state])

  function go(name: RouteName, dir: 1 | -1 = 1, moduleId?: string) {
    if (name !== 'dashboard') {
      setFreshSetup(false)
      setToastPending(false)
    }
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

  const updateDemo = (patch: Partial<DemoState>) =>
    setState((current) => ({ ...current, demo: { ...current.demo, ...patch } }))

  const updateActive = (fn: (active: SkincareActive) => SkincareActive) =>
    setState((current) => (current.skincareActive ? { ...current, skincareActive: fn(current.skincareActive) } : current))

  const logWeather = (date: string, uvMax: number, rhMin: number) =>
    setState((current) => {
      const prev = current.weatherLog[date]
      // Keep the day's extremes across several loads.
      const entry = prev ? { uvMax: Math.max(prev.uvMax, uvMax), rhMin: Math.min(prev.rhMin, rhMin) } : { uvMax, rhMin }
      if (prev && prev.uvMax === entry.uvMax && prev.rhMin === entry.rhMin) return current
      return { ...current, weatherLog: { ...current.weatherLog, [date]: entry } }
    })

  // Demo: move the latest scan back so today is day 14 and the rescan unlocks.
  function jumpScanCycle() {
    const target = addDays(dateKey(), -(SCAN_CYCLE_DAYS - 1))
    updateActive((active) =>
      active.scans.length
        ? { ...active, scans: active.scans.map((scan, i) => (i === active.scans.length - 1 ? { ...scan, date: target } : scan)) }
        : { ...active, baselineScan: { ...active.baselineScan, date: target } },
    )
  }

  function completeOnboarding() {
    setState((current) => ({ ...current, onboardingDone: true }))
    go('dashboard')
  }

  function completeSkincare() {
    setState((current) => {
      const skincare = { ...current.skincare, completedAt: new Date().toISOString() }
      const fresh = createSkincareActive(skincare)
      return {
        ...current,
        modulesSetUp: current.modulesSetUp.includes('skincare') ? current.modulesSetUp : [...current.modulesSetUp, 'skincare'],
        skincare,
        // Re-running setup (Edit routine) swaps the routine but keeps logs, scans and checks.
        skincareActive: current.skincareActive ? { ...current.skincareActive, routine: fresh.routine } : fresh,
      }
    })
    go('dashboard')
    setFreshSetup(true)
    setToastPending(true)
  }

  function resetDemo() {
    clearDemoStorage()
    document.documentElement.classList.remove('dark')
    setState(initialAppState)
    setFreshSetup(false)
    setToastPending(false)
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
            variant={
              !state.modulesSetUp.includes('skincare') || !state.skincareActive
                ? 'day0'
                : freshSetup
                  ? 'just-set-up'
                  : 'active'
            }
            state={state}
            showToast={toastPending}
            onToastDone={() => setToastPending(false)}
            onActiveChange={updateActive}
            onDemoChange={updateDemo}
            onJumpCycle={jumpScanCycle}
            onStartModule={(moduleId) =>
              moduleId === 'skincare' ? go('skincare/routine') : go('module/home', 1, moduleId)
            }
            onOpenModule={(moduleId) => go('module/home', 1, moduleId)}
            onReset={resetDemo}
          />
        )
      case 'skincare/routine':
        return <HasRoutineStep {...stepProps} />
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
    <WeatherProvider
      choice={state.ui.locationChoice}
      city={state.ui.city}
      onChoice={(choice, city) => updateUi(city ? { locationChoice: choice, city } : { locationChoice: choice })}
      onLog={logWeather}
    >
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
    </WeatherProvider>
  )
}

export default App
