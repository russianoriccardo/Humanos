import { useState } from 'react'
import { Bookmark, Check, HelpCircle } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { Sheet } from '../../components/Sheet'
import type { Drink } from '../../state/appState'
import { drinkIcon } from '../drinkIcons'
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

type CardRowProps = {
  card: GuideCard
  saved: boolean
  added: boolean
  onOpen: () => void
  onToggleSaved: () => void
}

// A card as listed on a situation page or in Saved.
export function GuideCardRow({ card, saved, added, onOpen, onToggleSaved }: CardRowProps) {
  return (
    <article className="relative flex gap-3 rounded-[20px] border border-border bg-surface p-4">
      <button type="button" onClick={onOpen} aria-label={`Open ${card.title}`} className={`absolute inset-0 rounded-[20px] ${focusRing}`} />
      <span className="pointer-events-none">
        <CardTile card={card} />
      </span>
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[15px] font-semibold text-text">{card.title}</p>
        <p className="text-[13px] text-muted">{card.when ?? card.verdict}</p>
        <p className="pt-1 text-sm leading-normal text-text">{card.why}</p>
        {added && (
          <span className="mt-1 inline-flex items-center gap-1 self-start rounded-full bg-tint px-2.5 py-1 text-xs font-semibold text-accent-text">
            <Check size={12} strokeWidth={3} aria-hidden />
            In your drinks
          </span>
        )}
      </div>
      <span className="relative z-10">
        <BookmarkButton saved={saved} title={card.title} onToggle={onToggleSaved} />
      </span>
    </article>
  )
}

// Quick log is full (8): swap one out for the new drink.
export function SwapSheet({ drinks, name, onSwap, onClose }: { drinks: Drink[]; name: string; onSwap: (id: string) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const pickedName = drinks.find((d) => d.id === picked)?.name
  return (
    <Sheet title="Your quick log is full" subtitle={`It holds 8 drinks. Swap one out for ${name}?`} onClose={onClose}>
      <div role="radiogroup" aria-label="Drink to swap out" className="flex flex-col gap-2">
        {drinks.map((d) => {
          const Icon = drinkIcon(d)
          const on = picked === d.id
          return (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPicked(d.id)}
              className={[
                'flex h-12 items-center gap-3 rounded-[16px] px-4 text-left',
                focusRing,
                on ? 'border-[1.5px] border-accent bg-tint' : 'border border-border bg-surface',
              ].join(' ')}
            >
              <Icon size={16} className="text-accent" aria-hidden />
              <span className="flex-1 text-[15px] text-text">{d.name}</span>
              <span className="text-sm text-muted">{d.ml} ml</span>
            </button>
          )
        })}
      </div>
      <div className="flex flex-col items-center gap-2">
        <PrimaryButton disabled={!picked} onClick={() => picked && onSwap(picked)}>
          {pickedName ? `Swap ${pickedName} for ${name}` : `Swap for ${name}`}
        </PrimaryButton>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
      </div>
    </Sheet>
  )
}
