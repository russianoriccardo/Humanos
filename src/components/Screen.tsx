import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ProgressDots } from './ProgressDots'
import { ThemeToggle } from './ThemeToggle'

type ScreenProps = {
  step: number
  totalSteps: number
  onBack?: () => void
  onSkip?: () => void
  footer?: ReactNode
  children: ReactNode
}

export function Screen({ step, totalSteps, onBack, onSkip, footer, children }: ScreenProps) {
  return (
    <div className="flex h-[100dvh] flex-col bg-bg text-text">
      <header className="flex shrink-0 items-center justify-between px-6 pt-4 pb-2">
        <div className="flex h-11 w-11 items-center justify-start">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back"
              className="flex h-11 w-11 items-center justify-center rounded-full text-text transition-transform motion-safe:active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ChevronLeft size={22} />
            </button>
          )}
        </div>

        <ProgressDots step={step} totalSteps={totalSteps} />

        <div className="flex h-11 items-center justify-end gap-1">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="h-11 px-2 text-sm text-muted transition-transform motion-safe:active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Skip
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-4">{children}</main>

      {footer && <footer className="shrink-0 px-6 pb-8 pt-3">{footer}</footer>}
    </div>
  )
}
