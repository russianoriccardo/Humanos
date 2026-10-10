import { useEffect, useState } from 'react'
import { Bell, Check, ScanFace } from 'lucide-react'
import { Chip } from '../../components/Chip'
import { SegmentBar } from '../../components/SegmentBar'
import { addDays, dateKey, fromKey, weekdayName } from '../../lib/dates'
import { loadPhoto } from '../../services/photoStore'
import type { AppState, ScanRecord } from '../../state/appState'
import { cycleDay, daysUntilScan, latestScan, SCAN_CYCLE_DAYS } from '../active'
import { betweenScans, compareReadings } from '../progress'
import { TabIntro } from './TabIntro'

type ProgressTabProps = {
  state: AppState
  scanReminderSet: boolean
  onRemindScan: (dayKey: string) => void
  onToggleKeepPhotos: (keep: boolean) => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function Eyebrow({ children }: { children: string }) {
  return <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">{children}</p>
}

function Bar({ label, value, done, of }: { label: string; value: string; done: number; of: number }) {
  const pct = of > 0 ? Math.round((Math.min(done, of) / of) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-text">{label}</span>
        <span className="shrink-0 font-semibold text-text">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border" role="progressbar" aria-label={label} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function shortDate(key: string) {
  return fromKey(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Shows the photo only when one was kept for this scan; otherwise the reading and date.
function ScanTile({ label, scan, showPhoto }: { label: string; scan: ScanRecord; showPhoto: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!showPhoto || !scan.photoId) return
    let objectUrl: string | null = null
    let cancelled = false
    loadPhoto(scan.photoId).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [scan.photoId, showPhoto])

  return (
    <div className="flex flex-col gap-2 rounded-[16px] border border-border bg-surface p-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[12px] bg-tint">
        {url ? (
          <img src={url} alt={`${label} scan photo`} className="h-full w-full -scale-x-100 object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
            <ScanFace size={22} className="text-accent" aria-hidden />
            <span className="text-sm font-semibold text-text">{scan.reading.type}</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-text">{label}</p>
        <p className="text-xs text-muted">{shortDate(scan.date)}</p>
      </div>
    </div>
  )
}

export function ProgressTab({ state, scanReminderSet, onRemindScan, onToggleKeepPhotos }: ProgressTabProps) {
  const active = state.skincareActive
  if (!active) return null
  const today = dateKey()
  const day = cycleDay(active, today)
  const left = daysUntilScan(active, today)
  const scanDay = addDays(latestScan(active).date, SCAN_CYCLE_DAYS - 1)
  const stats = betweenScans(active, state.weatherLog, today)
  const latest = active.scans.at(-1)
  const changes = latest ? compareReadings(active.baselineScan.reading, latest.reading) : []
  const nextDate = `${weekdayName(scanDay, 'short')} ${shortDate(scanDay)}`

  return (
    <div className="flex flex-col gap-5">
      <TabIntro title="Scan every 14 days. Log the days in between." />

      <section className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-accent bg-tint p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-surface text-accent">
            <ScanFace size={22} strokeWidth={1.8} aria-hidden />
          </span>
          <p className="text-[22px] leading-tight font-bold text-text">
            Day {Math.min(day, SCAN_CYCLE_DAYS)} of {SCAN_CYCLE_DAYS}
          </p>
        </div>
        <SegmentBar total={SCAN_CYCLE_DAYS} filled={day} label="Scan cycle" />
        <p className="text-sm font-semibold text-text">
          {left > 0 ? `Next scan in ${left} ${left === 1 ? 'day' : 'days'} · ${nextDate}` : 'Your 14-day scan is ready'}
        </p>
        <p className="text-sm text-text">Same window, same light, no makeup — so the comparison is fair.</p>
        {left > 0 &&
          (scanReminderSet ? (
            <span className="inline-flex h-11 items-center gap-2 self-start rounded-full bg-surface px-4 text-sm font-semibold text-text">
              <Check size={15} strokeWidth={2.5} className="text-accent" aria-hidden />
              Reminder set · {weekdayName(scanDay)} 09:00
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onRemindScan(scanDay)}
              className={`inline-flex h-11 items-center gap-2 self-start rounded-full border-[1.5px] border-accent bg-surface px-4 text-sm font-semibold text-text transition-transform duration-[120ms] motion-safe:active:scale-[0.97] ${focusRing}`}
            >
              <Bell size={15} className="text-accent" aria-hidden />
              Remind me {weekdayName(scanDay)} morning
            </button>
          ))}
      </section>

      <section className="flex flex-col gap-4 rounded-[20px] border border-border bg-surface p-5">
        <Eyebrow>Between scans · what you control</Eyebrow>
        <Bar label="Routine nights" value={`${stats.nights.done} of ${stats.nights.of}`} done={stats.nights.done} of={stats.nights.of} />
        <Bar
          label="SPF on sunny days"
          value={stats.spf.of ? `${stats.spf.done} of ${stats.spf.of}` : 'No sunny days yet'}
          done={stats.spf.done}
          of={stats.spf.of}
        />
        <Bar label="Face yoga" value={`${stats.yoga.done} ${stats.yoga.done === 1 ? 'session' : 'sessions'}`} done={stats.yoga.done} of={stats.yoga.of} />
        <p className="text-sm text-muted">Consistency is the best predictor of what your next scan will show.</p>
      </section>

      <section className="flex flex-col gap-3">
        <Eyebrow>{latest ? 'Baseline vs latest scan' : 'Baseline vs next scan'}</Eyebrow>
        <div className="grid grid-cols-2 gap-3">
          <ScanTile label="Baseline" scan={active.baselineScan} showPhoto={active.keepScanPhotos} />
          {latest ? (
            <ScanTile label="Latest" scan={latest} showPhoto={active.keepScanPhotos} />
          ) : (
            <div className="flex flex-col gap-2 rounded-[16px] border border-dashed border-muted p-3">
              <div className="flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-[12px] text-center">
                <span className="text-[22px] font-bold text-text">{left > 0 ? `${left} days` : 'Ready'}</span>
                <span className="text-xs text-muted">{left > 0 ? 'until it unlocks' : 'Take it below'}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-text">Next scan</p>
                <p className="text-xs text-muted">{shortDate(scanDay)}</p>
              </div>
            </div>
          )}
        </div>

        {latest ? (
          <div className="flex flex-col gap-2 rounded-[16px] bg-tint p-4">
            <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">What changed</p>
            {changes.length ? (
              <ul className="flex flex-col gap-1.5">
                {changes.map((change) => (
                  <li key={change} className="flex items-center gap-2 text-sm text-text">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {change}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text">No change since your baseline — skin moves over months, not weeks.</p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2" aria-label="Baseline reading">
            <Chip label={active.baselineScan.reading.type} dot />
            {active.baselineScan.reading.notes.map((note) => (
              <Chip key={note} label={note.charAt(0).toUpperCase() + note.slice(1)} dot />
            ))}
          </div>
        )}

        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[16px] border border-border bg-surface p-4">
          <span className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-text">Keep scan photos on this device for side-by-side comparison</span>
            <span className="text-xs text-muted">
              {active.keepScanPhotos
                ? 'Saved only on this phone, never uploaded. Delete anytime from the ··· menu.'
                : 'Off: photos are analyzed and discarded. Only the reading is saved.'}
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={active.keepScanPhotos}
            onChange={(event) => onToggleKeepPhotos(event.target.checked)}
            className={`peer sr-only`}
          />
          <span
            aria-hidden
            className={[
              'relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-150 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent',
              active.keepScanPhotos ? 'bg-accent' : 'bg-border',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-1 h-5 w-5 rounded-full bg-surface transition-transform duration-150 motion-reduce:transition-none',
                active.keepScanPhotos ? 'translate-x-6' : 'translate-x-1',
              ].join(' ')}
            />
          </span>
        </label>
      </section>
    </div>
  )
}
