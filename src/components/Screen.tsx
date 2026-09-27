import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ProgressDots } from './ProgressDots'
import { ThemeToggle } from './ThemeToggle'

type ScreenProps = {
  step?: number
  totalSteps?: number
  center?: ReactNode
  header?: ReactNode
  onBack?: () => void
  onSkip?: () => void
  showThemeToggle?: boolean
  footer?: ReactNode
  overlay?: ReactNode
  children: ReactNode
}

export function Screen({
  step,
  totalSteps,
  center,
  header,
  onBack,
  onSkip,
  showThemeToggle = true,
  footer,
  overlay,
  children,
}: ScreenProps) {
  const centerContent =
    center ?? (step !== undefined && totalSteps !== undefined ? <ProgressDots step={step} totalSteps={totalSteps} /> : null)

  return (
    <div className="relative flex h-full flex-col bg-bg text-text">
      {header ?? (
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 px-6 pt-4 pb-2">
          <div className="flex h-11 items-center justify-start">
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

          <div className="flex justify-center">{centerContent}</div>

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
            {showThemeToggle && <ThemeToggle />}
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto px-6 pb-4">{children}</main>

      {footer && <footer className="shrink-0 px-6 pt-3 pb-8">{footer}</footer>}

      {overlay}
    </div>
  )
}
