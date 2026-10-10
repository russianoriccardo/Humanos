import { useState } from 'react'
import { Screen } from '../components/Screen'
import { ThemeToggle } from '../components/ThemeToggle'
import { Avatar } from '../components/Avatar'
import { GlowScoreRing } from '../components/GlowScoreRing'
import { HintCard } from '../components/HintCard'
import { ModuleCard, type ModuleRowTone } from '../components/ModuleCard'
import { BottomNav } from '../components/BottomNav'
import { Chip } from '../components/Chip'
import { Toast } from '../components/Toast'
import { DemoPanel } from '../components/DemoPanel'
import { MODULE_ICONS, moduleName, orderedModules } from '../lib/modules'
import { todayKey, type AppState, type DemoState, type SkincareActive } from '../state/appState'
import { eveningSteps } from '../skincare/routine'

export type DashboardMode = 'day0' | 'skincare-live'

type DashboardProps = {
  mode: DashboardMode
  state: AppState
  justSetUp: boolean
  onToastDone: () => void
  onActiveChange: (fn: (active: SkincareActive) => SkincareActive) => void
  onDemoChange: (patch: Partial<DemoState>) => void
  onJumpCycle: () => void
  onStartModule: (moduleId: string) => void
  onOpenModule: (moduleId: string) => void
  onReset: () => void
}

// Shown right after Skincare is set up; the live glow score starts here until logging exists.
const BASELINE_SCORE = 64

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

function greeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard({
  mode,
  state,
  justSetUp,
  onToastDone,
  onActiveChange,
  onDemoChange,
  onJumpCycle,
  onStartModule,
  onOpenModule,
  onReset,
}: DashboardProps) {
  const [demoOpen, setDemoOpen] = useState(false)
  const active = state.skincareActive
  const live = mode === 'skincare-live' && !!active
  const name = state.onboarding.name.trim()
  const modules = orderedModules(state.onboarding.modules)
  const total = modules.length
  const nextModule = modules.find((id) => !state.modulesSetUp.includes(id))

  const today = todayKey()
  const steps = active ? eveningSteps(active.routine, new Date().getDay()) : []
  const done = (active?.routineLog[today] ?? []).filter((id) => steps.some((step) => step.id === id))
  const showCoachMark = live && !active.seenCoachMark

  function toggleStep(id: string) {
    onActiveChange((a) => {
      const current = a.routineLog[today] ?? []
      const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id]
      return { ...a, routineLog: { ...a.routineLog, [today]: next } }
    })
  }

  function rowFor(id: string, index: number): { subtitle: string; tone: ModuleRowTone } {
    if (!live) {
      if (index === 0) return { subtitle: 'Recommended first · 2 min', tone: 'recommended' }
      if (index === 1) return { subtitle: 'Waiting · tomorrow works', tone: 'waiting' }
      return { subtitle: 'Waiting · whenever you like', tone: 'waiting' }
    }
    if (id === 'skincare') return { subtitle: `Tonight · ${done.length} of ${steps.length} steps`, tone: 'default' }
    if (id === nextModule) return { subtitle: 'Up next · tomorrow', tone: 'default' }
    return { subtitle: 'Waiting · whenever you like', tone: 'waiting' }
  }

  const header = (
    <header className="flex shrink-0 items-center justify-between gap-3 px-6 pt-5 pb-2">
      <div className="min-w-0">
        <Eyebrow>{live ? greeting() : 'Welcome'}</Eyebrow>
        <p className="truncate text-[26px] leading-tight font-bold text-text">{name || 'Friend'}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <Avatar initial={(name[0] ?? 'H').toUpperCase()} onLongPress={() => setDemoOpen(true)} />
      </div>
    </header>
  )

  const overlay = (
    <>
      {justSetUp && <Toast message="Skincare is set up" onDone={onToastDone} />}

      {showCoachMark && (
        <button
          type="button"
          aria-label="Dismiss tip"
          className="absolute inset-0 z-20 cursor-default"
          onClick={() => onActiveChange((a) => ({ ...a, seenCoachMark: true }))}
        />
      )}

      {demoOpen && (
        <DemoPanel
          demo={state.demo}
          canJumpCycle={!!active}
          onChange={onDemoChange}
          onJumpCycle={onJumpCycle}
          onReset={onReset}
          onClose={() => setDemoOpen(false)}
        />
      )}
    </>
  )

  return (
    <Screen header={header} footer={<BottomNav active="home" />} overlay={overlay}>
      <div className="flex flex-col gap-4 pt-2" data-mode={mode}>
        <section className="flex items-center gap-4 rounded-[20px] border border-border bg-surface p-5">
          <GlowScoreRing score={live ? BASELINE_SCORE : null} />
          <div className="flex flex-col gap-1">
            <Eyebrow>Glow score</Eyebrow>
            <p className="text-sm leading-relaxed text-text">
              {!live
                ? 'Wakes up with your first log. Set up a module to begin.'
                : state.skincare.scan?.status === 'ok'
                  ? "Baseline set from your scan. Log tonight's routine to move it."
                  : "Baseline set from your answers. Log tonight's routine to move it."}
            </p>
          </div>
        </section>

        {live ? (
          <HintCard eyebrow={`Daily setup · ${state.modulesSetUp.length} of ${total} done`}>
            {nextModule
              ? `Skincare is live. ${moduleName(nextModule)} is next — tomorrow is plenty.`
              : "Skincare is live. That's every module you picked — nicely done."}
          </HintCard>
        ) : (
          <HintCard eyebrow={`Daily setup · 1 of ${total}`}>
            Pick one module to set up today — about 2 minutes. One a day is plenty.
          </HintCard>
        )}

        <section className="flex flex-col gap-3 pt-2">
          <Eyebrow>Your modules</Eyebrow>
          {modules.map((id, index) => {
            const { subtitle, tone } = rowFor(id, index)
            const isLiveSkincare = live && id === 'skincare'
            return (
              <div key={id} className="flex flex-col gap-3">
                <ModuleCard
                  variant="row"
                  name={moduleName(id)}
                  icon={MODULE_ICONS[id]}
                  subtitle={subtitle}
                  tone={tone}
                  onClick={() => (isLiveSkincare ? onOpenModule(id) : onStartModule(id))}
                  trailing={
                    isLiveSkincare ? (
                      <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold tracking-[1px] text-on-accent">
                        NEW
                      </span>
                    ) : !live && index === 0 ? (
                      <span className="shrink-0 rounded-full bg-cta px-4 py-2 text-sm font-semibold text-cta-text">Start</span>
                    ) : undefined
                  }
                >
                  {isLiveSkincare && steps.length > 0 && (
                    <div role="group" aria-label="Tonight's routine" className="flex flex-wrap gap-2">
                      {steps.map((step) => (
                        <Chip
                          key={step.id}
                          variant="step"
                          label={step.name}
                          selected={done.includes(step.id)}
                          onClick={() => toggleStep(step.id)}
                        />
                      ))}
                    </div>
                  )}
                </ModuleCard>

                {isLiveSkincare && showCoachMark && (
                  <div className="relative animate-pop rounded-[16px] bg-cta p-4 text-cta-text">
                    <span className="absolute -top-1.5 left-8 h-3 w-3 rotate-45 bg-cta" aria-hidden />
                    <p className="text-sm font-semibold">Your skincare hub is live</p>
                    <p className="mt-0.5 text-sm">Tap to open tonight's routine and see your progress.</p>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      </div>
    </Screen>
  )
}
