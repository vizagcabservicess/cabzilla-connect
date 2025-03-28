
/**
 * This file contains configuration helpers for making requests to the API
 */

// Function to get headers that bypass API authentication requirements
export const getBypassHeaders = () => {
  return {
    'X-API-Key': import.meta.env.VITE_API_KEY || 'test-api-key',
    'X-Auth-Bypass': 'true',
    'X-Direct-Access': 'enabled'
  };
};

// Function to get forced configuration for requests
export const getForcedRequestConfig = () => {
  return {
    forceRefresh: localStorage.getItem('forceCacheRefresh') === 'true',
    bypassCache: localStorage.getItem('bypassCache') === 'true',
    timestamp: Date.now(),
    headers: getBypassHeaders()
  };
};
