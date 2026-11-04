// Demo data. A web app can't read Apple Health, so the "connected" outcome imports this instead:
// 26 of the last 28 days, averaging 1.4 L.
import { addDays } from '../lib/dates'

export const HEALTH_AVG_ML = 1400
const MISSING = [9, 20]
// Days ago 1..28 minus the two missing ones; deltas from the average sum to zero.
const DELTAS = [-200, 200, -50, 50, 100, -100, 0, 0, -150, 150, 250, -250, -300, 300, 75, -75, 125, -125, 25, -25, 0, 0, -175, 175, 50, -50]

export function importedHealth(today: string): Record<string, number> {
  const out: Record<string, number> = {}
  let i = 0
  for (let ago = 1; ago <= 28; ago++) {
    if (MISSING.includes(ago)) continue
    out[addDays(today, -ago)] = HEALTH_AVG_ML + DELTAS[i++]
  }
  return out
}
