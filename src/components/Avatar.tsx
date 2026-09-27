import { useEffect, useRef } from 'react'

const LONG_PRESS_MS = 700

type AvatarProps = {
  initial: string
  onLongPress: () => void
}

export function Avatar({ initial, onLongPress }: AvatarProps) {
  const timer = useRef<number | null>(null)

  const cancel = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  const start = () => {
    cancel()
    timer.current = window.setTimeout(() => {
      timer.current = null
      onLongPress()
    }, LONG_PRESS_MS)
  }

  useEffect(() => cancel, [])

  return (
    <button
      type="button"
      aria-label="Profile"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => {
        event.preventDefault()
        cancel()
        onLongPress()
      }}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-tint text-base font-semibold text-text select-none [-webkit-touch-callout:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {initial}
    </button>
  )
}
