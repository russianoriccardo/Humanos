import type { ComponentType } from 'react'
import { Check } from 'lucide-react'

type ModuleCardProps = {
  name: string
  icon: ComponentType<{ size?: number; className?: string }>
  selected: boolean
  suggested?: boolean
  onClick: () => void
}

export function ModuleCard({ name, icon: Icon, selected, suggested = false, onClick }: ModuleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'flex flex-col gap-6 rounded-[20px] border bg-surface p-4 text-left',
        'transition-all duration-150 motion-safe:active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        selected ? 'border-[1.5px] border-accent' : 'border-border',
      ].join(' ')}
    >
      <span className="flex items-start justify-between">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-tint text-accent">
          <Icon size={18} />
        </span>
        <span
          className={[
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
            selected ? 'border-accent bg-accent text-cta-text' : 'border-border bg-transparent',
          ].join(' ')}
        >
          {selected && <Check size={12} strokeWidth={2.5} />}
        </span>
      </span>

      <span className="flex flex-col gap-0.5">
        <span className="text-base font-semibold text-text">{name}</span>
        {suggested && <span className="text-xs font-medium text-accent">Suggested for you</span>}
      </span>
    </button>
  )
}
