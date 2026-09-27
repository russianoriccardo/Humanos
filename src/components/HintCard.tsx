import type { ReactNode } from 'react'
import { SparkleIcon } from './icons/SparkleIcon'

type HintCardProps = {
  eyebrow?: string
  children: ReactNode
}

export function HintCard({ eyebrow, children }: HintCardProps) {
  return (
    <div className="flex gap-3 rounded-[20px] bg-tint p-4">
      <SparkleIcon size={16} className="mt-0.5 shrink-0 text-accent" />
      <div className="flex flex-col gap-1">
        {eyebrow && <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{eyebrow}</p>}
        <div className="text-sm leading-relaxed text-text">{children}</div>
      </div>
    </div>
  )
}
