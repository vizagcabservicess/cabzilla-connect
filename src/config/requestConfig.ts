
/**
 * Utility functions for API requests configuration
 */

export const getBypassHeaders = () => {
  // Get API key if available from environment
  const apiKey = import.meta.env.VITE_API_KEY || '';
  
  return {
    'X-API-Key': apiKey,
    'X-Auth-Bypass': 'true',
    'X-Direct-Access': 'true'
  };
};

export const getForcedRequestConfig = () => {
  return {
    forceRefresh: true,
    bypassCache: true,
    timestamp: Date.now(),
    headers: {
      ...getBypassHeaders(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  };
};
