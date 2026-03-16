// Service Worker for Empanadas App
// Strategy: Network First for pages, Cache First for static assets
// Data (Supabase API calls) is never cached - always requires internet

const CACHE_NAME = 'empanadas-app-v1'

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/login',
  '/dashboard',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/manifest.json',
]

// Install: pre-cache essential static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

// Fetch: different strategies based on request type
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip Supabase API calls - never cache data
  if (url.hostname.includes('supabase')) return

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return

  // Skip Next.js HMR/dev requests
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  // For static assets (_next/static): Cache First
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            return response
          }),
      ),
    )
    return
  }

  // For icon/image assets: Cache First
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
            return response
          }),
      ),
    )
    return
  }

  // For pages/navigation: Network First (try network, fallback to cache)
  if (
    request.mode === 'navigate' ||
    request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              caches.match('/dashboard').then(
                (fallback) =>
                  fallback ||
                  new Response(
                    'Sin conexion. Por favor, verifica tu internet.',
                    {
                      status: 503,
                      headers: { 'Content-Type': 'text/html; charset=utf-8' },
                    },
                  ),
              ),
          ),
        ),
    )
    return
  }

  // For other requests (JS, CSS, fonts): Stale While Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => cached)

      return cached || fetchPromise
    }),
  )
})
