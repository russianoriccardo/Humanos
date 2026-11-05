import { useRef, useState, type ReactNode } from 'react'

const REVEAL = 84

type SwipeRowProps = {
  label: string
  // What the revealed button says ("Delete", "Remove").
  action: string
  onTap: () => void
  onAction: () => void
  children: ReactNode
}

// Swipe left to reveal a red action; tap to open. Vertical scrolling still works (touch-action: pan-y).
export function SwipeRow({ label, action, onTap, onAction, children }: SwipeRowProps) {
  const [x, setX] = useState(0)
  const drag = useRef<{ start: number; base: number; moved: boolean } | null>(null)

  return (
    <div className="relative overflow-hidden">
      <button
        type="button"
        tabIndex={x === 0 ? -1 : 0}
        aria-hidden={x === 0}
        onClick={onAction}
        className="absolute inset-y-0 right-0 flex w-[84px] items-center justify-center bg-warning text-sm font-semibold text-white"
      >
        {action}
      </button>
      <button
        type="button"
        aria-label={label}
        style={{ transform: `translateX(${x}px)`, touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          drag.current = { start: e.clientX, base: x, moved: false }
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (!d) return
          const dx = e.clientX - d.start
          if (Math.abs(dx) > 6) {
            d.moved = true
            e.currentTarget.setPointerCapture?.(e.pointerId)
          }
          if (d.moved) setX(Math.max(-REVEAL, Math.min(0, d.base + dx)))
        }}
        onPointerUp={() => {
          const d = drag.current
          drag.current = null
          if (d?.moved) setX((v) => (v < -REVEAL / 2 ? -REVEAL : 0))
        }}
        onPointerCancel={() => {
          drag.current = null
          setX(0)
        }}
        onClick={() => {
          // A click after a drag is the end of the swipe, not a tap.
          if (x !== 0) setX(0)
          else onTap()
        }}
        className="relative flex w-full items-center gap-3 bg-surface py-2.5 text-left transition-transform duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none"
      >
        {children}
      </button>
    </div>
  )
}
