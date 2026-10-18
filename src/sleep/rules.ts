// Tonight's plan: the wind down steps, plus tips from simple rules once there are nights to go on.
import { addDays } from '../lib/dates'
import type { SleepCheckIn } from '../state/appState'
import type { TipIcon } from '../skincare/engine/types'
import { shiftClock } from './plan'

export const TAGS = ['Woke up at night', 'Late meal', 'Late coffee', 'Alcohol', 'Stressed', 'Trained late', 'Screens in bed', 'Noise']

// Tips start on night 3, once there's something to go on.
export const TIPS_FROM_NIGHT = 3
const MAX_TIPS = 2
const SHOWER_LEAD = 35

export type WindDownStep = { id: string; at: string; label: string; note?: string }

export type SleepTip = {
  id: string
  icon: TipIcon
  metric: string
  source: string
  body: string
  action?: { label: string; at: string }
}

export type TonightPlan = {
  steps: WindDownStep[]
  tips: SleepTip[]
  // Set when the partner pick applies: screens in bed on this many of the last 7 mornings.
  partnerPick: number | null
}

type TonightInput = {
  lightsOut: string
  night: number
  reminderOn: boolean
  trainedLate: boolean
  checkIns: Record<string, SleepCheckIn>
  // The morning that ends the 7 day lookback (today).
  today: string
}

// How many of the 7 mornings up to `today` carry `tag`.
export function tagCount(checkIns: Record<string, SleepCheckIn>, today: string, tag: string) {
  let count = 0
  for (let i = 0; i < 7; i++) if (checkIns[addDays(today, -i)]?.tags.includes(tag)) count++
  return count
}

export function buildTonight({ lightsOut, night, reminderOn, trainedLate, checkIns, today }: TonightInput): TonightPlan {
  const lo = (minutes: number) => shiftClock(lightsOut, -minutes)
  const tipsOn = night >= TIPS_FROM_NIGHT
  const steps: WindDownStep[] = [
    { id: 'dim', at: lo(60), label: 'Dim the lights' },
    { id: 'screens', at: lo(30), label: 'Screens away', note: reminderOn ? 'Reminder on' : undefined },
    { id: 'room', at: lo(15), label: 'Room cool and dark', note: 'Around 18°C' },
    { id: 'lightsOut', at: lightsOut, label: 'Lights out' },
  ]
  const tips: SleepTip[] = []

  if (tipsOn && trainedLate) {
    const at = lo(SHOWER_LEAD)
    tips.push({
      id: 'trained-late',
      icon: 'heart',
      metric: 'Trained at 19:30',
      source: 'Apple Health',
      body: `A late session keeps your body warm. A warm shower around ${at} helps it cool down in time for ${lightsOut}.`,
      action: { label: `Remind me at ${at}`, at },
    })
    steps.splice(1, 0, { id: 'shower', at, label: 'Warm shower', note: 'Added tonight · you trained late' })
  }

  const coffee = tagCount(checkIns, today, 'Late coffee')
  if (tipsOn && coffee >= 3) {
    tips.push({
      id: 'late-coffee',
      icon: 'moon',
      metric: `Late coffee, ${coffee} of the last 7 days`,
      source: 'Your morning check ins',
      body: "On those nights you fell asleep later. Keep today's last coffee before 14:00.",
    })
  }

  const screens = tagCount(checkIns, today, 'Screens in bed')
  return { steps, tips: tips.slice(0, MAX_TIPS), partnerPick: screens >= 4 ? screens : null }
}
