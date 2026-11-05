import { describe, expect, it } from 'vitest'
import { initialHydration, type DrinkLog, type HydrationActive } from '../state/appState'
import { makeCustom } from './drinks'
import { createHydrationActive } from './mirror'
import { resolveShortcut } from './shortcut'

const now = new Date(2026, 10, 5, 9, 0)
const beer = makeCustom('Beer', 150, false)
const log = (drinkId: string, name: string, ml: number, hour: number, counts = true, day = '2026-11-05'): DrinkLog => ({
  id: `${drinkId}-${hour}`,
  at: new Date(2026, 10, Number(day.slice(8)), hour).toISOString(),
  drinkId,
  name,
  ml,
  counts,
})
const withLogs = (active: HydrationActive, logs: DrinkLog[]): HydrationActive => {
  const byDay: Record<string, DrinkLog[]> = {}
  for (const l of logs) (byDay[l.at.slice(0, 10)] ??= []).push(l)
  return { ...active, logs: byDay }
}

describe('createHydrationActive order', () => {
  it('puts built ins first, and Water first when nothing picked counts', () => {
    const beerOnly = createHydrationActive({ ...initialHydration, drinks: [beer.id], customDrinks: [beer] }, true, now)
    expect(beerOnly.drinks.map((d) => d.id)).toEqual(['water', beer.id])
    const mixed = createHydrationActive({ ...initialHydration, drinks: [beer.id, 'coffee'], customDrinks: [beer] }, true, now)
    expect(mixed.drinks.map((d) => d.id)).toEqual(['coffee', beer.id])
  })
})

describe('resolveShortcut', () => {
  const base = createHydrationActive({ ...initialHydration, drinks: ['water', 'coffee', 'tea', beer.id], customDrinks: [beer] }, true, now)

  it('defaults to Water 250 for a Beer only setup', () => {
    const beerOnly = createHydrationActive({ ...initialHydration, drinks: [beer.id], customDrinks: [beer] }, true, now)
    expect(resolveShortcut(beerOnly)).toMatchObject({ drink: { id: 'water' }, ml: 250, pinned: false })
  })

  it('follows the last counted log at its size', () => {
    const a = withLogs(base, [log('water', 'Water', 250, 8), log('coffee', 'Coffee', 150, 10)])
    expect(resolveShortcut(a)).toMatchObject({ drink: { id: 'coffee' }, ml: 150 })
  })

  it('falls back past a last log that does not count', () => {
    const a = withLogs(base, [log('coffee', 'Coffee', 150, 10), log(beer.id, 'Beer', 330, 20, false)])
    expect(resolveShortcut(a)).toMatchObject({ drink: { id: 'coffee' }, ml: 150 })
  })

  it('lets a pin beat a later log', () => {
    const a = { ...withLogs(base, [log('tea', 'Tea', 250, 12)]), shortcut: { drinkId: 'water', ml: 500, pinned: true } }
    expect(resolveShortcut(a)).toEqual({ drink: base.drinks[0], ml: 500, pinned: true })
  })

  it('drops a pin whose drink is gone', () => {
    const custom = makeCustom('Oat milk', 200, true)
    const a = {
      ...withLogs({ ...base, drinks: base.drinks.filter((d) => d.id !== 'coffee') }, [log('tea', 'Tea', 300, 12)]),
      shortcut: { drinkId: custom.id, ml: 200, pinned: true },
    }
    expect(resolveShortcut(a)).toMatchObject({ drink: { id: 'tea' }, ml: 300, pinned: false })
  })

  it('ignores a pinned drink that does not count', () => {
    const a = { ...base, shortcut: { drinkId: beer.id, ml: 150, pinned: true } }
    expect(resolveShortcut(a)).toMatchObject({ drink: { id: 'water' }, ml: 250, pinned: false })
  })
})
