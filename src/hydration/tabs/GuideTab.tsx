import { useState } from 'react'
import { Bookmark, Check, ChevronRight, HelpCircle, Plus, Stethoscope } from 'lucide-react'
import { formatClock } from '../../lib/dates'
import type { AppState } from '../../state/appState'
import { TabIntro } from '../../skincare/tabs/TabIntro'
import { forYouNow, inDrinks } from '../forYou'
import { SITUATIONS, visibleCards, type GuideCard } from '../guide.content'
import type { HydrationToday } from '../today'
import { BookmarkButton, CardTile } from './GuideBits'

type GuideTabProps = {
  state: AppState
  today: HydrationToday
  onToggleSaved: (cardId: string) => void
  onReadCard: (cardId: string) => void
  onOpenSituation: (situationId: string) => void
  onOpenSaved: () => void
  onAddDrink: (card: GuideCard) => void
}

const MYTHS_SHOWN = 2

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

export function GuideTab({ state, today, onToggleSaved, onReadCard, onOpenSituation, onOpenSaved, onAddDrink }: GuideTabProps) {
  const [allMyths, setAllMyths] = useState(false)
  const doctor = today.active.doctorLimit
  const cards = visibleCards(doctor)
  const myths = cards.filter((c) => c.kind === 'myth')
  const situations = SITUATIONS.map((s) => ({ ...s, count: cards.filter((c) => c.situation === s.id).length })).filter((s) => s.count > 0)
  const hero = forYouNow(state, today)?.card
  const savedCount = state.hydrationSaved.filter((id) => cards.some((c) => c.id === id)).length

  return (
    <div className="flex flex-col gap-4">
      <TabIntro eyebrow="Guide" title="What to drink, and when" subtitle="Short, sourced, and no detox talk." />

      {doctor && (
        <p className="flex items-start gap-2.5 rounded-[16px] bg-tint p-4 text-sm leading-normal text-text">
          <Stethoscope size={16} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          While you follow a doctor's limit, we hide cards that suggest drinking more, like Hot days and After training.
        </p>
      )}

      {hero && (
        <section className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow>{`For you now · ${formatClock(today.now.getHours() * 60 + today.now.getMinutes())}`}</Eyebrow>
            <BookmarkButton saved={state.hydrationSaved.includes(hero.id)} title={hero.title} onToggle={() => onToggleSaved(hero.id)} />
          </div>
          <CardTile card={hero} size={48} />
          <div className="flex flex-col gap-1.5">
            <p className="text-[22px] font-bold tracking-[-0.3px] text-text">{hero.title}</p>
            <p className="text-[15px] leading-normal text-text">{hero.why}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onReadCard(hero.id)} className={`h-10 rounded-full bg-cta px-4 text-sm font-semibold text-cta-text ${focusRing}`}>
              Read
            </button>
            {hero.drink &&
              (inDrinks(today.active, hero) ? (
                <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-text">
                  <Check size={15} strokeWidth={2.5} className="text-accent" aria-hidden />
                  In your drinks
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onAddDrink(hero)}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-full border-[1.5px] border-accent bg-surface px-4 text-sm font-semibold text-text ${focusRing}`}
                >
                  <Plus size={15} aria-hidden />
                  Add to my drinks
                </button>
              ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <Eyebrow>Situations</Eyebrow>
        <div className="grid grid-cols-2 gap-3">
          {situations.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onOpenSituation(s.id)}
              className={`flex flex-col items-start gap-3 rounded-[20px] border border-border bg-surface p-4 text-left transition-transform duration-[120ms] motion-safe:active:scale-[0.98] ${focusRing}`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-tint text-accent">
                <s.icon size={18} aria-hidden />
              </span>
              <span className="flex flex-col">
                <span className="text-[15px] font-semibold text-text">{s.name}</span>
                <span className="text-[13px] text-muted">
                  {s.count} {s.count === 1 ? 'drink' : 'drinks'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <Eyebrow>Myths</Eyebrow>
          {myths.length > MYTHS_SHOWN && (
            <button
              type="button"
              aria-expanded={allMyths}
              onClick={() => setAllMyths((v) => !v)}
              className={`-my-3 h-11 text-sm font-semibold text-text underline underline-offset-2 ${focusRing}`}
            >
              {allMyths ? 'Fewer' : `All ${myths.length}`}
            </button>
          )}
        </div>
        {(allMyths ? myths : myths.slice(0, MYTHS_SHOWN)).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onReadCard(m.id)}
            className={`flex items-center gap-3 rounded-[16px] border border-border bg-surface px-4 py-3 text-left ${focusRing}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
              <HelpCircle size={18} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-semibold text-text">{m.title}</span>
              <span className="text-[13px] text-muted">{m.verdict}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
          </button>
        ))}
      </section>

      <button
        type="button"
        onClick={onOpenSaved}
        className={`flex items-center gap-3 rounded-[20px] border border-border bg-surface p-4 text-left ${focusRing}`}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-tint text-accent">
          <Bookmark size={18} aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-semibold text-text">Saved</span>
          <span className="text-sm text-muted">{savedCount ? `${savedCount} ${savedCount === 1 ? 'card' : 'cards'}` : 'Nothing yet'}</span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
      </button>
    </div>
  )
}
