import { useLayoutEffect, useRef } from 'react'
import { playEnter } from '../lib/motion'

type GlowScoreRingProps = {
  score: number | null
  size?: number
}

const STROKE = 5

export function GlowScoreRing({ score, size = 76 }: GlowScoreRingProps) {
  const radius = (size - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const progress = score === null ? 0 : Math.min(Math.max(score, 0), 100) / 100
  const arcRef = useRef<SVGCircleElement>(null)
  const dormant = score === null

  // The ring fills from empty when the score first appears ("wakes up").
  useLayoutEffect(() => {
    if (arcRef.current) playEnter(arcRef.current, { strokeDashoffset: String(circumference) })
  }, [dormant, circumference])

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        {score === null ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="3 5"
            className="stroke-muted"
          />
        ) : (
          <>
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={STROKE} className="stroke-tint" />
            <circle
              ref={arcRef}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              className="stroke-accent transition-[stroke-dashoffset] duration-1000 ease-out"
            />
          </>
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-text">
        {score === null ? '—' : score}
      </span>
    </div>
  )
}
