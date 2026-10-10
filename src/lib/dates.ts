// Local-calendar date helpers. Keys are 'YYYY-MM-DD' in the device's time zone.

export function dateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Noon avoids DST edges when doing day arithmetic.
export function fromKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12)
}

export function addDays(key: string, days: number) {
  const date = fromKey(key)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

export function daysBetween(fromKeyStr: string, toKeyStr: string) {
  return Math.round((fromKey(toKeyStr).getTime() - fromKey(fromKeyStr).getTime()) / 86_400_000)
}

// Every key from `start` to `end`, inclusive.
export function keysBetween(start: string, end: string) {
  const out: string[] = []
  for (let key = start, guard = 0; key <= end && guard < 400; key = addDays(key, 1), guard++) out.push(key)
  return out
}

// Accepts legacy un-padded keys ('2026-9-27') and ISO timestamps.
export function normalizeKey(value: string) {
  if (value.includes('T')) return dateKey(new Date(value))
  const [y, m, d] = value.split('-').map(Number)
  return dateKey(new Date(y, (m || 1) - 1, d || 1, 12))
}

export function formatClock(minutes: number) {
  const h = Math.floor(minutes / 60) % 24
  const m = Math.round(minutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function parseClock(value: string) {
  const [h, m] = value.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function weekdayName(key: string, style: 'long' | 'short' = 'long') {
  return fromKey(key).toLocaleDateString('en-GB', { weekday: style })
}
