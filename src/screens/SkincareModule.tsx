import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BellRing, ChevronLeft, Droplet, Ellipsis, PencilLine, RotateCcw, Trash2 } from 'lucide-react'
import { Screen } from '../components/Screen'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { Sheet } from '../components/Sheet'
import { Toast } from '../components/Toast'
import { notificationPermission, requestPermission, type PermissionState } from '../services/reminders'
import type { AppState, SkincareActive, UiState } from '../state/appState'
import type { Tip } from '../skincare/engine/types'
import { TodayTab } from '../skincare/tabs/TodayTab'

type TabId = UiState['skincareTab']

const TABS: { id: TabId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yoga', label: 'Face yoga' },
  { id: 'progress', label: 'Progress' },
  { id: 'ask', label: 'Ask AI' },
]

export type ModuleTabRender = (tab: TabId) => { content: ReactNode; footer?: ReactNode } | null

type SkincareModuleProps = {
  state: AppState
  tab: TabId
  toast: string | null
  hasScanPhotos: boolean
  onToastDone: () => void
  onTabChange: (tab: TabId) => void
  onBack: () => void
  onActiveChange: (fn: (active: SkincareActive) => SkincareActive) => void
  onRemind: (tip: Tip) => void
  onRemoveReminder: (id: string) => void
  onEditRoutine: () => void
  onResetModule: () => void
  onDeletePhotos: () => void
  // Tabs built in other files (Face yoga, Progress, Ask AI).
  renderTab?: ModuleTabRender
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

type SheetKind = 'notifications' | 'reset' | 'delete-photos' | null

export function SkincareModule({
  state,
  tab,
  toast,
  hasScanPhotos,
  onToastDone,
  onTabChange,
  onBack,
  onActiveChange,
  onRemind,
  onRemoveReminder,
  onEditRoutine,
  onResetModule,
  onDeletePhotos,
  renderTab,
}: SkincareModuleProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [permission, setPermission] = useState<PermissionState>(notificationPermission)
  const menuRef = useRef<HTMLDivElement>(null)

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
    document.getElementById('skincare-panel')?.closest('main')?.scrollTo({ top: 0 })
  }, [tab])

  const custom = tab === 'today' ? null : renderTab?.(tab)
  const content =
    tab === 'today' ? (
      <TodayTab state={state} onActiveChange={onActiveChange} onRemind={onRemind} />
    ) : (
      (custom?.content ?? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-base font-semibold text-text">Coming next</p>
          <p className="text-sm text-muted">This tab is on its way.</p>
        </div>
      ))
    )

  function menuItem(label: string, Icon: typeof Droplet, onClick: () => void) {
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
            <Droplet size={16} strokeWidth={2} aria-hidden />
          </span>
          Skincare
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
              {menuItem('Edit routine', PencilLine, onEditRoutine)}
              {menuItem('Notifications', BellRing, () => setSheet('notifications'))}
              {hasScanPhotos && menuItem('Delete scan photos', Trash2, () => setSheet('delete-photos'))}
              {menuItem('Reset module', RotateCcw, () => setSheet('reset'))}
            </div>
          )}
        </div>
      </div>
      <SegmentedTabs tabs={TABS} value={tab} onChange={onTabChange} label="Skincare sections" idPrefix="skincare" />
    </header>
  )

  const upcoming = state.ui.reminders.filter((r) => Date.parse(r.at) > Date.now())

  const overlay = (
    <>
      {toast && <Toast message={toast} onDone={onToastDone} />}

      {sheet === 'notifications' && (
        <Sheet title="Notifications" subtitle="Reminders for SPF and your next scan." onClose={() => setSheet(null)}>
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
        <Sheet title="Reset Skincare?" onClose={() => setSheet(null)}>
          <p className="text-sm leading-relaxed text-text">
            Your routine, logs, scans, saved scan photos and product checks on this device will be cleared. You can set
            Skincare up again from the dashboard.
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

      {sheet === 'delete-photos' && (
        <Sheet title="Delete scan photos?" onClose={() => setSheet(null)}>
          <p className="text-sm leading-relaxed text-text">
            Removes every scan photo saved on this device. Your readings and progress stay.
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
              onClick={() => {
                onDeletePhotos()
                setSheet(null)
              }}
              className={`h-11 flex-1 rounded-full bg-cta text-sm font-semibold text-cta-text ${focusRing}`}
            >
              Delete
            </button>
          </div>
        </Sheet>
      )}
    </>
  )

  return (
    <Screen header={header} footer={custom?.footer} overlay={overlay}>
      <div
        key={tab}
        id="skincare-panel"
        role="tabpanel"
        aria-labelledby={`skincare-tab-${tab}`}
        className="animate-fade pt-1 pb-4"
      >
        {content}
      </div>
    </Screen>
  )
}
