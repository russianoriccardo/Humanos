import { formatClock } from '../../lib/dates'
import { eveningSteps } from '../routine'
import { rules } from './rules.config'
import type { AdjustedStep, Tip, TodayContext, TodayPlan } from './types'

const R = rules.today

export function formatUv(uv: number) {
  return String(Math.round(uv * 10) / 10)
}

export function formatSleep(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

// Highest hourly UV whose hour overlaps [start, end) minutes.
export function peakUvInWindow(hourly: { hour: number; uv: number }[], start: number, end: number) {
  const overlapping = hourly.filter((h) => h.hour * 60 < end && h.hour * 60 + 60 > start)
  return overlapping.length ? Math.max(...overlapping.map((h) => h.uv)) : 0
}

type Rule = { tip: Tip; apply?: (tonight: AdjustedStep[]) => AdjustedStep[] }

function skip(tonight: AdjustedStep[], id: string, note: string) {
  return tonight.map((s) => (s.id === id ? { ...s, status: 'skipped' as const, note } : s))
}

function evaluateRules(ctx: TodayContext, tonight: AdjustedStep[]): Rule[] {
  const { weather, health, now, outdoorWindow } = ctx
  const fired: Rule[] = []
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const window = `${formatClock(outdoorWindow.start)}–${formatClock(outdoorWindow.end)}`

  // Safety — UV while outside. Skipped once the window is over: a reminder for the past helps no one.
  if (weather && nowMinutes < outdoorWindow.end) {
    const peak = peakUvInWindow(weather.hourly, outdoorWindow.start, outdoorWindow.end)
    if (peak >= R.uvReapplyMin) {
      // Halfway through the time outside (12:30–13:30 → 13:00).
      const at = formatClock(Math.round((outdoorWindow.start + outdoorWindow.end) / 2))
      fired.push({
        tip: {
          id: 'uv-reapply',
          icon: 'sun',
          priority: 'safety',
          metric: `UV ${formatUv(peak)}`,
          source: `Weather · you're outside ${window}`,
          body: `UV is ${formatUv(peak)} and you're outside at lunch. Reapply SPF around ${at}.`,
          action: { kind: 'reminder', label: `Remind me at ${at}`, at },
          routineChanged: false,
        },
      })
    }
  }

  // Barrier — short sleep after training.
  if (health.sleepMinutes !== null && health.sleepMinutes < R.barrierSleepMinutes && health.trainedYesterday) {
    const slept = formatSleep(health.sleepMinutes)
    const retinoid = tonight.find((s) => s.active.includes('retinoid'))
    const acid = tonight.find((s) => s.active.includes('aha') || s.active.includes('bha'))
    const target = retinoid ?? acid
    const what = retinoid ? 'the retinol' : 'the exfoliant'
    fired.push({
      tip: {
        id: 'barrier-night',
        icon: 'moon',
        priority: 'barrier',
        metric: `${slept} sleep`,
        source: 'Sleep & training · trained yesterday',
        body: target
          ? `You slept ${slept} and trained yesterday. Skip ${what} tonight. Give your barrier a night off.`
          : `You slept ${slept} and trained yesterday. Keep tonight gentle. Your barrier could use a night off.`,
        routineChanged: !!target,
      },
      apply: target ? (steps) => skip(steps, target.id, 'Skipped · barrier night off') : undefined,
    })
  }

  // Comfort — air humidity.
  if (weather) {
    const rh = weather.current.humidity
    if (rh < R.dryHumidityBelow) {
      const moisturizer = tonight.find((s) => s.kind === 'moisturizer')
      const serum = tonight.find((s) => s.kind === 'serum')
      const reorder = !!moisturizer && !!serum && tonight.indexOf(serum) < tonight.indexOf(moisturizer)
      fired.push({
        tip: {
          id: 'dry-air',
          icon: 'humidity',
          priority: 'comfort',
          metric: `Humidity ${rh}%`,
          source: 'Weather · right now',
          body: reorder
            ? `Humidity dropped to ${rh}%. Your skin will feel tight. Moisturizer before serum tonight, not after.`
            : `Humidity dropped to ${rh}%. Your skin will feel tight. Don't skip moisturizer tonight.`,
          routineChanged: reorder,
        },
        apply: reorder
          ? (steps) => {
              const m = steps.find((s) => s.id === moisturizer.id)!
              const rest = steps.filter((s) => s.id !== moisturizer.id)
              const at = rest.findIndex((s) => s.id === serum.id)
              const moved: AdjustedStep = { ...m, status: m.status === 'skipped' ? m.status : 'moved', note: 'Moved up · dry air' }
              const out = [...rest.slice(0, at), moved, ...rest.slice(at)]
              return out.map((s) =>
                s.id === serum.id && s.status !== 'skipped' ? { ...s, status: 'moved', note: 'After moisturizer tonight' } : s,
              )
            }
          : undefined,
      })
    } else if (rh > R.humidHumidityAbove) {
      const oil = tonight.find((s) => s.kind === 'oil')
      fired.push({
        tip: {
          id: 'humid',
          icon: 'humidity',
          priority: 'comfort',
          metric: `Humidity ${rh}%`,
          source: 'Weather · right now',
          body: oil
            ? `It's humid (${rh}%). Go lighter tonight. Skip the face oil.`
            : `It's humid (${rh}%). Go lighter tonight. A thin layer of moisturizer is enough.`,
          routineChanged: !!oil,
        },
        apply: oil ? (steps) => skip(steps, oil.id, 'Skipped · humid tonight') : undefined,
      })
    }
  }

  // Comfort — elevated resting heart rate (no routine change).
  if (
    health.restingHr !== null &&
    health.restingHrBaseline !== null &&
    health.restingHr - health.restingHrBaseline >= R.stressHrDelta
  ) {
    fired.push({
      tip: {
        id: 'stress',
        icon: 'heart',
        priority: 'comfort',
        metric: `${health.restingHr} bpm resting`,
        source: `Health · your usual is ${health.restingHrBaseline}`,
        body: `Your resting heart rate is up (${health.restingHr} vs your usual ${health.restingHrBaseline}). Keep tonight simple. Cleanse, moisturize, sleep.`,
        routineChanged: false,
      },
    })
  }

  // Info — low UV day.
  if (weather && weather.uvMax < R.lowUvBelow) {
    fired.push({
      tip: {
        id: 'low-uv',
        icon: 'sun',
        priority: 'info',
        metric: `UV ${formatUv(weather.uvMax)}`,
        source: "Weather · today's peak",
        body: `Low UV today (${formatUv(weather.uvMax)}). Morning SPF is still enough.`,
        routineChanged: false,
      },
    })
  }

  return fired
}

export const CALM_TIP: Tip = {
  id: 'calm',
  icon: 'check',
  priority: 'info',
  metric: 'All clear',
  source: 'Weather, sleep & training',
  body: 'Nothing unusual today. Your routine as planned.',
  routineChanged: false,
}

export function buildToday(ctx: TodayContext): TodayPlan {
  const base: AdjustedStep[] = eveningSteps(ctx.routine, ctx.now.getDay()).map((s) => ({ ...s, status: 'planned' }))
  // Stable sort: priority first, rule order within a priority.
  const kept = evaluateRules(ctx, base)
    .map((rule, order) => ({ rule, order }))
    .sort((a, b) => R.priority.indexOf(a.rule.tip.priority) - R.priority.indexOf(b.rule.tip.priority) || a.order - b.order)
    .slice(0, R.maxTips)
    .map(({ rule }) => rule)

  // Only shown tips may change the routine, so every change on screen has a visible reason.
  const tonight = kept.reduce((steps, rule) => (rule.apply ? rule.apply(steps) : steps), base)
  return { tips: kept.length ? kept.map((r) => r.tip) : [CALM_TIP], tonight }
}
