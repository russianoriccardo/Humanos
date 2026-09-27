import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { playEnter } from '../lib/motion'

type StepTransitionProps = {
  stepKey: string | number
  direction: 1 | -1
  fade?: boolean
  children: ReactNode
}

export function StepTransition({ stepKey, direction, fade = false, children }: StepTransitionProps) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (ref.current) playEnter(ref.current, { transform: fade ? 'none' : `translateX(${direction * 100}%)`, opacity: '0' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey])

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div key={stepKey} ref={ref} className="step-transition h-full transition-[transform,opacity] duration-300 ease-out">
        {children}
      </div>
    </div>
  )
}
