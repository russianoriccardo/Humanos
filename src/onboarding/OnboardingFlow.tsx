import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Welcome } from './steps/Welcome'
import { AboutYou } from './steps/AboutYou'
import { Goals } from './steps/Goals'
import { BuildHub } from './steps/BuildHub'
import { AllSet } from './steps/AllSet'
import { initialAnswers, type Answers } from './types'

const STORAGE_KEY = 'humanos.onboarding'
const TOTAL_STEPS = 5

function loadAnswers(): Answers {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialAnswers
    return { ...initialAnswers, ...JSON.parse(raw) }
  } catch {
    return initialAnswers
  }
}

type AnimatedStepProps = {
  stepKey: number
  direction: number
  isFinal: boolean
  children: ReactNode
}

function AnimatedStep({ stepKey, direction, isFinal, children }: AnimatedStepProps) {
  const [style, setStyle] = useState<CSSProperties>({
    transform: isFinal ? 'none' : `translateX(${direction * 100}%)`,
    opacity: 0,
  })

  useLayoutEffect(() => {
    setStyle({
      transform: isFinal ? 'none' : `translateX(${direction * 100}%)`,
      opacity: 0,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey])

  useEffect(() => {
    setStyle({ transform: 'translateX(0)', opacity: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey])

  return (
    <div key={stepKey} className="onboarding-step h-full transition-[transform,opacity] duration-300 ease-out" style={style}>
      {children}
    </div>
  )
}

type OnboardingFlowProps = {
  onComplete: (answers: Answers) => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [answers, setAnswers] = useState<Answers>(loadAnswers)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers))
  }, [answers])

  function updateAnswers(patch: Partial<Answers>) {
    setAnswers((current) => ({ ...current, ...patch }))
  }

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
        return (
          <AboutYou answers={answers} onChange={updateAnswers} onNext={goNext} onBack={goBack} onSkip={goNext} />
        )
      case 2:
        return <Goals answers={answers} onChange={updateAnswers} onNext={goNext} onBack={goBack} onSkip={goNext} />
      case 3:
        return (
          <BuildHub answers={answers} onChange={updateAnswers} onNext={goNext} onBack={goBack} onSkip={goNext} />
        )
      case 4:
        return <AllSet answers={answers} onBack={goBack} onComplete={() => onComplete(answers)} />
      default:
        return null
    }
  })()

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatedStep stepKey={step} direction={direction} isFinal={step === TOTAL_STEPS - 1}>
        {stepContent}
      </AnimatedStep>
    </div>
  )
}
