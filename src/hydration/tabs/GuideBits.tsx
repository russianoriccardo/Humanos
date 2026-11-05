import { Bookmark, HelpCircle } from 'lucide-react'
import { situationOf, type GuideCard } from '../guide.content'

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

// The card's tile: its situation's icon, or a question mark for myths.
export function CardTile({ card, size = 40 }: { card: GuideCard; size?: number }) {
  const Icon = (card.situation && situationOf(card.situation)?.icon) || HelpCircle
  return (
    <span className="flex shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent" style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.45)} aria-hidden />
    </span>
  )
}

export function BookmarkButton({ saved, title, onToggle }: { saved: boolean; title: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from Saved` : `Save ${title}`}
      onClick={onToggle}
      className={`-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${saved ? 'text-accent' : 'text-muted'} ${focusRing}`}
    >
      <Bookmark size={20} fill={saved ? 'currentColor' : 'none'} aria-hidden />
    </button>
  )
}
