
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface ErrorState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export function useErrorHandler(maxRetries = 3) {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    retryCount: 0
  });

  const handleError = useCallback((error: Error, context?: string) => {
    console.error(`Error ${context ? `in ${context}` : ''}:`, error);
    
    setErrorState(prev => ({
      hasError: true,
      error,
      retryCount: prev.retryCount + 1
    }));

    // Show user-friendly error message
    if (error.message.includes('network') || error.message.includes('fetch')) {
      toast.error('Network error. Please check your connection and try again.');
    } else if (error.message.includes('unauthorized')) {
      toast.error('Session expired. Please log in again.');
    } else {
      toast.error('Something went wrong. Please try again.');
    }
  }, []);

  const retry = useCallback((retryFunction: () => Promise<void> | void) => {
    if (errorState.retryCount < maxRetries) {
      setErrorState(prev => ({ ...prev, hasError: false, error: null }));
      try {
        const result = retryFunction();
        if (result instanceof Promise) {
          result.catch(handleError);
        }
      } catch (error) {
        handleError(error as Error);
      }
    } else {
      toast.error(`Maximum retry attempts (${maxRetries}) exceeded.`);
    }
  }, [errorState.retryCount, maxRetries, handleError]);

  const clearError = useCallback(() => {
    setErrorState({ hasError: false, error: null, retryCount: 0 });
  }, []);

  return {
    ...errorState,
    handleError,
    retry,
    clearError,
    canRetry: errorState.retryCount < maxRetries
  };
}
