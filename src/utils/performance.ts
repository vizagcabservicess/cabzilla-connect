// Performance optimization utilities

// Dynamic import wrapper with error handling
export const dynamicImport = async (importFn: () => Promise<any>) => {
  try {
    return await importFn();
  } catch (error) {
    console.error('Dynamic import failed:', error);
    throw error;
  }
};

// Lazy load component with retry mechanism
export const lazyLoadComponent = (importFn: () => Promise<any>, retries = 3) => {
  return async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };
};

// Performance monitoring
export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`${name} took ${end - start}ms`);
};

// Debounce function for performance optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for performance optimization
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Intersection Observer for lazy loading
export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit = {}
) => {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  });
};

// Preload critical resources
export const preloadResource = (href: string, as: string) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
};

// Load Razorpay script dynamically
export const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay script'));
    document.head.appendChild(script);
  });
};

// Optimize images
export const optimizeImage = (src: string, width?: number, quality = 80): string => {
  // Add image optimization parameters if supported by your CDN
  const url = new URL(src, window.location.origin);
  if (width) url.searchParams.set('w', width.toString());
  url.searchParams.set('q', quality.toString());
  return url.toString();
};

// Memory management
export const cleanupMemory = () => {
  // Clear unused event listeners
  // Clear unused timers
  // Clear unused intervals
  if (typeof window !== 'undefined' && 'gc' in window) {
    (window as any).gc();
  }
};

// Performance budget monitoring
export const checkPerformanceBudget = () => {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigation) {
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
    const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
    
    console.log('Performance Metrics:', {
      loadTime: `${loadTime}ms`,
      domContentLoaded: `${domContentLoaded}ms`,
      totalTime: `${navigation.loadEventEnd - navigation.fetchStart}ms`
    });
    
    // Alert if performance is poor
    if (loadTime > 3000) {
      console.warn('Page load time exceeds 3 seconds');
    }
  }
};

// Dynamic imports for heavy components
export const dynamicImports = {
  // Heavy UI components
  Recharts: () => import('recharts'),
  Swiper: () => import('swiper'),
  PDFRenderer: () => import('@react-pdf/renderer'),
  
  // Maps components (load only when needed)
  GoogleMaps: () => import('@react-google-maps/api'),
  
  // Form components
  ReactHookForm: () => import('react-hook-form'),
  Zod: () => import('zod'),
  
  // Utility libraries
  DateFns: () => import('date-fns'),
  Axios: () => import('axios'),
};

// Resource loading optimization
export const loadResourceOptimized = (url: string, type: 'script' | 'style' | 'image'): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (type === 'script') {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      document.head.appendChild(script);
    } else if (type === 'style') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load style: ${url}`));
      document.head.appendChild(link);
    } else if (type === 'image') {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    }
  });
};

// Bundle size monitoring
export const monitorBundleSize = () => {
  if (typeof window !== 'undefined') {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          if (resourceEntry.name.includes('.js') || resourceEntry.name.includes('.css')) {
            console.log(`Resource loaded: ${resourceEntry.name} (${resourceEntry.transferSize} bytes)`);
          }
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }
};

// Critical CSS inlining
export const inlineCriticalCSS = (css: string) => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
};

// Defer non-critical resources
export const deferResource = (url: string, type: 'script' | 'style') => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      loadResourceOptimized(url, type);
    });
  } else {
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        loadResourceOptimized(url, type);
      });
    } else {
      setTimeout(() => {
        loadResourceOptimized(url, type);
      }, 1000);
    }
  }
};
