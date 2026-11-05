import { useState, type ReactNode } from 'react'
import { AlertCircle, Bookmark, Check, ChevronLeft, Plus } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { Screen } from '../../components/Screen'
import { SegmentedTabs } from '../../components/SegmentedTabs'
import { Toast } from '../../components/Toast'
import type { HydrationActive } from '../../state/appState'
import { guideDrink, inDrinks } from '../forYou'
import { cardById, situationOf, visibleCards, type GuideCard } from '../guide.content'
import { QUICK_LOG_MAX } from '../drinks'
import { BookmarkButton, CardTile, GuideCardRow, SwapSheet } from '../tabs/GuideBits'
import { SwipeRow } from '../tabs/SwipeRow'

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

// What each myth points to next.
const RELATED: Record<string, string> = {
  'myth-coffee': 'winddown-coffee',
  'myth-eight': 'myth-onlywater',
  'myth-onlywater': 'heat-milk',
  'myth-thirst': 'myth-eight',
  'myth-more': 'heat-water',
}

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

type Common = {
  active: HydrationActive
  saved: string[]
  toast: string | null
  onToastDone: () => void
  onBack: () => void
  onToggleSaved: (cardId: string) => void
  onReadCard: (cardId: string) => void
}

function Shell({ title, onBack, right, footer, overlay, toast, onToastDone, children }: {
  title?: string
  onBack: () => void
  right?: ReactNode
  footer?: ReactNode
  overlay?: ReactNode
  toast: string | null
  onToastDone: () => void
  children: ReactNode
}) {
  const header = (
    <header className="grid shrink-0 grid-cols-[44px_1fr_44px] items-center px-6 pt-4 pb-2">
      <button type="button" onClick={onBack} aria-label="Back" className={`-ml-2.5 flex h-11 w-11 items-center justify-center rounded-full text-text ${focusRing}`}>
        <ChevronLeft size={22} />
      </button>
      <h1 className="text-center text-lg font-bold text-text">{title}</h1>
      <span className="flex justify-end">{right}</span>
    </header>
  )
  return (
    <Screen
      header={header}
      footer={footer}
      overlay={
        <>
          {toast && <Toast message={toast} onDone={onToastDone} />}
          {overlay}
        </>
      }
    >
      {children}
    </Screen>
  )
}

export function SituationScreen({ situationId, active, saved, toast, onToastDone, onBack, onToggleSaved, onReadCard }: Common & { situationId: string }) {
  const situation = situationOf(situationId)
  if (!situation) return null
  const cards = visibleCards(active.doctorLimit).filter((c) => c.situation === situation.id)
  return (
    <Shell onBack={onBack} toast={toast} onToastDone={onToastDone}>
      <div className="flex flex-col gap-4 pt-1 pb-4">
        <div className="flex flex-col gap-1.5">
          <Eyebrow>Situation</Eyebrow>
          <h2 className="text-[24px] leading-tight font-bold text-text">{situation.name}</h2>
          <p className="text-[15px] text-muted">{situation.intro}</p>
        </div>
        {cards.map((card) => (
          <GuideCardRow
            key={card.id}
            card={card}
            saved={saved.includes(card.id)}
            added={inDrinks(active, card)}
            onOpen={() => onReadCard(card.id)}
            onToggleSaved={() => onToggleSaved(card.id)}
          />
        ))}
      </div>
    </Shell>
  )
}

function Block({ title, tone = 'plain', children }: { title: string; tone?: 'plain' | 'tint' | 'warning'; children: ReactNode }) {
  return (
    <section
      className={[
        'flex flex-col gap-2 rounded-[20px] p-4',
        tone === 'warning' ? 'bg-warning-tint' : tone === 'tint' ? 'bg-tint' : 'border border-border bg-surface',
      ].join(' ')}
    >
      <p className={['text-[11px] font-semibold tracking-[1.5px] uppercase', tone === 'warning' ? 'text-warning' : 'text-muted'].join(' ')}>{title}</p>
      {children}
    </section>
  )
}

