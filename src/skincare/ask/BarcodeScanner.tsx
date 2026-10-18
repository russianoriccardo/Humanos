import { useEffect, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import { CameraOff, X } from 'lucide-react'

type BarcodeScannerProps = {
  onCode: (code: string) => void
  onCancel: () => void
  onUsePhoto: () => void
}

const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

// Live barcode reading with ZXing — iOS Safari has no native BarcodeDetector. Loaded only when opened.
export function BarcodeScanner({ onCode, onCancel, onUsePhoto }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'starting' | 'scanning' | 'denied' | 'unavailable'>('starting')
  const onCodeRef = useRef(onCode)
  onCodeRef.current = onCode

  useEffect(() => {
    let controls: IScannerControls | null = null
    let cancelled = false

    ;(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unavailable')
        return
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ])
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
        ])
        // Slower per frame, but finds bars in blurry, small or slightly tilted frames.
        hints.set(DecodeHintType.TRY_HARDER, true)
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
        const started = await reader.decodeFromConstraints(
          {
            // Without a size, many phones give 640×480 — too few pixels per bar for a product barcode.
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          },
          videoRef.current ?? undefined,
          (result, _error, scanner) => {
            if (!result) return
            scanner.stop()
            try {
              navigator.vibrate?.(30)
            } catch {
              // iOS: no vibration API.
            }
            onCodeRef.current(result.getText())
          },
        )
        if (cancelled) started.stop()
        else {
          controls = started
          setStatus('scanning')
          // Continuous autofocus where the browser exposes it (Android Chrome); iPhone focuses on its own.
          const track = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0]
          const caps = track?.getCapabilities?.() as { focusMode?: string[] } | undefined
          if (track && caps?.focusMode?.includes('continuous')) {
            track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => undefined)
          }
        }
      } catch (error) {
        if (cancelled) return
        const name = error instanceof DOMException ? error.name : ''
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
      }
    })()

    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [])

  const off = status === 'denied' || status === 'unavailable'

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-panel text-on-panel" role="dialog" aria-label="Scan a barcode">
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="pl-2 text-base font-semibold">Scan a barcode</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close scanner"
          className={`flex h-11 w-11 items-center justify-center rounded-full ${focusRing}`}
        >
          <X size={22} />
        </button>
      </div>

      <div className="relative mx-4 mt-4 flex-1 overflow-hidden rounded-[24px]">
        <video ref={videoRef} playsInline muted autoPlay className={['h-full w-full object-cover', off ? 'invisible' : ''].join(' ')} />
        {!off && (
          <>
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-32 -translate-y-1/2 rounded-[16px] border-2 border-accent" aria-hidden />
            <p aria-live="polite" className="absolute inset-x-0 bottom-6 text-center text-sm font-medium">
              {status === 'starting' ? 'Starting camera…' : 'Fit the barcode in the frame, about 20 cm away'}
            </p>
          </>
        )}
        {off && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            <CameraOff size={28} strokeWidth={1.6} className="text-accent" aria-hidden />
            <p className="text-base font-semibold">Camera access is off</p>
            <p className="text-sm">Allow the camera in your browser settings, or snap the ingredient list instead.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 px-4 pt-4 pb-8">
        <button
          type="button"
          onClick={onUsePhoto}
          className={`h-12 rounded-full bg-on-panel text-sm font-semibold text-panel ${focusRing}`}
        >
          Snap the ingredient list instead
        </button>
      </div>
    </div>
  )
}
