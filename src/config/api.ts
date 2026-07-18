// API configuration

function getRuntimeProductionOrigin(): string {
  if (typeof window === 'undefined') {
    return 'https://vizagtaxihub.com';
  }
  const origin = window.location.origin;
  if (/^https?:\/\/([a-z0-9-]+\.)*vizagtaxihub\.com$/i.test(origin)) {
    return origin;
  }
  return 'https://vizagtaxihub.com';
}

function getRuntimeApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return import.meta.env.DEV
      ? 'http://localhost:8080'
      : 'https://vizagtaxihub.com';
  }

  const isLocalHost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  // Use local backend only when app itself runs on localhost.
  if (import.meta.env.DEV && isLocalHost) {
    return 'http://localhost:8080';
  }

  return getRuntimeProductionOrigin();
}

// Runtime API base URL with CSP-safe same-origin fallback.
export const apiBaseUrl = getRuntimeApiBaseUrl();

// Helper function to get full API URL
export const getApiUrl = (path: string = ''): string => {
  // Ensure path starts with a slash if it doesn't already and isn't empty
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';

  // List of known API directories that should not get .php
  const apiDirectories = ['/api/pooling', '/api/admin', '/api/user'];
  const isApiDirectory = apiDirectories.some(dir => normalizedPath.startsWith(dir + '/') || normalizedPath === dir);

  // Split path and query string - .php must go before ?, not after
  const [pathPart, queryPart] = normalizedPath.split('?');
  const hasQuery = queryPart !== undefined;

  // If the path part already has .php, don't add it again
  if (pathPart.includes('.php')) {
    const fullUrl = `${apiBaseUrl}${normalizedPath}`.replace(/([^:]\/)+/g, '$1');
    return fullUrl;
  }

  // Add .php before query string if this is an API endpoint
  if (
    pathPart.includes('/api/') &&
    !pathPart.endsWith('/') &&
    !isApiDirectory
  ) {
    const withPhp = hasQuery ? `${pathPart}.php?${queryPart}` : `${pathPart}.php`;
    return `${apiBaseUrl}${withPhp}`.replace(/([^:]\/)+/g, '$1');
  }

  // Remove any duplicate slashes that might occur when joining
  const fullUrl = `${apiBaseUrl}${normalizedPath}`.replace(/([^:]\/)+/g, '$1');
  return fullUrl;
};

// Force refresh headers for API requests to bypass cache
export const forceRefreshHeaders = {
  'X-Force-Refresh': 'true',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Default headers for API requests
export const defaultHeaders = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
};

// Export configuration options
export default {
  baseUrl: apiBaseUrl,
  getApiUrl,
  defaultHeaders,
  forceRefreshHeaders
};
