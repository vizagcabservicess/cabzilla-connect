
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
  const lastProcessedEventId = useRef<Record<string, number>>({});
  const processingStack = useRef<Set<string>>(new Set());
  const preventLogging = useRef<boolean>(false);
  const refreshCountRef = useRef<Record<string, number>>({});
  const fareChangeHistory = useRef<Map<string, number[]>>(new Map());
  
  // Check if a fare is different from what we've tracked
  const isFareChanged = (cabId: string, fare: number, tolerance: number = 0): boolean => {
    // If we're already processing this exact fare, prevent re-entry
    const key = `${cabId}_${fare}`;
    if (processingStack.current.has(key)) {
      return false;
    }
    
    try {
      processingStack.current.add(key);
      
      // Known fares should not trigger another update
      if (knownFareKeys.current.has(key)) {
        return false;
      }
      
      const previousFare = trackedFares.current[cabId];
      
      // If we have no previous fare, it's a change
      if (previousFare === undefined) return true;
      
      // FIXED: Track fare change history to detect oscillations
      if (!fareChangeHistory.current.has(cabId)) {
        fareChangeHistory.current.set(cabId, []);
      }
      
      const history = fareChangeHistory.current.get(cabId) || [];
      if (history.length > 5) {
        history.shift(); // Keep only last 5 changes
      }
      history.push(fare);
      fareChangeHistory.current.set(cabId, history);
      
      // Check for minimum difference to avoid micro-adjustments
      const diff = Math.abs(previousFare - fare);
      return diff > tolerance;
    } finally {
      // Always remove from processing stack
      processingStack.current.delete(key);
    }
  };
  
  // Track a fare value to prevent duplicate updates
  const trackFare = (cabId: string, fare: number): void => {
    const previousFare = trackedFares.current[cabId];
    
    // Only log when fare actually changes to reduce console spam
    if (previousFare !== fare && !preventLogging.current) {
      console.log(`Tracking fare for ${cabId}: ${fare}`);
    }
    
    trackedFares.current[cabId] = fare;
    lastDispatchTime.current[cabId] = Date.now();
    
    // Add to known fare keys to prevent duplicate processing
    const key = `${cabId}_${fare}`;
    knownFareKeys.current.add(key);
    
    // FIXED: Maintain a reasonable set size to prevent memory leaks
    if (knownFareKeys.current.size > 200) {
      // Clear older entries
      const keysArray = Array.from(knownFareKeys.current);
      const keysToDelete = keysArray.slice(0, 100); // Remove half the cache
      keysToDelete.forEach(k => knownFareKeys.current.delete(k));
    }
  };
  
  // Track event IDs to prevent duplicate processing
  const hasProcessedEvent = (cabId: string, eventId: number): boolean => {
    if (!eventId) return false;
    return lastProcessedEventId.current[cabId] === eventId;
  };
  
  // Track that we've processed an event
  const trackProcessedEvent = (cabId: string, eventId: number): void => {
    if (!eventId) return;
    lastProcessedEventId.current[cabId] = eventId;
  };
  
  // FIXED: Improved throttling for refreshes to prevent cascading updates
  const shouldThrottle = (cabId: string, minInterval: number = 300): boolean => {
    const now = Date.now();
    const lastTime = lastDispatchTime.current[cabId] || 0;
    
    // Throttle based on refresh count
    const refreshCount = refreshCountRef.current[cabId] || 0;
    let adjustedInterval = minInterval;
    
    if (refreshCount > 3) {
      // Increase throttle time for cabId with multiple refreshes
      adjustedInterval = Math.min(minInterval * Math.max(1, refreshCount / 2), 2000);
      
      // Reset counter after a period of time to avoid permanent throttling
      if (now - lastTime > 10000) {
        refreshCountRef.current[cabId] = 0;
      }
    }
    
    // Check if we've already processed this sync recently
    if (syncHistory.current.has(cabId)) {
      const lastSync = syncHistory.current.get(cabId) || 0;
      if (now - lastSync < adjustedInterval) {
        return true;
      }
    }
    
    // Record this sync attempt and increment counter
    syncHistory.current.set(cabId, now);
    refreshCountRef.current[cabId] = (refreshCountRef.current[cabId] || 0) + 1;
    
    // Clean up history if it gets too large
    if (syncHistory.current.size > 100) {
      const keysToDelete = Array.from(syncHistory.current.keys()).slice(0, 50);
      keysToDelete.forEach(k => syncHistory.current.delete(k));
    }
    
    return (now - lastTime) < adjustedInterval;
  };
  
  // Enable or disable console logging
  const setLoggingEnabled = (enabled: boolean): void => {
    preventLogging.current = !enabled;
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
  
  // Check if lock is currently held
  const isLockHeld = (): boolean => {
    return syncLock.current;
  };
  
  // Reset tracking for a specific cab or all cabs
  const resetTracking = (cabId?: string): void => {
    if (cabId) {
      delete trackedFares.current[cabId];
      delete lastDispatchTime.current[cabId];
      delete lastProcessedEventId.current[cabId];
      delete refreshCountRef.current[cabId];
      
      // Clear fare keys related to this cabId
      const keysToRemove: string[] = [];
      knownFareKeys.current.forEach(key => {
        if (key.startsWith(`${cabId}_`)) {
          keysToRemove.push(key);
        }
      });
      
      keysToRemove.forEach(key => knownFareKeys.current.delete(key));
      syncHistory.current.delete(cabId);
      fareChangeHistory.current.delete(cabId);
    } else {
      trackedFares.current = {};
      lastDispatchTime.current = {};
      lastProcessedEventId.current = {};
      knownFareKeys.current.clear();
      syncHistory.current.clear();
      processingStack.current.clear();
      refreshCountRef.current = {};
      fareChangeHistory.current.clear();
    }
    syncLock.current = false;
  };
  
  // Check if we're already processing a specific fare
  const isProcessing = (cabId: string, fare: number): boolean => {
    const key = `${cabId}_${fare}`;
    return processingStack.current.has(key);
  };
  
  // FIXED: Get the fare variation for a cab to detect oscillations
  const getFareVariation = (cabId: string): number => {
    const history = fareChangeHistory.current.get(cabId);
    if (!history || history.length < 2) return 0;
    
    let maxVariation = 0;
    for (let i = 1; i < history.length; i++) {
      const variation = Math.abs(history[i] - history[i-1]);
      maxVariation = Math.max(maxVariation, variation);
    }
    
    return maxVariation;
  };
  
  // FIXED: Check if fare value is oscillating (changing back and forth)
  const isOscillating = (cabId: string): boolean => {
    const history = fareChangeHistory.current.get(cabId);
    if (!history || history.length < 4) return false;
    
    // Check for pattern like A, B, A, B or similar oscillations
    const variation = getFareVariation(cabId);
    return variation > 0 && refreshCountRef.current[cabId] > 3;
  };
  
  return {
    isFareChanged,
    trackFare,
    shouldThrottle,
    acquireSyncLock,
    releaseSyncLock,
    isLockHeld,
    resetTracking,
    hasProcessedEvent,
    trackProcessedEvent,
    isProcessing,
    setLoggingEnabled,
    getFareVariation,
    isOscillating
  };
};
