import type { FaceLandmarker } from '@mediapipe/tasks-vision'
import { scanConfig } from './scanConfig'

let pending: Promise<FaceLandmarker> | null = null

// Dynamic import keeps MediaPipe (and its WASM/model fetch) out of the app bundle until the scan screen asks for it.
export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (!pending) {
    pending = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const fileset = await FilesetResolver.forVisionTasks(scanConfig.wasmPath)
      const options = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: { modelAssetPath: scanConfig.modelPath, delegate },
        runningMode: 'VIDEO' as const,
        numFaces: 2,
        outputFacialTransformationMatrixes: true,
      })
      let landmarker: FaceLandmarker
      try {
        landmarker = await FaceLandmarker.createFromOptions(fileset, options('GPU'))
      } catch {
        landmarker = await FaceLandmarker.createFromOptions(fileset, options('CPU'))
      }
      // The first inference compiles the graph (can take seconds on slow devices); pay that cost
      // behind "Starting the scanner…" instead of freezing the first live frame.
      const warmup = document.createElement('canvas')
      warmup.width = warmup.height = 64
      warmup.getContext('2d')?.fillRect(0, 0, 64, 64)
      landmarker.detectForVideo(warmup, performance.now())
      warmup.width = warmup.height = 0
      return landmarker
    })()
    pending.catch(() => {
      pending = null
    })
  }
  return pending
}
