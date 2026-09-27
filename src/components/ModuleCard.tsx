import type { ComponentType, ReactNode } from 'react'
import { Check } from 'lucide-react'

type Icon = ComponentType<{ size?: number; className?: string }>

type SelectCardProps = {
  variant?: 'select'
  name: string
  icon: Icon
  selected: boolean
  suggested?: boolean
  onClick: () => void
}

export type ModuleRowTone = 'recommended' | 'waiting' | 'default'

type RowCardProps = {
  variant: 'row'
  name: string
  icon: Icon
  subtitle: string
  tone?: ModuleRowTone
  trailing?: ReactNode
  onClick: () => void
  children?: ReactNode
}

type ModuleCardProps = SelectCardProps | RowCardProps

const pressable =
  'transition-all duration-150 motion-safe:active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function IconTile({ icon: Icon }: { icon: Icon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent">
      <Icon size={18} />
    </span>
  )
}

const rowTone: Record<ModuleRowTone, string> = {
  recommended: 'border-[1.5px] border-accent',
  waiting: 'border border-dashed border-border opacity-75',
  default: 'border border-border',
}

export function ModuleCard(props: ModuleCardProps) {
  if (props.variant === 'row') {
    const { name, icon, subtitle, tone = 'default', trailing, onClick, children } = props
    return (
      <div className={['rounded-[20px] bg-surface transition-opacity duration-300', rowTone[tone]].join(' ')}>
        <button
          type="button"
          onClick={onClick}
          className={['flex w-full items-center gap-3 rounded-[20px] p-4 text-left', pressable].join(' ')}
        >
          <IconTile icon={icon} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-base font-semibold text-text">{name}</span>
            {/* Waiting cards sit at 75% opacity; full text color keeps the dimmed subtitle above 4.5:1. */}
            <span className={['text-sm', tone === 'waiting' ? 'text-text' : 'text-muted'].join(' ')}>{subtitle}</span>
          </span>
          {trailing}
        </button>
        {children && <div className="px-4 pb-4">{children}</div>}
      </div>
    )
  }

  const { name, icon, selected, suggested = false, onClick } = props
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'flex flex-col gap-6 rounded-[20px] border bg-surface p-4 text-left',
        pressable,
        selected ? 'border-[1.5px] border-accent' : 'border-border',
      ].join(' ')}
    >
      <span className="flex items-start justify-between">
        <IconTile icon={icon} />
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
        {suggested && <span className="text-xs font-medium text-accent-text">Suggested for you</span>}
      </span>
    </button>
  )
}
