import { Check, Plus } from 'lucide-react'

type ChipProps = {
  label: string
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  dot?: boolean
  variant?: 'solid' | 'soft' | 'dashed' | 'step'
}

const pressable =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export function Chip({ label, selected = false, onClick, disabled = false, dot = false, variant = 'solid' }: ChipProps) {
  if (!onClick) {
    return (
      <span className="inline-flex h-11 items-center gap-2 rounded-full bg-tint px-4 text-sm font-medium text-text">
        {dot && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        {label}
      </span>
    )
  }

  if (variant === 'step') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={selected}
        className={[
          'inline-flex h-11 items-center gap-2 rounded-full bg-tint pr-4 pl-2.5 text-sm font-medium text-text',
          'transition-transform duration-[120ms] motion-safe:active:scale-[0.97]',
          pressable,
        ].join(' ')}
      >
        <span
          className={[
            'flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] transition-colors duration-[120ms]',
            selected ? 'border-accent bg-accent text-on-accent' : 'border-muted bg-transparent',
          ].join(' ')}
        >
          {selected && <Check size={12} strokeWidth={3} className="animate-pop" />}
        </span>
        {label}
      </button>
    )
  }

  if (variant === 'dashed') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          'inline-flex h-11 items-center gap-1.5 rounded-full border border-dashed border-muted bg-transparent px-4 text-sm font-medium text-text',
          'transition-transform duration-[120ms] motion-safe:active:scale-[0.97]',
          pressable,
          disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        ].join(' ')}
      >
        <Plus size={15} strokeWidth={2} className="text-accent" aria-hidden />
        {label}
      </button>
    )
  }

  const soft = variant === 'soft'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium',
        soft
          ? 'transition-all duration-[120ms] motion-safe:active:scale-[0.97]'
          : 'transition-transform duration-150 motion-safe:active:scale-[0.97]',
        pressable,
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        soft
          ? selected
            ? 'border-[1.5px] border-accent bg-tint text-text'
            : 'border-border bg-surface text-text'
          : selected
            ? 'border-cta bg-cta text-cta-text'
            : 'border-border bg-surface text-text',
      ].join(' ')}
    >
      {soft && selected && <Check size={14} strokeWidth={2.5} className="animate-pop text-accent" aria-hidden />}
      {label}
    </button>
  )
}
