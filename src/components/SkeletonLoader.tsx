import React from 'react';

// Hero skeleton: same structure/classes as index.html inline skeleton for zero visual flash when React mounts
export const HeroSkeleton = () => (
  <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
    <div style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div className="skel-header">
        <div className="skel skel-bar" />
        <div className="skel skel-bar" style={{ width: '5rem' }} />
      </div>
    </div>
    <div className="skel-hero">
      <div className="skel-card">
        <div className="skel-row">
          <div className="skel skel-block" />
          <div className="skel skel-block" />
          <div className="skel skel-block" />
        </div>
        <div className="skel skel-btn" />
      </div>
    </div>
  </div>
);

// Page skeleton for other pages
export const PageSkeleton = () => (
  <div className="min-h-screen bg-gray-50 animate-pulse">
    {/* Header skeleton */}
    <div className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="h-8 bg-gray-300 rounded w-32"></div>
          <div className="hidden md:flex space-x-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 bg-gray-300 rounded w-16"></div>
            ))}
          </div>
          <div className="h-8 bg-gray-300 rounded w-20"></div>
        </div>
      </div>
    </div>

    {/* Page content skeleton */}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page title */}
      <div className="mb-8">
        <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-5 bg-gray-300 rounded w-1/2 mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6">
              <div className="h-5 bg-gray-300 rounded w-1/3 mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * Mobile Urbania `/vehicle/urbania`: white card + title bars + hero block (matches in-app loading UI).
 * Use until the LCP illustration `onLoad` or when swapping in after navigation.
 */
export function UrbaniaVehicleHeroSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200/90 bg-white p-4 shadow-[0_10px_28px_-20px_rgba(15,23,42,0.08)] sm:p-5 ${className ?? ''}`}
      aria-hidden
    >
      <div className="max-w-xl space-y-2 pb-3">
        <div className="h-8 w-48 animate-pulse rounded-md bg-gray-200 sm:h-9 sm:w-56" />
        <div className="h-4 w-full max-w-md animate-pulse rounded-md bg-gray-100" />
      </div>
      <div className="mt-1 flex w-full min-h-[min(13rem,44vw)] items-center justify-center rounded-xl bg-gray-100/90 px-2 py-3 sm:min-h-[min(15rem,40vw)] sm:py-4">
        <div className="h-[min(11rem,38vw)] w-full max-w-md animate-pulse rounded-lg bg-gray-200/90 sm:h-[min(13rem,34vw)]" />
      </div>
    </div>
  );
}
