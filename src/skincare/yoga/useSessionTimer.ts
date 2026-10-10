import { useCallback, useEffect, useRef, useState } from 'react'
import type { YogaSession } from './faceYoga.content'

export type Segment = { exIndex: number; phase: 'prep' | 'work'; seconds: number }

export function segmentsOf(session: YogaSession): Segment[] {
  return session.exercises.flatMap((ex, exIndex) => [
    { exIndex, phase: 'prep' as const, seconds: session.prepSeconds },
    { exIndex, phase: 'work' as const, seconds: ex.seconds },
  ])
}

const TICK_MS = 200

function buzz() {
  try {
    navigator.vibrate?.(35)
  } catch {
    // Not supported (iOS Safari): silent.
  }
}

// Elapsed time is measured from performance.now() deltas, not tick counts, so throttled timers
// (background tabs, low-power mode) don't stretch the session.
export function useSessionTimer(session: YogaSession, onFinish: () => void) {
  const segments = useRef(segmentsOf(session)).current
  const [segIndex, setSegIndex] = useState(0)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [paused, setPaused] = useState(false)
  const finished = segIndex >= segments.length

  const segRef = useRef(0)
  const elapsedRef = useRef(0)
  const lastRef = useRef(performance.now())
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  const goTo = useCallback(
    (next: number, haptic: boolean) => {
      segRef.current = next
      elapsedRef.current = 0
      lastRef.current = performance.now()
      setSegIndex(next)
      setElapsedMs(0)
      if (haptic) buzz()
      if (next >= segments.length) onFinishRef.current()
    },
    [segments.length],
  )

  useEffect(() => {
    if (paused || finished) return
    lastRef.current = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      elapsedRef.current += now - lastRef.current
      lastRef.current = now
      const seg = segments[segRef.current]
      if (seg && elapsedRef.current >= seg.seconds * 1000) goTo(segRef.current + 1, true)
      else setElapsedMs(elapsedRef.current)
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [paused, finished, segments, goTo])

  const current = segments[Math.min(segIndex, segments.length - 1)]
  const remaining = finished ? 0 : Math.max(0, Math.ceil(current.seconds - elapsedMs / 1000))

  return {
    segment: current,
    exercise: session.exercises[current.exIndex],
    remaining,
    progress: finished ? 1 : Math.min(1, elapsedMs / (current.seconds * 1000)),
    paused,
    finished,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    skip: () => goTo(segRef.current + 1, false),
  }
}
