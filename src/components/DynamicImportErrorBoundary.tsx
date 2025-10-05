import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class DynamicImportErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a dynamic import error
    const isDynamicImportError = 
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk') ||
      error.message.includes('ChunkLoadError');

    return {
      hasError: isDynamicImportError,
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DynamicImportErrorBoundary caught an error:', error, errorInfo);
    
    // Log the error for debugging
    if (error.message.includes('Failed to fetch dynamically imported module')) {
      console.error('Dynamic import failed:', {
        error: error.message,
        url: this.extractModuleUrl(error.message),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        retryCount: this.state.retryCount
      });
    }
  }

  private extractModuleUrl(errorMessage: string): string | null {
    const match = errorMessage.match(/https:\/\/[^\s]+\.js/);
    return match ? match[0] : null;
  }

  private handleRetry = () => {
    const { onRetry } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= 3) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    // Clear any existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Increment retry count
    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1
    }));

    // Clear browser cache for the failed module
    this.clearModuleCache();

    // Retry after a short delay
    this.retryTimeoutId = setTimeout(() => {
      if (onRetry) {
        onRetry();
      } else {
        // Force a page reload as fallback
        window.location.reload();
      }
    }, 1000 * (retryCount + 1)); // Exponential backoff
  };

  private clearModuleCache = () => {
    try {
      // Clear service worker cache if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CACHE'
        });
      }

      // Clear browser cache for the specific module
      const { error } = this.state;
      if (error) {
        const moduleUrl = this.extractModuleUrl(error.message);
        if (moduleUrl) {
          // Try to clear the specific module from cache
          fetch(moduleUrl, {
            method: 'HEAD',
            cache: 'no-cache'
          }).catch(() => {
            // Ignore errors, we're just trying to clear cache
          });
        }
      }
    } catch (err) {
      console.warn('Failed to clear module cache:', err);
    }
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Module Loading Failed
            </h2>
            <p className="text-gray-600 mb-4">
              We're having trouble loading this page. This usually happens due to network issues or browser cache problems.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={this.handleRetry}
                disabled={retryCount >= 3}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {retryCount >= 3 ? 'Max Retries Reached' : 'Try Again'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Reload Page
              </Button>
            </div>
            {retryCount > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Retry attempt: {retryCount}/3
              </p>
            )}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Technical Details
                </summary>
                <pre className="text-xs text-gray-400 mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}

export default DynamicImportErrorBoundary;











