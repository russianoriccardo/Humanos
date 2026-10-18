import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { Bell, ChevronRight } from 'lucide-react'
import { Screen } from '../components/Screen'
import { ThemeToggle } from '../components/ThemeToggle'
import { Avatar } from '../components/Avatar'
import { GlowScoreRing } from '../components/GlowScoreRing'
import { HintCard } from '../components/HintCard'
import { ModuleCard, type ModuleRowTone } from '../components/ModuleCard'
import { BottomNav } from '../components/BottomNav'
import { Toast } from '../components/Toast'
import { DemoPanel } from '../components/DemoPanel'
import { addDays } from '../lib/dates'
import { MODULE_ICONS, moduleName, orderedModules } from '../lib/modules'
import {
  todayKey,
  type AppState,
  type DemoState,
  type SkincareActive,
  type SleepActive,
  type SleepTab,
} from '../state/appState'
import { useToday } from '../skincare/useToday'
import { routineDay } from '../skincare/active'
import { glowBreakdown, glowReason } from '../skincare/engine/glowScore'
import { rules } from '../skincare/engine/rules.config'
import { checkInMinutes, formatDuration, shiftClock, tonightLightsOut, WIND_DOWN_MINUTES } from '../sleep/plan'

// day0: nothing set up · just-set-up: first arrival after a module's setup · active: every visit after
export type DashboardVariant = 'day0' | 'just-set-up' | 'active'

type DashboardProps = {
  variant: DashboardVariant
  // The module whose setup just finished (drives the toast and NEW badge).
  freshModuleId: string | null
  state: AppState
  showToast: boolean
  onToastDone: () => void
  onActiveChange: (fn: (active: SkincareActive) => SkincareActive) => void
  onSleepActiveChange: (fn: (active: SleepActive) => SleepActive) => void
  onDemoChange: (patch: Partial<DemoState>) => void
  onJumpCycle: () => void
  onSimulate: () => void
  onSimulateSleep: () => void
  onStartModule: (moduleId: string) => void
  onOpenModule: (moduleId: string, sleepTab?: SleepTab) => void
  onReset: () => void
}

type Icon = ComponentType<{ size?: number; className?: string }>

// Squares switch from the day's view to tonight's at 15:00.
const EVENING_HOUR = 15

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

