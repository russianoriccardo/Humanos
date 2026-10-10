import { useEffect, useState } from 'react'

const THRESHOLD = 150

// True while the on-screen keyboard is up. iOS shrinks only the visual viewport; Android with
// interactive-widget=resizes-content shrinks innerHeight too, so compare against the tallest
// innerHeight seen at this width as well.
export function useKeyboardOpen() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let width = window.innerWidth
    let tallest = window.innerHeight

    const update = () => {
      if (window.innerWidth !== width) {
        width = window.innerWidth
        tallest = window.innerHeight
      }
      tallest = Math.max(tallest, window.innerHeight)
      setOpen(vv.height < Math.max(window.innerHeight, tallest) - THRESHOLD)
    }

    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return open
}
