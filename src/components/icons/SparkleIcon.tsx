type IconProps = {
  size?: number
  className?: string
}

export function SparkleIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.5c.7 5.4 4.1 8.8 9.5 9.5-5.4.7-8.8 4.1-9.5 9.5-.7-5.4-4.1-8.8-9.5-9.5 5.4-.7 8.8-4.1 9.5-9.5z" />
    </svg>
  )
}
