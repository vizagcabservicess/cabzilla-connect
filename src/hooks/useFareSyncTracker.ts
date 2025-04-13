
import { useRef } from 'react';

/**
 * Simple hook to track fare updates and prevent duplicates
 */
export const useFareSyncTracker = () => {
  // Use refs to avoid re-renders but maintain state across renders
  const trackedFares = useRef<Record<string, number>>({});
  const lastDispatchTime = useRef<Record<string, number>>({});
  const syncLock = useRef<boolean>(false);
  const knownFareKeys = useRef<Set<string>>(new Set());
  const syncHistory = useRef<Map<string, number>>(new Map());
  
  // Check if a fare is different from what we've tracked
  const isFareChanged = (cabId: string, fare: number): boolean => {
    const key = `${cabId}_${fare}`;
    if (knownFareKeys.current.has(key)) {
      return false;
    }
    return trackedFares.current[cabId] !== fare;
  };
  
  // Track a fare value to prevent duplicate updates
  const trackFare = (cabId: string, fare: number): void => {
    const previousFare = trackedFares.current[cabId];
    
    // Only log when fare actually changes to reduce console spam
    if (previousFare !== fare) {
      console.log(`Tracking fare for ${cabId}: ${fare}`);
    }
    
    trackedFares.current[cabId] = fare;
    lastDispatchTime.current[cabId] = Date.now();
    
    // Add to known fare keys to prevent duplicate processing
    const key = `${cabId}_${fare}`;
    knownFareKeys.current.add(key);
  };
  
  // Check if we should throttle updates for this cab
  const shouldThrottle = (cabId: string, minInterval: number = 300): boolean => {
    const now = Date.now();
    const lastTime = lastDispatchTime.current[cabId] || 0;
    
    // Check if we've already processed this sync recently
    if (syncHistory.current.has(cabId)) {
      const lastSync = syncHistory.current.get(cabId) || 0;
      if (now - lastSync < minInterval * 2) {
        return true;
      }
    }
    
    // Record this sync attempt
    syncHistory.current.set(cabId, now);
    
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
      
      // Clear fare keys related to this cabId
      const keysToRemove: string[] = [];
      knownFareKeys.current.forEach(key => {
        if (key.startsWith(`${cabId}_`)) {
          keysToRemove.push(key);
        }
      });
      
      keysToRemove.forEach(key => knownFareKeys.current.delete(key));
    } else {
      trackedFares.current = {};
      lastDispatchTime.current = {};
      knownFareKeys.current.clear();
      syncHistory.current.clear();
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
