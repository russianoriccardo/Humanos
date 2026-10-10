import { useState } from 'react'
import { X } from 'lucide-react'
import { SelectableRow } from './SelectableRow'
import { SCENARIO_LABELS } from '../services/health.mock'
import type { DemoState } from '../state/appState'
import type { HealthScenario } from '../skincare/engine/types'

type DemoPanelProps = {
  demo: DemoState
  canJumpCycle: boolean
  onChange: (patch: Partial<DemoState>) => void
  onJumpCycle: () => void
  onReset: () => void
  onClose: () => void
}

const SCENARIOS = Object.keys(SCENARIO_LABELS) as HealthScenario[]

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Label({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

export function DemoPanel({ demo, canJumpCycle, onChange, onJumpCycle, onReset, onClose }: DemoPanelProps) {
  const [confirmReset, setConfirmReset] = useState(false)
  const [jumped, setJumped] = useState(false)
  const timeInput =
    'h-11 w-full rounded-[14px] border border-border bg-surface px-3 text-base text-text focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none'

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-panel/40" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Demo panel"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88%] flex-col rounded-t-[28px] border-t border-border bg-bg"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <div>
            <p className="text-base font-semibold text-text">Demo panel</p>
            <p className="text-sm text-muted">For demos only — users never see this.</p>
          </div>
          <button
            type="button"
            aria-label="Close demo panel"
            onClick={onClose}
            className={`flex h-11 w-11 items-center justify-center rounded-full text-text ${focusRing}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 pt-2 pb-8">
          <section className="flex flex-col gap-2">
            <Label>Health scenario (mock)</Label>
            {SCENARIOS.map((id) => (
              <SelectableRow
                key={id}
                tone="tinted"
                title={SCENARIO_LABELS[id].title}
                description={SCENARIO_LABELS[id].detail}
                selected={demo.scenario === id}
                onClick={() => onChange({ scenario: id })}
              />
            ))}
          </section>

          <section className="flex flex-col gap-2">
            <Label>Fake outdoor window</Label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm text-muted">
                From
                <input
                  type="time"
                  value={demo.outdoorWindow.start}
                  onChange={(e) => e.target.value && onChange({ outdoorWindow: { ...demo.outdoorWindow, start: e.target.value } })}
                  className={timeInput}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-muted">
                To
                <input
                  type="time"
                  value={demo.outdoorWindow.end}
                  onChange={(e) => e.target.value && onChange({ outdoorWindow: { ...demo.outdoorWindow, end: e.target.value } })}
                  className={timeInput}
                />
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <Label>Scan cycle</Label>
            <button
              type="button"
              disabled={!canJumpCycle}
              onClick={() => {
                onJumpCycle()
                setJumped(true)
              }}
              className={`h-11 rounded-full border border-border bg-surface px-4 text-sm font-medium text-text disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
            >
              {jumped ? 'Jumped to day 14 ✓' : 'Jump scan cycle to day 14'}
            </button>
            {!canJumpCycle && <p className="text-sm text-muted">Set up Skincare first.</p>}
          </section>

          <section className="flex flex-col gap-2">
            <Label>Reset</Label>
            {confirmReset ? (
              <div className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-4">
                <p className="text-sm text-text">Clears every answer on this device and restarts onboarding.</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className={`h-11 flex-1 rounded-full border border-border text-sm font-medium text-text ${focusRing}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={onReset}
                    className={`h-11 flex-1 rounded-full bg-cta text-sm font-semibold text-cta-text ${focusRing}`}
                  >
                    Reset
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className={`h-11 rounded-full border border-border bg-surface px-4 text-sm font-medium text-text ${focusRing}`}
              >
                Reset demo
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
