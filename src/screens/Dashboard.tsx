import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
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
import { SegmentBar } from '../components/SegmentBar'
import { MODULE_ICONS, moduleName, orderedModules } from '../lib/modules'
import { todayKey, type AppState, type DemoState, type SkincareActive } from '../state/appState'
import { useToday } from '../skincare/useToday'
import { cycleDay, daysUntilScan, routineDay, SCAN_CYCLE_DAYS } from '../skincare/active'
import { glowBreakdown, glowReason } from '../skincare/engine/glowScore'
import { rules } from '../skincare/engine/rules.config'
import { TipIcon } from '../skincare/TipIcon'

// day0: nothing set up · just-set-up: first arrival from the result screen (13) · active: every visit after (13b)
export type DashboardVariant = 'day0' | 'just-set-up' | 'active'

type DashboardProps = {
  variant: DashboardVariant
  // The module whose setup just finished (drives the toast, NEW badge and hint).
  freshModuleId: string | null
  state: AppState
  showToast: boolean
  onToastDone: () => void
  onActiveChange: (fn: (active: SkincareActive) => SkincareActive) => void
  onDemoChange: (patch: Partial<DemoState>) => void
  onJumpCycle: () => void
  onSimulate: () => void
  onStartModule: (moduleId: string) => void
  onOpenModule: (moduleId: string) => void
  onReset: () => void
}

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
  variant,
  freshModuleId,
  state,
  showToast,
  onToastDone,
  onActiveChange,
  onDemoChange,
  onJumpCycle,
  onSimulate,
  onStartModule,
  onOpenModule,
  onReset,
}: DashboardProps) {
  const [demoOpen, setDemoOpen] = useState(false)
  const { plan, usableWeather, health } = useToday(state)
  const active = state.skincareActive
  const live = variant !== 'day0'
  const skincareLive = live && !!active
  const fresh = variant === 'just-set-up' ? freshModuleId : null
  const isLive = (id: string) => (id === 'skincare' ? skincareLive : live && state.modulesSetUp.includes(id))
  const name = state.onboarding.name.trim()
  const modules = orderedModules(state.onboarding.modules)
  const total = modules.length
  const nextModule = modules.find((id) => !state.modulesSetUp.includes(id))
  const today = todayKey()

  const tonight = (plan?.tonight ?? []).filter((step) => step.status !== 'skipped')
  const done = (active?.routineLog[today] ?? []).filter((id) => tonight.some((step) => step.id === id))
  const showCoachMark = skincareLive && !active.seenCoachMark
  const tips = (plan?.tips ?? []).filter((tip) => tip.id !== 'calm')
  const glow = active ? glowBreakdown({ active, weatherLog: state.weatherLog, today }) : null

  // Any touch dismisses the coach mark, without a full-screen layer that would swallow scrolls and taps.
  useEffect(() => {
    if (!showCoachMark) return
    const dismiss = () => onActiveChange((a) => ({ ...a, seenCoachMark: true }))
    document.addEventListener('pointerdown', dismiss, { once: true })
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [showCoachMark, onActiveChange])

  function toggleStep(id: string) {
    onActiveChange((a) => {
      const current = a.routineLog[today] ?? []
      const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id]
      return { ...a, routineLog: { ...a.routineLog, [today]: next } }
    })
  }

  function rowFor(id: string, index: number): { subtitle: string; tone: ModuleRowTone } {
    if (variant === 'day0') {
      if (index === 0) return { subtitle: 'Recommended first · 2 min', tone: 'recommended' }
      if (index === 1) return { subtitle: 'Waiting · tomorrow works', tone: 'waiting' }
      return { subtitle: 'Waiting · whenever you like', tone: 'waiting' }
    }
    if (id === 'skincare' && skincareLive) {
      if (fresh === 'skincare') return { subtitle: `Tonight · ${done.length} of ${tonight.length} steps`, tone: 'default' }
      const day = routineDay(active!, today)
      const tipLabel = tips.length ? `${tips.length} ${tips.length === 1 ? 'tip' : 'tips'} for today` : 'routine as planned'
      return { subtitle: `Day ${day} · ${tipLabel}`, tone: 'default' }
    }
    if (isLive(id)) return { subtitle: fresh === id ? 'Just set up · open your hub' : 'Open your hub', tone: 'default' }
    if (id === nextModule) {
      return { subtitle: variant === 'just-set-up' ? 'Up next · tomorrow' : 'Ready to set up · 2 min', tone: 'default' }
    }
    return { subtitle: 'Waiting · whenever you like', tone: 'waiting' }
  }

  const glowText = !skincareLive
    ? live
      ? 'Wakes up with your first skincare log.'
      : 'Wakes up with your first log. Set up a module to begin.'
    : fresh === 'skincare'
      ? "Your baseline. Log tonight's routine to move it."
      : glowReason(glow!.delta, usableWeather, health)

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
      {showToast && freshModuleId && <Toast message={`${moduleName(freshModuleId)} is set up`} onDone={onToastDone} />}

      {demoOpen && (
        <DemoPanel
          demo={state.demo}
          canJumpCycle={!!active}
          onChange={onDemoChange}
          onJumpCycle={onJumpCycle}
          onSimulate={onSimulate}
          onReset={onReset}
          onClose={() => setDemoOpen(false)}
        />
      )}
    </>
  )

  const skincareBody = (() => {
    if (!skincareLive) return null
    if (fresh === 'skincare') {
      const steps = plan?.tonight ?? []
      return steps.length > 0 ? (
        <div role="group" aria-label="Tonight's routine" className="flex flex-wrap gap-2">
          {steps.map((step) => (
            <Chip
              key={step.id}
              variant="step"
              label={step.name}
              skipped={step.status === 'skipped'}
              selected={done.includes(step.id)}
              onClick={() => toggleStep(step.id)}
            />
          ))}
        </div>
      ) : null
    }
    const top = plan?.tips[0]
    const day = cycleDay(active, today)
    const left = daysUntilScan(active, today)
    // Spans only: this renders inside the card's <button>.
    return (
      <span className="flex flex-col gap-3">
        {top && (
          <span className="flex items-center gap-3 rounded-[14px] bg-tint p-3">
            <TipIcon icon={top.icon} size="sm" />
            <span className="text-sm leading-snug text-text">{top.body}</span>
          </span>
        )}
        <span className="flex flex-col gap-2">
          <span className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-text">{left > 0 ? `Next face scan in ${left} ${left === 1 ? 'day' : 'days'}` : 'Face scan due today'}</span>
            <span className="shrink-0 text-muted">
              {Math.min(day, SCAN_CYCLE_DAYS)} / {SCAN_CYCLE_DAYS}
            </span>
          </span>
          <SegmentBar total={SCAN_CYCLE_DAYS} filled={day} label="Scan cycle" />
        </span>
      </span>
    )
  })()

  return (
    <Screen header={header} footer={<BottomNav active="home" />} overlay={overlay}>
      <div className="flex flex-col gap-4 pt-2" data-variant={variant}>
        <section className="flex items-center gap-4 rounded-[20px] border border-border bg-surface p-5">
          <GlowScoreRing score={skincareLive ? (fresh === 'skincare' ? rules.glow.baseline : glow!.score) : null} />
          <div className="flex flex-col gap-1">
            <Eyebrow>Glow score</Eyebrow>
            <p className="text-sm leading-relaxed text-text">{glowText}</p>
          </div>
        </section>

        {variant === 'day0' && (
          <HintCard eyebrow={`Daily setup · 1 of ${total}`}>
            Pick one module to set up today. About 2 minutes. One a day is plenty.
          </HintCard>
        )}
        {variant === 'just-set-up' && (
          <HintCard eyebrow={`Daily setup · ${state.modulesSetUp.length} of ${total} done`}>
            {nextModule
              ? `${moduleName(freshModuleId ?? '')} is live. ${moduleName(nextModule)} is next. Tomorrow is plenty.`
              : `${moduleName(freshModuleId ?? '')} is live. That's every module you picked. Nicely done.`}
          </HintCard>
        )}

        <section className="flex flex-col gap-3 pt-2">
          <Eyebrow>Your modules</Eyebrow>
          {modules.map((id, index) => {
            const { subtitle, tone } = rowFor(id, index)
            const moduleLive = isLive(id)
            const isLiveSkincare = moduleLive && id === 'skincare'
            return (
              <div key={id} className="flex flex-col gap-3">
                <ModuleCard
                  variant="row"
                  name={moduleName(id)}
                  icon={MODULE_ICONS[id]}
                  subtitle={subtitle}
                  tone={tone}
                  childrenInButton={isLiveSkincare && fresh !== 'skincare'}
                  onClick={() => (moduleLive ? onOpenModule(id) : onStartModule(id))}
                  trailing={
                    moduleLive ? (
                      fresh === id ? (
                        <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold tracking-[1px] text-on-accent">
                          NEW
                        </span>
                      ) : (
                        <ChevronRight size={20} className="shrink-0 text-muted" aria-hidden />
                      )
                    ) : variant === 'day0' && index === 0 ? (
                      <span className="shrink-0 rounded-full bg-cta px-4 py-2 text-sm font-semibold text-cta-text">Start</span>
                    ) : undefined
                  }
                >
                  {isLiveSkincare ? skincareBody : null}
                </ModuleCard>

                {isLiveSkincare && showCoachMark && (
                  <div className="relative animate-pop rounded-[16px] bg-cta p-4 text-cta-text">
                    <span className="absolute -top-1.5 left-8 h-3 w-3 rotate-45 bg-cta" aria-hidden />
                    <p className="text-sm font-semibold">Your skincare hub is live</p>
                    <p className="mt-0.5 text-sm">Tap to open today's tips, face yoga and your progress.</p>
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
