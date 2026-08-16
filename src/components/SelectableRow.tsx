import { Check } from 'lucide-react'

type SelectableRowProps = {
  title: string
  description: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
}

export function SelectableRow({ title, description, selected, onClick, disabled = false }: SelectableRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={[
        'flex w-full items-center justify-between gap-3 rounded-[20px] border bg-surface px-5 py-4 text-left',
        'transition-all duration-150 motion-safe:active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        disabled ? 'pointer-events-none opacity-40' : 'cursor-pointer',
        selected ? 'border-[1.5px] border-accent' : 'border-border',
      ].join(' ')}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-base font-semibold text-text">{title}</span>
        <span className="text-sm text-muted">{description}</span>
      </span>
      <span
        className={[
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-accent bg-accent text-cta-text' : 'border-border bg-transparent',
        ].join(' ')}
      >
        {selected && <Check size={14} strokeWidth={2.5} />}
      </span>
    </button>
  )
}
