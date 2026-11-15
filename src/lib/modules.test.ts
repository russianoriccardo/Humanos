import { describe, expect, it } from 'vitest'
import { MAX_FREE_MODULES, toggleModuleWithCap } from './modules'

describe('toggleModuleWithCap', () => {
  it('adds under the cap', () => {
    expect(toggleModuleWithCap(['skincare'], 'sleep')).toEqual({ next: ['skincare', 'sleep'], hitCap: false })
  })

  it('removes a picked module', () => {
    expect(toggleModuleWithCap(['skincare', 'sleep'], 'skincare')).toEqual({ next: ['sleep'], hitCap: false })
  })

  it('keeps the list and flags the cap when adding one too many', () => {
    const full = ['skincare', 'sleep', 'hydration']
    expect(full).toHaveLength(MAX_FREE_MODULES)
    const result = toggleModuleWithCap(full, 'teeth')
    expect(result).toEqual({ next: full, hitCap: true })
    expect(result.next).toBe(full)
  })

  it('frees a place when removing at the cap', () => {
    const { next } = toggleModuleWithCap(['skincare', 'sleep', 'hydration'], 'sleep')
    expect(next).toEqual(['skincare', 'hydration'])
    expect(toggleModuleWithCap(next, 'teeth')).toEqual({ next: ['skincare', 'hydration', 'teeth'], hitCap: false })
  })
})