export function CardScreen({
  cardId,
  active,
  saved,
  toast,
  onToastDone,
  onBack,
  onToggleSaved,
  onReadCard,
  onAddDrink,
}: Common & { cardId: string; onAddDrink: (card: GuideCard, replaceId?: string) => void }) {
  const [swapOpen, setSwapOpen] = useState(false)
  const card = cardById(cardId)
  if (!card) return null
  const myth = card.kind === 'myth'
  const situation = card.situation ? situationOf(card.situation) : undefined
  const added = inDrinks(active, card)
  const related = cardById(RELATED[card.id] ?? '')
  const showRelated = related && !(active.doctorLimit && related.pushesMore)
  const drink = guideDrink(card)

  const add = () => (active.drinks.length >= QUICK_LOG_MAX ? setSwapOpen(true) : onAddDrink(card))

  const footer = drink ? (
    <div className="flex flex-col items-center gap-2">
      {added ? (
        <span className="flex h-14 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-border text-base font-semibold text-text">
          <Check size={18} strokeWidth={2.5} className="text-accent" aria-hidden />
          In your drinks
        </span>
      ) : (
        <PrimaryButton onClick={add}>
          <span className="inline-flex items-center justify-center gap-2">
            <Plus size={18} aria-hidden />
            Add to my drinks
          </span>
        </PrimaryButton>
      )}
      <p className="text-[13px] text-muted">
        {added ? `It is in Today now, as a ${drink.ml} ml button.` : `It becomes a one tap button in Today, ${drink.ml} ml.`}
      </p>
    </div>
  ) : undefined

  return (
    <Shell
      onBack={onBack}
      right={<BookmarkButton saved={saved.includes(card.id)} title={card.title} onToggle={() => onToggleSaved(card.id)} />}
      footer={footer}
      toast={toast}
      onToastDone={onToastDone}
      overlay={
        swapOpen &&
        drink && (
          <SwapSheet
            drinks={active.drinks}
            name={drink.name}
            onClose={() => setSwapOpen(false)}
            onSwap={(id) => {
              setSwapOpen(false)
              onAddDrink(card, id)
            }}
          />
        )
      }
    >
      <div className="flex flex-col gap-4 pt-1 pb-4">
        <CardTile card={card} size={56} />
        <div className="flex flex-col gap-2">
          <Eyebrow>{myth ? 'Myth' : (situation?.name ?? 'Guide')}</Eyebrow>
          <h2 className="text-[28px] leading-tight font-bold text-text">{card.title}</h2>
          {myth ? (
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-tint px-3 py-1.5 text-sm font-semibold text-text">
              <Check size={14} strokeWidth={2.5} className="text-accent" aria-hidden />
              {card.verdict}
            </span>
          ) : (
            card.when && <p className="text-[15px] text-muted">{card.when}</p>
          )}
        </div>

        <Block title={myth ? 'What the research says' : 'Why it can help'}>
          <p className="text-[15px] leading-relaxed text-text">{card.why}</p>
        </Block>
        {card.how && (
          <Block title="How to make it">
            <p className="text-[15px] leading-relaxed text-text">{card.how}</p>
          </Block>
        )}
        {card.means && (
          <Block title="What it means for you">
            <p className="text-[15px] leading-relaxed text-text">{card.means}</p>
          </Block>
        )}
        {card.caveat && (
          <Block title="Good to know" tone="warning">
            <p className="flex items-start gap-2 text-[15px] leading-relaxed text-text">
              <AlertCircle size={16} className="mt-1 shrink-0 text-warning" aria-hidden />
              {card.caveat}
            </p>
          </Block>
        )}
        <Block title="Sources" tone="tint">
          <ul className="flex flex-col gap-1">
            {card.sources.map((source) => (
              <li key={source} className="text-sm text-text">
                {source}
              </li>
            ))}
          </ul>
        </Block>

        {myth && showRelated && related && (
          <section className="flex flex-col gap-2.5">
            <Eyebrow>Related</Eyebrow>
            <GuideCardRow
              card={related}
              saved={saved.includes(related.id)}
              added={inDrinks(active, related)}
              onOpen={() => onReadCard(related.id)}
              onToggleSaved={() => onToggleSaved(related.id)}
            />
          </section>
        )}
      </div>
    </Shell>
  )
}

type SavedFilter = 'all' | 'drinks' | 'myths'

export function SavedScreen({
  active,
  saved,
  toast,
  onToastDone,
  onBack,
  onReadCard,
  onRemove,
  onBrowse,
}: Common & { onRemove: (cardId: string) => void; onBrowse: () => void }) {
  const [filter, setFilter] = useState<SavedFilter>('all')
  const cards = visibleCards(active.doctorLimit).filter((c) => saved.includes(c.id))
  const drinks = cards.filter((c) => c.kind === 'drink')
  const myths = cards.filter((c) => c.kind === 'myth')
  const shown = filter === 'drinks' ? drinks : filter === 'myths' ? myths : cards
  const tabs: { id: SavedFilter; label: string }[] = [
    { id: 'all', label: `All · ${cards.length}` },
    { id: 'drinks', label: `Drinks · ${drinks.length}` },
    { id: 'myths', label: `Myths · ${myths.length}` },
  ]

  return (
    <Shell title="Saved" onBack={onBack} toast={toast} onToastDone={onToastDone}>
      <div className="flex flex-col gap-4 pt-1 pb-4">
        {cards.length === 0 ? (
          <section className="flex flex-col items-start gap-3 rounded-[20px] border-[1.5px] border-dashed border-border-strong p-[18px]">
            <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-tint text-accent">
              <Bookmark size={18} aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-semibold text-text">Nothing saved yet</p>
              <p className="text-sm leading-normal text-muted">Tap the bookmark on any card and it stays here, even when you are offline.</p>
            </div>
            <button type="button" onClick={onBrowse} className={`h-10 rounded-full bg-cta px-4 text-sm font-semibold text-cta-text ${focusRing}`}>
              Browse the guide
            </button>
          </section>
        ) : (
          <>
            <SegmentedTabs tabs={tabs} value={filter} onChange={setFilter} label="Saved cards" idPrefix="saved" />
            <ul id="saved-panel" className="flex flex-col gap-3">
              {shown.map((card) => (
                <li key={card.id} className="overflow-hidden rounded-[20px]">
                  <SwipeRow label={`${card.title}. Open`} action="Remove" onTap={() => onReadCard(card.id)} onAction={() => onRemove(card.id)}>
                    <span className="flex w-full gap-3 rounded-[20px] border border-border p-4">
                      <CardTile card={card} />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-[15px] font-semibold text-text">{card.title}</span>
                        <span className="text-[13px] text-muted">{card.when ?? card.verdict}</span>
                        <span className="pt-1 text-sm leading-normal text-text">{card.why}</span>
                        {inDrinks(active, card) && <span className="text-xs font-semibold text-accent-text">In your drinks</span>}
                      </span>
                    </span>
                  </SwipeRow>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Shell>
  )
}
