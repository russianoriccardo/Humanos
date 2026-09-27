import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { playEnter } from '../lib/motion'

type ToastProps = {
  message: string
  onDone: () => void
  duration?: number
}

export function Toast({ message, onDone, duration = 3000 }: ToastProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [leaving, setLeaving] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useLayoutEffect(() => {
    if (ref.current) playEnter(ref.current, { transform: 'translateY(-160%)', opacity: '0' })
  }, [])

  useEffect(() => {
    const hide = window.setTimeout(() => setLeaving(true), duration)
    const done = window.setTimeout(() => onDoneRef.current(), duration + 320)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(done)
    }
  }, [duration])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center px-6">
      <div
        ref={ref}
        style={leaving ? { transform: 'translateY(-160%)', opacity: 0 } : undefined}
        className="motion-slide flex items-center gap-2.5 rounded-full border border-border bg-surface py-2.5 pr-5 pl-3 transition-[transform,opacity] duration-300 ease-out"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent">
          <Check size={14} strokeWidth={3} />
        </span>
        <span className="text-sm font-semibold text-text">{message}</span>
      </div>
    </div>
  )
}
