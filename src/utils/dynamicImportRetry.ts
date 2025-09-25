/**
 * Utility for retrying failed dynamic imports with exponential backoff
 */

import React from 'react';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesReached?: (error: Error) => void;
}

interface RetryableImportOptions extends RetryOptions {
  moduleName?: string;
}

/**
 * Retry a dynamic import with exponential backoff
 */
export async function retryDynamicImport<T>(
  importFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry,
    onMaxRetriesReached
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a dynamic import error
      const isDynamicImportError = 
        lastError.message.includes('Failed to fetch dynamically imported module') ||
        lastError.message.includes('Loading chunk') ||
        lastError.message.includes('Loading CSS chunk') ||
        lastError.message.includes('ChunkLoadError');

      if (!isDynamicImportError) {
        // If it's not a dynamic import error, don't retry
        throw lastError;
      }

      console.warn(`Dynamic import attempt ${attempt} failed:`, lastError.message);

      if (attempt === maxRetries) {
        console.error(`Dynamic import failed after ${maxRetries} attempts`);
        onMaxRetriesReached?.(lastError);
        throw lastError;
      }

      onRetry?.(attempt, lastError);

      // Clear cache before retry
      await clearModuleCache(lastError.message);

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      
      console.log(`Retrying dynamic import in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Clear module cache for a specific error
 */
async function clearModuleCache(errorMessage: string): Promise<void> {
  try {
    // Extract module URL from error message
    const moduleUrl = extractModuleUrl(errorMessage);
    if (!moduleUrl) return;

    // Clear service worker cache if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CACHE',
          url: moduleUrl
        });
      } catch (err) {
        console.warn('Failed to clear service worker cache:', err);
      }
    }

    // Try to clear browser cache for the specific module
    try {
      await fetch(moduleUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (err) {
      // Ignore fetch errors, we're just trying to clear cache
      console.warn('Failed to clear module cache:', err);
    }
  } catch (err) {
    console.warn('Failed to clear module cache:', err);
  }
}

/**
 * Extract module URL from error message
 */
function extractModuleUrl(errorMessage: string): string | null {
  const match = errorMessage.match(/https:\/\/[^\s]+\.js/);
  return match ? match[0] : null;
}

/**
 * Create a retryable dynamic import function
 */
export function createRetryableImport<T>(
  importFn: () => Promise<T>,
  options: RetryableImportOptions = {}
): () => Promise<T> {
  const { moduleName, ...retryOptions } = options;
  
  return () => retryDynamicImport(importFn, {
    ...retryOptions,
    onRetry: (attempt, error) => {
      console.log(`Retrying import for ${moduleName || 'module'} (attempt ${attempt})`);
      options.onRetry?.(attempt, error);
    },
    onMaxRetriesReached: (error) => {
      console.error(`Max retries reached for ${moduleName || 'module'}`);
      options.onMaxRetriesReached?.(error);
    }
  });
}

/**
 * Enhanced lazy loading with retry mechanism
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: RetryableImportOptions = {}
): React.LazyExoticComponent<T> {
  return React.lazy(createRetryableImport(importFn, options));
}

/**
 * Preload a module to reduce loading failures
 */
export async function preloadModule<T>(
  importFn: () => Promise<T>,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 5000 } = options;
  
  try {
    await Promise.race([
      importFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Preload timeout')), timeout)
      )
    ]);
  } catch (error) {
    console.warn('Module preload failed:', error);
    // Don't throw, preloading is optional
  }
}

/**
 * Check if an error is a dynamic import error
 */
export function isDynamicImportError(error: Error): boolean {
  return (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Loading CSS chunk') ||
    error.message.includes('ChunkLoadError') ||
    error.message.includes('Loading module')
  );
}
