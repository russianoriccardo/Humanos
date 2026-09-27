type StyleProps = Partial<Record<'transform' | 'opacity' | 'strokeDashoffset', string>>

// Plays a CSS transition from `from` to the element's stylesheet values.
// React flushes effects before paint for click-driven updates, so setting a start state and an end
// state in effects lands in one style pass and never animates. Forcing a reflow between them does.
export function playEnter(el: HTMLElement | SVGElement, from: StyleProps, to: StyleProps = {}) {
  const style = el.style
  style.transition = 'none'
  Object.assign(style, from)
  void (el as HTMLElement).getBoundingClientRect()
  style.transition = ''
  for (const key of Object.keys(from) as (keyof StyleProps)[]) style[key] = to[key] ?? ''
}
