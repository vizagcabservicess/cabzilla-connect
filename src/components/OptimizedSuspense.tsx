import React, { Suspense, ReactNode } from 'react';

interface OptimizedSuspenseProps {
  children: ReactNode;
  fallback?: ReactNode;
}

// Optimized Suspense wrapper that minimizes layout shift
const OptimizedSuspense: React.FC<OptimizedSuspenseProps> = ({ 
  children, 
  fallback = null 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

export default OptimizedSuspense;