/**
 * Service Worker for cache management and dynamic import error handling
 */

const CACHE_NAME = 'vizag-taxi-hub-v1';
const DYNAMIC_CACHE_NAME = 'vizag-taxi-hub-dynamic-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// Activate event
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

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle dynamic imports and JS chunks
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs')) {
    event.respondWith(
      handleDynamicImport(request)
    );
  }
});

// Handle dynamic import requests
async function handleDynamicImport(request) {
  const url = new URL(request.url);
  
  try {
    // Try to get from cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Serving from cache:', url.pathname);
      return cachedResponse;
    }

    // Fetch from network
    const response = await fetch(request);
    
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, response.clone());
      console.log('Cached dynamic import:', url.pathname);
    }
    
    return response;
  } catch (error) {
    console.error('Failed to fetch dynamic import:', url.pathname, error);
    
    // Try to serve from cache even if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('Serving stale cache for:', url.pathname);
      return cachedResponse;
    }
    
    // If all else fails, throw the error
    throw error;
  }
}

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
        client.postMessage({
          type: 'CACHE_CLEARED',
          url: url
        });
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
        client.postMessage({
          type: 'ALL_CACHES_CLEARED'
        });
      });
    });
  } catch (error) {
    console.error('Failed to clear all caches:', error);
  }
}

// Preload a module
async function preloadModule(url) {
  try {
    const response = await fetch(url, {
      cache: 'force-cache'
    });
    
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      await cache.put(url, response);
      console.log('Preloaded module:', url);
    }
  } catch (error) {
    console.warn('Failed to preload module:', url, error);
  }
}











