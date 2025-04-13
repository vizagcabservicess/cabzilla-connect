
import { useRef } from 'react';

/**
 * Simple hook to track fare updates and prevent duplicates
 */
export const useFareSyncTracker = () => {
  // Use refs to avoid re-renders but maintain state across renders
  const trackedFares = useRef<Record<string, number>>({});
  const lastDispatchTime = useRef<Record<string, number>>({});
  const syncLock = useRef<boolean>(false);
  
  // Check if a fare is different from what we've tracked
  const isFareChanged = (cabId: string, fare: number): boolean => {
    return trackedFares.current[cabId] !== fare;
  };
  
  // Track a fare value to prevent duplicate updates
  const trackFare = (cabId: string, fare: number): void => {
    trackedFares.current[cabId] = fare;
    lastDispatchTime.current[cabId] = Date.now();
  };
  
  // Check if we should throttle updates for this cab
  const shouldThrottle = (cabId: string, minInterval: number = 300): boolean => {
    const now = Date.now();
    const lastTime = lastDispatchTime.current[cabId] || 0;
    return (now - lastTime) < minInterval;
  };
  
  // Acquire or check sync lock
  const acquireSyncLock = (force: boolean = false): boolean => {
    if (syncLock.current && !force) return false;
    syncLock.current = true;
    return true;
  };
  
  // Release sync lock
  const releaseSyncLock = (): void => {
    syncLock.current = false;
  };
  
  // Reset tracking for a specific cab or all cabs
  const resetTracking = (cabId?: string): void => {
    if (cabId) {
      delete trackedFares.current[cabId];
      delete lastDispatchTime.current[cabId];
    } else {
      trackedFares.current = {};
      lastDispatchTime.current = {};
    }
    syncLock.current = false;
  };
  
  return {
    isFareChanged,
    trackFare,
    shouldThrottle,
    acquireSyncLock,
    releaseSyncLock,
    resetTracking
  };
};
