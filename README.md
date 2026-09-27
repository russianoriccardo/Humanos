# HUMANOS

A calm, customizable hub for personal care: skincare, cycle, nutrition, teeth, fitness, sleep. This repo is the
mobile web prototype: the 5-step onboarding, the Day 0 dashboard, the Skincare setup flow (with an on-device face
scan), and the dashboard state after setup.

Vite + React + TypeScript + Tailwind CSS v4. No backend: all state lives in `localStorage` under `humanos.state`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. The dev server also prints a `Network:` URL you can open from a phone on the same Wi-Fi
(Windows may need an inbound firewall rule for port 5173). **The camera will not work over that plain-`http` LAN
URL on phones** — see the HTTPS note below. It does work on `localhost` on the laptop itself.

`npm run dev` and `npm run build` first copy MediaPipe's WASM runtime from `node_modules` into `public/mediapipe/`
(git-ignored). The face model is committed at `public/models/face_landmarker.task`, so the scan makes no
third-party requests.

Other scripts: `npm run build` (type-check + production build into `dist/`), `npm run preview` (serve the build),
`npm run lint`.

## Deploy (Netlify)

1. In Netlify, **Add new site → Import an existing project** and pick this GitHub repo.
2. Netlify reads `netlify.toml`: build command `npm run build`, publish directory `dist`, Node 22, SPA redirect
   (`/* → /index.html 200`), and a no-cache header for the service worker.
3. Deploy. Every push to `main` redeploys automatically.

The site is a PWA: on a phone, open it in Safari (iOS) or Chrome (Android) and use **Add to Home Screen**; it then
opens full screen with the HUMANOS icon. App icons are generated from the logo mark by
`node scripts/generate-icons.mjs` (no dependencies).

## HTTPS and the camera

Browsers only expose the camera (`getUserMedia`) on secure origins. `localhost` counts as secure; a LAN IP over
plain `http` does not, and **iOS Safari never exposes the camera without HTTPS**. To test the face scan on a phone,
use the Netlify deploy (HTTPS by default). If the camera is unavailable or denied, the scan shows a
"Camera access is off" state with *Try again* and *Continue without a scan* — it never blocks the flow.

## Reset the demo

On the dashboard, **long-press the avatar** (the initial in the top-right) for about 0.7s — or right-click it on a
laptop — then confirm **Reset**. This clears every `humanos.*` key on the device and returns to the first
onboarding screen.

## Face scan: what's real and what isn't

- **Real, on-device:** face detection and landmarks (MediaPipe Face Landmarker, loaded only when the scan screen
  opens) and the photo-quality checks — one face, centered in the oval, distance, brightness, sharpness (variance of
  the Laplacian) and head pose. Every threshold lives in `src/skincare/scan/scanConfig.ts`.
- **Prototype heuristic, not a diagnosis:** the skin reading (`src/skincare/reading.ts`) is a deterministic rule set
  built from the user's answers plus two simple frame statistics. It must be replaced by a validated model before
  launch.
- **Privacy:** the photo never leaves the device and is never written to storage. Camera tracks stop on capture and
  when leaving the screen; the frozen frame is only held in a canvas that is cleared on leave. Only the resulting
  reading is saved.

## Project map

```
src/
  App.tsx                 state-machine router + persisted AppState
  state/appState.ts       AppState types, load/save, migration, demo reset
  onboarding/             5-step onboarding flow
  screens/                Dashboard (day0 / skincare-live), ComingNext placeholder
  skincare/               setup steps, result screen, reading + routine rules
  skincare/scan/          camera hook, MediaPipe loader, quality checks, scanConfig
  components/             shared UI (Screen, buttons, Chip, SelectableRow, ModuleCard, …)
  lib/                    module catalog, theme hook, motion helper
```
