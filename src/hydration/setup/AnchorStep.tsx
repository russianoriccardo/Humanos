import { HintCard } from '../../components/HintCard'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SelectableRow } from '../../components/SelectableRow'
import { StepTitle } from '../../skincare/StepTitle'
import type { HydrationAnchor } from '../../state/appState'
import { HydrationStepScreen } from './HydrationStepScreen'
import { totalSteps, type HydrationStepProps } from './steps'

const OPTIONS: { id: HydrationAnchor; title: string; description: string }[] = [
  { id: 'track', title: 'I track it', description: 'An app, or a bottle with marks' },
  { id: 'roughly', title: 'Roughly, in my head', description: "I have a sense, I don't count" },
  { id: 'notAtAll', title: 'Not at all', description: 'I drink when I remember' },
]

export function AnchorStep({ setup, onChange, onNext, onBack }: HydrationStepProps) {
  // Apple Health is only asked of trackers: switching away drops an earlier answer.
  const pick = (anchor: HydrationAnchor | null) =>
    onChange(anchor === 'track' ? { anchor } : { anchor, health: null, healthAvgMl: null })

  return (
    <HydrationStepScreen
      step={1}
      total={totalSteps(setup)}
      onBack={onBack}
      onSkip={() => {
        pick(null)
        onNext()
      }}
      footer={
        <PrimaryButton onClick={onNext} disabled={setup.anchor === null}>
          Continue
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-6">
        <StepTitle title="Do you keep an eye on how much you drink?" subtitle="No right answer. It sets how often we check in." />
        <div className="flex flex-col gap-3">
          {OPTIONS.map((option) => (
            <SelectableRow
              key={option.id}
              tone="tinted"
              title={option.title}
              description={option.description}
              selected={setup.anchor === option.id}
              onClick={() => pick(option.id)}
            />
          ))}
        </div>
        {setup.anchor === 'track' && (
          <HintCard>You track already, so next we can bring in your history from Apple Health. One extra step.</HintCard>
        )}
      </div>
    </HydrationStepScreen>
  )
}
