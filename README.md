# HUMANOS

A calm, customizable hub for personal care: skincare, cycle, nutrition, teeth, fitness, sleep. This repo is the
mobile web prototype: the 5-step onboarding, the dashboard, the Skincare setup flow (with an on-device face scan),
and the live Skincare module — Today's adjusted routine, Face yoga, Progress with 14-day rescans, and Ask AI product
checks.

Vite + React + TypeScript + Tailwind CSS v4. App state lives on the device in `localStorage` under `humanos.state`.
The only server code is one optional Netlify Function that reads product labels (see Ask AI below).

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

`VITE_BASE` (default `/`) sets the path the app is served from.

Other scripts: `npm run build` (type-check + production build into `dist/`), `npm run preview` (serve the build),
`npm run lint`, `npm test` (Vitest: rules engine, product checks, weather parsing, the Netlify Function).

Locally, Ask AI runs in demo mode (Vite doesn't run Netlify Functions). To exercise the real function, use
`netlify dev` from the Netlify CLI with `ANTHROPIC_API_KEY` set in your shell.

## Live site (GitHub Pages)

https://russianoriccardo.github.io/Humanos/ — the landing page, with the app prototype at
https://russianoriccardo.github.io/Humanos/app/.

`.github/workflows/pages.yml` rebuilds and publishes both on every push to `main` (or run it by hand from the
Actions tab). It builds the app with `VITE_BASE=/<repo>/app/`, copies `landing/` to the site root and the app build
to `app/`. In the repo settings, **Pages → Source** must be set to **GitHub Actions**.

GitHub Pages can't run the Netlify Function, so Ask AI there is in demo mode — unless you point it at your Netlify
deploy: set `VITE_API_BASE=https://<your-site>.netlify.app` for the Pages build, and add the Pages origin
(`https://russianoriccardo.github.io`) to `ALLOWED_ORIGINS` on Netlify.

The landing page is a single self-contained file: `landing/index.html`. Its waitlist form is a front-end prototype
and doesn't store emails yet.

## Deploy (Netlify)

1. In Netlify, **Add new site → Import an existing project** and pick this GitHub repo.
2. Netlify reads `netlify.toml`: build command `npm run build`, publish directory `dist`, Node 22, SPA redirect
   (`/* → /index.html 200`), and a no-cache header for the service worker. `netlify/functions/` deploys
   automatically.
3. **Site configuration → Environment variables:**
   - `ANTHROPIC_API_KEY` — turns on real label reading and follow-up answers in Ask AI. Server-side only; it is
     never in the client bundle. Without it, Ask AI runs in demo mode and the app still works end to end.
   - `ALLOWED_ORIGINS` (optional) — extra comma-separated origins allowed to call the function, e.g. the GitHub
     Pages site. The Netlify site's own URLs are always allowed.
4. Deploy. Every push to `main` redeploys automatically.

The origin check stops other websites from using your key, but it isn't authentication: set a spending limit on the
Anthropic account.

The site is a PWA: on a phone, open it in Safari (iOS) or Chrome (Android) and use **Add to Home Screen**; it then
opens full screen with the HUMANOS icon. App icons are generated from the logo mark by
`node scripts/generate-icons.mjs` (no dependencies).

## HTTPS and the camera

Browsers only expose the camera (`getUserMedia`) on secure origins. `localhost` counts as secure; a LAN IP over
plain `http` does not, and **iOS Safari never exposes the camera without HTTPS**. To test the face scan or the
barcode scanner on a phone, use a deployed (HTTPS) site. If the camera is unavailable or denied, both show a
"Camera access is off" state with a way to continue — they never block the flow.

## Demo panel and reset

On the dashboard, **long-press the avatar** (the initial in the top-right) for about 0.7s — or right-click it on a
laptop. The hidden Demo panel lets you:

- switch the **mock health scenario**: *Restful* (8h, no training), *Short sleep, trained* (5h10, trained yesterday —
  default), *Stressed* (6h, high resting heart rate);
- set the **fake outdoor window** (default 12:30–13:30) used by the UV-reapply tip;
- **jump the scan cycle to day 14** to unlock the rescan;
- **Reset demo** — clears every `humanos.*` key and saved scan photos on the device and returns to the first
  onboarding screen.

## What's real and what's mocked

| Area | Status |
|---|---|
| Weather, UV, humidity | **Real** — Open-Meteo, no API key. Location is asked for once on the Today tab (rounded to ~1 km); if denied, a city from `src/config.ts` (default Milan) is used and can be changed. Cached 30 minutes; offline it shows the last data ("Updated 2h ago") or hides weather tips. |
| Sleep, training, resting heart rate | **Mock** (`src/services/health.mock.ts`), switchable in the Demo panel. A web app can't read HealthKit / Health Connect; this is replaced when the app is wrapped natively. |
| Today's tips and tonight's routine | **Real rules** (`src/skincare/engine/buildToday.ts`) on the real weather + mock health. Thresholds in `rules.config.ts`. |
| Glow score | **Simple documented formula** from your logs (`glowScore.ts`): baseline 64 + routine nights + SPF on sunny days + face yoga, each capped. Motivational, not a skin measurement. |
| Face detection and photo-quality checks | **Real, on-device** (MediaPipe Face Landmarker, loaded only on the scan screen). Thresholds in `src/skincare/scan/scanConfig.ts`. |
| Skin reading | **Prototype heuristic, not a diagnosis** (`src/skincare/reading.ts`): rules from your answers plus two frame statistics. Must be replaced by a validated model before launch. |
| Product barcode lookup | **Real** — Open Beauty Facts (open data, no key). Unknown codes fall back to the photo flow. |
| Product label reading | **Real when `ANTHROPIC_API_KEY` is set** (Claude reads the photo in the Netlify Function), otherwise **demo mode** with a fixed "Glow toner · 7% glycolic acid" and a visible "Demo mode" tag. |
| Product verdicts | **Real rules, on-device** (`analyzeProduct.ts` + `ingredients.ts`). The AI only extracts the label; it never decides the verdict. Guidance, not medical advice. |
| Reminders | **Local only.** They fire while the app is open or in the background; a web app can't wake itself when closed, so a missed reminder shows on the next open. |

## Privacy

- **Face photos never leave the device.** Camera tracks stop on capture and when leaving the screen; the frame is
  held only in a canvas that is cleared afterwards. By default only the reading is saved.
- **Scan photos are kept only if you opt in** ("Keep scan photos on this device" on the Progress tab). They are
  stored in IndexedDB on the device — never `localStorage`, never uploaded — and can be deleted from the module's
  ··· menu. Reset module and Reset demo also delete them.
- **Product photos** are downscaled and re-encoded on the device (which strips location metadata), then sent to the
  Netlify Function only to read the label.
- No brand names or sponsored content appear in the app. The product-alternatives slot exists in the `Verdict` type
  but is switched off (`config.partnerships = false`); when enabled, every sponsored item must show a visible
  "Sponsored" label.

## Project map

```
src/
  App.tsx                 state-machine router, persisted AppState, reminders
  config.ts               fallback cities, cache time, partnerships flag, API base
  state/                  AppState (load/save/migration), shared weather provider
  services/               weather (Open-Meteo), health.mock, reminders, photoStore (IndexedDB),
                          productLookup (Open Beauty Facts), productAi (Netlify Function client)
  onboarding/             5-step onboarding flow
  screens/                Dashboard, SkincareModule, YogaPlayer, ComingNext placeholder
  skincare/               setup steps, result screen, reading, routine, progress
  skincare/engine/        buildToday, glowScore, analyzeProduct, ingredients, rules.config (+ tests)
  skincare/tabs/          Today, Face yoga, Progress, Ask AI
  skincare/yoga/          session content (faceYoga.content.ts), timer, streak stats
  skincare/scan/          camera hook, MediaPipe loader, quality checks, scanConfig
  components/             shared UI (Screen, buttons, Chip, cards, tabs, sheets, …)
  lib/                    module catalog, theme, dates, motion, keyboard detection
netlify/functions/
  read-product.ts         label reading + follow-up answers (Claude), demo mode without a key
```
