
// Helper functions for making API requests

/**
 * Get headers that bypass common API restrictions
 */
export const getBypassHeaders = (): Record<string, string> => {
  return {
    'X-Bypass-Cache': 'true',
    'X-Force-Refresh': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
};

/**
 * Get forced request configuration with bypass headers and cache settings
 */
export const getForcedRequestConfig = () => {
  return {
    headers: getBypassHeaders(),
    timeout: 30000, // 30 seconds timeout
    cache: 'no-store' as const
  };
};

/**
 * Format data for multipart form submission
 * This is more reliable for PHP endpoints than JSON
 */
export const formatDataForMultipart = (data: Record<string, any>): FormData => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    // Handle arrays and objects
    if (typeof value === 'object' && value !== null) {
      formData.append(key, JSON.stringify(value));
    } else {
      // Convert other values to string
      formData.append(key, String(value ?? ''));
    }
  });
  
  return formData;
};
