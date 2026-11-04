import { useState } from 'react'
import { Check } from 'lucide-react'
import { HintCard } from '../../components/HintCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { requestPermission } from '../../services/reminders'
import type { HydrationSetup, Reminder } from '../../state/appState'
import { hydrationDay } from '../day'
import { buildMirror, createHydrationActive } from '../mirror'
import { hydrationReminders } from '../nudges'
import { DEFAULT_TARGET } from '../target'
import { HydrationBadge } from './HydrationStepScreen'

type MirrorStepProps = {
  setup: HydrationSetup
  wake: string
  quiet: string
  importedDays: number
  onBack: () => void
  // Reminders to schedule today, and whether reminders are on at all.
  onDone: (reminders: Reminder[], reminderOn: boolean) => void
}

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

export function MirrorStep({ setup, wake, quiet, importedDays, onBack, onDone }: MirrorStepProps) {
  const [now] = useState(() => new Date())
  const mirror = buildMirror(setup, { now, wake, quiet, importedDays })
  // null until the CTA is tapped; then today's reminders (none when day 1 is tomorrow).
  const [reminders, setReminders] = useState<Reminder[] | null>(null)
  const [deniedOpen, setDeniedOpen] = useState(false)
  const [asking, setAsking] = useState(false)

  async function setReminder() {
    if (asking) return
    setAsking(true)
    const permission = await requestPermission()
    setAsking(false)
    if (permission === 'granted' || permission === 'unsupported') {
      const active = createHydrationActive(setup, true, now, { wake })
      const day = hydrationDay(now)
      setReminders(
        mirror.firstStep.tomorrow ? [] : hydrationReminders(active, day, now, { target: setup.targetMl ?? DEFAULT_TARGET, quiet, hot: false }),
      )
    } else setDeniedOpen(true)
  }

  return (
    <Screen
      onBack={onBack}
      showThemeToggle={false}
      footer={
        reminders ? (
          <PrimaryButton onClick={() => onDone(reminders, true)}>Go to my hub</PrimaryButton>
        ) : (
          <PrimaryButton onClick={setReminder} aria-busy={asking}>
            {mirror.firstStep.cta}
          </PrimaryButton>
        )
      }
      overlay={
        deniedOpen && (
          <Sheet
            title="Reminders are off"
            subtitle={`Notifications for HUMANOS are turned off, so the ${mirror.firstStep.time} nudge can't reach you. Logging still works without it.`}
            onClose={() => setDeniedOpen(false)}
          >
            <div className="flex flex-col items-center gap-2">
              <PrimaryButton onClick={() => setDeniedOpen(false)}>Turn on in Settings</PrimaryButton>
              <SecondaryButton
                onClick={() => {
                  setDeniedOpen(false)
                  onDone([], false)
                }}
              >
                I'll remember myself
              </SecondaryButton>
            </div>
          </Sheet>
        )
      }
    >
      <div className="flex flex-col gap-6 pt-2">
        <div className="flex flex-col items-start gap-3">
          <HydrationBadge label="Hydration · ready" />
          <h1 className="text-[28px] leading-tight font-bold text-text">{mirror.headline}</h1>
          <p className="text-base text-muted">{mirror.sub}</p>
        </div>

        <section className="flex flex-col gap-4 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
          <div className="flex flex-col gap-1">
            <Eyebrow>Strength</Eyebrow>
            <p className="text-base leading-relaxed text-text">{mirror.strength}</p>
          </div>
          <div className="h-px bg-border" />
          <div className="flex flex-col gap-1">
            <Eyebrow>{mirror.gapLabel}</Eyebrow>
            <p className="text-base leading-relaxed text-text">{mirror.gap}</p>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-[20px] border border-border bg-surface p-5">
          <Eyebrow>Your first step</Eyebrow>
          <p className="text-[44px] leading-none font-bold tracking-[-1px] text-text">{mirror.firstStep.time}</p>
          <p className="text-base font-semibold text-text">{mirror.firstStep.a}</p>
          <p className="text-base leading-relaxed text-muted">{mirror.firstStep.b}</p>
        </section>

        {reminders ? (
          <p role="status" className="flex items-start gap-2 rounded-[20px] bg-tint p-4 text-sm text-text">
            <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            Set. First nudge at {mirror.firstStep.time}.
          </p>
        ) : (
          <HintCard>{mirror.hint}</HintCard>
        )}
      </div>
    </Screen>
  )
}
