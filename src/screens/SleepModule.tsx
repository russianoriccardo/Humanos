import { useEffect, useRef, useState } from 'react'
import { BellRing, ChevronLeft, Clock, Ellipsis, Moon, RotateCcw } from 'lucide-react'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { Sheet } from '../components/Sheet'
import { Toast } from '../components/Toast'
import { dateKey } from '../lib/dates'
import { isModuleReminder, notificationPermission, requestPermission, type PermissionState } from '../services/reminders'
import type { AppState, SleepActive, SleepCheckIn, SleepTab } from '../state/appState'
import { nightKeyFor } from '../sleep/plan'
import type { SleepTip } from '../sleep/rules'
import { MorningsTab } from '../sleep/tabs/MorningsTab'
import { PatternsTab } from '../sleep/tabs/PatternsTab'
import { TonightTab } from '../sleep/tabs/TonightTab'
import { WindDownTab } from '../sleep/tabs/WindDownTab'

const TABS: { id: SleepTab; label: string }[] = [
  { id: 'tonight', label: 'Tonight' },
  { id: 'winddown', label: 'Wind down' },
  { id: 'mornings', label: 'Mornings' },
  { id: 'patterns', label: 'Patterns' },
]

type SleepModuleProps = {
  state: AppState
  active: SleepActive
  tab: SleepTab
  toast: string | null
  onToastDone: () => void
  onTabChange: (tab: SleepTab) => void
  onBack: () => void
  onActiveChange: (fn: (active: SleepActive) => SleepActive) => void
  onSaveMorning: (checkIn: SleepCheckIn) => void
  onRemind: (tip: SleepTip) => void
  onToggleReminder: (on: boolean) => void
  onRemoveReminder: (id: string) => void
  onEditTimes: () => void
  onResetModule: () => void
  onStartSession: (sessionId: string) => void
  onOpenSkincare: () => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

type SheetKind = 'notifications' | 'reset' | 'coming-soon' | null

export function SleepModule({
  state,
  active,
  tab,
  toast,
  onToastDone,
  onTabChange,
  onBack,
  onActiveChange,
  onSaveMorning,
  onRemind,
  onToggleReminder,
  onRemoveReminder,
  onEditTimes,
  onResetModule,
  onStartSession,
  onOpenSkincare,
}: SleepModuleProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [permission, setPermission] = useState<PermissionState>(notificationPermission)
  const menuRef = useRef<HTMLDivElement>(null)
  const night = nightKeyFor()
  const today = dateKey()

  useEffect(() => {
    if (!menuOpen) return
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Each tab starts at the top.
  useEffect(() => {
    document.getElementById('sleep-panel')?.closest('main')?.scrollTo({ top: 0 })
  }, [tab])

  const content =
    tab === 'tonight' ? (
      <TonightTab
        state={state}
        active={active}
        night={night}
        onActiveChange={onActiveChange}
        onRemind={onRemind}
        onToggleReminder={onToggleReminder}
        onComingSoon={() => setSheet('coming-soon')}
      />
    ) : tab === 'mornings' ? (
      <MorningsTab active={active} today={today} onSave={onSaveMorning} />
    ) : tab === 'winddown' ? (
      <WindDownTab state={state} active={active} night={night} onStart={onStartSession} onComingSoon={() => setSheet('coming-soon')} />
    ) : (
      <PatternsTab
        active={active}
        today={today}
        night={night}
        skincareLive={state.modulesSetUp.includes('skincare') && !!state.skincareActive}
        onOpenSkincare={onOpenSkincare}
      />
    )

  function menuItem(label: string, Icon: typeof Moon, onClick: () => void) {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          setMenuOpen(false)
          onClick()
        }}
        className={`flex h-12 w-full items-center gap-3 px-4 text-left text-sm font-medium text-text hover:bg-tint ${focusRing}`}
      >
        <Icon size={17} className="text-accent" aria-hidden />
        {label}
      </button>
    )
  }

  const header = (
    <header className="flex shrink-0 flex-col gap-3 px-6 pt-4 pb-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to home"
          className={`-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full text-text ${focusRing}`}
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex items-center gap-2 text-lg font-bold text-text">
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-tint text-accent">
            <Moon size={16} strokeWidth={2} aria-hidden />
          </span>
          Sleep
        </h1>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className={`-mr-2.5 flex h-11 w-11 items-center justify-center rounded-full text-text ${focusRing}`}
          >
            <Ellipsis size={22} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute top-12 right-0 z-30 w-56 animate-fade overflow-hidden rounded-[16px] border border-border bg-surface py-1"
            >
              {menuItem('Edit sleep times', Clock, onEditTimes)}
              {menuItem('Notifications', BellRing, () => setSheet('notifications'))}
              {menuItem('Reset module', RotateCcw, () => setSheet('reset'))}
            </div>
          )}
        </div>
      </div>
      <SegmentedTabs tabs={TABS} value={tab} onChange={onTabChange} label="Sleep sections" idPrefix="sleep" />
    </header>
  )

  const upcoming = state.ui.reminders.filter((r) => isModuleReminder('sleep', r.id) && Date.parse(r.at) > Date.now())

  const overlay = (
    <>
      {toast && <Toast message={toast} onDone={onToastDone} />}

      {sheet === 'notifications' && (
        <Sheet title="Notifications" subtitle="Reminders for winding down and your morning check in." onClose={() => setSheet(null)}>
          <p className="text-sm leading-relaxed text-text">
            Reminders fire while HUMANOS is open or in the background. A web app can't wake itself when it's fully
            closed, so a reminder you miss shows up the next time you open the app.
          </p>
          {permission === 'default' && (
            <button
              type="button"
              onClick={async () => setPermission(await requestPermission())}
              className={`h-11 rounded-full bg-cta px-4 text-sm font-semibold text-cta-text ${focusRing}`}
            >
              Allow notifications
            </button>
          )}
          {permission === 'granted' && <p className="text-sm text-muted">Notifications are on for this device.</p>}
          {permission === 'denied' && (
            <p className="text-sm text-muted">Notifications are blocked in your browser settings, so reminders show inside the app.</p>
          )}
          {permission === 'unsupported' && (
            <p className="text-sm text-muted">
              This browser can't show notifications here, so reminders show inside the app. On iPhone, add HUMANOS to your Home
              Screen first.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">Scheduled</p>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted">Nothing scheduled.</p>
            ) : (
              upcoming.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-surface py-1 pr-1 pl-4">
                  <span className="text-sm text-text">
                    {r.title} ·{' '}
                    {new Date(r.at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveReminder(r.id)}
                    className={`h-11 rounded-full px-3 text-sm font-semibold text-text ${focusRing}`}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </Sheet>
      )}

      {sheet === 'reset' && (
        <Sheet title="Reset Sleep?" onClose={() => setSheet(null)}>
          <p className="text-sm leading-relaxed text-text">
            Your plan, morning check ins and sessions on this device will be cleared. You can set Sleep up again from the
            dashboard.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSheet(null)}
              className={`h-11 flex-1 rounded-full border border-border text-sm font-medium text-text ${focusRing}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onResetModule}
              className={`h-11 flex-1 rounded-full bg-cta text-sm font-semibold text-cta-text ${focusRing}`}
            >
              Reset
            </button>
          </div>
        </Sheet>
      )}

      {sheet === 'coming-soon' && (
        <Sheet title="Coming soon" subtitle="This is on its way." onClose={() => setSheet(null)}>
          <PrimaryButton onClick={() => setSheet(null)}>Got it</PrimaryButton>
        </Sheet>
      )}
    </>
  )

  return (
    <Screen header={header} overlay={overlay}>
      <div key={tab} id="sleep-panel" role="tabpanel" aria-labelledby={`sleep-tab-${tab}`} className="animate-fade pt-1 pb-4">
        {content}
      </div>
    </Screen>
  )
}
