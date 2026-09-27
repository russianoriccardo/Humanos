import { ChartNoAxesColumn, Ellipsis, HeartPulse, House, ListChecks, type LucideIcon } from 'lucide-react'

type NavItem = { id: string; label: string; icon: LucideIcon }

const ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'routines', label: 'Routines', icon: ListChecks },
  { id: 'insights', label: 'Insights', icon: ChartNoAxesColumn },
  { id: 'more', label: 'More', icon: Ellipsis },
]

export function BottomNav({ active = 'home' }: { active?: string }) {
  return (
    <nav aria-label="Main" className="flex items-center justify-around rounded-full border border-border bg-surface px-2 py-1">
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = id === active
        return (
          <button
            key={id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            className={[
              'flex h-14 min-w-11 flex-col items-center justify-center gap-0.5 rounded-full px-1.5',
              'transition-transform motion-safe:active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
              isActive ? 'text-accent-text' : 'text-muted',
            ].join(' ')}
          >
            <Icon size={21} strokeWidth={1.8} className={isActive ? 'text-accent' : undefined} />
            <span className="text-[10px] font-medium">{label}</span>
            <span className={['h-1 w-1 rounded-full', isActive ? 'bg-accent' : 'bg-transparent'].join(' ')} />
          </button>
        )
      })}
    </nav>
  )
}
