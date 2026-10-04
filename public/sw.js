// Minimal service worker: makes HUMANOS installable and lets it reopen offline.
// Navigations go network-first (fresh deploys win); same-origin assets are served from cache and
// refreshed in the background. Camera frames never touch this: they are never requested over the network.
const CACHE = 'humanos-v2'
// Paths are relative to this file, so the app works at the domain root or under a sub-path.
const ROOT = new URL('./', self.location).href
const SHELL = ['./', 'manifest.webmanifest', 'favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(ROOT, copy))
          return response
        })
        .catch(() => caches.match(ROOT)),
    )
    return
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone())
          return response
        })
        .catch(() => cached)
      return cached ?? network
    }),
  )
})
