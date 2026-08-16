import { Screen } from '../../components/Screen'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SelectableRow } from '../../components/SelectableRow'
import { GOALS } from '../../lib/modules'
import type { Answers } from '../types'

const MAX_GOALS = 3

type GoalsProps = {
  answers: Answers
  onChange: (patch: Partial<Answers>) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export function Goals({ answers, onChange, onNext, onBack, onSkip }: GoalsProps) {
  const atCap = answers.goals.length >= MAX_GOALS

  function toggleGoal(goalId: string) {
    if (answers.goals.includes(goalId)) {
      onChange({ goals: answers.goals.filter((id) => id !== goalId) })
    } else if (!atCap) {
      onChange({ goals: [...answers.goals, goalId] })
    }
  }

  return (
    <Screen
      step={2}
      totalSteps={5}
      onBack={onBack}
      onSkip={onSkip}
      footer={
        <PrimaryButton onClick={onNext} disabled={answers.goals.length === 0}>
          Continue
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-tight font-bold text-text">
            What do you want to glow up?
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-base text-muted">Pick maximum 3.</p>
            <p className="text-sm text-muted">{answers.goals.length} / {MAX_GOALS} selected</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {GOALS.map((goal) => {
            const selected = answers.goals.includes(goal.id)
            return (
              <SelectableRow
                key={goal.id}
                title={goal.title}
                description={goal.description}
                selected={selected}
                onClick={() => toggleGoal(goal.id)}
                disabled={!selected && atCap}
              />
            )
          })}
        </div>
      </div>
    </Screen>
  )
}
