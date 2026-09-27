import { MODULE_ICONS, MODULES } from '../lib/modules'
import { Screen } from '../components/Screen'

type ComingNextProps = {
  moduleId: string
  onBack: () => void
}

export function ComingNext({ moduleId, onBack }: ComingNextProps) {
  const module = MODULES.find((m) => m.id === moduleId)
  const Icon = MODULE_ICONS[moduleId]

  return (
    <Screen onBack={onBack}>
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        {Icon && (
          <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-tint text-accent">
            <Icon size={24} />
          </span>
        )}
        <h1 className="text-[26px] leading-tight font-bold">{module?.name ?? 'Module'} home</h1>
        <p className="max-w-[280px] text-base text-muted">Coming next — this is the screen we design after setup.</p>
      </div>
    </Screen>
  )
}
