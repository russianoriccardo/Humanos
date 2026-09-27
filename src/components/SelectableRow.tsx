import { Check } from 'lucide-react'

type SelectableRowProps = {
  title: string
  description?: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
  tone?: 'plain' | 'tinted'
}

export function SelectableRow({
  title,
  description,
  selected,
  onClick,
  disabled = false,
  tone = 'plain',
}: SelectableRowProps) {
  const tinted = tone === 'tinted'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'flex w-full items-center justify-between gap-3 rounded-[20px] border px-5 py-4 text-left',
        tinted
          ? 'transition-all duration-[120ms] motion-safe:active:scale-[0.97]'
          : 'transition-all duration-150 motion-safe:active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        disabled ? 'pointer-events-none opacity-40' : 'cursor-pointer',
        selected ? 'border-[1.5px] border-accent' : 'border-border',
        selected && tinted ? 'bg-tint' : 'bg-surface',
      ].join(' ')}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-semibold text-text">{title}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
      <span
        className={[
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
          selected
            ? ['border-accent bg-accent', tinted ? 'text-on-accent' : 'text-cta-text'].join(' ')
            : 'border-border bg-transparent',
        ].join(' ')}
      >
        {selected && <Check size={14} strokeWidth={2.5} className={tinted ? 'animate-pop' : undefined} />}
      </span>
    </button>
  )
}
