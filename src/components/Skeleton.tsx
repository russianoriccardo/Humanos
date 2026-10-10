// Loading placeholder. Pulse is disabled under prefers-reduced-motion.
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden className={['block rounded-[10px] bg-tint motion-safe:animate-pulse', className].join(' ')} />
}

export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div aria-hidden className="flex gap-3 rounded-[20px] border border-border bg-surface p-4">
      <Skeleton className="h-10 w-10 shrink-0" />
      <div className="flex flex-1 flex-col gap-2 pt-1">
        <Skeleton className="h-3.5 w-24" />
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={['h-3', i === lines - 1 ? 'w-3/5' : 'w-full'].join(' ')} />
        ))}
      </div>
    </div>
  )
}
