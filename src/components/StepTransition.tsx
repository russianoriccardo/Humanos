import { useEffect, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react'

type StepTransitionProps = {
  stepKey: string | number
  direction: 1 | -1
  fade?: boolean
  children: ReactNode
}

function startStyle(direction: 1 | -1, fade: boolean): CSSProperties {
  return { transform: fade ? 'none' : `translateX(${direction * 100}%)`, opacity: 0 }
}

// State flips via effects (not rAF) so the final position never depends on a paint loop running.
export function StepTransition({ stepKey, direction, fade = false, children }: StepTransitionProps) {
  const [style, setStyle] = useState<CSSProperties>(() => startStyle(direction, fade))

  useLayoutEffect(() => {
    setStyle(startStyle(direction, fade))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey])

  useEffect(() => {
    setStyle({ transform: 'translateX(0)', opacity: 1 })
  }, [stepKey])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div key={stepKey} className="step-transition h-full transition-[transform,opacity] duration-300 ease-out" style={style}>
        {children}
      </div>
    </div>
  )
}
