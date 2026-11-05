# HUMANOS

A calm, customizable hub for personal care: skincare, cycle, nutrition, teeth, fitness, sleep, hydration. This repo
is the mobile web prototype: the 5-step onboarding, the dashboard, and three live modules, each with its own setup
flow:

- **Skincare**: on-device face scan, Today's adjusted routine, Face yoga, Progress with 14-day rescans, and Ask AI
  product checks.
- **Sleep**: a weekly lights-out plan, wind down sessions, morning check ins and patterns from your own nights.
- **Hydration**: a daily water target with one tap logging, pace, hot day adjustments, reminders only when you're
  behind, and a sourced Guide.

The other modules (cycle, nutrition, teeth, fitness, mind) show a "Coming next" screen. Live modules appear on the
dashboard as squares; modules not set up yet are listed below them, one a day suggested.

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
`npm run lint`, `npm test` (Vitest: Skincare rules engine and product checks, the Sleep plan and patterns, the Hydration
target, pace, reminders, Guide and demo data, weather parsing, the Netlify Function).

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

On the dashboard, **long-press the avatar** (the initial in the top-right) for about 0.7s, or right-click it on a
laptop. The hidden Demo panel lets you:

- switch the **mock health scenario**: *No data* (default, what a new account sees: no sleep or training tips),
  *Restful* (8h, no training), *Short sleep, trained* (5h10, trained yesterday), *Stressed* (6h, high resting heart
  rate);
- pick the **Health connect** outcome that "Connect Apple Health" plays out in Sleep and Hydration setup: *Not
  available* (default), *Connected*, *Denied*, *No data*;
- set a **Hot day** (Off, 29°C or 33°C) and **Workout today** (0, 45 or 90 min) for Hydration; workouts only count
  when Apple Health is connected;
- set the **fake outdoor window** (default 12:30 to 13:30) used by the UV reapply tip;
- **jump the scan cycle to day 14** to unlock the rescan, or **simulate 9 days** of Skincare use;
- **Simulate 18 nights of sleep**: check ins, tags, wind down sessions and tonight's training tip (the "night 18"
  investor state);
- **Simulate 12 days of water**: logs with a quiet afternoon, target hit 4 of 7, today's entries, Ginger tea in the
  quick log and three Guide saves (the "day 12" investor state);
- **Reset demo**: clears every `humanos.*` key and saved scan photos on the device (including Hydration Guide saves)
  and returns to the first onboarding screen.

Each module also has **Reset** in its ··· menu, which clears only that module and its reminders (Hydration keeps your
Guide saves).

## What's real and what's mocked

| Area | Status |
|---|---|
| Weather, UV, humidity | **Real** — Open-Meteo, no API key. Location is asked for once on the Today tab (rounded to ~1 km); if denied, a city from `src/config.ts` (default Milan) is used and can be changed. Cached 30 minutes; offline it shows the last data ("Updated 2h ago") or hides weather tips. |
| Apple Health, training, resting heart rate | **Mock.** A web app can't read HealthKit or Health Connect. `src/services/health.mock.ts` holds the Demo panel scenarios (default *No data*); "Connect Apple Health" in setup plays out the Demo panel's Health connect outcome, and Hydration's imported history is `src/hydration/demo.ts`. Replaced when the app is wrapped natively. |
| Sleep for Skincare | **Real when you log it**: Skincare reads last night's Sleep morning check in; otherwise the mock scenario; with neither, sleep rules stay quiet. |
| Today's tips and tonight's routine | **Real rules** (`src/skincare/engine/buildToday.ts`) on the real weather + sleep as above. Thresholds in `rules.config.ts`. |
| Sleep plan, tips and patterns | **Real rules on your own data** (`src/sleep/plan.ts`, `rules.ts`, `patterns.ts`): lights out moves 15 minutes a week toward a goal; tips start on night 3; patterns unlock after 7 check ins. Patterns in your data, not medical advice. |
| Hydration target, pace and adjustments | **Real rules** (`src/hydration/`): 30 ml per kg plus activity, paced from wake to 20:00; the hot day adjustment uses the real afternoon temperature from Open-Meteo (opt in), the workout adjustment needs Apple Health. A doctor's fluid limit is never raised. |
| Glow score | **Simple documented formula** from your logs (`glowScore.ts`): baseline 64 + routine nights + SPF on sunny days + face yoga, each capped. Motivational, not a skin measurement. |
| Face detection and photo-quality checks | **Real, on-device** (MediaPipe Face Landmarker, loaded only on the scan screen). Thresholds in `src/skincare/scan/scanConfig.ts`. |
| Skin reading | **Prototype heuristic, not a diagnosis** (`src/skincare/reading.ts`): rules from your answers plus two frame statistics. Must be replaced by a validated model before launch. |
| Product barcode lookup | **Real** — Open Beauty Facts (open data, no key). Unknown codes fall back to the photo flow. |
| Product label reading | **Real when `ANTHROPIC_API_KEY` is set** (Claude reads the photo in the Netlify Function), otherwise **demo mode** with a fixed "Glow toner · 7% glycolic acid" and a visible "Demo mode" tag. |
| Product verdicts | **Real rules, on-device** (`analyzeProduct.ts` + `ingredients.ts`). The AI only extracts the label; it never decides the verdict. Guidance, not medical advice. |
| Reminders | **Local only.** They fire while the app is open or in the background; a web app can't wake itself when closed, so a missed reminder shows on the next open. Sleep and Hydration reminders renew each day the app runs; a Hydration nudge fires only if you're behind pace at that moment. |

