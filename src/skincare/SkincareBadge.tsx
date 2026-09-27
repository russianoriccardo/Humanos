import { Droplet } from 'lucide-react'

export function SkincareBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-tint px-3 text-[11px] font-semibold tracking-[1.5px] whitespace-nowrap text-text uppercase">
      <Droplet size={13} strokeWidth={2} className="text-accent" aria-hidden />
      {label}
    </span>
  )
}
