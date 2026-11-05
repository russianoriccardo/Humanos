import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { playEnter } from '../lib/motion'

type ToastProps = {
  message: string
  detail?: string
  icon?: 'check' | 'bell'
  onDone: () => void
  duration?: number
  // One quick action, e.g. "+250 ml water" on a hydration nudge.
  action?: { label: string; onClick: () => void }
}

export function Toast({ message, detail, icon = 'check', onDone, duration = 3000, action }: ToastProps) {
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

  const Icon = icon === 'bell' ? Bell : Check

  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-3 z-50 flex justify-center px-6">
      <div
        ref={ref}
        style={leaving ? { transform: 'translateY(-160%)', opacity: 0 } : undefined}
        className={[
          'motion-slide flex items-center gap-2.5 border border-border bg-surface py-2.5 pr-5 pl-3 transition-[transform,opacity] duration-300 ease-out',
          action ? 'pointer-events-auto' : '',
          detail ? 'rounded-[20px]' : 'rounded-full',
        ].join(' ')}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
          <Icon size={14} strokeWidth={icon === 'bell' ? 2.4 : 3} />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-text">{message}</span>
          {detail && <span className="text-sm text-muted">{detail}</span>}
        </span>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick()
              setLeaving(true)
            }}
            className="ml-1 h-10 shrink-0 rounded-full bg-cta px-3 text-sm font-semibold text-cta-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
