import type { VerdictLevel } from '../engine/types'

// Good fit = gold, Use with care = warm orange, Not for you right now = muted.
export const LEVEL_COPY: Record<VerdictLevel, { label: string; badge: string }> = {
  good: { label: 'Good fit', badge: 'bg-accent text-on-accent' },
  care: { label: 'Use with care', badge: 'bg-warning-tint text-warning' },
  'not-now': { label: 'Not for you right now', badge: 'bg-tint text-text' },
}
