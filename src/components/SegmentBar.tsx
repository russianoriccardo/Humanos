type SegmentBarProps = {
  total: number
  filled: number
  label?: string
}

export function SegmentBar({ total, filled, label }: SegmentBarProps) {
  const done = Math.max(0, Math.min(total, filled))
  return (
    // A span so it can sit inside a button (cards are tappable as a whole).
    <span
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className="flex w-full gap-1"
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={['h-1.5 flex-1 rounded-full', i < done ? 'bg-accent' : 'bg-border'].join(' ')} />
      ))}
    </span>
  )
}
