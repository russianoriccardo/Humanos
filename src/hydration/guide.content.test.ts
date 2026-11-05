import { describe, expect, it } from 'vitest'
import { forYouToday, GUIDE, visibleCards, type ForYouContext } from './guide.content'

const at = (h: number) => new Date(2026, 10, 5, h, 0)
const base: ForYouContext = {
  now: at(10),
  doctor: false,
  hot: false,
  workoutMinutes: 0,
  lastRested: null,
  coffeesToday: 0,
  behind: false,
  isDay1: false,
  hasCoffee: false,
  dayNumber: 0,
}
const id = (ctx: Partial<ForYouContext>) => forYouToday({ ...base, ...ctx })?.card.id

describe('forYouToday', () => {
  it('follows the rules in order', () => {
    expect(id({ hot: true, workoutMinutes: 90 })).toBe('heat-milk')
    expect(id({ workoutMinutes: 45 })).toBe('training-water')
    expect(id({ workoutMinutes: 90 })).toBe('training-sports')
    expect(id({ lastRested: 2 })).toBe('energy-water')
    expect(id({ coffeesToday: 3, now: at(20) })).toBe('winddown-coffee')
    expect(id({ now: at(20) })).toBe('winddown-sips')
    expect(forYouToday({ ...base, behind: true, now: at(15) })).toMatchObject({ card: { id: 'energy-water' }, action: 'logWater' })
    expect(id({ now: at(15) })).toBe('focus-greentea')
    expect(id({ isDay1: true, hasCoffee: true })).toBe('myth-coffee')
  })

  it('never shows a card that pushes more in doctor mode', () => {
    expect(id({ doctor: true, hot: true })).not.toBe('heat-milk')
    expect(id({ doctor: true, behind: true, now: at(15) })).toBe('focus-greentea')
    for (let day = 0; day < 30; day++) {
      const card = forYouToday({ ...base, doctor: true, dayNumber: day })?.card
      expect(card?.pushesMore).toBe(false)
    }
  })

  it('works from empty data: a new user still gets a card', () => {
    expect(forYouToday(base)?.card.kind).toBe('drink')
  })
})

describe('guide content', () => {
  it('has no detox, flush or cure claims, and no dashes between words', () => {
    for (const card of GUIDE) {
      const text = [card.title, card.when, card.verdict, card.why, card.how, card.caveat, card.means].join(' ')
      expect(text).not.toMatch(/detox|flush|cure/i)
      expect(text).not.toMatch(/\s[–—-]\s/)
    }
  })

  it('hides the cards that push more in doctor mode', () => {
    expect(visibleCards(true).some((c) => c.pushesMore)).toBe(false)
    expect(visibleCards(false)).toHaveLength(GUIDE.length)
  })
})
