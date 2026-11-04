import type { ReactNode } from 'react'
import { GlassWater } from 'lucide-react'
import { Screen } from '../../components/Screen'

export function HydrationBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-tint px-3 text-[11px] font-semibold tracking-[1.5px] whitespace-nowrap text-text uppercase">
      <GlassWater size={13} strokeWidth={2} className="text-accent" aria-hidden />
      {label}
    </span>
  )
}

type HydrationStepScreenProps = {
  step: number
  total: number
  onBack: () => void
  onSkip?: () => void
  footer: ReactNode
  overlay?: ReactNode
  children: ReactNode
}

export function HydrationStepScreen({ step, total, onBack, onSkip, footer, overlay, children }: HydrationStepScreenProps) {
  return (
    <Screen
      center={<HydrationBadge label={`Hydration · ${step} of ${total}`} />}
      showThemeToggle={false}
      onBack={onBack}
      onSkip={onSkip}
      footer={footer}
      overlay={overlay}
    >
      {children}
    </Screen>
  )
}
