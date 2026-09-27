import { useState } from 'react'
import { Screen } from '../components/Screen'
import { ThemeToggle } from '../components/ThemeToggle'
import { Avatar } from '../components/Avatar'
import { GlowScoreRing } from '../components/GlowScoreRing'
import { HintCard } from '../components/HintCard'
import { ModuleCard, type ModuleRowTone } from '../components/ModuleCard'
import { BottomNav } from '../components/BottomNav'
import { MODULE_ICONS, moduleName, orderedModules } from '../lib/modules'
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

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

export function Dashboard({ mode, state, onStartModule, onReset }: DashboardProps) {
  const [confirmReset, setConfirmReset] = useState(false)
  const name = state.onboarding.name.trim()
  const modules = orderedModules(state.onboarding.modules)
  const total = modules.length

  function subtitleFor(index: number): { subtitle: string; tone: ModuleRowTone } {
    if (index === 0) return { subtitle: 'Recommended first · 2 min', tone: 'recommended' }
    if (index === 1) return { subtitle: 'Waiting · tomorrow works', tone: 'waiting' }
    return { subtitle: 'Waiting · whenever you like', tone: 'waiting' }
  }

  const header = (
    <header className="flex shrink-0 items-center justify-between gap-3 px-6 pt-5 pb-2">
      <div className="min-w-0">
        <Eyebrow>Welcome</Eyebrow>
        <p className="truncate text-[26px] leading-tight font-bold text-text">{name || 'Friend'}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <Avatar initial={(name[0] ?? 'H').toUpperCase()} onLongPress={() => setConfirmReset(true)} />
      </div>
    </header>
  )

  const resetOverlay = confirmReset && (
    <div className="absolute inset-0 z-30" onClick={() => setConfirmReset(false)}>
      <div
        role="dialog"
        aria-label="Reset demo"
        onClick={(event) => event.stopPropagation()}
        className="absolute top-20 right-6 w-64 rounded-[20px] border border-border bg-surface p-4"
      >
        <p className="text-base font-semibold text-text">Reset demo?</p>
        <p className="mt-1 text-sm text-muted">Clears every answer on this device and restarts onboarding.</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmReset(false)}
            className="h-11 flex-1 rounded-full border border-border text-sm font-medium text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReset}
            className="h-11 flex-1 rounded-full bg-cta text-sm font-semibold text-cta-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <Screen header={header} footer={<BottomNav active="home" />} overlay={resetOverlay}>
      <div className="flex flex-col gap-4 pt-2" data-mode={mode}>
        <section className="flex items-center gap-4 rounded-[20px] border border-border bg-surface p-5">
          <GlowScoreRing score={null} />
          <div className="flex flex-col gap-1">
            <Eyebrow>Glow score</Eyebrow>
            <p className="text-sm leading-relaxed text-text">Wakes up with your first log. Set up a module to begin.</p>
          </div>
        </section>

        <HintCard eyebrow={`Daily setup · 1 of ${total}`}>
          Pick one module to set up today — about 2 minutes. One a day is plenty.
        </HintCard>

        <section className="flex flex-col gap-3 pt-2">
          <Eyebrow>Your modules</Eyebrow>
          {modules.map((id, index) => {
            const { subtitle, tone } = subtitleFor(index)
            return (
              <ModuleCard
                key={id}
                variant="row"
                name={moduleName(id)}
                icon={MODULE_ICONS[id]}
                subtitle={subtitle}
                tone={tone}
                onClick={() => onStartModule(id)}
                trailing={
                  index === 0 ? (
                    <span className="shrink-0 rounded-full bg-cta px-4 py-2 text-sm font-semibold text-cta-text">
                      Start
                    </span>
                  ) : undefined
                }
              />
            )
          })}
        </section>
      </div>
    </Screen>
  )
}
