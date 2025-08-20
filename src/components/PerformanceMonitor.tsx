import React, { useEffect, useState } from 'react';
import { checkPerformanceBudget } from '@/utils/performance';
import { useNetworkStatus } from '@/hooks/usePerformance';

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  totalTime: number;
  jsHeapSize: number;
  jsHeapUsed: number;
}

const PerformanceMonitor: React.FC<{ showInProduction?: boolean }> = ({ 
  showInProduction = false 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { isOnline, connectionType } = useNetworkStatus();

  useEffect(() => {
    // Only show in development or if explicitly enabled
    if (import.meta.env.PROD && !showInProduction) {
      return;
    }

    const updateMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        const totalTime = navigation.loadEventEnd - navigation.fetchStart;

        // Get memory info if available
        const memory = (performance as any).memory;
        const jsHeapSize = memory ? memory.usedJSHeapSize / 1024 / 1024 : 0;
        const jsHeapUsed = memory ? memory.totalJSHeapSize / 1024 / 1024 : 0;

        setMetrics({
          loadTime,
          domContentLoaded,
          totalTime,
          jsHeapSize,
          jsHeapUsed
        });
      }
    };

    // Update metrics after page load
    if (document.readyState === 'complete') {
      updateMetrics();
    } else {
      window.addEventListener('load', updateMetrics);
      return () => window.removeEventListener('load', updateMetrics);
    }
  }, [showInProduction]);

  // Toggle visibility with keyboard shortcut (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible && import.meta.env.PROD && !showInProduction) {
    return null;
  }

  const getPerformanceColor = (value: number, threshold: number) => {
    if (value <= threshold * 0.7) return 'text-green-600';
    if (value <= threshold) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceStatus = (value: number, threshold: number) => {
    if (value <= threshold * 0.7) return 'Good';
    if (value <= threshold) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ×
        </button>
      </div>

      {metrics ? (
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span>Load Time:</span>
            <span className={getPerformanceColor(metrics.loadTime, 3000)}>
              {metrics.loadTime.toFixed(0)}ms ({getPerformanceStatus(metrics.loadTime, 3000)})
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>DOM Ready:</span>
            <span className={getPerformanceColor(metrics.domContentLoaded, 2000)}>
              {metrics.domContentLoaded.toFixed(0)}ms ({getPerformanceStatus(metrics.domContentLoaded, 2000)})
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Total Time:</span>
            <span className={getPerformanceColor(metrics.totalTime, 5000)}>
              {metrics.totalTime.toFixed(0)}ms ({getPerformanceStatus(metrics.totalTime, 5000)})
            </span>
          </div>
          
          {metrics.jsHeapSize > 0 && (
            <div className="flex justify-between">
              <span>Memory Used:</span>
              <span className={getPerformanceColor(metrics.jsHeapSize, 50)}>
                {metrics.jsHeapSize.toFixed(1)}MB
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-500">Loading metrics...</div>
      )}

      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="flex justify-between text-xs">
          <span>Network:</span>
          <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        {connectionType !== 'unknown' && (
          <div className="flex justify-between text-xs">
            <span>Connection:</span>
            <span className="text-gray-600">{connectionType}</span>
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};

export default PerformanceMonitor;

