// Copies MediaPipe's WASM runtime into public/ so the face scan is self-hosted (no CDN at runtime).
// Skips files that are already up to date: rewriting them while `vite` watches public/ crashes the
// dev server on Windows (EBUSY).
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'

const src = 'node_modules/@mediapipe/tasks-vision/wasm'
const dest = 'public/mediapipe/wasm'

mkdirSync(dest, { recursive: true })
let copied = 0
for (const file of readdirSync(src)) {
  if (file.includes('module')) continue
  const from = `${src}/${file}`
  const to = `${dest}/${file}`
  if (existsSync(to) && statSync(to).size === statSync(from).size && statSync(to).mtimeMs >= statSync(from).mtimeMs) continue
  copyFileSync(from, to)
  copied++
}
console.log(copied ? `MediaPipe WASM: copied ${copied} file(s) to ${dest}` : 'MediaPipe WASM: up to date')
