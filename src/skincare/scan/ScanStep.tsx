import { useCallback, useEffect, useRef, useState } from 'react'
import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import { CameraOff, Check, Lock, TriangleAlert } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { SecondaryButton } from '../../components/SecondaryButton'
import { SkincareStepScreen } from '../SkincareStepScreen'
import { StepTitle } from '../StepTitle'
import type { SkincareStepProps } from '../types'
import type { SkinReading } from '../../state/appState'
import { buildReading, detectionPills } from '../reading'
import { scanConfig } from './scanConfig'
import { evaluate, rejectionLabel, type CheckId, type QualityResult } from './quality'
import { coverCrop, createSampler } from './sampler'
import { loadFaceLandmarker } from './detector'
import { useCamera } from './useCamera'

type Phase = 'intro' | 'processing' | 'complete' | 'rejected'
type PlacedPill = { label: string; left: number; top: number }

const PANEL_ASPECT = 4 / 5
const CHECKLIST = ['Face detected', 'Skin tone mapped', 'Texture & hydration']
const TIPS = ['Face a window — daylight beats a lamp', 'Fill the oval with your whole face', 'Take off glasses, hats and heavy makeup']
const INITIAL_LIVE: QualityResult = { passed: false, failures: ['noFace'], hint: 'Center your face in the oval' }

