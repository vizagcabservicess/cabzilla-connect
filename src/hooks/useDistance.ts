
import { useState, useEffect } from 'react';

// Mock distance calculation for now. In a real app, you'd use a maps API.
const calculateMockDistance = (from: string, to: string): number => {
  if (!from || !to) return 0;
  // Simple hash-based mock distance for some consistency.
  const combined = `${from.toLowerCase()}-${to.toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash % 250) + 50; // Distance between 50 and 300 km
};

export const useDistance = (from: string, to: string) => {
  const [distance, setDistance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (from && to) {
      setIsLoading(true);
      // Simulate async API call
      const timer = setTimeout(() => {
        const dist = calculateMockDistance(from, to);
        setDistance(dist);
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDistance(null);
    }
  }, [from, to]);

  return { distance, isLoading };
};
