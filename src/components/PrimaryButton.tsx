import type { ButtonHTMLAttributes } from 'react'

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>

export function PrimaryButton({ className = '', disabled, ...props }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'h-14 w-full rounded-full text-base font-semibold',
        'transition-transform duration-150 motion-safe:active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        disabled
          ? 'cursor-not-allowed bg-neutral-300 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-500'
          : 'cursor-pointer bg-cta text-cta-text shadow-none',
        className,
      ].join(' ')}
      {...props}
    />
  )
}
