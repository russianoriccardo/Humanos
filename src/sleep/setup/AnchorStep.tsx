import { PrimaryButton } from '../../components/PrimaryButton'
import { SelectableRow } from '../../components/SelectableRow'
import { StepTitle } from '../../skincare/StepTitle'
import type { SleepAnchor } from '../../state/appState'
import { SleepStepScreen } from './SleepStepScreen'
import type { SleepStepProps } from './types'

const OPTIONS: { id: SleepAnchor; title: string; description: string }[] = [
  { id: 'well', title: 'Well', description: 'I usually wake up rested' },
  { id: 'fine', title: 'Fine, could be better', description: "Some nights work, some don't" },
  { id: 'badly', title: 'Badly', description: 'I rarely wake up rested' },
]

export function AnchorStep({ setup, onChange, onNext, onBack }: SleepStepProps) {
  return (
    <SleepStepScreen
      step={1}
      onBack={onBack}
      onSkip={() => {
        onChange({ anchor: null })
        onNext()
      }}
      footer={
        <PrimaryButton onClick={onNext} disabled={setup.anchor === null}>
          Continue
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-6">
        <StepTitle title="How do you sleep, most nights?" subtitle="Your gut feeling is enough. Your nights will fill in the details." />
        <div className="flex flex-col gap-3">
          {OPTIONS.map((option) => (
            <SelectableRow
              key={option.id}
              tone="tinted"
              title={option.title}
              description={option.description}
              selected={setup.anchor === option.id}
              onClick={() => onChange({ anchor: option.id })}
            />
          ))}
        </div>
      </div>
    </SleepStepScreen>
  )
}
