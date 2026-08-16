type ChipProps = {
  label: string
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  dot?: boolean
}

export function Chip({ label, selected = false, onClick, disabled = false, dot = false }: ChipProps) {
  if (!onClick) {
    return (
      <span className="inline-flex h-11 items-center gap-2 rounded-full bg-tint px-4 text-sm font-medium text-text">
        {dot && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        {label}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border px-4 text-sm font-medium',
        'transition-transform duration-150 motion-safe:active:scale-[0.97]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        selected ? 'border-cta bg-cta text-cta-text' : 'border-border bg-surface text-text',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
