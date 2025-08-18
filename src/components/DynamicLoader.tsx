import React, { useState, useEffect, Suspense } from 'react';
import { dynamicImports } from '@/utils/performance';

interface DynamicLoaderProps {
  library: keyof typeof dynamicImports;
  fallback?: React.ReactNode;
  children: (module: any) => React.ReactNode;
}

const DynamicLoader: React.FC<DynamicLoaderProps> = ({ 
  library, 
  fallback = <div>Loading...</div>, 
  children 
}) => {
  const [module, setModule] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModule = async () => {
      try {
        setLoading(true);
        const importedModule = await dynamicImports[library]();
        setModule(importedModule);
      } catch (err) {
        setError(err as Error);
        console.error(`Failed to load ${library}:`, err);
      } finally {
        setLoading(false);
      }
    };

    loadModule();
  }, [library]);

  if (loading) {
    return <>{fallback}</>;
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Failed to load {library}: {error.message}
      </div>
    );
  }

  return <>{children(module)}</>;
};

export default DynamicLoader;

// Specific dynamic loaders for common use cases
export const DynamicRecharts = ({ children, fallback }: { children: (module: any) => React.ReactNode; fallback?: React.ReactNode }) => (
  <DynamicLoader library="Recharts" fallback={fallback}>
    {children}
  </DynamicLoader>
);

export const DynamicSwiper = ({ children, fallback }: { children: (module: any) => React.ReactNode; fallback?: React.ReactNode }) => (
  <DynamicLoader library="Swiper" fallback={fallback}>
    {children}
  </DynamicLoader>
);

export const DynamicGoogleMaps = ({ children, fallback }: { children: (module: any) => React.ReactNode; fallback?: React.ReactNode }) => (
  <DynamicLoader library="GoogleMaps" fallback={fallback}>
    {children}
  </DynamicLoader>
);

export const DynamicPDFRenderer = ({ children, fallback }: { children: (module: any) => React.ReactNode; fallback?: React.ReactNode }) => (
  <DynamicLoader library="PDFRenderer" fallback={fallback}>
    {children}
  </DynamicLoader>
);