// Which checklist item a failure belongs to: face problems stop at item 0, light at 1, blur at 2.
function stageReached(failures: CheckId[]) {
  if (failures.some((f) => ['noFace', 'multipleFaces', 'offCenter', 'tooSmall', 'pose'].includes(f))) return 0
  if (failures.some((f) => f === 'tooDark' || f === 'tooBright')) return 1
  if (failures.includes('blurry')) return 2
  return CHECKLIST.length
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function Guide({ ready }: { ready: boolean }) {
  const { cx, cy, rx, ry } = scanConfig.oval
  const corner = 'M6 18 V6 H18 M82 6 H94 V18 M94 107 V119 H82 M18 119 H6 V107'
  return (
    <svg viewBox="0 0 100 125" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
      <ellipse
        cx={cx * 100}
        cy={cy * 125}
        rx={rx * 100}
        ry={ry * 125}
        fill="none"
        strokeWidth={1.6}
        strokeDasharray={ready ? undefined : '5 4'}
        vectorEffect="non-scaling-stroke"
        className="stroke-accent transition-all duration-300"
      />
      <path d={corner} fill="none" strokeWidth={2} strokeLinecap="round" vectorEffect="non-scaling-stroke" className="stroke-accent" />
    </svg>
  )
}

export function ScanStep({ setup, onChange, onNext, onBack }: SkincareStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const photoRef = useRef<HTMLCanvasElement>(null)
  const landmarkerRef = useRef<FaceLandmarker | null>(null)
  const samplerRef = useRef<ReturnType<typeof createSampler> | null>(null)
  const { status: camera, start: startCamera, stop: stopCamera } = useCamera(videoRef)

  const [phase, setPhase] = useState<Phase>('intro')
  const [detector, setDetector] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [live, setLive] = useState<QualityResult>(INITIAL_LIVE)
  const [ready, setReady] = useState(false)
  const [ticks, setTicks] = useState(0)
  const [failures, setFailures] = useState<CheckId[]>([])
  const [reading, setReading] = useState<SkinReading | null>(null)
  const [pills, setPills] = useState<PlacedPill[]>([])

  const sampler = () => (samplerRef.current ??= createSampler())

  const releasePhoto = useCallback(() => {
    const canvas = photoRef.current
    if (canvas) canvas.width = canvas.height = 0
  }, [])

  const loadDetector = useCallback(() => {
    setDetector('loading')
    loadFaceLandmarker()
      .then((landmarker) => {
        landmarkerRef.current = landmarker
        setDetector('ready')
      })
      .catch(() => setDetector('failed'))
  }, [])

  useEffect(() => {
    loadDetector()
    startCamera()
    return () => {
      stopCamera()
      releasePhoto()
      samplerRef.current?.release()
    }
  }, [loadDetector, startCamera, stopCamera, releasePhoto])

  // Live quality checks on the preview, ~10fps.
  useEffect(() => {
    if (phase !== 'intro' || camera !== 'live' || detector !== 'ready') return
    let stable = 0
    let cancelled = false
    let timer = 0
    const tick = () => {
      if (cancelled) return
      const video = videoRef.current
      const landmarker = landmarkerRef.current
      if (video && landmarker && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const view = coverCrop(video.videoWidth, video.videoHeight, PANEL_ASPECT)
          const result = landmarker.detectForVideo(video, performance.now())
          const { measurements } = sampler().measure(
            video,
            video.videoWidth,
            video.videoHeight,
            view,
            result.faceLandmarks,
            result.facialTransformationMatrixes ?? [],
          )
          const quality = evaluate(measurements)
          stable = quality.passed ? stable + 1 : 0
          setLive(quality)
          setReady(stable >= scanConfig.stableFramesRequired)
        } catch {
          stable = 0
          setReady(false)
        }
      }
      timer = window.setTimeout(tick, 1000 / scanConfig.liveFps)
    }
    tick()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [phase, camera, detector])

  function capture() {
    const video = videoRef.current
    const canvas = photoRef.current
    if (!video || !canvas || video.videoWidth === 0) return
    const view = coverCrop(video.videoWidth, video.videoHeight, PANEL_ASPECT)
    const scale = Math.min(1, 960 / view.w)
    canvas.width = Math.round(view.w * scale)
    canvas.height = Math.round(view.h * scale)
    canvas.getContext('2d')?.drawImage(video, view.x, view.y, view.w, view.h, 0, 0, canvas.width, canvas.height)
    stopCamera()
    setReady(false)
    setTicks(0)
    setPhase('processing')
  }

  // Analyze the frozen frame, then hold the processing screen for at least minProcessingMs.
  useEffect(() => {
    if (phase !== 'processing') return
    const canvas = photoRef.current
    const landmarker = landmarkerRef.current
    const startedAt = performance.now()
    const timers: number[] = []

    let failed: CheckId[] = ['noFace']
    let outcome: ReturnType<ReturnType<typeof createSampler>['measure']> | null = null
    try {
      if (canvas && landmarker && canvas.width > 0) {
        const result = landmarker.detectForVideo(canvas, performance.now())
        outcome = sampler().measure(
          canvas,
          canvas.width,
          canvas.height,
          { x: 0, y: 0, w: canvas.width, h: canvas.height },
          result.faceLandmarks,
          result.facialTransformationMatrixes ?? [],
          true,
        )
        failed = evaluate(outcome.measurements).failures
      }
    } catch {
      failed = ['noFace']
    }

    const reached = stageReached(failed)
    for (let i = 0; i < reached; i++) timers.push(window.setTimeout(() => setTicks(i + 1), 600 * (i + 1)))
    const delay = Math.max(scanConfig.minProcessingMs - (performance.now() - startedAt), 600 * reached + 300)

    timers.push(
      window.setTimeout(() => {
        const stats = outcome?.stats
        const landmarks = outcome?.landmarks
        if (failed.length === 0 && stats && landmarks) {
          const built = buildReading(setup, stats)
          setReading(built)
          setPills(
            detectionPills(built.type, stats).map((pill) => ({
              label: pill.label,
              left: clamp((1 - landmarks[pill.landmark].x) * 100, 18, 82),
              top: clamp(landmarks[pill.landmark].y * 100, 8, 92),
            })),
          )
          setPhase('complete')
        } else {
          setFailures(failed.length > 0 ? failed : ['noFace'])
          setPhase('rejected')
        }
      }, delay),
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  function skipScan() {
    stopCamera()
    releasePhoto()
    onChange({ scan: { status: 'skipped' } })
    onNext()
  }

  function retake() {
    releasePhoto()
    setFailures([])
    setReading(null)
    setPills([])
    setLive(INITIAL_LIVE)
    setPhase('intro')
    if (detector === 'failed') loadDetector()
    startCamera()
  }

  function finish() {
    if (!reading) return
    releasePhoto()
    onChange({ scan: { status: 'ok', reading } })
    onNext()
  }

  const cameraOff = phase === 'intro' && (camera === 'denied' || camera === 'unavailable' || detector === 'failed')
  const previewLive = phase === 'intro' && camera === 'live' && !cameraOff
  const starting = phase === 'intro' && !cameraOff && (camera !== 'live' || detector === 'loading')

  const copy = {
    intro: { title: 'Let the AI see your skin', subtitle: 'One photo in natural light is enough.' },
    processing: { title: 'Reading your photo', subtitle: 'This happens on your device.' },
    complete: { title: 'Scan complete', subtitle: "Here's what we picked up." },
    rejected: { title: "We couldn't read that one", subtitle: "Nothing wrong with you — the photo just isn't usable." },
  }[phase]

  const footer = (() => {
    if (phase === 'processing') return <PrimaryButton disabled>Analyzing…</PrimaryButton>
    if (phase === 'complete') return <PrimaryButton onClick={finish}>See my starting point</PrimaryButton>
    const taking = phase === 'intro' && !cameraOff
    return (
      <div className="flex flex-col items-center gap-2">
        <PrimaryButton onClick={taking ? capture : retake} disabled={taking && !ready}>
          {taking ? 'Take photo' : phase === 'rejected' ? 'Retake photo' : 'Try again'}
        </PrimaryButton>
        <SecondaryButton onClick={skipScan}>{taking ? 'Skip for now' : 'Continue without a scan'}</SecondaryButton>
      </div>
    )
  })()

  return (
    <SkincareStepScreen step={4} onBack={onBack} onSkip={skipScan} footer={footer}>
      <div className="flex flex-col gap-5">
        <StepTitle title={copy.title} subtitle={copy.subtitle} />

        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-panel text-on-panel">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            aria-label="Front camera preview"
            className={['absolute inset-0 h-full w-full -scale-x-100 object-cover', previewLive ? '' : 'invisible'].join(' ')}
          />
          <canvas
            ref={photoRef}
            aria-hidden
            className={[
              'absolute inset-0 h-full w-full -scale-x-100 object-cover transition-opacity duration-300',
              phase === 'intro' ? 'invisible' : '',
              phase === 'processing' ? 'opacity-50' : phase === 'rejected' ? 'opacity-[0.22]' : 'opacity-100',
            ].join(' ')}
          />

          {phase === 'intro' && !cameraOff && <Guide ready={ready} />}

          {previewLive && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
              <span aria-live="polite" className="rounded-full bg-panel/80 px-3.5 py-1.5 text-sm font-medium text-on-panel">
                {detector === 'ready' ? live.hint : 'Starting the scanner…'}
              </span>
            </div>
          )}

          {starting && !previewLive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-medium text-on-panel">Starting camera…</span>
            </div>
          )}

          {cameraOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <CameraOff size={28} strokeWidth={1.6} className="text-accent" aria-hidden />
              <p className="text-base font-semibold text-on-panel">
                {detector === 'failed' && camera === 'live' ? "The scanner couldn't load" : 'Camera access is off'}
              </p>
              <p className="text-sm text-on-panel">
                {detector === 'failed' && camera === 'live'
                  ? 'Check your connection and try again — or carry on without a scan.'
                  : 'Allow the camera in your browser settings, or carry on without a scan.'}
              </p>
            </div>
          )}

          {phase === 'processing' && (
            <div className="absolute inset-x-0 h-0.5 animate-scanline bg-accent" aria-hidden />
          )}

          {phase === 'complete' &&
            pills.map((pill) => (
              <span
                key={pill.label}
                style={{ left: `${pill.left}%`, top: `${pill.top}%` }}
                className="absolute inline-flex -translate-x-1/2 -translate-y-1/2 animate-pop items-center gap-1.5 rounded-full border border-accent bg-panel/80 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-on-panel"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {pill.label}
              </span>
            ))}

          {phase === 'rejected' && (
            <div className="absolute inset-0 flex items-center justify-center px-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-tint px-3.5 py-2 text-center text-sm font-semibold text-warning">
                <TriangleAlert size={15} strokeWidth={2} className="shrink-0" aria-hidden />
                {rejectionLabel(failures)}
              </span>
            </div>
          )}
        </div>

        {phase === 'intro' && (
          <p className="flex items-start gap-2.5 text-sm text-muted">
            <Lock size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-accent" aria-hidden />
            Analyzed on your device. Never shared without your say-so.
          </p>
        )}

        {phase === 'processing' && (
          <ul className="flex flex-col gap-2.5" aria-live="polite">
            {CHECKLIST.map((item, index) => {
              const done = index < ticks
              return (
                <li key={item} className={['flex items-center gap-3 text-sm', done ? 'text-text' : 'text-muted'].join(' ')}>
                  <span
                    className={[
                      'flex h-5 w-5 items-center justify-center rounded-full border-[1.5px]',
                      done ? 'border-accent bg-accent text-on-accent' : 'border-muted',
                    ].join(' ')}
                  >
                    {done && <Check size={12} strokeWidth={3} className="animate-pop" />}
                  </span>
                  {item}
                </li>
              )
            })}
          </ul>
        )}

        {phase === 'complete' && (
          <div className="flex items-start gap-3 rounded-[16px] bg-tint p-4">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
              <Check size={12} strokeWidth={3} />
            </span>
            <p className="text-sm text-text">Photo analyzed and discarded. Only the reading is saved.</p>
          </div>
        )}

        {phase === 'rejected' && (
          <div className="flex flex-col gap-2.5 rounded-[20px] bg-tint p-4">
            <p className="text-[11px] font-semibold tracking-[1.5px] text-muted uppercase">What usually fixes it</p>
            <ul className="flex flex-col gap-2">
              {TIPS.map((tip) => (
                <li key={tip} className="flex items-start gap-2.5 text-sm text-text">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SkincareStepScreen>
  )
}
