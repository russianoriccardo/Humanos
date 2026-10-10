type TabIntroProps = {
  eyebrow?: string
  title: string
  subtitle?: string
}

export function TabIntro({ eyebrow, title, subtitle }: TabIntroProps) {
  return (
    <div className="flex flex-col gap-1.5 pt-1">
      {eyebrow && <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{eyebrow}</p>}
      <h2 className="text-[24px] leading-tight font-bold text-text">{title}</h2>
      {subtitle && <p className="text-[15px] text-muted">{subtitle}</p>}
    </div>
  )
}
