import { useEffect, useRef, useState } from 'react'
import { OnboardingFlow } from './onboarding/OnboardingFlow'
import type { Answers } from './onboarding/types'
import { StepTransition } from './components/StepTransition'
import { Toast } from './components/Toast'
import { Dashboard } from './screens/Dashboard'
import { ComingNext } from './screens/ComingNext'
import { SETUP_READY } from './lib/modules'
import { SkincareModule, type ModuleTabRender } from './screens/SkincareModule'
import { YogaPlayer } from './screens/YogaPlayer'
import { FaceYogaTab } from './skincare/tabs/FaceYogaTab'
import { ProgressTab } from './skincare/tabs/ProgressTab'
import { AskTab } from './skincare/tabs/AskTab'
import { PrimaryButton } from './components/PrimaryButton'
import { thisWeek, yogaStreak } from './skincare/yoga/stats'
import { daysUntilScan, latestScan } from './skincare/active'
import { deleteAllPhotos, photoCount, savePhoto } from './services/photoStore'
import { HasRoutineStep } from './skincare/HasRoutineStep'
import { InventoryStep } from './skincare/InventoryStep'
import { GoalStep } from './skincare/GoalStep'
import { ScanStep } from './skincare/scan/ScanStep'
import { ResultScreen } from './skincare/ResultScreen'
import { AnchorStep } from './sleep/setup/AnchorStep'
import { IntentStep } from './sleep/setup/IntentStep'
import { ConstraintStep } from './sleep/setup/ConstraintStep'
import { HealthStep } from './sleep/setup/HealthStep'
import { MirrorStep } from './sleep/setup/MirrorStep'
import { createSleepActive, defaultSleepTab, nextAt, nightKeyFor, retime, sleepReminders, tonightLightsOut } from './sleep/plan'
import type { SleepTip } from './sleep/rules'
import { SleepModule } from './screens/SleepModule'
import { SleepSessionPlayer } from './screens/SleepSessionPlayer'
import { sessionById } from './sleep/sessions'
import { simulateSleep } from './sleep/demo'
import { createSkincareActive, SCAN_CYCLE_DAYS } from './skincare/active'
import type { Tip } from './skincare/engine/types'
import { WeatherProvider } from './state/weather'
import { addDays, dateKey } from './lib/dates'
import { typedNameVerdict } from './skincare/ask/typedVerdict'
import {
  makeReminder,
  reminderIdFor,
  isModuleReminder,
  requestPermission,
  showSystemNotification,
  splitDue,
  todayAt,
} from './services/reminders'
import {
  clearDemoStorage,
  initialAppState,
  initialSkincare,
  initialSleep,
  loadAppState,
  saveAppState,
  type AppState,
  type DemoState,
  type Reminder,
  type SkinReading,
  type SkincareActive,
  type SkincareSetup,
  type SleepActive,
  type SleepCheckIn,
  type SleepSetup,
  type UiState,
} from './state/appState'

type RouteName =
  | 'onboarding'
  | 'dashboard'
  | 'skincare'
  | 'skincare/yoga'
  | 'skincare/rescan'
  | 'skincare/routine'
  | 'skincare/inventory'
  | 'skincare/goal'
  | 'skincare/scan'
  | 'skincare/result'
  | 'module/home'
  | 'sleep'
  | 'sleep/anchor'
  | 'sleep/intent'
  | 'sleep/constraint'
  | 'sleep/health'
  | 'sleep/mirror'
  | 'sleep/session'

type Route = { name: RouteName; moduleId?: string }

const SKINCARE_FLOW: RouteName[] = [
  'skincare/routine',
  'skincare/inventory',
  'skincare/goal',
  'skincare/scan',
  'skincare/result',
]

const SLEEP_FLOW: RouteName[] = ['sleep/anchor', 'sleep/intent', 'sleep/constraint', 'sleep/health', 'sleep/mirror']

type Alert = { message: string; detail?: string; icon?: 'check' | 'bell' }

