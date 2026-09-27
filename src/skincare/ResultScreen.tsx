import { Screen } from '../components/Screen'
import { PrimaryButton } from '../components/PrimaryButton'
import { HintCard } from '../components/HintCard'
import type { SkincareSetup } from '../state/appState'
import { SkincareBadge } from './SkincareBadge'
import { branchOf } from './catalog'
import { buildReading, buildRoutine, readingHeadline } from './reading'

type ResultScreenProps = {
  setup: SkincareSetup
  onBack: () => void
  onDone: () => void
}

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

export function ResultScreen({ setup, onBack, onDone }: ResultScreenProps) {
  const scanned = setup.scan?.status === 'ok' && !!setup.scan.reading
  const reading = setup.scan?.reading ?? buildReading(setup, null)
  const routine = buildRoutine(setup)
  const isA = branchOf(setup.hasRoutine) === 'A'
  const spfGap = reading.gap.startsWith('No SPF')

  return (
    <Screen onBack={onBack} showThemeToggle={false} footer={<PrimaryButton onClick={onDone}>Go to my hub</PrimaryButton>}>
      <div className="flex flex-col gap-6 pt-2">
        <div className="flex flex-col items-start gap-3">
          <SkincareBadge label="Skincare · ready" />
          <h1 className="text-[26px] leading-tight font-bold whitespace-pre-line text-text">{readingHeadline(reading)}</h1>
          <p className="text-base text-muted">
            {scanned ? 'Built from your answers and your photo.' : 'Built from your answers and your goal.'}
          </p>
        </div>

        <section className="flex flex-col gap-4 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
          <div className="flex flex-col gap-1">
            <Eyebrow>Strength</Eyebrow>
            <p className="text-base leading-relaxed text-text">{reading.strength}</p>
          </div>
          <div className="h-px bg-border" />
          <div className="flex flex-col gap-1">
            <Eyebrow>Gap</Eyebrow>
            <p className="text-base leading-relaxed text-text">{reading.gap}</p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <Eyebrow>{isA ? 'Your first routine' : 'Your starter routine'}</Eyebrow>
          <ol className="flex flex-col gap-3">
            {routine.map((step, index) => (
              <li key={step.product} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tint text-sm font-semibold text-text">
                  {index + 1}
                </span>
                <span className="text-base text-text">
                  <span className="font-semibold">{step.product}</span>
                  <span className="text-muted"> · {step.timing}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <HintCard eyebrow="Smart suggestions">
          {isA
            ? `As HUMANOS learns your skin, you'll get product picks matched to it — starting with ${spfGap ? 'that SPF gap' : 'the gap above'}.`
            : 'You own nothing yet — so these picks are the first three to buy, matched to your skin.'}
        </HintCard>
      </div>
    </Screen>
  )
}
