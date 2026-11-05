// "For you today" for the current state: shared by Today and the Guide hero.
import { daysBetween } from '../lib/dates'
import type { AppState, Drink, HydrationActive } from '../state/appState'
import { forYouToday, type GuideCard } from './guide.content'
import type { HydrationToday } from './today'

export function forYouNow(state: AppState, today: HydrationToday) {
  const { active, now, logs, adj, pace, isDay1, day } = today
  const checkIns = state.sleepActive ? Object.entries(state.sleepActive.checkIns).sort(([a], [b]) => b.localeCompare(a)) : []
  return forYouToday({
    now,
    doctor: active.doctorLimit,
    hot: adj.heatMl > 0,
    workoutMinutes: state.hydration.health === 'connected' ? state.demo.workoutMinutes : 0,
    lastRested: checkIns[0]?.[1].rested ?? null,
    coffeesToday: logs.filter((l) => l.drinkId === 'coffee').length,
    behind: pace === 'behind',
    isDay1,
    hasCoffee: active.drinks.some((d) => d.id === 'coffee'),
    dayNumber: daysBetween(active.startedAt, day),
  })
}

// A Guide card's drink as a quick log button.
export function guideDrink(card: GuideCard): Drink | null {
  return card.drink ? { id: `guide:${card.id}`, ...card.drink, sweet: false, source: 'guide' } : null
}

export const inDrinks = (active: HydrationActive, card: GuideCard) => active.drinks.some((d) => d.id === `guide:${card.id}`)
