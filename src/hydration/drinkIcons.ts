import { Citrus, Coffee, CupSoda, GlassWater, Leaf, Sparkles, Wine, Zap, type LucideIcon } from 'lucide-react'
import type { Drink } from '../state/appState'

const BY_ID: Record<string, LucideIcon> = {
  water: GlassWater,
  coffee: Coffee,
  tea: Leaf,
  sparkling: Sparkles,
  juice: Citrus,
  sports: Zap,
}

// Built ins have their own icon; custom and Guide drinks get a cup, alcohol a glass of wine.
export function drinkIcon(drink: Pick<Drink, 'id' | 'counts'>): LucideIcon {
  return BY_ID[drink.id] ?? (drink.counts ? CupSoda : Wine)
}
