import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

type SheetProps = {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

export function Sheet({ title, subtitle, onClose, children }: SheetProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-panel/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[88%] flex-col rounded-t-[28px] border-t border-border bg-bg"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-2">
          <div>
            <p className="text-base font-semibold text-text">{title}</p>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="-mt-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-6 pt-2 pb-8">{children}</div>
      </div>
    </div>
  )
}
