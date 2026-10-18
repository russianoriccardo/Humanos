// The sleep plan: pure functions over the setup answers. Clock values are 'HH:MM', 24h, and every
// calculation wraps around midnight.
import { dateKey, daysBetween, formatClock, parseClock } from '../lib/dates'
import { makeReminder } from '../services/reminders'
import type { Reminder, SleepActive, SleepAnchor, SleepIntent, SleepSetup, SleepTab } from '../state/appState'

export const SLEEP_NEED_MINUTES = 7 * 60 + 30
export const PLAN_STEP_MINUTES = 15
export const WIND_DOWN_MINUTES = 30
const DAY = 24 * 60

export const INTENTS: { id: SleepIntent; title: string; description: string }[] = [
  { id: 'energy', title: 'More energy', description: 'Stay sharp into the afternoon' },
  { id: 'fallAsleep', title: 'Fall asleep faster', description: 'Less time lying awake' },
  { id: 'fewerWakeups', title: 'Fewer wake ups', description: 'Sleep through the night' },
  { id: 'mornings', title: 'Easier mornings', description: 'Get up without the fight' },
]

const wrap = (minutes: number) => ((minutes % DAY) + DAY) % DAY

export const shiftClock = (clock: string, minutes: number) => formatClock(wrap(parseClock(clock) + minutes))

// Minutes from bedtime to wake, across midnight. 0 when they're the same.
export function windowMinutes(bedtime: string, wake: string) {
  return wrap(parseClock(wake) - parseClock(bedtime))
}

// 400 → "6h 40m", 420 → "7h", 17 → "17m".
export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export type WindowCheck = 'same' | 'short' | 'long' | 'ok'

export function checkWindow(bedtime: string, wake: string): WindowCheck {
  const window = windowMinutes(bedtime, wake)
  if (window === 0) return 'same'
  if (window < 4 * 60) return 'short'
  if (window > 12 * 60) return 'long'
  return 'ok'
}

// Short window: the goal is the lights out that leaves 7h 30m before the alarm. Otherwise keep the bedtime.
export function goalFor(bedtime: string, wake: string) {
  return windowMinutes(bedtime, wake) < SLEEP_NEED_MINUTES ? shiftClock(wake, -SLEEP_NEED_MINUTES) : bedtime
}

type Plan = { planStart: string; goal: string }

// How many minutes the goal sits before the starting lights out.
function minutesToGoal({ planStart, goal }: Plan) {
  return wrap(parseClock(planStart) - parseClock(goal))
}

// Lights out moves 15 minutes earlier each week, never past the goal.
export function lightsOutFor(plan: Plan, week: number) {
  return shiftClock(plan.planStart, -Math.min(PLAN_STEP_MINUTES * Math.max(0, week), minutesToGoal(plan)))
}

// Weeks until lights out reaches the goal. Week 1 carries the first shift.
export function planWeeks(plan: Plan) {
  return Math.max(1, Math.ceil(minutesToGoal(plan) / PLAN_STEP_MINUTES))
}

// Minutes still to go from a lights out to the goal.
export const minutesFromGoal = (lightsOut: string, goal: string) => wrap(parseClock(lightsOut) - parseClock(goal))

const ANCHOR_LINE: Record<SleepAnchor | 'none', string> = {
  well: 'A good base. Our job is to protect it.',
  fine: 'A solid base with room to gain.',
  badly: 'A rough stretch, so we start small.',
  none: "Here's your starting point.",
}

export type SleepMirror = {
  window: number
  short: boolean
  goal: string
  lightsOut: string
  nudgeAt: string
  headline: string
  subtitle: string
  strength: string
  gap: string
  firstStep: { time: string; body: string; cta: string }
}

