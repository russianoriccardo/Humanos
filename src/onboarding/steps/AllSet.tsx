import { Check } from 'lucide-react'
import { Screen } from '../../components/Screen'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { Chip } from '../../components/Chip'
import { MODULES } from '../../lib/modules'
import type { Answers } from '../types'

type AllSetProps = {
  answers: Answers
  onBack: () => void
  onComplete: () => void
}

export function AllSet({ answers, onBack, onComplete }: AllSetProps) {
  const selectedModules = MODULES.filter((module) => answers.modules.includes(module.id))

  return (
    <Screen
      step={4}
      totalSteps={5}
      footer={
        <div className="flex flex-col items-center gap-2">
          <PrimaryButton onClick={onComplete}>Enter your hub</PrimaryButton>
          <SecondaryButton onClick={onBack}>Back</SecondaryButton>
          <p className="text-sm text-muted">You can edit modules anytime in Settings.</p>
        </div>
      }
    >
      <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-accent">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-tint">
            <Check size={26} strokeWidth={2.5} className="text-accent" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-[28px] leading-tight font-bold text-text">You're all set, {answers.name}</h1>
          <p className="max-w-[300px] text-base text-muted">
            Your hub is ready with the modules you picked. Your routines start today.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {selectedModules.map((module) => (
            <Chip key={module.id} label={module.name} dot />
          ))}
        </div>
      </div>
    </Screen>
  )
}
