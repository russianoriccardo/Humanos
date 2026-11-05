// The setup mirror (S5) and the active module it creates.
import { addDays } from '../lib/dates'
import type { Drink, HydrationActive, HydrationSetup } from '../state/appState'
import { importedHealth } from './demo'
import { BUILT_IN, QUICK_LOG_MAX, WATER } from './drinks'
import { DEFAULT_WAKE, hydrationDay } from './day'
import { defaultSlots, nextSlot } from './nudges'
import { DEFAULT_TARGET, formatLitres, glasses, GLASS_ML } from './target'

export type MirrorContext = {
  now: Date
  // Sleep's wake time when Sleep is live, else 07:30.
  wake?: string
  // Last moment for a nudge: 20:00, or earlier when Sleep says so.
  quiet?: string
  // Days of Apple Health history imported (0 without it).
  importedDays?: number
}

export type HydrationMirror = {
  headline: string
  sub: string
  strength: string
  gapLabel: string
  gap: string
  firstStep: { time: string; a: string; b: string; cta: string; tomorrow: boolean }
  slots: string[]
  hint: string
}

// The setup's picked drinks, built in or custom, in pick order.
export function pickedDrinks(setup: HydrationSetup): Drink[] {
  const all = [...BUILT_IN, ...setup.customDrinks]
  return setup.drinks.map((id) => all.find((d) => d.id === id)).filter((d): d is Drink => !!d)
}

// "11:00 and 15:30", "08:00, 13:00 and 16:30".
export function joinTimes(times: string[]) {
  return times.length <= 1 ? (times[0] ?? '') : `${times.slice(0, -1).join(', ')} and ${times[times.length - 1]}`
}

const COUNT = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']

// "two more glasses", "one more glass".
export function moreGlasses(ml: number) {
  const n = Math.max(1, Math.round(ml / GLASS_ML))
  return `${COUNT[n] ?? n} more ${n === 1 ? 'glass' : 'glasses'}`
}

export function mirrorSlots(setup: HydrationSetup, wake: string, quiet: string) {
  return defaultSlots(setup.anchor, wake, setup.doctorLimit)
    .filter((t) => setup.doctorLimit || t <= quiet)
    .sort()
}

