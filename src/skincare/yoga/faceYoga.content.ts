// Face-yoga session content. Edit freely: the player and the Face yoga tab read everything from here.
// Each exercise gets `prepSeconds` of "get ready" first, so 4 × (15s + work) = 6 minutes.

export type YogaExercise = {
  id: string
  name: string
  seconds: number
  target: string
  instruction: string
}

export type YogaSession = {
  id: string
  title: string
  bestTime: string
  prepSeconds: number
  exercises: YogaExercise[]
  tip: string
  weeklyGoal: number
}

export const todaysSession: YogaSession = {
  id: 'depuff-lift',
  title: 'Depuff & lift',
  bestTime: 'Best right after cleansing, before serum.',
  prepSeconds: 15,
  weeklyGoal: 5,
  tip: 'A few drops of face oil let your fingers glide. Never drag dry skin.',
  exercises: [
    {
      id: 'jaw-release',
      name: 'Jaw release',
      seconds: 60,
      target: 'Softens a clenched jaw and the tension that comes with it',
      instruction:
        'Place your knuckles just under your cheekbones. Open your mouth slowly as you glide down toward the jaw, then close. Keep your shoulders low.',
    },
    {
      id: 'cheek-lift',
      name: 'Cheek lift',
      seconds: 90,
      target: 'Lifts the cheeks and wakes up circulation',
      instruction:
        'Smile with your mouth closed. Rest your fingertips on the tops of your cheeks and press gently upward toward your temples. Hold, breathe, release.',
    },
    {
      id: 'brow-smoother',
      name: 'Brow smoother',
      seconds: 60,
      target: 'Eases the lines that form between the brows',
      instruction:
        'Place two fingers between your brows. Sweep them outward along the brow bone to your temples, slowly, as if smoothing a page.',
    },
    {
      id: 'lymph-sweep',
      name: 'Lymph sweep',
      seconds: 90,
      target: 'Moves fluid away from the face to reduce morning puffiness',
      instruction:
        'With flat fingers, sweep from the center of your face outward to your ears, then down the sides of your neck to your collarbones. Light pressure only.',
    },
  ],
}

export function sessionSeconds(session: YogaSession) {
  return session.exercises.reduce((total, ex) => total + session.prepSeconds + ex.seconds, 0)
}
