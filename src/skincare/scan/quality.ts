import { scanConfig } from './scanConfig'

export type Point = { x: number; y: number }

export type FaceBox = { minX: number; minY: number; maxX: number; maxY: number; cx: number; cy: number; w: number; h: number }

export type CheckId = 'noFace' | 'multipleFaces' | 'offCenter' | 'tooSmall' | 'tooDark' | 'tooBright' | 'pose' | 'blurry'

export type FrameMeasurements = {
  faceCount: number
  box?: FaceBox
  brightness?: number
  sharpness?: number
  yaw?: number
  pitch?: number
}

export type QualityResult = { passed: boolean; failures: CheckId[]; hint: string }

// Priority order: the first failure drives the live hint.
const ORDER: CheckId[] = ['noFace', 'multipleFaces', 'offCenter', 'tooSmall', 'tooDark', 'tooBright', 'pose', 'blurry']

export const REJECT_MESSAGE: Record<CheckId, string> = {
  noFace: 'No face found',
  multipleFaces: 'More than one face',
  offCenter: 'Face partly out of frame',
  tooSmall: 'Move a little closer',
  tooDark: 'Too dark',
  tooBright: 'Too bright',
  pose: 'Face the camera straight on',
  blurry: 'A bit blurry — hold still',
}

const LIVE_HINT: Record<CheckId, string> = {
  noFace: 'Center your face in the oval',
  multipleFaces: 'Just one face, please',
  offCenter: 'Center your face in the oval',
  tooSmall: 'Move a little closer',
  tooDark: 'Find more light',
  tooBright: 'Too bright — step out of direct light',
  pose: 'Face the camera straight on',
  blurry: 'Hold still…',
}

export const READY_HINT = 'Perfect — take the photo'

export function faceBox(landmarks: Point[]): FaceBox {
  let minX = 1, minY = 1, maxX = 0, maxY = 0
  for (const { x, y } of landmarks) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY }
}

// MediaPipe doesn't document the matrix layout, so find it from where the translation lives
// (the face sits tens of cm in front of the camera, so |tz| dwarfs the rotation terms).
export function poseDegrees(data: number[]): { yaw: number; pitch: number } {
  const columnMajor = Math.abs(data[14]) >= Math.abs(data[11])
  const r = (row: number, col: number) => (columnMajor ? data[col * 4 + row] : data[row * 4 + col])
  const toDeg = (rad: number) => {
    const deg = Math.abs((rad * 180) / Math.PI)
    return deg > 90 ? 180 - deg : deg
  }
  const yaw = Math.atan2(-r(2, 0), Math.hypot(r(2, 1), r(2, 2)))
  const pitch = Math.atan2(r(2, 1), r(2, 2))
  return { yaw: toDeg(yaw), pitch: toDeg(pitch) }
}

export function luminance(r: number, g: number, b: number) {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

// Mean luminance of an RGBA region (x/y/w/h in pixels of that image).
export function meanLuminance(image: ImageData, x: number, y: number, w: number, h: number) {
  const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y))
  const x1 = Math.min(image.width, Math.ceil(x + w)), y1 = Math.min(image.height, Math.ceil(y + h))
  let sum = 0, count = 0
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const i = (py * image.width + px) * 4
      sum += luminance(image.data[i], image.data[i + 1], image.data[i + 2])
      count++
    }
  }
  return count > 0 ? sum / count : 0
}

// Variance of the 4-neighbour Laplacian over a grayscale buffer.
export function laplacianVariance(gray: Float32Array, width: number, height: number) {
  let sum = 0, sumSq = 0, n = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const v = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i]
      sum += v
      sumSq += v * v
      n++
    }
  }
  if (n === 0) return 0
  const mean = sum / n
  return sumSq / n - mean * mean
}

export function toGray(image: ImageData): Float32Array {
  const gray = new Float32Array(image.width * image.height)
  for (let i = 0; i < gray.length; i++) {
    gray[i] = luminance(image.data[i * 4], image.data[i * 4 + 1], image.data[i * 4 + 2])
  }
  return gray
}

export function evaluate(m: FrameMeasurements): QualityResult {
  const failed = new Set<CheckId>()
  const c = scanConfig

  if (m.faceCount > 1) failed.add('multipleFaces')
  else if (m.faceCount === 0 || !m.box) failed.add('noFace')
  else {
    const { box } = m
    const { cx, cy, rx, ry } = c.oval
    const inOval = ((box.cx - cx) / rx) ** 2 + ((box.cy - cy) / ry) ** 2 <= 1
    const inFrame = box.minX >= 0 && box.minY >= 0 && box.maxX <= 1 && box.maxY <= 1
    if (!inOval || !inFrame) failed.add('offCenter')
    if (box.h < c.minFaceHeightRatio) failed.add('tooSmall')
    if (m.brightness !== undefined && m.brightness < c.minBrightness) failed.add('tooDark')
    if (m.brightness !== undefined && m.brightness > c.maxBrightness) failed.add('tooBright')
    if ((m.yaw ?? 0) > c.maxYawDegrees || (m.pitch ?? 0) > c.maxPitchDegrees) failed.add('pose')
    if (m.sharpness !== undefined && m.sharpness < c.minSharpness) failed.add('blurry')
  }

  const failures = ORDER.filter((id) => failed.has(id))
  return { passed: failures.length === 0, failures, hint: failures.length ? LIVE_HINT[failures[0]] : READY_HINT }
}

// "Too dark · face partly out of frame"
export function rejectionLabel(failures: CheckId[]) {
  return failures
    .map((id, i) => (i === 0 ? REJECT_MESSAGE[id] : REJECT_MESSAGE[id].charAt(0).toLowerCase() + REJECT_MESSAGE[id].slice(1)))
    .join(' · ')
}
