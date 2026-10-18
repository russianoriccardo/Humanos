import { useState } from 'react'
import { Check } from 'lucide-react'
import { HintCard } from '../../components/HintCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { Screen } from '../../components/Screen'
import { Sheet } from '../../components/Sheet'
import { requestPermission } from '../../services/reminders'
import type { Reminder, SleepSetup } from '../../state/appState'
import { buildMirror, sleepReminders } from '../plan'
import { SleepBadge } from './SleepBadge'

type MirrorStepProps = {
  setup: SleepSetup
  onBack: () => void
  // The reminders to schedule (empty when notifications are off).
  onDone: (reminders: Reminder[]) => void
}

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

export function MirrorStep({ setup, onBack, onDone }: MirrorStepProps) {
  const mirror = buildMirror(setup)
  // null until the CTA is tapped; then the reminders that will be scheduled.
  const [reminders, setReminders] = useState<Reminder[] | null>(null)
  const [deniedOpen, setDeniedOpen] = useState(false)
  const [asking, setAsking] = useState(false)

  async function setForTonight() {
    if (asking) return
    setAsking(true)
    const permission = await requestPermission()
    setAsking(false)
    if (permission === 'granted' || permission === 'unsupported') {
      setReminders(sleepReminders(mirror.lightsOut, setup.wake ?? '07:00'))
    } else setDeniedOpen(true)
  }

  return (
    <Screen
      onBack={onBack}
      showThemeToggle={false}
      footer={
        reminders ? (
          <PrimaryButton onClick={() => onDone(reminders)}>Go to my hub</PrimaryButton>
        ) : (
          <PrimaryButton onClick={setForTonight} aria-busy={asking}>
            {mirror.firstStep.cta}
          </PrimaryButton>
        )
      }
      overlay={
        deniedOpen && (
          <Sheet
            title="Reminders are off"
            subtitle={`Notifications for HUMANOS are turned off, so the ${mirror.nudgeAt} nudge can't reach you. Your plan still works without it.`}
            onClose={() => setDeniedOpen(false)}
          >
            <div className="flex flex-col items-center gap-2">
              <PrimaryButton onClick={() => setDeniedOpen(false)}>Turn on in Settings</PrimaryButton>
              <SecondaryButton
                onClick={() => {
                  setDeniedOpen(false)
                  onDone([])
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
          <SleepBadge label="Sleep · ready" />
          <h1 className="text-[26px] leading-tight font-bold text-text">{mirror.headline}</h1>
          <p className="text-base text-muted">{mirror.subtitle}</p>
        </div>

        <section className="flex flex-col gap-4 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
          <div className="flex flex-col gap-1">
            <Eyebrow>Strength</Eyebrow>
            <p className="text-base leading-relaxed text-text">{mirror.strength}</p>
          </div>
          <div className="h-px bg-border" />
          <div className="flex flex-col gap-1">
            <Eyebrow>Gap</Eyebrow>
            <p className="text-base leading-relaxed text-text">{mirror.gap}</p>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-[20px] border border-border bg-surface p-5">
          <Eyebrow>Your first step</Eyebrow>
          <p className="text-[44px] leading-none font-bold text-text">{mirror.firstStep.time}</p>
          <p className="text-base leading-relaxed text-text">{mirror.firstStep.body}</p>
        </section>

        {reminders && reminders.length > 0 ? (
          <p role="status" className="flex items-start gap-2 rounded-[20px] bg-tint p-4 text-sm text-text">
            <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            Set. We'll nudge you at {mirror.nudgeAt} to start winding down.
          </p>
        ) : (
          <HintCard>We'll nudge you at {mirror.nudgeAt} to start winding down.</HintCard>
        )}
      </div>
    </Screen>
  )
}
