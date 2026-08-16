import { Screen } from '../../components/Screen'
import { PrimaryButton } from '../../components/PrimaryButton'

type WelcomeProps = {
  onNext: () => void
}

function LogoMark() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="36" className="stroke-text" strokeWidth="1.5" />
      <circle cx="48" cy="12" r="3" className="fill-accent" />
      <path
        d="M48,28 C39,37 39,59 48,68 C57,59 57,37 48,28 Z"
        className="stroke-accent"
        strokeWidth="1.5"
        fill="none"
      />
      <line x1="48" y1="28" x2="48" y2="68" className="stroke-accent" strokeWidth="1.5" />
    </svg>
  )
}

export function Welcome({ onNext }: WelcomeProps) {
  return (
    <Screen
      step={0}
      totalSteps={5}
      footer={
        <div className="flex flex-col items-center gap-3">
          <PrimaryButton onClick={onNext}>Start</PrimaryButton>
          <p className="text-sm text-muted">Takes less than a minute</p>
        </div>
      }
    >
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <LogoMark />

        <div className="mt-2 flex flex-col items-center gap-2">
          <p className="text-2xl font-semibold tracking-[4px] text-text">HUMANOS</p>
          <p className="text-[10px] font-medium tracking-[3px] text-accent uppercase">
            Biohack your best self
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <h1 className="text-[30px] leading-[1.15] font-bold text-text">
            Your glow up
            <br />
            starts here
          </h1>
          <p className="max-w-[300px] text-base text-muted">
            Skin, cycle, teeth, food, sleep — everything your body needs, in one calm place.
          </p>
        </div>
      </div>
    </Screen>
  )
}
