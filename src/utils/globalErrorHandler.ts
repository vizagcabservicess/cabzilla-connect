/**
 * Global error handler for dynamic import failures
 */

import { clearAllCaches, clearCacheForUrl } from './serviceWorkerCache';

interface ErrorHandlerOptions {
  enableRetry?: boolean;
  enableCacheClear?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

class GlobalErrorHandler {
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(options: ErrorHandlerOptions = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections (dynamic import failures)
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      if (this.isDynamicImportError(error)) {
        console.error('Unhandled dynamic import error:', error);
        this.handleDynamicImportError(error);
        event.preventDefault(); // Prevent default error handling
      }
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      const error = event.error;
      if (this.isDynamicImportError(error)) {
        console.error('Dynamic import error:', error);
        this.handleDynamicImportError(error);
        event.preventDefault();
      }
    });
  }

  private isDynamicImportError(error: any): boolean {
    if (!error || typeof error.message !== 'string') return false;
    
    const dynamicImportErrorPatterns = [
      'Failed to fetch dynamically imported module',
      'Loading chunk',
      'Loading CSS chunk',
      'ChunkLoadError',
      'Loading module',
      'Importing a module script failed'
    ];

    return dynamicImportErrorPatterns.some(pattern => 
      error.message.includes(pattern)
    );
  }

  private async handleDynamicImportError(error: Error): Promise<void> {
    console.log(`Handling dynamic import error (attempt ${this.retryCount + 1}/${this.maxRetries})`);

    if (this.retryCount >= this.maxRetries) {
      console.error('Max retries reached for dynamic import error');
      this.showUserFriendlyError();
      return;
    }

    this.retryCount++;

    try {
      // Clear cache for the failed module
      const moduleUrl = this.extractModuleUrl(error.message);
      if (moduleUrl) {
        await clearCacheForUrl(moduleUrl);
      }

      // Clear all caches if this is a persistent issue
      if (this.retryCount > 1) {
        await clearAllCaches();
      }

      // Retry after delay
      setTimeout(() => {
        this.retryDynamicImport();
      }, this.retryDelay * this.retryCount);

    } catch (cacheError) {
      console.error('Failed to clear cache:', cacheError);
      this.retryDynamicImport();
    }
  }

  private extractModuleUrl(errorMessage: string): string | null {
    const match = errorMessage.match(/https:\/\/[^\s]+\.js/);
    return match ? match[0] : null;
  }

  private retryDynamicImport(): void {
    console.log('Retrying dynamic import...');
    
    // Try to reload the current page
    if (this.retryCount <= 2) {
      // For first few retries, try to reload just the failed module
      this.reloadFailedModule();
    } else {
      // For final retry, reload the entire page
      window.location.reload();
    }
  }

  private reloadFailedModule(): void {
    // This is a simplified approach - in a real app, you might want to
    // implement more sophisticated module reloading
    const currentUrl = window.location.href;
    
    // Try to reload the page with cache busting
    const url = new URL(currentUrl);
    url.searchParams.set('_t', Date.now().toString());
    
    // Use replace to avoid adding to history
    window.location.replace(url.toString());
  }

  private showUserFriendlyError(): void {
    // Create a user-friendly error message
    const errorContainer = document.createElement('div');
    errorContainer.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
      ">
        <div style="
          background: white;
          color: black;
          padding: 2rem;
          border-radius: 8px;
          max-width: 400px;
          text-align: center;
        ">
          <h2 style="margin: 0 0 1rem 0; color: #dc2626;">Loading Error</h2>
          <p style="margin: 0 0 1.5rem 0;">
            We're having trouble loading this page. This usually happens due to network issues or browser cache problems.
          </p>
          <button onclick="window.location.reload()" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
          ">
            Reload Page
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(errorContainer);
  }

  public reset(): void {
    this.retryCount = 0;
  }
}

// Create global instance
export const globalErrorHandler = new GlobalErrorHandler({
  enableRetry: true,
  enableCacheClear: true,
  maxRetries: 3,
  retryDelay: 1000
});

// Export for manual control
export { GlobalErrorHandler };






















































