import { describe, expect, it } from 'vitest'
import { sessionSeconds, todaysSession } from './faceYoga.content'
import { thisWeek, yogaStreak } from './stats'

const iso = (key: string) => new Date(`${key}T08:00:00`).toISOString()

describe('face yoga stats', () => {
  it('the session is exactly 6 minutes with prep', () => {
    expect(sessionSeconds(todaysSession)).toBe(360)
  })

  it('counts a streak ending today or yesterday', () => {
    const sessions = ['2026-10-07', '2026-10-08', '2026-10-09'].map(iso)
    expect(yogaStreak(sessions, '2026-10-09')).toBe(3)
    expect(yogaStreak(sessions, '2026-10-10')).toBe(3)
    expect(yogaStreak(sessions, '2026-10-11')).toBe(0)
  })

  it('ignores duplicate sessions on one day', () => {
    expect(yogaStreak(['2026-10-10', '2026-10-10', '2026-10-09'].map(iso), '2026-10-10')).toBe(2)
  })

  it('builds Monday→Sunday with today and future marked', () => {
    // 2026-10-10 is a Saturday.
    const week = thisWeek(['2026-10-05', '2026-10-08', '2026-10-10'].map(iso), '2026-10-10')
    expect(week.days.map((d) => d.key)).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11',
    ])
    expect(week.count).toBe(3)
    expect(week.days[5]).toMatchObject({ isToday: true, done: true })
    expect(week.days[6].future).toBe(true)
  })
})
