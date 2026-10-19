// Wind down sessions. Breathing sessions loop a pattern across 4 rounds; body sessions are timed text
// steps; sounds have no audio in the MVP.

export type SessionGroup = 'Breathing' | 'Body' | 'Sound'

export type BreathPhase = { word: 'Breathe in' | 'Hold' | 'Breathe out'; seconds: number; size: 'big' | 'small' }

export type SleepSession = {
  id: string
  title: string
  blurb: string
  group: SessionGroup
  minutes?: number
  // What the library shows on the right when it isn't "{minutes} min".
  lengthLabel?: string
  // Off the library list; offered only when it fits the night (Legs up the wall after late training).
  situational?: boolean
  pattern?: BreathPhase[]
  steps?: { text: string; seconds: number }[]
}

export const BREATH_ROUNDS = 4

const inhale = (seconds: number): BreathPhase => ({ word: 'Breathe in', seconds, size: 'big' })
const exhale = (seconds: number): BreathPhase => ({ word: 'Breathe out', seconds, size: 'small' })
const hold = (seconds: number, size: BreathPhase['size']): BreathPhase => ({ word: 'Hold', seconds, size })

export const SESSIONS: SleepSession[] = [
  {
    id: 'breath478',
    title: '4 7 8 breathing',
    blurb: 'Calms a racing mind',
    group: 'Breathing',
    minutes: 4,
    pattern: [inhale(4), hold(7, 'big'), exhale(8)],
  },
  {
    id: 'box',
    title: 'Box breathing',
    blurb: 'Steady, even rounds',
    group: 'Breathing',
    minutes: 5,
    pattern: [inhale(4), hold(4, 'big'), exhale(4), hold(4, 'small')],
  },
  {
    id: 'yoga',
    title: 'Sleep yoga',
    blurb: 'Six gentle floor stretches',
    group: 'Body',
    minutes: 10,
    steps: [
      "Child's pose. Knees wide, arms long, forehead down. Let your back soften.",
      'Cat and cow. Round your back as you breathe out, arch it as you breathe in.',
      'Lying twist. On your back, let both knees drop to one side. Switch halfway.',
      'Happy baby. Hold your feet, knees toward your armpits. Rock gently.',
      'Reclined butterfly. Soles together, knees falling open, hands on your belly.',
      'Rest flat on your back, palms up. Let the floor hold you.',
    ].map((text) => ({ text, seconds: 100 })),
  },
  {
    id: 'bodyScan',
    title: 'Body scan',
    blurb: 'Release tension head to toe',
    group: 'Body',
    minutes: 8,
    steps: [
      'Close your eyes. Notice your face. Let your jaw and forehead go soft.',
      'Move to your neck and shoulders. Let them drop away from your ears.',
      'Your arms and hands. Feel them heavy, fingers loose.',
      'Your chest and back. Notice each breath, without changing it.',
      'Your belly. Let it rise and fall on its own.',
      'Your hips and thighs. Let them sink into the bed.',
      'Your knees and calves. Let go of any effort.',
      'Your feet. Feel them warm and heavy. Rest here.',
    ].map((text) => ({ text, seconds: 60 })),
  },
  {
    id: 'legsUp',
    title: 'Legs up the wall',
    blurb: 'A 5 minute reset after training',
    group: 'Body',
    minutes: 5,
    situational: true,
    steps: [
      'Sit sideways against a wall, then swing your legs up as you lie back.',
      'Let your arms rest open, palms up. Breathe slowly into your belly.',
      'Feel your legs drain and your hips grow heavy.',
      'Bend your knees, roll to one side and rest there before you sit up.',
    ].map((text) => ({ text, seconds: 75 })),
  },
  { id: 'rain', title: 'Rain on leaves', blurb: 'Fades out by itself', group: 'Sound', lengthLabel: '30 min' },
  { id: 'brownNoise', title: 'Brown noise', blurb: 'Covers street noise', group: 'Sound', lengthLabel: 'All night' },
]

export const sessionById = (id: string) => SESSIONS.find((s) => s.id === id)

export const sessionSeconds = (session: SleepSession) => (session.minutes ?? 0) * 60