export function buildMirror(setup: HydrationSetup, ctx: MirrorContext): HydrationMirror {
  const { now, wake = DEFAULT_WAKE, quiet = '20:00', importedDays = 0 } = ctx
  const target = setup.targetMl ?? DEFAULT_TARGET
  const L = formatLitres(target)
  const doctor = setup.doctorLimit
  const connected = setup.health === 'connected'
  const picked = pickedDrinks(setup)
  const ids = new Set(setup.drinks)

  const headline = doctor ? `Your limit is ${L}.` : `Your target is ${L}.`
  const sub = doctor
    ? "Your doctor's number. We'll help you stay inside it."
    : `About ${glasses(target)} glasses a day. ${connected ? `Built from ${importedDays} days and your answers.` : 'Built from your answers.'}`

  const strength =
    setup.anchor === 'track'
      ? connected
        ? `You logged water on ${importedDays} of the last 28 days. You already keep count.`
        : "You already keep count. Now it's one tap."
      : ids.has('water')
        ? "Water is already part of your day. That's the hardest habit, and you have it."
        : ids.has('tea') || ids.has('sparkling')
          ? `${ids.has('tea') ? 'Tea' : 'Sparkling water'} counts fully, so you're closer than you think.`
          : ids.has('coffee')
            ? "Your coffee counts too. Most people don't know that."
            : "Here's your starting point."

  // "Mostly sweet" by usual volume: a sports drink outweighs a coffee.
  const pickedMl = picked.reduce((s, d) => s + d.ml, 0)
  const sweetMl = picked.filter((d) => d.sweet).reduce((s, d) => s + d.ml, 0)
  const avg = setup.healthAvgMl
  const gap = doctor
    ? "We'll show how close you are to your limit, and never push past it."
    : connected && avg !== null && avg < target
      ? `You average ${formatLitres(avg)}. About ${moreGlasses(target - avg)} a day closes the gap.`
      : picked.length > 0 && sweetMl * 2 >= pickedMl && sweetMl > 0
        ? 'Most of what you drink is sweet. Swapping one a day for water is an easy first win.'
        : picked.length > 0 && !ids.has('water')
          ? 'No plain water yet. A glass with breakfast is the easiest place to start.'
          : setup.anchor === 'notAtAll'
            ? "You don't keep count yet, so we'll check in at three moments in your day."
            : 'Your first week shows when in the day you drink, and when you go quiet.'

  const slots = mirrorSlots(setup, wake, quiet)
  const next = nextSlot(
    slots.map((time) => ({ time, on: true })),
    now,
  )
  const firstName = picked[0] ? (picked[0].source === 'builtin' ? picked[0].name.toLowerCase() : picked[0].name) : 'water'

  let firstStep: HydrationMirror['firstStep']
  if (doctor) {
    firstStep = {
      time: slots[0],
      a: 'A daily status, not a nudge to drink more.',
      b: `You'll see how much of your ${L} is left.`,
      cta: next ? `Remind me at ${slots[0]}` : 'Set for tomorrow',
      tomorrow: !next,
    }
  } else if (!next) {
    firstStep = {
      time: slots[0],
      a: 'First glass, tomorrow morning.',
      b: 'Day 1 starts tomorrow. No catching up tonight.',
      cta: 'Set for tomorrow',
      tomorrow: true,
    }
  } else if (setup.anchor === 'track') {
    firstStep = {
      time: next,
      a: 'Halfway check.',
      b: `If you're under ${formatLitres(target / 2)} by then, we'll tell you. Otherwise you won't hear from us.`,
      cta: `Remind me at ${next}`,
      tomorrow: false,
    }
  } else {
    firstStep = {
      time: next,
      a: `A glass of ${firstName}.`,
      b: 'Halfway by 14:00 keeps the evening light.',
      cta: `Remind me at ${next}`,
      tomorrow: false,
    }
  }

  return {
    headline,
    sub,
    strength,
    gapLabel: doctor ? 'How we help' : 'Gap',
    gap,
    firstStep,
    slots,
    hint: `We'll nudge you at ${joinTimes(slots)}. Nothing after ${quiet}.`,
  }
}

type CreateContext = { wake?: string }

export function createHydrationActive(setup: HydrationSetup, reminderOn: boolean, now: Date, ctx: CreateContext = {}): HydrationActive {
  const wake = ctx.wake ?? DEFAULT_WAKE
  const today = hydrationDay(now)
  const slots = defaultSlots(setup.anchor, wake, setup.doctorLimit)
  // Built ins first, then own drinks; Water leads when nothing picked counts (e.g. only Beer).
  const ordered = [...pickedDrinks(setup).filter((d) => d.source === 'builtin'), ...pickedDrinks(setup).filter((d) => d.source !== 'builtin')]
  const picked = ordered.some((d) => d.counts) ? ordered : [WATER, ...ordered]
  // Set up after the last slot: day 1 is tomorrow, no catching up tonight.
  const startedAt = nextSlot(slots.map((time) => ({ time, on: true })), now) ? today : addDays(today, 1)
  return {
    startedAt,
    targetMl: setup.targetMl ?? DEFAULT_TARGET,
    doctorLimit: setup.doctorLimit,
    drinks: picked.slice(0, QUICK_LOG_MAX),
    logs: {},
    imported: setup.health === 'connected' ? importedHealth(today) : {},
    slots: slots.map((time) => ({ time, on: true })),
    reminderOn,
    heat: 'unasked',
    notToday: [],
    fired: [],
    asked: { drop: [] },
    seenCoachMark: false,
  }
}
