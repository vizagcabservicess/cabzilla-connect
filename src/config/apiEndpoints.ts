
import { getApiUrl } from './api';

/**
 * API endpoint configuration for local fare requests
 */
export const localFareEndpoints = {
  // Direct endpoints
  directLocalFares: '/api/direct-local-fares.php',
  adminLocalFares: '/api/admin/direct-local-fares.php',
  
  // Fallback endpoints (used if direct endpoints fail)
  localPackageFares: '/api/local-package-fares.php',
  
  // Admin endpoints for management
  syncLocalFares: '/api/admin/sync-local-fares.php',
  localFaresUpdate: '/api/admin/local-fares-update.php',
};

/**
 * Get a fully qualified URL for a local fare API endpoint
 * @param endpoint The endpoint path
 * @returns The full API URL
 */
export const getLocalFareUrl = (endpoint: string): string => {
  return getApiUrl(endpoint);
};

/**
 * Get all possible variants of an endpoint to try
 * This helps handle different server configurations
 * @param baseEndpoint The base endpoint to get variants for
 * @returns Array of endpoint variants to try
 */
export const getEndpointVariants = (baseEndpoint: string): string[] => {
  // Strip .php extension if present
  const basePath = baseEndpoint.replace('.php', '');
  
  // Return various format alternatives
  return [
    baseEndpoint,                  // Original format: /api/endpoint.php
    basePath,                      // No extension: /api/endpoint
    `/backend${baseEndpoint}`,     // Backend prefix with extension: /backend/api/endpoint.php
    `/backend${basePath}`,         // Backend prefix without extension: /backend/api/endpoint
    `/api/backend${basePath}`,     // Alternative nesting
    `/src/backend/php-templates${baseEndpoint}` // Direct dev path
  ];
};

/**
 * Get a list of URLs to try for a given fare endpoint
 * This tries multiple server configurations to increase reliability
 * @param endpoint The endpoint path 
 * @returns Array of URLs to try
 */
export const getLocalFareUrlVariants = (endpoint: string): string[] => {
  const variants = getEndpointVariants(endpoint);
  return variants.map(variant => getApiUrl(variant));
};
