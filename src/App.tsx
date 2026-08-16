import { OnboardingFlow } from './onboarding/OnboardingFlow'
import type { Answers } from './onboarding/types'

function App() {
  function handleComplete(answers: Answers) {
    console.log('onboarding complete', answers)
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-neutral-200 p-0 sm:p-6 dark:bg-neutral-950">
      <div className="h-dvh w-full overflow-hidden bg-bg sm:h-[844px] sm:max-w-[430px] sm:rounded-[40px] sm:shadow-2xl sm:ring-1 sm:ring-black/5">
        <OnboardingFlow onComplete={handleComplete} />
      </div>
    </div>
  )
}

export default App
