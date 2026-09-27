import { scanConfig } from './scanConfig'
import { faceBox, laplacianVariance, meanLuminance, poseDegrees, toGray, luminance, type FrameMeasurements, type Point } from './quality'

export type Rect = { x: number; y: number; w: number; h: number }

export type FrameStats = {
  brightness: number
  tZone: number
  cheeks: number
  evenness: number
}

type Landmark = { x: number; y: number }
type Matrix = { data: number[] }

export const LANDMARK = { forehead: 151, noseBridge: 6, rightCheek: 205, leftCheek: 425, jaw: 148 } as const

// The region of the source that an object-cover panel of `aspect` (w/h) actually shows.
export function coverCrop(srcW: number, srcH: number, aspect: number): Rect {
  if (srcW / srcH > aspect) {
    const w = srcH * aspect
    return { x: (srcW - w) / 2, y: 0, w, h: srcH }
  }
  const h = srcW / aspect
  return { x: 0, y: (srcH - h) / 2, w: srcW, h }
}

export function createSampler() {
  const analysis = document.createElement('canvas')
  const analysisCtx = analysis.getContext('2d', { willReadFrequently: true })!
  const crop = document.createElement('canvas')
  const cropCtx = crop.getContext('2d', { willReadFrequently: true })!

  function measure(
    source: CanvasImageSource,
    srcW: number,
    srcH: number,
    view: Rect,
    faces: Landmark[][],
    matrices: Matrix[],
    withStats = false,
  ): { measurements: FrameMeasurements; landmarks?: Point[]; stats?: FrameStats } {
    if (faces.length !== 1) return { measurements: { faceCount: faces.length } }

    // Landmarks come normalized to the full source; re-normalize to the visible crop.
    const landmarks = faces[0].map((p) => ({ x: (p.x * srcW - view.x) / view.w, y: (p.y * srcH - view.y) / view.h }))
    const box = faceBox(landmarks)

    const aw = scanConfig.analysisWidth
    const ah = Math.max(1, Math.round((aw * view.h) / view.w))
    analysis.width = aw
    analysis.height = ah
    analysisCtx.drawImage(source, view.x, view.y, view.w, view.h, 0, 0, aw, ah)
    const image = analysisCtx.getImageData(0, 0, aw, ah)
    const brightness = meanLuminance(image, box.minX * aw, box.minY * ah, box.w * aw, box.h * ah)

    const size = scanConfig.sharpnessCropSize
    crop.width = size
    crop.height = size
    const sx = view.x + Math.max(0, box.minX) * view.w
    const sy = view.y + Math.max(0, box.minY) * view.h
    const sw = Math.max(1, (Math.min(1, box.maxX) - Math.max(0, box.minX)) * view.w)
    const sh = Math.max(1, (Math.min(1, box.maxY) - Math.max(0, box.minY)) * view.h)
    cropCtx.drawImage(source, sx, sy, sw, sh, 0, 0, size, size)
    const sharpness = laplacianVariance(toGray(cropCtx.getImageData(0, 0, size, size)), size, size)

    const pose = matrices[0]?.data?.length === 16 ? poseDegrees(matrices[0].data) : { yaw: 0, pitch: 0 }
    const measurements: FrameMeasurements = { faceCount: 1, box, brightness, sharpness, ...pose }

    if (!withStats) return { measurements, landmarks }

    const patch = Math.max(3, Math.round(aw * 0.06))
    const at = (index: number) => {
      const p = landmarks[index]
      return meanLuminance(image, p.x * aw - patch / 2, p.y * ah - patch / 2, patch, patch)
    }
    const cheekValues: number[] = []
    for (const index of [LANDMARK.rightCheek, LANDMARK.leftCheek]) {
      const p = landmarks[index]
      const x0 = Math.round(p.x * aw - patch / 2), y0 = Math.round(p.y * ah - patch / 2)
      for (let y = Math.max(0, y0); y < Math.min(ah, y0 + patch); y++) {
        for (let x = Math.max(0, x0); x < Math.min(aw, x0 + patch); x++) {
          const i = (y * aw + x) * 4
          cheekValues.push(luminance(image.data[i], image.data[i + 1], image.data[i + 2]))
        }
      }
    }
    const cheekMean = cheekValues.reduce((a, b) => a + b, 0) / Math.max(1, cheekValues.length)
    const evenness = Math.sqrt(cheekValues.reduce((a, v) => a + (v - cheekMean) ** 2, 0) / Math.max(1, cheekValues.length))

    return {
      measurements,
      landmarks,
      stats: {
        brightness,
        tZone: (at(LANDMARK.forehead) + at(LANDMARK.noseBridge)) / 2,
        cheeks: (at(LANDMARK.rightCheek) + at(LANDMARK.leftCheek)) / 2,
        evenness,
      },
    }
  }

  function release() {
    analysis.width = analysis.height = 0
    crop.width = crop.height = 0
  }

  return { measure, release }
}
