import { Info, Plus } from 'lucide-react'
import { Sheet } from '../../components/Sheet'
import { parseClock } from '../../lib/dates'
import type { HydrationActive } from '../../state/appState'
import { DOCTOR_STATUS, MAX_SLOTS } from '../nudges'

type RemindersSheetProps = {
  active: HydrationActive
  sleepLive: boolean
  onChange: (fn: (active: HydrationActive) => HydrationActive) => void
  onToggleReminder: (on: boolean) => void
  onClose: () => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const partOfDay = (time: string) => (parseClock(time) < 12 * 60 ? 'Late morning' : parseClock(time) < 17 * 60 ? 'Afternoon' : 'Early evening')

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: (on: boolean) => void }) {
  return (
    <label className="shrink-0 cursor-pointer">
      <span className="sr-only">{label}</span>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onToggle(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={[
          'relative block h-[31px] w-[51px] rounded-full transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
          on ? 'bg-cta' : 'bg-border',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-sm transition-transform duration-150 motion-reduce:transition-none',
            on ? 'translate-x-[22px]' : 'translate-x-[2px]',
          ].join(' ')}
        />
      </span>
    </label>
  )
}

function Row({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-semibold text-text">{title}</span>
        {sub && <span className="text-sm text-muted">{sub}</span>}
      </span>
      {children}
    </div>
  )
}

export function RemindersSheet({ active, sleepLive, onChange, onToggleReminder, onClose }: RemindersSheetProps) {
  const slots = [...active.slots].sort((a, b) => a.time.localeCompare(b.time))
  const full = slots.length >= MAX_SLOTS
  const setSlots = (next: { time: string; on: boolean }[]) => onChange((a) => ({ ...a, slots: next.sort((x, y) => x.time.localeCompare(y.time)) }))

  if (active.doctorLimit) {
    return (
      <Sheet title="Reminders" subtitle="One status a day while you follow a doctor's limit." onClose={onClose}>
        <div className="rounded-[20px] border border-border bg-surface px-4">
          <Row title={`Daily status at ${DOCTOR_STATUS}`} sub="How much of your limit is left. Never a nudge to drink more.">
            <Switch on={active.reminderOn} label="Daily status" onToggle={onToggleReminder} />
          </Row>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet title="Reminders" subtitle="Only when you're behind pace. Never more than 3 a day." onClose={onClose}>
      <div className="flex flex-col divide-y divide-border rounded-[20px] border border-border bg-surface px-4">
        {slots.map((slot, index) => (
          <div key={`${slot.time}-${index}`} className="flex items-center justify-between gap-3 py-3">
            <label className={`relative flex min-w-0 flex-col rounded-[8px] focus-within:outline focus-within:outline-2 focus-within:outline-accent`}>
              <span className="text-[17px] font-semibold text-text tabular-nums underline decoration-border underline-offset-4">{slot.time}</span>
              <span className="text-sm text-muted">{partOfDay(slot.time)}</span>
              <input
                type="time"
                aria-label={`Change the ${slot.time} reminder`}
                value={slot.time}
                onChange={(e) => e.target.value && setSlots(slots.map((s, i) => (i === index ? { ...s, time: e.target.value } : s)))}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.()
                  } catch {
                    // The native control still works.
                  }
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <Switch on={slot.on} label={`${slot.time} reminder`} onToggle={(on) => setSlots(slots.map((s, i) => (i === index ? { ...s, on } : s)))} />
          </div>
        ))}
        <div className="py-2">
          <button
            type="button"
            disabled={full}
            onClick={() => setSlots([...slots, { time: slots.some((s) => s.time === '17:30') ? '12:00' : '17:30', on: true }])}
            className={`flex h-11 items-center gap-1.5 text-sm font-semibold text-text disabled:cursor-not-allowed disabled:opacity-45 ${focusRing}`}
          >
            <Plus size={15} aria-hidden />
            Add a time
          </button>
          {full && (
            <p className="flex items-start gap-2 pb-2 text-sm text-muted">
              <Info size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden />
              Three a day is the most we send. Turn one off to add another.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-[20px] border border-border bg-surface px-4">
        <Row title="Hot days" sub="Move a nudge earlier instead of adding one">
          <Switch on={active.heat === 'on'} label="Hot days" onToggle={(on) => onChange((a) => ({ ...a, heat: on ? 'on' : 'off' }))} />
        </Row>
        <Row title="Quiet after 20:00" sub={sleepLive ? 'Or 2 hours before lights out' : 'No reminders in the evening'} />
      </div>
    </Sheet>
  )
}
