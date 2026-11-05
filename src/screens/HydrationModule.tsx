import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronLeft, Ellipsis, GlassWater } from 'lucide-react'
import { Chip } from '../components/Chip'
import { PrimaryButton } from '../components/PrimaryButton'
import { Screen } from '../components/Screen'
import { SecondaryButton } from '../components/SecondaryButton'
import { SegmentedTabs } from '../components/SegmentedTabs'
import { Sheet } from '../components/Sheet'
import { Toast } from '../components/Toast'
import { CITIES } from '../config'
import { useWeather } from '../state/weather'
import type { AppState, Drink, DrinkLog, HydrationActive, UiState } from '../state/appState'
import { formatLitres } from '../hydration/target'
import { LogSheet } from '../hydration/tabs/LogSheet'
import type { HydrationSheet } from '../hydration/tabs/sheets'
import { TodayTab } from '../hydration/tabs/TodayTab'
import { useHydrationToday } from '../hydration/useHydrationToday'

type TabId = UiState['hydrationTab']

const TABS: { id: TabId; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'guide', label: 'Guide' },
]

type HydrationModuleProps = {
  state: AppState
  tab: TabId
  toast: string | null
  onToastDone: () => void
  onTabChange: (tab: TabId) => void
  onBack: () => void
  onLog: (drink: Drink, ml: number, at?: Date) => void
  onDelete: (id: string) => void
  onEdit: (id: string, patch: Partial<Pick<DrinkLog, 'at' | 'ml' | 'drinkId' | 'name' | 'counts'>>) => void
  onActiveChange: (fn: (active: HydrationActive) => HydrationActive) => void
  onToggleReminder: (on: boolean) => void
  onReset: () => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function HydrationModule({
  state,
  tab,
  toast,
  onToastDone,
  onTabChange,
  onBack,
  onLog,
  onDelete,
  onEdit,
  onActiveChange,
  onToggleReminder,
  onReset,
}: HydrationModuleProps) {
  const today = useHydrationToday(state)
  const weather = useWeather()
  const [sheet, setSheet] = useState<HydrationSheet>(null)
  const close = () => setSheet(null)

  // Each tab starts at the top.
  useEffect(() => {
    document.getElementById('hydration-panel')?.closest('main')?.scrollTo({ top: 0 })
  }, [tab])

  if (!today) return null
  const { active } = today

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
            <GlassWater size={16} strokeWidth={2} aria-hidden />
          </span>
          Hydration
        </h1>
        <button
          type="button"
          aria-label="More options"
          onClick={() => setSheet({ kind: 'menu' })}
          className={`-mr-2.5 flex h-11 w-11 items-center justify-center rounded-full text-text ${focusRing}`}
        >
          <Ellipsis size={22} />
        </button>
      </div>
      <SegmentedTabs tabs={TABS} value={tab} onChange={onTabChange} label="Hydration sections" idPrefix="hydration" />
    </header>
  )

  const editing = sheet?.kind === 'edit' ? Object.values(active.logs).flat().find((l) => l.id === sheet.id) : undefined
  const limit = active.doctorLimit ? { total: today.total, target: today.target } : undefined

  const overlay = (
    <>
      {toast && <Toast message={toast} onDone={onToastDone} />}

      {sheet?.kind === 'log' && (
        <LogSheet
          drinks={active.drinks}
          initialDrinkId={sheet.drinkId}
          limit={limit}
          onClose={close}
          onSave={(drink, ml, at) => {
            close()
            onLog(drink, ml, at)
          }}
        />
      )}

      {sheet?.kind === 'edit' && editing && (
        <LogSheet
          drinks={active.drinks}
          entry={editing}
          limit={limit}
          onClose={close}
          onSave={(drink, ml, at) => {
            close()
            onEdit(editing.id, { drinkId: drink.id, name: drink.name, counts: drink.counts, ml, at: at.toISOString() })
          }}
          onDelete={() => {
            close()
            onDelete(editing.id)
          }}
        />
      )}

      {sheet?.kind === 'why' && (
        <Sheet
          title={`Why ${formatLitres(today.target)} today`}
          subtitle={`Adjustments reset at 04:00. Your usual target stays ${formatLitres(today.base)}.`}
          onClose={close}
        >
          <ul className="flex flex-col divide-y divide-border rounded-[20px] border border-border bg-surface px-4">
            <li className="flex items-center justify-between gap-3 py-3 text-[15px] text-text">
              <span>Your daily target</span>
              <span className="font-semibold">{formatLitres(today.base)}</span>
            </li>
            {today.adj.items.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 py-3">
                <span className="flex flex-col">
                  <span className="text-[15px] text-text">{item.label}</span>
                  <span className="text-sm text-muted">{item.sub}</span>
                </span>
                <span className="text-[15px] font-semibold text-accent-text">+{item.ml} ml</span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 py-3 text-[15px] font-bold text-text">
              <span>Today</span>
              <span>{formatLitres(today.target)}</span>
            </li>
          </ul>
          <div className="flex flex-col items-center gap-2">
            <PrimaryButton onClick={close}>Got it</PrimaryButton>
            <SecondaryButton
              onClick={() => {
                close()
                onActiveChange((a) => ({ ...a, notToday: [...a.notToday.filter((d) => d >= today.day), today.day] }))
              }}
            >
              Not today, keep {formatLitres(today.base)}
            </SecondaryButton>
            <button
              type="button"
              onClick={() => setSheet({ kind: 'reminders' })}
              className={`h-11 text-sm font-semibold text-text underline underline-offset-2 ${focusRing}`}
            >
              Hot day settings
            </button>
          </div>
        </Sheet>
      )}

      {sheet?.kind === 'city' && (
        <Sheet title="Set my city" subtitle="Used only for the temperature near you." onClose={close}>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((city) => (
              <Chip
                key={city.name}
                variant="soft"
                label={city.name}
                selected={state.ui.locationChoice === 'city' && state.ui.city === city.name}
                onClick={() => {
                  weather.useCity(city.name)
                  onActiveChange((a) => ({ ...a, heat: 'on' }))
                  close()
                }}
              />
            ))}
          </div>
        </Sheet>
      )}

      {/* The menu and the reminders sheet are filled in with the Guide step. */}
      {sheet?.kind === 'menu' && (
        <Sheet title="Hydration" onClose={close}>
          <button
            type="button"
            onClick={() => setSheet({ kind: 'reset' })}
            className={`flex h-12 items-center rounded-[16px] border border-border bg-surface px-4 text-left text-[15px] font-semibold text-warning ${focusRing}`}
          >
            Reset Hydration
          </button>
        </Sheet>
      )}
      {sheet?.kind === 'reset' && (
        <Sheet title="Reset Hydration?" onClose={close}>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-warning-tint text-warning">
              <AlertTriangle size={20} aria-hidden />
            </span>
            <p className="text-sm leading-normal text-text">
              This deletes your Hydration logs, drinks and reminders, and takes you back to setup. Your other modules and your Guide saves
              stay as they are.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className={`h-14 w-full rounded-full bg-warning text-base font-semibold text-white ${focusRing}`}
            >
              Reset Hydration
            </button>
            <SecondaryButton onClick={close}>Cancel</SecondaryButton>
          </div>
        </Sheet>
      )}
      {sheet?.kind === 'reminders' && (
        <Sheet title="Reminders" subtitle="Only when you're behind pace. Never more than 3 a day." onClose={close}>
          <p className="text-sm text-muted">Reminder settings are on their way.</p>
        </Sheet>
      )}
    </>
  )

  return (
    <Screen header={header} overlay={overlay}>
      <div key={tab} id="hydration-panel" role="tabpanel" aria-labelledby={`hydration-tab-${tab}`} className="animate-fade pt-1 pb-4">
        {tab === 'today' ? (
          <TodayTab
            state={state}
            today={today}
            onLog={onLog}
            onDelete={onDelete}
            onActiveChange={onActiveChange}
            onToggleReminder={onToggleReminder}
            onOpenSheet={setSheet}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-base font-semibold text-text">Coming next</p>
            <p className="text-sm text-muted">The Guide is on its way.</p>
          </div>
        )}
      </div>
    </Screen>
  )
}
