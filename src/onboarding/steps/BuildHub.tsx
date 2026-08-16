import { Screen } from '../../components/Screen'
import { PrimaryButton } from '../../components/PrimaryButton'
import { ModuleCard } from '../../components/ModuleCard'
import { MODULES, MODULE_ICONS, suggestedModuleIds } from '../../lib/modules'
import type { Answers } from '../types'

type BuildHubProps = {
  answers: Answers
  onChange: (patch: Partial<Answers>) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export function BuildHub({ answers, onChange, onNext, onBack, onSkip }: BuildHubProps) {
  const suggested = suggestedModuleIds(answers.goals)

  function toggleModule(moduleId: string) {
    if (answers.modules.includes(moduleId)) {
      onChange({ modules: answers.modules.filter((id) => id !== moduleId) })
    } else {
      onChange({ modules: [...answers.modules, moduleId] })
    }
  }

  const count = answers.modules.length

  return (
    <Screen
      step={3}
      totalSteps={5}
      onBack={onBack}
      onSkip={onSkip}
      footer={
        <PrimaryButton onClick={onNext} disabled={count === 0}>
          {count === 0 ? 'Continue' : `Continue · ${count} module${count === 1 ? '' : 's'}`}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-tight font-bold text-text">Build your hub</h1>
          <p className="text-base text-muted">These become your dashboard. Change anytime.</p>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {MODULES.map((module) => (
            <ModuleCard
              key={module.id}
              name={module.name}
              icon={MODULE_ICONS[module.id]}
              selected={answers.modules.includes(module.id)}
              suggested={suggested.includes(module.id)}
              onClick={() => toggleModule(module.id)}
            />
          ))}
        </div>
      </div>
    </Screen>
  )
}
