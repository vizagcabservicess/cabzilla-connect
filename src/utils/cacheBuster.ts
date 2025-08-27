/**
 * Cache Busting Utilities
 * Handles browser cache clearing and version management
 */

export const clearBrowserCache = async (): Promise<void> => {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('Browser cache cleared successfully');
    } catch (error) {
      console.error('Error clearing browser cache:', error);
    }
  }
};

export const forcePageReload = (): void => {
  window.location.reload();
};

export const checkVersionAndReload = (): void => {
  const currentVersion = process.env.NODE_ENV === 'production' 
    ? Date.now().toString() 
    : 'dev';
  
  const storedVersion = localStorage.getItem('app_version');
  
  if (storedVersion && storedVersion !== currentVersion) {
    localStorage.setItem('app_version', currentVersion);
    forcePageReload();
  } else {
    localStorage.setItem('app_version', currentVersion);
  }
};

export const addCacheBustingParam = (url: string): string => {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
};

export const clearLocalStorage = (): void => {
  try {
    localStorage.clear();
    console.log('Local storage cleared successfully');
  } catch (error) {
    console.error('Error clearing local storage:', error);
  }
};

export const clearSessionStorage = (): void => {
  try {
    sessionStorage.clear();
    console.log('Session storage cleared successfully');
  } catch (error) {
    console.error('Error clearing session storage:', error);
  }
};

export const clearAllStorage = (): void => {
  clearLocalStorage();
  clearSessionStorage();
  clearBrowserCache();
};

// Auto-clear cache on app start
export const initializeCacheBusting = (): void => {
  checkVersionAndReload();
  
  // Clear cache on app initialization
  clearBrowserCache();
  
  // Add event listener for when user comes back to the app
  window.addEventListener('focus', () => {
    const lastVisit = localStorage.getItem('last_visit');
    const now = Date.now();
    
    // If user was away for more than 1 hour, clear cache
    if (lastVisit && (now - parseInt(lastVisit)) > 3600000) {
      clearBrowserCache();
    }
    
    localStorage.setItem('last_visit', now.toString());
  });
};
