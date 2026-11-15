import { Screen } from '../../components/Screen'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { ModuleCard } from '../../components/ModuleCard'
import { useState } from 'react'
import { HintCard } from '../../components/HintCard'
import { MAX_FREE_MODULES, MODULES, MODULE_ICONS, suggestedModuleIds, toggleModuleWithCap } from '../../lib/modules'
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

  const [limitHit, setLimitHit] = useState(false)
  const count = answers.modules.length
  const atCap = count >= MAX_FREE_MODULES

  function toggleModule(moduleId: string) {
    const { next, hitCap } = toggleModuleWithCap(answers.modules, moduleId)
    if (hitCap) setLimitHit(true)
    else if (next.length < MAX_FREE_MODULES) setLimitHit(false)
    onChange({ modules: next })
  }

  return (
    <Screen
      step={3}
      totalSteps={5}
      onBack={onBack}
      onSkip={onSkip}
      footer={
        <div className="flex flex-col items-center gap-2">
          <PrimaryButton onClick={onNext} disabled={count === 0}>
            {count === 0 ? 'Continue' : `Continue · ${count} module${count === 1 ? '' : 's'}`}
          </PrimaryButton>
          <SecondaryButton onClick={onBack}>Back</SecondaryButton>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-tight font-bold text-text">Build your hub</h1>
          <div className="flex items-center justify-between gap-3">
            <p className="text-base text-muted">Pick up to 3. Add more anytime.</p>
            <p className={['shrink-0 text-sm', atCap ? 'text-accent-text' : 'text-muted'].join(' ')}>
              {count} / {MAX_FREE_MODULES} selected
            </p>
          </div>
        </div>

        {/* Always in the page (empty, gap cancelled) so screen readers announce the hint when it appears. */}
        <div id="module-cap-hint" aria-live="polite" className={limitHit ? 'animate-fade' : '-mt-6'}>
          {limitHit && (
            <HintCard>
              <span className="block font-semibold">Three is the best place to start.</span>
              Each module takes a minute to set up, and three you use beat six you don't. You can add more from your dashboard
              anytime.
            </HintCard>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {MODULES.map((module) => (
            <ModuleCard
              key={module.id}
              name={module.name}
              icon={MODULE_ICONS[module.id]}
              selected={answers.modules.includes(module.id)}
              suggested={suggested.includes(module.id)}
              dimmed={atCap}
              describedBy={answers.modules.includes(module.id) ? undefined : 'module-cap-hint'}
              onClick={() => toggleModule(module.id)}
            />
          ))}
        </div>
      </div>
    </Screen>
  )
}
