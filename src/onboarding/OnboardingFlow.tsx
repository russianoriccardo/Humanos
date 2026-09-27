import { useState } from 'react'
import { StepTransition } from '../components/StepTransition'
import { Welcome } from './steps/Welcome'
import { AboutYou } from './steps/AboutYou'
import { Goals } from './steps/Goals'
import { BuildHub } from './steps/BuildHub'
import { AllSet } from './steps/AllSet'
import type { Answers } from './types'

const TOTAL_STEPS = 5

type OnboardingFlowProps = {
  answers: Answers
  onChange: (patch: Partial<Answers>) => void
  onComplete: () => void
}

export function OnboardingFlow({ answers, onChange, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)

  function goNext() {
    setDirection(1)
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1))
  }

  function goBack() {
    setDirection(-1)
    setStep((current) => Math.max(current - 1, 0))
  }

  const stepContent = (() => {
    switch (step) {
      case 0:
        return <Welcome onNext={goNext} />
      case 1:
        return <AboutYou answers={answers} onChange={onChange} onNext={goNext} onBack={goBack} onSkip={goNext} />
      case 2:
        return <Goals answers={answers} onChange={onChange} onNext={goNext} onBack={goBack} onSkip={goNext} />
      case 3:
        return <BuildHub answers={answers} onChange={onChange} onNext={goNext} onBack={goBack} onSkip={goNext} />
      case 4:
        return <AllSet answers={answers} onBack={goBack} onComplete={onComplete} />
      default:
        return null
    }
  })()

  return (
    <StepTransition stepKey={step} direction={direction} fade={step === TOTAL_STEPS - 1}>
      {stepContent}
    </StepTransition>
  )
}
