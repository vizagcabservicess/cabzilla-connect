
// Helper functions for making API requests
import { getApiUrl } from './api';

/**
 * Get headers that bypass common API restrictions
 */
export const getBypassHeaders = (): Record<string, string> => {
  return {
    'X-Bypass-Cache': 'true',
    'X-Force-Refresh': 'true',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Origin': window.location.origin,
    'X-Requested-With': 'XMLHttpRequest',
    // Additional CORS headers
    'Accept': '*/*',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
};

/**
 * Get forced request configuration with bypass headers and cache settings
 * Enhanced with additional settings to prevent CORS issues
 */
export const getForcedRequestConfig = () => {
  return {
    headers: getBypassHeaders(),
    timeout: 45000, // Increased timeout for reliability
    cache: 'no-store' as const,
    mode: 'cors' as const,
    credentials: 'omit' as const, // Don't send credentials for CORS
    keepalive: true, // Keep connection alive
    redirect: 'follow' as const // Follow redirects
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

/**
 * Create a CORS-friendly URL for API requests
 * Always use the CORS proxy for more reliable cross-domain requests
 */
export const createCorsUrl = (endpoint: string): string => {
  return getApiUrl(endpoint);
};

/**
 * Apply CORS workarounds for OPTIONS preflight requests
 * This helps fix CORS issues by sending a preflight request first
 */
export const checkCorsWithPreflight = async (endpoint: string): Promise<boolean> => {
  try {
    // First check if the CORS fix endpoint works
    const corsFixUrl = getApiUrl('/api/fix-cors');
    await fetch(corsFixUrl, { 
      method: 'OPTIONS',
      headers: getBypassHeaders(),
      mode: 'cors'
    });
    console.log('CORS preflight check successful');
    return true;
  } catch (error) {
    console.error('CORS preflight check failed:', error);
    return false;
  }
};
