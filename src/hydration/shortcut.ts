// What the dashboard "+" logs. It follows what the user actually drinks, can be pinned, and is never
// a drink that doesn't count (alcohol): one tap should always move the bar.
import type { Drink, HydrationActive } from '../state/appState'
import { WATER } from './drinks'

export type Shortcut = { drink: Drink; ml: number; pinned: boolean }

type ShortcutSource = Pick<HydrationActive, 'drinks' | 'logs' | 'shortcut'>

export function resolveShortcut(active: ShortcutSource): Shortcut {
  const counted = (id: string) => active.drinks.find((d) => d.id === id && d.counts)

  // 1. Pinned, still on the quick log and counting.
  const pin = active.shortcut
  const pinned = pin?.pinned ? counted(pin.drinkId) : undefined
  if (pin && pinned) return { drink: pinned, ml: pin.ml, pinned: true }

  // 2. The most recent counted log whose drink is still on the quick log, at that log's size.
  const recent = Object.values(active.logs)
    .flat()
    .filter((l) => l.counts && counted(l.drinkId))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]
  if (recent) return { drink: counted(recent.drinkId)!, ml: recent.ml, pinned: false }

  // 3. The first counted drink on the quick log; 4. Water 250 ml.
  const first = active.drinks.find((d) => d.counts)
  return first ? { drink: first, ml: first.ml, pinned: false } : { drink: WATER, ml: WATER.ml, pinned: false }
}