export function buildMirror(setup: SleepSetup): SleepMirror {
  const bedtime = setup.bedtime ?? '23:00'
  const wake = setup.wake ?? '07:00'
  const window = windowMinutes(bedtime, wake)
  const short = window < SLEEP_NEED_MINUTES
  const goal = goalFor(bedtime, wake)
  const lightsOut = short ? lightsOutFor({ planStart: bedtime, goal }, 1) : bedtime
  const intent = INTENTS.find((i) => i.id === setup.intents[0])?.title.toLowerCase() ?? 'rested days'
  return {
    window,
    short,
    goal,
    lightsOut,
    nudgeAt: shiftClock(lightsOut, -WIND_DOWN_MINUTES),
    headline: `Roughly ${formatDuration(window)} on weekdays.`,
    subtitle: `${ANCHOR_LINE[setup.anchor ?? 'none']} Built from your answers.`,
    strength: 'You know your weekday rhythm. A steady wake time is the anchor every sleep plan builds on.',
    gap: short
      ? `For ${intent} most adults need about 7h 30m. Your ${wake} alarm leaves room for ${formatDuration(window)}.`
      : 'Hard mornings with enough hours usually point to light and timing, not to how long you sleep.',
    firstStep: short
      ? {
          time: lightsOut,
          body: `Lights out 15 minutes earlier tonight. One small shift a week until ${goal}.`,
          cta: 'Set for tonight',
        }
      : {
          time: shiftClock(wake, 30),
          body: 'Daylight within 30 minutes of waking. Curtains open, or a few minutes outside.',
          cta: 'Set for tomorrow',
        },
  }
}

export function createSleepActive(setup: SleepSetup, reminderOn: boolean, today = dateKey()): SleepActive {
  const bedtime = setup.bedtime ?? '23:00'
  const wake = setup.wake ?? '07:00'
  return {
    startedAt: today,
    planStart: bedtime,
    goal: goalFor(bedtime, wake),
    wake,
    checkIns: {},
    windDown: {},
    sessions: [],
    reminderOn,
    seenCoachMark: false,
  }
}

// The next time `clock` comes round after `from`.
export function nextAt(clock: string, from: Date) {
  const minutes = parseClock(clock)
  const at = new Date(from)
  at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)
  if (at.getTime() <= from.getTime()) at.setDate(at.getDate() + 1)
  return at
}

// Tonight's wind down nudge and tomorrow's check in. A nudge after midnight still belongs to the
// night that started the evening before.
export function sleepReminders(lightsOut: string, wake: string, now = new Date()): Reminder[] {
  const nudge = nextAt(shiftClock(lightsOut, -WIND_DOWN_MINUTES), now)
  const checkIn = nextAt(shiftClock(wake, 15), nudge)
  const night = new Date(nudge)
  if (night.getHours() < 12) night.setDate(night.getDate() - 1)
  return [
    makeReminder(
      `sleep:winddown:${dateKey(night)}`,
      nudge.toISOString(),
      'Time to wind down',
      `Lights out at ${lightsOut}. Dim the lights and put screens away.`,
    ),
    makeReminder(`sleep:checkin:${dateKey(checkIn)}`, checkIn.toISOString(), 'How did you sleep?', "Ten seconds. It's what makes your plan smarter."),
  ]
}

export const checkInMinutes = (checkIn: { lightsOut: string; wake: string }) => windowMinutes(checkIn.lightsOut, checkIn.wake)

// Night 1 is the setup day.
export const nightNumber = (active: SleepActive, today: string) => daysBetween(active.startedAt, today) + 1

// Week 1 already carries the first 15 minute shift, matching the setup's "15 minutes earlier tonight".
export const planWeekFor = (night: number) => Math.floor((Math.max(1, night) - 1) / 7) + 1

export const tonightLightsOut = (active: SleepActive, today: string) => lightsOutFor(active, planWeekFor(nightNumber(active, today)))

// The night a moment belongs to: until 05:00 it's still the previous evening's night.
export function nightKeyFor(now = new Date()) {
  const at = new Date(now)
  if (at.getHours() < 5) at.setDate(at.getDate() - 1)
  return dateKey(at)
}

// New weekday times mid plan. Night numbering carries on; tonight takes the first shift from the new
// bedtime, then the plan keeps moving 15 minutes a week toward the new goal.
export function retime(active: SleepActive, bedtime: string, wake: string, today: string): SleepActive {
  const elapsed = planWeekFor(nightNumber(active, today)) - 1
  return { ...active, planStart: shiftClock(bedtime, PLAN_STEP_MINUTES * elapsed), goal: goalFor(bedtime, wake), wake }
}

// Mornings first while last night is still unlogged; Tonight otherwise.
export function defaultSleepTab(active: SleepActive | null, now = new Date()): SleepTab {
  const today = dateKey(now)
  if (!active || active.startedAt === today) return 'tonight'
  return now.getHours() < 11 && !active.checkIns[today] ? 'mornings' : 'tonight'
}
