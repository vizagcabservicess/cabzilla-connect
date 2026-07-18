/**
 * Service Worker — push notifications + light static precache.
 *
 * Do not cache-first JS bundles: after a deploy, missing chunks may return index.html
 * with HTTP 200; caching that breaks dynamic imports ("Failed to fetch dynamically
 * imported module") until users clear site data.
 */

const CACHE_NAME = 'vizag-taxi-hub-v5';
const DYNAMIC_CACHE_NAME = 'vizag-taxi-hub-dynamic-v5';

/** Real static files only — never precache `/` or other HTML routes (stale app shell). */
const STATIC_ASSETS = [
  '/og-image.png',
  '/cars/sedan.svg',
  '/cars/ertiga.svg',
  '/cars/innova.svg',
  '/cars/luxury.svg',
  '/cars/tempo.svg',
  '/cars/amaze.svg',
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const path of STATIC_ASSETS) {
        try {
          await cache.add(new Request(path, { cache: 'reload' }));
        } catch (e) {
          console.warn('SW precache skip:', path, e);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isModuleScript = url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs');
  if (!isModuleScript) return;

  // Network-only for scripts — hashed filenames + browser HTTP cache are enough.
  event.respondWith(fetch(request));
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { type, url } = event.data;
  
  switch (type) {
    case 'CLEAR_CACHE':
      clearCache(url);
      break;
    case 'CLEAR_ALL_CACHES':
      clearAllCaches();
      break;
    case 'PRELOAD_MODULE':
      preloadModule(url);
      break;
  }
});

// Clear specific cache
async function clearCache(url) {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const request of keys) {
        if (url && request.url === url) {
          await cache.delete(request);
          console.log('Cleared cache for:', url);
        }
      }
    }
    
    // Notify main thread
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        try {
          client.postMessage({ type: 'CACHE_CLEARED', url: url });
        } catch (e) { /* ignore postMessage errors to sandboxed/iframe clients */ }
      });
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

// Clear all caches
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    
    console.log('All caches cleared');
    
    // Notify main thread
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        try {
          client.postMessage({ type: 'ALL_CACHES_CLEARED' });
        } catch (e) { /* ignore postMessage errors to sandboxed/iframe clients */ }
      });
    });
  } catch (error) {
    console.error('Failed to clear all caches:', error);
  }
}

// Preload a module (network only — do not SW-cache scripts; see fetch handler comment)
async function preloadModule(url) {
  try {
    await fetch(url, { cache: 'default' });
  } catch (error) {
    console.warn('Failed to preload module:', url, error);
  }
}

// Web Push — show OS/browser notification (payload JSON: { title, body, url, data })
self.addEventListener('push', (event) => {
  let payload = { title: 'Vizag Taxi Hub', body: '', url: '/admin', tag: 'vizag-taxi-hub' };
  try {
    if (event.data) {
      const j = event.data.json();
      if (j && typeof j === 'object') {
        payload = {
          title: j.title || payload.title,
          body: j.body || '',
          url: j.url || '/admin',
          tag: j.tag || (j.data && j.data.type) || payload.tag,
        };
      }
    }
  } catch (e) {
    try {
      const t = event.data ? event.data.text() : '';
      if (t) {
        payload.body = t;
      }
    } catch (_) {}
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/og-image.png',
      badge: '/og-image.png',
      tag: payload.tag || 'vizag-taxi-hub',
      renotify: true,
      data: { url: payload.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin';
  const path = url.startsWith('http') ? url : new URL(url, self.location.origin).pathname;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const c = clientList[i];
        try {
          const u = new URL(c.url);
          if (u.pathname.startsWith(path.split('?')[0]) && 'focus' in c) {
            return c.focus();
          }
        } catch (_) {}
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(self.location.origin + path);
      }
    })
  );
});

















