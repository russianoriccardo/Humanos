// Renders the HUMANOS logo mark to PNG app icons with no dependencies (Node's zlib only).
// Geometry mirrors the <LogoMark> SVG in Welcome.tsx (96-unit viewBox).
// Usage: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [0x13, 0x15, 0x10]
const RING = [0xf1, 0xed, 0xe2]
const GOLD = [0xc7, 0xa8, 0x68]
const STROKE = 2.2 // slightly heavier than the 1.5 on screen so small icons stay legible
const SCALE = 0.8 // keeps the mark inside the maskable-icon safe zone

function cubic(p0, p1, p2, p3, steps = 48) {
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
  return pts
}

// Lens: M48,28 C39,37 39,59 48,68 C57,59 57,37 48,28 Z, plus the centre line.
const lens = [...cubic([48, 28], [39, 37], [39, 59], [48, 68]), ...cubic([48, 68], [57, 59], [57, 37], [48, 28])]
const segments = []
for (let i = 0; i < lens.length - 1; i++) segments.push([lens[i], lens[i + 1]])
segments.push([[48, 28], [48, 68]])

function distToSegment(x, y, [[ax, ay], [bx, by]]) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
}

// Colour of a point in viewBox units, or null for background.
function shade(x, y) {
  if (Math.hypot(x - 48, y - 12) <= 3.2) return GOLD
  if (x > 38 && x < 58 && y > 26 && y < 70) {
    for (const seg of segments) if (distToSegment(x, y, seg) <= STROKE / 2) return GOLD
  }
  if (Math.abs(Math.hypot(x - 48, y - 48) - 36) <= STROKE / 2) return RING
  return null
}

function render(size) {
  const px = new Uint8Array(size * size * 4)
  const unit = (size * SCALE) / 96
  const offset = (size - 96 * unit) / 2
  const ss = 4
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = shade((i + (sx + 0.5) / ss - offset) / unit, (j + (sy + 0.5) / ss - offset) / unit) ?? BG
          r += c[0]; g += c[1]; b += c[2]
        }
      }
      const k = (j * size + i) * 4, n = ss * ss
      px[k] = Math.round(r / n); px[k + 1] = Math.round(g / n); px[k + 2] = Math.round(b / n); px[k + 3] = 255
    }
  }
  return px
}

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(size, rgba) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4)
  header[8] = 8; header[9] = 6 // 8-bit RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

mkdirSync('public/icons', { recursive: true })
for (const size of [180, 192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, png(size, render(size)))
  console.log(`public/icons/icon-${size}.png`)
}
