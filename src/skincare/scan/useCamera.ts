import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export type CameraStatus = 'idle' | 'starting' | 'live' | 'denied' | 'unavailable'

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>) {
  const [status, setStatus] = useState<CameraStatus>('idle')
  const streamRef = useRef<MediaStream | null>(null)
  const requestId = useRef(0)

  const stop = useCallback(() => {
    requestId.current++
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [videoRef])

  const start = useCallback(async () => {
    stop()
    const id = requestId.current
    // No mediaDevices at all: old browser, or an insecure (http) origin on iOS Safari.
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      return
    }
    setStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      if (id !== requestId.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => undefined)
      }
      setStatus('live')
    } catch (error) {
      if (id !== requestId.current) return
      const name = error instanceof DOMException ? error.name : ''
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
    }
  }, [stop, videoRef])

  useEffect(() => stop, [stop])

  return { status, start, stop }
}
