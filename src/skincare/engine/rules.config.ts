// Every threshold the skincare engine uses. Tune here; the tests pin the behaviour.
import type { TipPriority } from './types'

export const rules = {
  today: {
    // UV reapply: peak UV inside the outdoor window at or above this.
    uvReapplyMin: 6,
    // "Low UV today" when the day's peak is below this.
    lowUvBelow: 3,
    // Barrier night: slept less than this (minutes) AND trained yesterday.
    barrierSleepMinutes: 6 * 60,
    // Current relative humidity (%) below = dry air, above = humid.
    dryHumidityBelow: 40,
    humidHumidityAbove: 75,
    // Resting heart rate this many bpm above the personal baseline = stressed (added for the stressed scenario).
    stressHrDelta: 8,
    maxTips: 3,
    priority: ['safety', 'barrier', 'comfort', 'info'] as TipPriority[],
  },

  // Product checks (Ask AI). See analyzeProduct.ts.
  product: {
    // "High on the list" = within the first N ingredients (INCI lists run highest concentration first).
    highInListTop: 5,
    // Two or more warnings with no goal benefit → "Not for you right now".
    notNowWarnings: 2,
    // Strong actives: twice a week when they'd clash or the air is dry, else three times.
    gentleDays: [2, 6],
    regularDays: [1, 3, 5],
  },

  // Glow score: baseline + what the logs say, capped per source. See glowScore.ts.
  glow: {
    baseline: 64,
    perRoutineNight: 1,
    routineNightsCap: 12,
    perSpfSunnyDay: 0.5,
    spfCap: 4,
    perYogaSession: 0.5,
    yogaCap: 4,
    // A night counts when at most this many of the planned evening steps were left out.
    nightTolerance: 1,
    // "Sunny" for SPF credit: daily UV peak at or above this.
    sunnyUvMin: 3,
  },
} as const
