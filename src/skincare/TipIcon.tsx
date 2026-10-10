import { CircleCheck, Droplets, HeartPulse, Moon, Sun, type LucideIcon } from 'lucide-react'
import type { TipIcon as TipIconName } from './engine/types'

const ICONS: Record<TipIconName, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  humidity: Droplets,
  heart: HeartPulse,
  check: CircleCheck,
}

type TipIconProps = {
  icon: TipIconName
  size?: 'sm' | 'md'
}

export function TipIcon({ icon, size = 'md' }: TipIconProps) {
  const Icon = ICONS[icon]
  return (
    <span
      className={[
        'flex shrink-0 items-center justify-center rounded-[10px] bg-tint text-accent',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
      ].join(' ')}
      aria-hidden
    >
      <Icon size={size === 'sm' ? 16 : 19} strokeWidth={1.8} />
    </span>
  )
}
