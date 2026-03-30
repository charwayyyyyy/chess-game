const CACHE_NAME = 'chess-pwa-v6';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.webmanifest',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/screenshots/screenshot-desktop.png',
  '/assets/screenshots/screenshot-mobile.png'
];

// ─── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => {}))
  );
  self.skipWaiting();
});

// ─── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(keyList.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// ─── Fetch (Stale-While-Revalidate) ────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
    return;
  }
  e.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(e.request).then((cachedResponse) => {
        const fetchPromise = fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              cache.put(e.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse || caches.match('/index.html'));
        return cachedResponse || fetchPromise;
      })
    )
  );
});

// ─── Push Notifications ────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : {};
  const title = data.title || 'The Chess Game';
  const options = {
    body: data.body || "It's your move! Come back and play.",
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-192.png',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
    actions: [
      { action: 'play', title: 'Play Now' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click ────────────────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ─── Background Sync ───────────────────────────────────────────────────────
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-game-state') {
    e.waitUntil(syncGameState());
  }
});

async function syncGameState() {
  // Placeholder: sync any queued game state to a backend if needed
  return Promise.resolve();
}

// ─── Periodic Background Sync ──────────────────────────────────────────────
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'refresh-chess-content') {
    e.waitUntil(refreshContent());
  }
});

async function refreshContent() {
  // Pre-fetch the latest app shell to keep it fresh
  const cache = await caches.open(CACHE_NAME);
  await cache.add('/').catch(() => {});
}

