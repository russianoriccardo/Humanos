import type { ReactNode } from 'react'

type StepTitleProps = {
  title: string
  subtitle: string
  aside?: ReactNode
}

export function StepTitle({ title, subtitle, aside }: StepTitleProps) {
  return (
    <div className="flex flex-col gap-2 pt-2">
      <h1 className="text-[28px] leading-tight font-bold text-text">{title}</h1>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-base text-muted">{subtitle}</p>
        {aside}
      </div>
    </div>
  )
}
