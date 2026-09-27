// Copies MediaPipe's WASM runtime into public/ so the face scan is self-hosted (no CDN at runtime).
import { cpSync, mkdirSync, readdirSync } from 'node:fs'

const src = 'node_modules/@mediapipe/tasks-vision/wasm'
const dest = 'public/mediapipe/wasm'

mkdirSync(dest, { recursive: true })
for (const file of readdirSync(src)) {
  if (!file.includes('module')) cpSync(`${src}/${file}`, `${dest}/${file}`)
}
console.log(`MediaPipe WASM copied to ${dest}`)
