import type { ButtonHTMLAttributes } from 'react'

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function SecondaryButton({ className = '', ...props }: SecondaryButtonProps) {
  return (
    <button
      type="button"
      className={[
        'h-11 w-full rounded-full text-base font-medium text-muted',
        'transition-transform duration-150 motion-safe:active:scale-[0.98]',
        'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      ].join(' ')}
      {...props}
    />
  )
}
