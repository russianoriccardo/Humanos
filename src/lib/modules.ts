import { Droplet, Leaf, Dumbbell, Moon, Brain, GlassWater } from 'lucide-react'
import type { ComponentType } from 'react'
import { ToothIcon } from '../components/icons/ToothIcon'
import { CycleIcon } from '../components/icons/CycleIcon'
import type { Goal, Module } from '../onboarding/types'

type IconComponent = ComponentType<{ size?: number; className?: string }>

export const MODULE_ICONS: Record<string, IconComponent> = {
  skincare: Droplet,
  cycle: CycleIcon,
  nutrition: Leaf,
  teeth: ToothIcon,
  fitness: Dumbbell,
  sleep: Moon,
  mind: Brain,
  hydration: GlassWater,
}

export const MODULES: Module[] = [
  { id: 'skincare', name: 'Skincare' },
  { id: 'cycle', name: 'Cycle' },
  { id: 'nutrition', name: 'Nutrition' },
  { id: 'teeth', name: 'Teeth' },
  { id: 'fitness', name: 'Fitness' },
  { id: 'sleep', name: 'Sleep' },
  { id: 'mind', name: 'Mind' },
  { id: 'hydration', name: 'Hydration' },
]

export const GOALS: Goal[] = [
  {
    id: 'better-skin',
    title: 'Better skin',
    description: 'Routines, tracking & reminders',
    moduleId: 'skincare',
  },
  {
    id: 'cycle-awareness',
    title: 'Cycle awareness',
    description: 'Predictions & phase insights',
    moduleId: 'cycle',
  },
  {
    id: 'oral-care',
    title: 'Oral care',
    description: 'Daily habits that stick',
    moduleId: 'teeth',
  },
  {
    id: 'eat-better',
    title: 'Eat better',
    description: 'Gentle nutrition guidance',
    moduleId: 'nutrition',
  },
  {
    id: 'move-more',
    title: 'Move more',
    description: 'Fitness that fits your life',
    moduleId: 'fitness',
  },
  {
    id: 'sleep-recovery',
    title: 'Sleep & recovery',
    description: 'Wind down, wake up better',
    moduleId: 'sleep',
  },
]

export function suggestedModuleIds(goalIds: string[]): string[] {
  return GOALS.filter((goal) => goalIds.includes(goal.id)).map((goal) => goal.moduleId)
}

export function moduleName(id: string) {
  return MODULES.find((m) => m.id === id)?.name ?? id
}

// Dashboard order: Skincare first when picked (it's the only module with a setup flow today).
// Falls back to Skincare alone if onboarding's module step was skipped.
export function orderedModules(picked: string[]): string[] {
  const list = picked.length > 0 ? picked : ['skincare']
  return list.includes('skincare') ? ['skincare', ...list.filter((id) => id !== 'skincare')] : list
}
