type IconProps = {
  size?: number
  className?: string
}

export function ToothIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3c-2.2 0-3.2 1.1-4.5 1.1-1.6 0-2.5-1-3.2-1C3.3 3.1 3 4 3 5.5c0 2.5.9 5 1.6 7.4.5 1.8.9 4.6 2.3 6.5.6.8 1.2 1.4 1.9 1.4.9 0 1.1-2.6 1.5-4 .3-1 .6-1.5 1.2-1.5s.9.5 1.2 1.5c.4 1.4.6 4 1.5 4 .7 0 1.3-.6 1.9-1.4 1.4-1.9 1.8-4.7 2.3-6.5C19.1 10.5 20 8 20 5.5c0-1.5-.3-2.4-1.3-2.4-.7 0-1.6 1-3.2 1C14.2 4.1 13.2 3 12 3z" />
    </svg>
  )
}
