import { useEffect, useRef } from 'react'
import { Check } from 'lucide-react'

type UndoToastProps = {
  message: string
  onUndo: () => void
  onDone: () => void
  duration?: number
}

// Bottom toast with an Undo button, for every log and delete. Sits above any footer.
export function UndoToast({ message, onUndo, onDone, duration = 5000 }: UndoToastProps) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    const timer = window.setTimeout(() => onDoneRef.current(), duration)
    return () => window.clearTimeout(timer)
  }, [duration, message])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-28 z-50 flex justify-center px-6">
      <div className="pointer-events-auto flex animate-fade items-center gap-3 rounded-full bg-panel py-1.5 pr-1.5 pl-4 text-on-panel shadow-lg">
        <Check size={16} strokeWidth={2.5} className="shrink-0 text-accent" aria-hidden />
        <span className="text-sm font-medium">{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="h-9 rounded-full px-3 text-sm font-semibold text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Undo
        </button>
      </div>
    </div>
  )
}
