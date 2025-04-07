
/**
 * Get headers that bypass cache and add admin mode
 */
export function getBypassHeaders(): Record<string, string> {
  return {
    'X-Admin-Mode': 'true',
    'X-Debug': 'true',
    'X-Bypass-Cache': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  };
}

/**
 * Get forced request config
 */
export function getForcedRequestConfig(): RequestInit {
  return {
    headers: getBypassHeaders(),
    cache: 'no-store'
  };
}

/**
 * Format data for multipart form submission
 */
export function formatDataForMultipart(data: Record<string, any>): FormData {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        // Handle arrays by stringifying them
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'object' && !(value instanceof File)) {
        // Handle objects by stringifying them
        formData.append(key, JSON.stringify(value));
      } else {
        // Handle primitives and files directly
        formData.append(key, value);
      }
    }
  });
  
  return formData;
}