## Sleep module

Setup asks how you usually sleep, what you want from it (up to two), your weekday bedtime and wake time, and Apple
Health. The plan starts 15 minutes earlier than your bedtime and moves lights out 15 minutes a week toward a goal that
leaves 7h 30m before your alarm. Tonight shows lights out, a tickable wind down and, from night 3, tips from simple
rules. Mornings is a ten second check in (times prefilled from the plan, how rested you feel, optional tags). Wind down
has breathing and body sessions with a player. Patterns unlocks after 7 check ins: the last 7 nights, consistency,
what helps and what costs you, and a link to Skincare. A wind down reminder and a morning check in reminder are
scheduled from setup on.

## Hydration module

Set up in a few taps: how closely you keep count, what you usually drink (built ins plus up to three of your own,
alcohol is logged but never counted), Apple Health for people who already track, and a target from your weight and
activity (or a doctor's fluid limit, which is never raised and never pushes for more). Today shows litres against an
evenly paced day from your wake time to 20:00, one tap logging with undo, swipe to delete, a hot day adjustment from
the real afternoon temperature (opt in, from day 3) and, with Apple Health, a workout adjustment. Up to three reminders
fire only when you're behind pace and go quiet after 20:00 (earlier when Sleep says lights out is early). The Guide holds
short, sourced cards by situation and a few myths, with no detox talk; saves survive a module reset. Logic lives in
`src/hydration/` with unit tests; Apple Health is mocked in `src/hydration/demo.ts`. Demo panel: Hot day (29 or 33°C),
Workout today, and **Simulate 12 days of water** for the investor "day 12" state.

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
  App.tsx                 state-machine router, persisted AppState, reminders (fire, renew, undo)
  config.ts               fallback cities, cache time, partnerships flag, API base
  state/                  AppState (load/save/migration), shared weather provider
  services/               weather (Open-Meteo), health.mock, reminders, photoStore (IndexedDB),
                          productLookup (Open Beauty Facts), productAi (Netlify Function client)
  onboarding/             5-step onboarding flow
  screens/                Dashboard, SkincareModule, SleepModule, SleepSessionPlayer, HydrationModule,
                          YogaPlayer, ComingNext placeholder
  skincare/               setup steps, result screen, reading, routine, progress
  skincare/engine/        buildToday, glowScore, analyzeProduct, ingredients, rules.config (+ tests)
  skincare/tabs/          Today, Face yoga, Progress, Ask AI
  skincare/yoga/          session content (faceYoga.content.ts), timer, streak stats
  skincare/scan/          camera hook, MediaPipe loader, quality checks, scanConfig
  sleep/                  plan, rules, patterns, sessions, demo data (+ tests)
  sleep/setup/            Sleep setup steps
  sleep/tabs/             Tonight, Wind down, Mornings, Patterns
  hydration/              drinks, target, day and pace, adjustments, nudges, tuning, week, mirror,
                          Guide content, demo data (+ tests), My drinks
  hydration/setup/        Hydration setup steps
  hydration/tabs/         Today, Guide, log and edit sheet, reminders sheet
  hydration/guide/        situation page, card page, Saved
  components/             shared UI (Screen, buttons, Chip, cards, tabs, sheets, toasts, …)
  lib/                    module catalog, theme, dates, motion, keyboard detection
netlify/functions/
  read-product.ts         label reading + follow-up answers (Claude), demo mode without a key
```