function greeting(now = new Date()) {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

type SquareProps = {
  name: string
  icon: Icon
  isNew: boolean
  wide: boolean
  highlight?: boolean
  value: string
  valueSize?: 'big' | 'small'
  caption: string
  extra?: ReactNode
  onOpen: () => void
}

// A live module. The whole card opens the module; `extra` may hold its own button, raised above the card's.
function ModuleSquare({ name, icon: Icon, isNew, wide, highlight = false, value, valueSize = 'big', caption, extra, onOpen }: SquareProps) {
  return (
    <div
      className={[
        'relative flex flex-col overflow-hidden rounded-[20px] p-4',
        wide ? 'aspect-[2/1]' : 'aspect-square',
        highlight ? 'border-[1.5px] border-accent bg-tint' : 'border border-border bg-surface',
      ].join(' ')}
    >
      <button type="button" onClick={onOpen} aria-label={`Open ${name}`} className={`absolute inset-0 rounded-[20px] ${focusRing}`} />
      <div className="pointer-events-none flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent">
          <Icon size={16} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{name}</span>
        {isNew ? (
          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold tracking-[1px] text-on-accent">NEW</span>
        ) : (
          <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
        )}
      </div>
      <div className="pointer-events-none mt-auto flex min-w-0 flex-col gap-0.5">
        <p className={['truncate leading-tight font-bold text-text', valueSize === 'big' ? 'text-[26px]' : 'text-base'].join(' ')}>{value}</p>
        <p className="truncate text-[13px] text-muted">{caption}</p>
        {extra && <div className="pt-2">{extra}</div>}
      </div>
    </div>
  )
}

function CoachMark({ title, body, right }: { title: string; body: string; right: boolean }) {
  return (
    <div className="relative animate-pop rounded-[16px] bg-cta p-4 text-cta-text">
      <span className={['absolute -top-1.5 h-3 w-3 rotate-45 bg-cta', right ? 'left-[calc(50%+2rem)]' : 'left-8'].join(' ')} aria-hidden />
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-0.5 text-sm">{body}</p>
    </div>
  )
}

export function Dashboard({
  variant,
  freshModuleId,
  state,
  showToast,
  onToastDone,
  onActiveChange,
  onSleepActiveChange,
  onDemoChange,
  onJumpCycle,
  onSimulate,
  onSimulateSleep,
  onStartModule,
  onOpenModule,
  onReset,
}: DashboardProps) {
  const [demoOpen, setDemoOpen] = useState(false)
  const { plan, usableWeather, health } = useToday(state)
  const active = state.skincareActive
  const sleepActive = state.sleepActive
  const live = variant !== 'day0'
  const skincareLive = live && !!active
  const fresh = variant === 'just-set-up' ? freshModuleId : null
  const name = state.onboarding.name.trim()
  const modules = orderedModules(state.onboarding.modules, state.modulesSetUp)
  const total = modules.length
  const today = todayKey()
  const evening = new Date().getHours() >= EVENING_HOUR

  // Live = set up and holding its data; Skincare and Sleep are the only modules that can be.
  const startedOn = (id: string) => (id === 'skincare' ? active?.startedAt : id === 'sleep' ? sleepActive?.startedAt : undefined)
  const liveModules = live ? state.modulesSetUp.filter((id) => !!startedOn(id)) : []
  const pending = modules.filter((id) => !liveModules.includes(id))
  const nextModule = pending[0]
  const setUpToday = [...liveModules].reverse().find((id) => startedOn(id) === today)

  const tonight = (plan?.tonight ?? []).filter((step) => step.status !== 'skipped')
  const done = (active?.routineLog[today] ?? []).filter((id) => tonight.some((step) => step.id === id))
  const tips = (plan?.tips ?? []).filter((tip) => tip.id !== 'calm')
  const glow = active ? glowBreakdown({ active, weatherLog: state.weatherLog, today }) : null

  const skincareCoach = liveModules.includes('skincare') && !!active && !active.seenCoachMark
  const sleepCoach = !skincareCoach && liveModules.includes('sleep') && !!sleepActive && !sleepActive.seenCoachMark
  const coachFor = skincareCoach ? 'skincare' : sleepCoach ? 'sleep' : null

  // Any touch dismisses the coach mark, without a full-screen layer that would swallow scrolls and taps.
  useEffect(() => {
    if (!coachFor) return
    const dismiss = () =>
      coachFor === 'skincare'
        ? onActiveChange((a) => ({ ...a, seenCoachMark: true }))
        : onSleepActiveChange((a) => ({ ...a, seenCoachMark: true }))
    document.addEventListener('pointerdown', dismiss, { once: true })
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [coachFor, onActiveChange, onSleepActiveChange])

  function day0Row(index: number): { subtitle: string; tone: ModuleRowTone } {
    if (index === 0) return { subtitle: 'Recommended first · 2 min', tone: 'recommended' }
    if (index === 1) return { subtitle: 'Waiting · tomorrow works', tone: 'waiting' }
    return { subtitle: 'Waiting · whenever you like', tone: 'waiting' }
  }

  function skincareSquare(wide: boolean) {
    if (!active) return null
    const common = { name: 'Skincare', icon: MODULE_ICONS.skincare, isNew: fresh === 'skincare', wide, onOpen: () => onOpenModule('skincare') }
    if (evening) {
      return (
        <ModuleSquare
          {...common}
          value={`${done.length} of ${tonight.length}`}
          caption="Tonight's routine"
          extra={
            <span className="flex gap-1" aria-hidden>
              {tonight.map((step) => (
                <span key={step.id} className={['h-1.5 flex-1 rounded-full', done.includes(step.id) ? 'bg-accent' : 'bg-tint'].join(' ')} />
              ))}
            </span>
          }
        />
      )
    }
    return (
      <ModuleSquare
        {...common}
        value={`${tips.length} ${tips.length === 1 ? 'tip' : 'tips'}`}
        caption={`Adjusted for today · Day ${routineDay(active, today)}`}
        extra={<p className="truncate text-xs text-text">{tips[0]?.metric ?? 'Routine as planned'}</p>}
      />
    )
  }

  function sleepSquare(wide: boolean) {
    if (!sleepActive) return null
    const common = { name: 'Sleep', icon: MODULE_ICONS.sleep, isNew: fresh === 'sleep', wide, onOpen: () => onOpenModule('sleep') }
    const lastNight = sleepActive.checkIns[today]

    if (evening || sleepActive.startedAt === today) {
      const lightsOut = tonightLightsOut(sleepActive, today)
      return (
        <ModuleSquare
          {...common}
          value={lightsOut}
          caption="Lights out tonight"
          extra={
            <span className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-tint px-2.5 text-xs font-semibold text-text">
              <Bell size={12} className="shrink-0 text-accent" aria-hidden />
              <span className="truncate">Wind down {shiftClock(lightsOut, -WIND_DOWN_MINUTES)}</span>
            </span>
          }
        />
      )
    }

    if (lastNight) {
      const minutes = checkInMinutes(lastNight)
      const logged = Object.values(sleepActive.checkIns).map(checkInMinutes)
      let caption = 'Last night'
      if (logged.length >= 3) {
        const diff = Math.round(minutes - logged.reduce((sum, m) => sum + m, 0) / logged.length)
        caption += diff === 0 ? ' · on your average' : ` · ${formatDuration(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'}`
      }
      const week = Array.from({ length: 7 }, (_, i) => sleepActive.checkIns[addDays(today, i - 6)])
      return (
        <ModuleSquare
          {...common}
          value={formatDuration(minutes)}
          caption={caption}
          extra={
            <span className="flex h-6 items-end gap-1" aria-hidden>
              {week.map((night, i) => (
                <span
                  key={i}
                  className={['flex-1 rounded-[3px]', night ? (i === 6 ? 'bg-accent' : 'bg-accent/50') : 'border border-dashed border-border'].join(' ')}
                  style={{ height: night ? `${Math.max(20, Math.min(100, (checkInMinutes(night) / 600) * 100))}%` : '100%' }}
                />
              ))}
            </span>
          }
        />
      )
    }

    return (
      <ModuleSquare
        {...common}
        highlight
        value="How did you sleep?"
        valueSize="small"
        caption="No data for last night"
        extra={
          <button
            type="button"
            onClick={() => onOpenModule('sleep', 'mornings')}
            className={`pointer-events-auto relative z-10 h-8 rounded-full bg-cta px-3 text-xs font-semibold text-cta-text ${focusRing}`}
          >
            Log in 10 sec
          </button>
        }
      />
    )
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
          canSimulateSleep={!!sleepActive}
          onChange={onDemoChange}
          onJumpCycle={onJumpCycle}
          onSimulate={onSimulate}
          onSimulateSleep={onSimulateSleep}
          onReset={onReset}
          onClose={() => setDemoOpen(false)}
        />
      )}
    </>
  )

  const isWide = (index: number) => index === liveModules.length - 1 && liveModules.length % 2 === 1
  const coachIndex = coachFor ? liveModules.indexOf(coachFor) : -1
  const coachRight = coachIndex % 2 === 1 && !isWide(coachIndex)

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

        {variant === 'day0' ? (
          <>
            <HintCard eyebrow={`Daily setup · 1 of ${total}`}>
              Pick one module to set up today. About 2 minutes. One a day is plenty.
            </HintCard>
            <section className="flex flex-col gap-3 pt-2">
              <Eyebrow>Your modules</Eyebrow>
              {modules.map((id, index) => {
                const { subtitle, tone } = day0Row(index)
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
                        <span className="shrink-0 rounded-full bg-cta px-4 py-2 text-sm font-semibold text-cta-text">Start</span>
                      ) : undefined
                    }
                  />
                )
              })}
            </section>
          </>
        ) : (
          <>
            {nextModule && (
              <HintCard eyebrow={`Daily setup · ${liveModules.length} of ${total} done`}>
                {setUpToday
                  ? `${moduleName(setUpToday)} is live. ${moduleName(nextModule)} is next. Tomorrow is plenty.`
                  : `${moduleName(nextModule)} is ready whenever you are. About 2 minutes.`}
              </HintCard>
            )}

            <section className="flex flex-col gap-3 pt-2">
              <Eyebrow>Your modules</Eyebrow>
              <div className="grid grid-cols-2 gap-3">
                {liveModules.map((id, index) => (
                  <div key={id} className={isWide(index) ? 'col-span-2' : undefined}>
                    {id === 'skincare' ? skincareSquare(isWide(index)) : sleepSquare(isWide(index))}
                  </div>
                ))}
              </div>
              {coachFor === 'skincare' && (
                <CoachMark title="Your skincare hub is live" body="Tap to open today's tips, face yoga and your progress." right={coachRight} />
              )}
              {coachFor === 'sleep' && (
                <CoachMark title="Your sleep hub is live" body="Tap it for tonight's plan and your wind down." right={coachRight} />
              )}
            </section>

            {pending.length > 0 && (
              <section className="flex flex-col gap-3 pt-2">
                <Eyebrow>Not set up yet</Eyebrow>
                {pending.map((id, index) => {
                  const first = index === 0
                  return (
                    <ModuleCard
                      key={id}
                      variant="row"
                      name={moduleName(id)}
                      icon={MODULE_ICONS[id]}
                      subtitle={first ? (setUpToday ? 'Up next · tomorrow' : 'Ready to set up · 2 min') : 'Waiting · whenever you like'}
                      tone={first ? 'default' : 'waiting'}
                      onClick={() => onStartModule(id)}
                      trailing={
                        first && !setUpToday ? (
                          <span className="shrink-0 rounded-full bg-cta px-4 py-2 text-sm font-semibold text-cta-text">Start</span>
                        ) : undefined
                      }
                    />
                  )
                })}
              </section>
            )}
          </>
        )}
      </div>
    </Screen>
  )
}