function App() {
  const [state, setState] = useState<AppState>(() => loadAppState(createSkincareActive))
  const [route, setRoute] = useState<Route>(() => ({ name: state.onboardingDone ? 'dashboard' : 'onboarding' }))
  const [direction, setDirection] = useState<1 | -1>(1)
  // Dashboard 13 lasts until the user leaves the dashboard; the toast only shows once within it.
  const [freshModuleId, setFreshModuleId] = useState<string | null>(null)
  const [toastPending, setToastPending] = useState(false)
  // "Edit routine" re-runs setup and should come back to the module, not the dashboard.
  const [editingRoutine, setEditingRoutine] = useState(false)
  // "Edit sleep times" reruns the bedtime step and comes back to Sleep.
  const [editingSleepTimes, setEditingSleepTimes] = useState(false)
  const [sleepSessionId, setSleepSessionId] = useState<string | null>(null)
  const [moduleToast, setModuleToast] = useState<string | null>(null)
  const [alert, setAlert] = useState<Alert | null>(null)
  const [resetCount, setResetCount] = useState(0)
  const [photoTotal, setPhotoTotal] = useState(0)

  useEffect(() => {
    saveAppState(state)
  }, [state])

  // Whether "Delete scan photos" should appear in the module menu.
  const refreshPhotoCount = () => photoCount().then(setPhotoTotal)
  useEffect(() => {
    if (route.name === 'skincare') refreshPhotoCount()
  }, [route.name])

  function go(name: RouteName, dir: 1 | -1 = 1, moduleId?: string) {
    if (name !== 'dashboard') {
      setFreshModuleId(null)
      setToastPending(false)
    }
    setDirection(dir)
    setRoute({ name, moduleId })
  }

  function skincareStep(offset: 1 | -1) {
    const index = SKINCARE_FLOW.indexOf(route.name)
    const target = SKINCARE_FLOW[index + offset]
    if (target) go(target, offset)
    else if (editingRoutine) {
      setEditingRoutine(false)
      go('skincare', -1)
    } else go('dashboard', -1)
  }

  const updateOnboarding = (patch: Partial<Answers>) =>
    setState((current) => ({ ...current, onboarding: { ...current.onboarding, ...patch } }))

  const updateSkincare = (patch: Partial<SkincareSetup>) =>
    setState((current) => ({ ...current, skincare: { ...current.skincare, ...patch } }))

  const updateSleep = (patch: Partial<SleepSetup>) =>
    setState((current) => ({ ...current, sleep: { ...current.sleep, ...patch } }))

  const updateUi = (patch: Partial<UiState>) => setState((current) => ({ ...current, ui: { ...current.ui, ...patch } }))

  const updateDemo = (patch: Partial<DemoState>) =>
    setState((current) => ({ ...current, demo: { ...current.demo, ...patch } }))

  const updateActive = (fn: (active: SkincareActive) => SkincareActive) =>
    setState((current) => (current.skincareActive ? { ...current, skincareActive: fn(current.skincareActive) } : current))

  const updateSleepActive = (fn: (active: SleepActive) => SleepActive) =>
    setState((current) => (current.sleepActive ? { ...current, sleepActive: fn(current.sleepActive) } : current))

  const setReminders = (fn: (reminders: Reminder[]) => Reminder[]) =>
    setState((current) => ({ ...current, ui: { ...current.ui, reminders: fn(current.ui.reminders) } }))

  const logWeather = (date: string, uvMax: number, rhMin: number) =>
    setState((current) => {
      const prev = current.weatherLog[date]
      // Keep the day's extremes across several loads.
      const entry = prev ? { uvMax: Math.max(prev.uvMax, uvMax), rhMin: Math.min(prev.rhMin, rhMin) } : { uvMax, rhMin }
      if (prev && prev.uvMax === entry.uvMax && prev.rhMin === entry.rhMin) return current
      return { ...current, weatherLog: { ...current.weatherLog, [date]: entry } }
    })

  // --- Reminders: fire while the app is open; catch up on ones missed while it was closed. ---
  const firedRef = useRef(new Set<string>())
  useEffect(() => {
    const { due, expired, upcoming } = splitDue(state.ui.reminders)
    if (due.length || expired.length) {
      for (const reminder of due) {
        if (firedRef.current.has(reminder.id)) continue
        firedRef.current.add(reminder.id)
        showSystemNotification(reminder)
        setAlert({ message: reminder.title, detail: reminder.body, icon: 'bell' })
      }
      setReminders((list) => list.filter((r) => !due.includes(r) && !expired.includes(r)))
      return
    }
    if (!upcoming.length) return
    const next = Math.min(...upcoming.map((r) => Date.parse(r.at)))
    // setTimeout caps at ~24.8 days; re-evaluate before that.
    const timer = window.setTimeout(() => setReminders((list) => [...list]), Math.min(next - Date.now() + 250, 2 ** 31 - 1))
    return () => window.clearTimeout(timer)
  }, [state.ui.reminders])

  // Sleep reminders roll forward: whenever the app runs, tonight's wind down and the next check in exist.
  const sleepActive = state.sleepActive
  const sleepReminderKey = sleepActive?.reminderOn
    ? `${tonightLightsOut(sleepActive, nightKeyFor())}|${sleepActive.wake}|${dateKey()}`
    : null
  useEffect(() => {
    if (!sleepReminderKey || !sleepActive) return
    const wanted = sleepReminders(tonightLightsOut(sleepActive, nightKeyFor()), sleepActive.wake).filter(
      (r) => !(r.id.startsWith('sleep:checkin:') && sleepActive.checkIns[r.id.slice('sleep:checkin:'.length)]),
    )
    setReminders((list) => {
      const ids = new Set(list.map((r) => r.id))
      const missing = wanted.filter((r) => !ids.has(r.id))
      return missing.length ? [...list, ...missing] : list
    })
    // Keyed on the times and the day, not on every check in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepReminderKey])

  async function remindForTip(tip: Tip) {
    if (!tip.action) return
    const reminder = makeReminder(
      reminderIdFor('skincare', tip, dateKey()),
      todayAt(tip.action.at),
      'Time to reapply SPF',
      tip.body.replace(/ Reapply SPF around .*$/, ' Reapply now.'),
    )
    setReminders((list) => [...list.filter((r) => r.id !== reminder.id), reminder])
    setModuleToast(`Reminder set for ${tip.action.at}`)
    // Asked here because it needs a tap; the reminder works in-app either way.
    await requestPermission()
  }

  async function remindForScan(dayKey: string) {
    const reminder = makeReminder(
      `skincare:scan:${dayKey}`,
      new Date(`${dayKey}T09:00:00`).toISOString(),
      'Your 14-day scan',
      'Same window, same light, no makeup, so the comparison is fair.',
    )
    setReminders((list) => [...list.filter((r) => r.id !== reminder.id), reminder])
    setModuleToast('Reminder set for 09:00')
    await requestPermission()
  }

  async function saveRescan(reading: SkinReading, photo: Blob | null) {
    const id = `scan-${Date.now()}`
    // The photo is stored only if the user opted in AND the save worked; otherwise it's gone.
    const stored = photo ? await savePhoto(id, photo) : false
    updateActive((a) => ({ ...a, scans: [...a.scans, { date: dateKey(), reading, ...(stored ? { photoId: id } : {}) }] }))
    updateUi({ skincareTab: 'progress' })
    go('skincare', -1)
    setModuleToast('Scan saved')
  }

  async function deletePhotos() {
    await deleteAllPhotos()
    updateActive((a) => ({
      ...a,
      baselineScan: { ...a.baselineScan, photoId: undefined },
      scans: a.scans.map((scan) => ({ ...scan, photoId: undefined })),
    }))
    setPhotoTotal(0)
    setModuleToast('Scan photos deleted')
  }

  // Demo: move the latest scan back so today is day 14 and the rescan unlocks.
  // Demo: nine days of use for pitches — day 9, 7 of 9 nights logged, 4 yoga sessions (3-day streak),
  // one glycolic toner check. Today is left unlogged so "tonight" is still open.
  function simulateNineDays() {
    const today = dateKey()
    const start = addDays(today, -8)
    updateActive((a) => {
      const evening = a.routine.filter((s) => s.when !== 'am').map((s) => s.id)
      const missed = addDays(today, -5)
      const routineLog: Record<string, string[]> = {}
      for (let i = 8; i >= 1; i--) {
        const day = addDays(today, -i)
        if (day !== missed) routineLog[day] = evening
      }
      const yoga = [-5, -3, -2, -1].map((offset) => new Date(`${addDays(today, offset)}T08:00:00`).toISOString())
      const name = 'Glow toner · 7% glycolic acid'
      const check = {
        id: `check-${Date.now()}`,
        date: new Date().toISOString(),
        source: 'text' as const,
        productName: name,
        ingredients: [],
        verdict: typedNameVerdict(name, state.skincare.goal, a.routine, { humidity: null, uvMax: null }),
        demo: true,
      }
      return {
        ...a,
        startedAt: start,
        baselineScan: { ...a.baselineScan, date: start },
        scans: [],
        routineLog,
        yoga: { sessions: yoga },
        productChecks: [check],
        seenCoachMark: true,
      }
    })
    setFreshModuleId(null)
    setToastPending(false)
  }

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
    const editing = editingRoutine
    setState((current) => {
      const skincare = { ...current.skincare, completedAt: current.skincare.completedAt ?? new Date().toISOString() }
      const fresh = createSkincareActive(skincare)
      return {
        ...current,
        modulesSetUp: current.modulesSetUp.includes('skincare') ? current.modulesSetUp : [...current.modulesSetUp, 'skincare'],
        skincare,
        // Re-running setup (Edit routine) swaps the routine but keeps logs, scans and checks.
        skincareActive: current.skincareActive ? { ...current.skincareActive, routine: fresh.routine } : fresh,
      }
    })
    if (editing) {
      setEditingRoutine(false)
      go('skincare')
      setModuleToast('Routine updated')
      return
    }
    go('dashboard')
    setFreshModuleId('skincare')
    setToastPending(true)
  }

  function sleepStep(offset: 1 | -1) {
    if (editingSleepTimes) {
      setEditingSleepTimes(false)
      if (offset === 1) applySleepTimes()
      go('sleep', -1)
      return
    }
    const target = SLEEP_FLOW[SLEEP_FLOW.indexOf(route.name) + offset]
    go(target ?? 'dashboard', offset)
  }

  function applySleepTimes() {
    setState((current) => {
      const { bedtime, wake } = current.sleep
      if (!current.sleepActive || !bedtime || !wake) return current
      return {
        ...current,
        sleepActive: retime(current.sleepActive, bedtime, wake, dateKey()),
        // Dropped so the rolling reminders come back at the new times.
        ui: {
          ...current.ui,
          reminders: current.ui.reminders.filter((r) => !/^sleep:(winddown|checkin):/.test(r.id)),
        },
      }
    })
    setModuleToast('Sleep times updated')
  }

  function editSleepTimes() {
    setEditingSleepTimes(true)
    go('sleep/constraint')
  }

  function saveMorning(checkIn: SleepCheckIn) {
    const today = dateKey()
    updateSleepActive((a) => ({ ...a, checkIns: { ...a.checkIns, [today]: checkIn } }))
    setReminders((list) => list.filter((r) => r.id !== `sleep:checkin:${today}`))
    setModuleToast('Morning saved')
  }

  async function remindForSleepTip(tip: SleepTip) {
    if (!tip.action) return
    const reminder = makeReminder(
      `sleep:${tip.id}:${nightKeyFor()}`,
      nextAt(tip.action.at, new Date()).toISOString(),
      'Time for a warm shower',
      'It helps your body cool down in time for lights out.',
    )
    setReminders((list) => [...list.filter((r) => r.id !== reminder.id), reminder])
    setModuleToast(`Reminder set for ${tip.action.at}`)
    await requestPermission()
  }

  async function toggleSleepReminder(on: boolean) {
    updateSleepActive((a) => ({ ...a, reminderOn: on }))
    if (on) await requestPermission()
    else setReminders((list) => list.filter((r) => !r.id.startsWith('sleep:winddown:')))
  }

  // Demo panel: 18 nights of check ins and sessions, with tonight's training tip showing.
  function simulateSleepNights() {
    setState((current) => {
      if (!current.sleepActive) return current
      return {
        ...current,
        sleepActive: simulateSleep(current.sleepActive),
        demo: { ...current.demo, scenario: 'shortSleepTrained' },
        // Dropped so the rolling reminders come back at the simulated plan's times.
        ui: { ...current.ui, reminders: current.ui.reminders.filter((r) => !/^sleep:(winddown|checkin):/.test(r.id)) },
      }
    })
    setFreshModuleId(null)
    setToastPending(false)
  }

  function resetSleepModule() {
    setState((current) => ({
      ...current,
      modulesSetUp: current.modulesSetUp.filter((id) => id !== 'sleep'),
      sleep: initialSleep,
      sleepActive: null,
      ui: { ...current.ui, reminders: current.ui.reminders.filter((r) => !isModuleReminder('sleep', r.id)), sleepTab: null },
    }))
    go('dashboard', -1)
  }

  function completeSleep(reminders: Reminder[]) {
    setState((current) => {
      const sleep = { ...current.sleep, completedAt: current.sleep.completedAt ?? new Date().toISOString() }
      const ids = new Set(reminders.map((r) => r.id))
      return {
        ...current,
        modulesSetUp: [...current.modulesSetUp.filter((id) => id !== 'sleep'), 'sleep'],
        sleep,
        sleepActive: createSleepActive(sleep, reminders.length > 0),
        ui: { ...current.ui, reminders: [...current.ui.reminders.filter((r) => !ids.has(r.id)), ...reminders] },
      }
    })
    go('dashboard')
    setFreshModuleId('sleep')
    setToastPending(true)
  }

  function editRoutine() {
    setEditingRoutine(true)
    go('skincare/routine')
  }

  function resetModule() {
    deleteAllPhotos()
    setPhotoTotal(0)
    setState((current) => ({
      ...current,
      modulesSetUp: current.modulesSetUp.filter((id) => id !== 'skincare'),
      skincare: initialSkincare,
      skincareActive: null,
      ui: { ...current.ui, reminders: current.ui.reminders.filter((r) => !isModuleReminder('skincare', r.id)), skincareTab: 'today' },
    }))
    go('dashboard', -1)
  }

  function resetDemo() {
    clearDemoStorage()
    // Photos live in IndexedDB, which clearing localStorage doesn't touch.
    deleteAllPhotos()
    setPhotoTotal(0)
    document.documentElement.classList.remove('dark')
    setState(initialAppState)
    setFreshModuleId(null)
    setToastPending(false)
    setEditingRoutine(false)
    setEditingSleepTimes(false)
    setSleepSessionId(null)
    setResetCount((count) => count + 1)
    go('onboarding', -1)
  }

  const renderTab: ModuleTabRender = (tab) => {
    const active = state.skincareActive
    if (!active) return null
    if (tab === 'yoga') return { content: <FaceYogaTab active={active} onStart={() => go('skincare/yoga')} /> }
    if (tab === 'progress') {
      const left = daysUntilScan(active)
      const scanDay = addDays(latestScan(active).date, SCAN_CYCLE_DAYS - 1)
      return {
        content: (
          <ProgressTab
            state={state}
            scanReminderSet={state.ui.reminders.some((r) => r.id === `skincare:scan:${scanDay}`)}
            onRemindScan={remindForScan}
            onToggleKeepPhotos={(keep) => updateActive((a) => ({ ...a, keepScanPhotos: keep }))}
          />
        ),
        footer: (
          <PrimaryButton disabled={left > 0} onClick={() => go('skincare/rescan')}>
            {left > 0 ? `Scan unlocks in ${left} ${left === 1 ? 'day' : 'days'}` : 'Take your 14-day scan'}
          </PrimaryButton>
        ),
      }
    }
    if (tab === 'ask') return { content: <AskTab state={state} onActiveChange={updateActive} onToast={setModuleToast} /> }
    return null
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
            variant={state.modulesSetUp.length === 0 ? 'day0' : freshModuleId ? 'just-set-up' : 'active'}
            freshModuleId={freshModuleId}
            state={state}
            showToast={toastPending}
            onToastDone={() => setToastPending(false)}
            onActiveChange={updateActive}
            onSleepActiveChange={updateSleepActive}
            onDemoChange={updateDemo}
            onJumpCycle={jumpScanCycle}
            onSimulate={simulateNineDays}
            onSimulateSleep={simulateSleepNights}
            onStartModule={(moduleId) =>
              !SETUP_READY.includes(moduleId)
                ? go('module/home', 1, moduleId)
                : moduleId === 'skincare'
                  ? go('skincare/routine')
                  : go('sleep/anchor')
            }
            onOpenModule={(moduleId, sleepTab) => {
              if (moduleId === 'skincare') go('skincare')
              else if (moduleId === 'sleep') {
                updateUi({ sleepTab: sleepTab ?? defaultSleepTab(state.sleepActive) })
                go('sleep')
              } else go('module/home', 1, moduleId)
            }}
            onReset={resetDemo}
          />
        )
      case 'skincare':
        return state.skincareActive ? (
          <SkincareModule
            state={state}
            tab={state.ui.skincareTab}
            toast={moduleToast}
            hasScanPhotos={photoTotal > 0}
            onToastDone={() => setModuleToast(null)}
            onTabChange={(tab) => updateUi({ skincareTab: tab })}
            onBack={() => go('dashboard', -1)}
            onActiveChange={updateActive}
            onRemind={remindForTip}
            onRemoveReminder={(id) => setReminders((list) => list.filter((r) => r.id !== id))}
            onEditRoutine={editRoutine}
            onResetModule={resetModule}
            onDeletePhotos={deletePhotos}
            renderTab={renderTab}
          />
        ) : null
      case 'skincare/yoga':
        return state.skincareActive ? (
          <YogaPlayer
            streak={yogaStreak(state.skincareActive.yoga.sessions)}
            weekCount={thisWeek(state.skincareActive.yoga.sessions).count}
            onComplete={() => updateActive((a) => ({ ...a, yoga: { sessions: [...a.yoga.sessions, new Date().toISOString()] } }))}
            onExit={() => go('skincare', -1)}
          />
        ) : null
      case 'skincare/rescan':
        return state.skincareActive ? (
          <ScanStep
            {...stepProps}
            rescan={{
              keepPhoto: state.skincareActive.keepScanPhotos,
              onDone: saveRescan,
              onCancel: () => go('skincare', -1),
            }}
          />
        ) : null
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
      case 'sleep/anchor':
        return <AnchorStep setup={state.sleep} onChange={updateSleep} onNext={() => sleepStep(1)} onBack={() => sleepStep(-1)} />
      case 'sleep/intent':
        return <IntentStep setup={state.sleep} onChange={updateSleep} onNext={() => sleepStep(1)} onBack={() => sleepStep(-1)} />
      case 'sleep/constraint':
        return <ConstraintStep setup={state.sleep} onChange={updateSleep} onNext={() => sleepStep(1)} onBack={() => sleepStep(-1)} />
      case 'sleep/health':
        return (
          <HealthStep
            setup={state.sleep}
            outcome={state.demo.healthConnect}
            onChange={updateSleep}
            onNext={() => sleepStep(1)}
            onBack={() => sleepStep(-1)}
          />
        )
      case 'sleep/mirror':
        return <MirrorStep setup={state.sleep} onBack={() => sleepStep(-1)} onDone={completeSleep} />
      // The Sleep module itself is built next; until then it's a placeholder.
      case 'sleep':
        return state.sleepActive ? (
          <SleepModule
            state={state}
            active={state.sleepActive}
            tab={state.ui.sleepTab ?? 'tonight'}
            toast={moduleToast}
            onToastDone={() => setModuleToast(null)}
            onTabChange={(sleepTab) => updateUi({ sleepTab })}
            onBack={() => go('dashboard', -1)}
            onActiveChange={updateSleepActive}
            onSaveMorning={saveMorning}
            onRemind={remindForSleepTip}
            onToggleReminder={toggleSleepReminder}
            onRemoveReminder={(id) => setReminders((list) => list.filter((r) => r.id !== id))}
            onEditTimes={editSleepTimes}
            onResetModule={resetSleepModule}
            onStartSession={(id) => {
              setSleepSessionId(id)
              go('sleep/session')
            }}
            onOpenSkincare={() => go('skincare')}
          />
        ) : null
      case 'sleep/session': {
        const session = sleepSessionId ? sessionById(sleepSessionId) : undefined
        return session ? (
          <SleepSessionPlayer
            session={session}
            onComplete={() => {
              updateSleepActive((a) => ({ ...a, sessions: [...a.sessions, { id: session.id, at: new Date().toISOString() }] }))
              setModuleToast('Session saved')
              go('sleep', -1)
            }}
            onExit={() => go('sleep', -1)}
          />
        ) : null
      }
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
          {alert && (
            <Toast
              key={alert.message + alert.detail}
              message={alert.message}
              detail={alert.detail}
              icon={alert.icon}
              duration={6000}
              onDone={() => setAlert(null)}
            />
          )}
        </div>
      </div>
    </WeatherProvider>
  )
}

export default App
