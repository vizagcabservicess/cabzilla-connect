import { useEffect, useRef, useCallback, useState } from 'react';
import { debounce, throttle, createIntersectionObserver } from '@/utils/performance';

// Hook for lazy loading with intersection observer
export const useLazyLoad = (options: IntersectionObserverInit = {}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = createIntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      options
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return { elementRef, isVisible };
};

// Hook for debounced functions
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) => {
  return useCallback(debounce(callback, delay), [callback, delay]);
};

// Hook for throttled functions
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  limit: number
) => {
  return useCallback(throttle(callback, limit), [callback, limit]);
};

// Hook for performance monitoring (disabled in production)
export const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    if (import.meta.env.PROD) return;
    
    const start = performance.now();
    return () => {
      const end = performance.now();
      console.log(`${componentName} render time: ${end - start}ms`);
    };
  }, [componentName]);
};

// Hook for memory management
export const useMemoryCleanup = () => {
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (typeof window !== 'undefined' && 'gc' in window) {
        (window as any).gc();
      }
    };
  }, []);
};

// Hook for image optimization
export const useImageOptimization = () => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const preloadImage = useCallback((src: string) => {
    if (loadedImages.has(src)) return;

    const img = new Image();
    img.onload = () => {
      setLoadedImages(prev => new Set(prev).add(src));
    };
    img.src = src;
  }, [loadedImages]);

  return { preloadImage, loadedImages };
};

// Hook for scroll performance optimization
export const useScrollOptimization = (callback: (scrollTop: number) => void, delay = 16) => {
  const throttledCallback = useThrottle(callback, delay);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      throttledCallback(scrollTop);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [throttledCallback]);
};

// Hook for resize performance optimization
export const useResizeOptimization = (callback: (width: number, height: number) => void, delay = 250) => {
  const debouncedCallback = useDebounce(callback, delay);

  useEffect(() => {
    const handleResize = () => {
      debouncedCallback(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [debouncedCallback]);
};

// Hook for network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setConnectionType(connection?.effectiveType || 'unknown');
      }
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection?.addEventListener('change', updateNetworkStatus);
    }

    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
      
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connection?.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  return { isOnline, connectionType };
};

