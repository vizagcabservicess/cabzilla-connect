/**
 * Service Worker cache management utilities
 */

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }
  } catch (error) {
    console.error('Failed to clear caches:', error);
  }
}

/**
 * Clear specific cache by name
 */
export async function clearCacheByName(cacheName: string): Promise<void> {
  try {
    if ('caches' in window) {
      await caches.delete(cacheName);
      console.log(`Cache '${cacheName}' cleared`);
    }
  } catch (error) {
    console.error(`Failed to clear cache '${cacheName}':`, error);
  }
}

/**
 * Clear cache for a specific URL
 */
export async function clearCacheForUrl(url: string): Promise<void> {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const request of keys) {
          if (request.url === url) {
            await cache.delete(request);
            console.log(`Cleared cache for URL: ${url}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to clear cache for URL '${url}':`, error);
  }
}

/**
 * Clear cache for assets matching a pattern
 */
export async function clearCacheForAssets(pattern: RegExp): Promise<void> {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        
        for (const request of keys) {
          if (pattern.test(request.url)) {
            await cache.delete(request);
            console.log(`Cleared cache for asset: ${request.url}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to clear cache for assets:', error);
  }
}

/**
 * Get cache information
 */
export async function getCacheInfo(): Promise<{
  cacheNames: string[];
  totalSize: number;
  entries: Array<{ url: string; size: number }>;
}> {
  try {
    if (!('caches' in window)) {
      return { cacheNames: [], totalSize: 0, entries: [] };
    }

    const cacheNames = await caches.keys();
    const entries: Array<{ url: string; size: number }> = [];
    let totalSize = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          const size = blob.size;
          totalSize += size;
          entries.push({ url: request.url, size });
        }
      }
    }

    return { cacheNames, totalSize, entries };
  } catch (error) {
    console.error('Failed to get cache info:', error);
    return { cacheNames: [], totalSize: 0, entries: [] };
  }
}

/**
 * Clear old caches (older than specified days)
 */
export async function clearOldCaches(maxAgeDays: number = 7): Promise<void> {
  try {
    if (!('caches' in window)) return;

    const cacheNames = await caches.keys();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    for (const cacheName of cacheNames) {
      // Check if cache name contains a date
      const dateMatch = cacheName.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        const cacheDate = new Date(dateMatch[1]);
        if (cacheDate < cutoffDate) {
          await caches.delete(cacheName);
          console.log(`Cleared old cache: ${cacheName}`);
        }
      }
    }
  } catch (error) {
    console.error('Failed to clear old caches:', error);
  }
}

/**
 * Preload critical assets
 */
export async function preloadCriticalAssets(assets: string[]): Promise<void> {
  try {
    for (const asset of assets) {
      try {
        await fetch(asset, { cache: 'force-cache' });
        console.log(`Preloaded asset: ${asset}`);
      } catch (error) {
        console.warn(`Failed to preload asset ${asset}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to preload critical assets:', error);
  }
}

/**
 * Register service worker with cache management
 */
export async function registerServiceWorkerWithCacheManagement(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          console.log('Service worker cache cleared');
        }
      });

      console.log('Service worker registered with cache management');
    }
  } catch (error) {
    console.error('Failed to register service worker:', error);
  }
}

