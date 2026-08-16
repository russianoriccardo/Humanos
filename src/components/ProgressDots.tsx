type ProgressDotsProps = {
  step: number
  totalSteps: number
}

export function ProgressDots({ step, totalSteps }: ProgressDotsProps) {
  return (
    <div className="flex items-center justify-center gap-1.5" role="presentation">
      {Array.from({ length: totalSteps }, (_, index) => {
        const active = index === step
        return (
          <span
            key={index}
            className={[
              'rounded-full transition-all duration-200',
              active ? 'h-1.5 w-5 bg-accent' : 'h-1.5 w-1.5 bg-muted/40',
            ].join(' ')}
          />
        )
      })}
    </div>
  )
}
