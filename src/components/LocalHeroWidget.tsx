import React from 'react';
import { Hero } from './Hero';

interface LocalHeroWidgetProps {
  initialPickup?: string;
  initialDrop?: string;
  onSearch?: (searchData: any) => void;
  onStepChange?: (step: number) => void;
  onEditStart?: () => void;
  onTripEditOpenChange?: (open: boolean) => void;
  embedStretchToShell?: boolean;
  summaryBackHref?: string;
  /** Desktop marketing hero: stacked booking card. */
  embedDesktopCardLayout?: boolean;
  embedDesktopCardTitle?: string;
}

export function LocalHeroWidget({
  initialPickup,
  initialDrop,
  onSearch,
  onStepChange,
  onEditStart,
  onTripEditOpenChange,
  embedStretchToShell,
  summaryBackHref,
  embedDesktopCardLayout,
  embedDesktopCardTitle,
}: LocalHeroWidgetProps) {
  // Synchronously prepare prefill data so Hero sees it on first render
  if (typeof window !== 'undefined') {
    // Always set trip type to local for this widget
    sessionStorage.setItem('tripType', 'local');

    let pickupFromQuery: string | undefined;
    let dropFromQuery: string | undefined;
    let dateFromQuery: string | undefined;
    let autoFromQuery = false;
    const searchParams = new URLSearchParams(window.location.search);
    pickupFromQuery = searchParams.get('from') || undefined;
    dropFromQuery = searchParams.get('to') || undefined;
    dateFromQuery = searchParams.get('date') || undefined;
    const autoParam = searchParams.get('auto');
    autoFromQuery = autoParam === '1' || autoParam === 'true';

    const effectivePickup = initialPickup || pickupFromQuery;
    const effectiveDrop = initialDrop || dropFromQuery;

    // Prefer full routePrefillData written by cross-page redirects (Hero).
    // Fall back to query/slug names when present.
    const existingPrefill = sessionStorage.getItem('routePrefillData');
    if (!existingPrefill && effectivePickup) {
      const pickupDate = dateFromQuery ? new Date(dateFromQuery) : undefined;
      const prefillData = {
        pickupLocation: {
          name: effectivePickup,
          address: effectivePickup,
          id: 'prefill-pickup',
          city: effectivePickup,
          state: 'Unknown',
          lat: 0,
          lng: 0,
          type: 'other' as const,
          popularityScore: 0,
        },
        dropLocation: effectiveDrop
          ? {
              name: effectiveDrop,
              address: effectiveDrop,
              id: 'prefill-drop',
              city: effectiveDrop,
              state: 'Unknown',
              lat: 0,
              lng: 0,
              type: 'other' as const,
              popularityScore: 0,
            }
          : null,
        tripType: 'local',
        tripMode: 'one-way',
        pickupDate: pickupDate ? pickupDate.toISOString() : undefined,
        autoTriggerSearch: autoFromQuery,
      };
      sessionStorage.setItem('routePrefillData', JSON.stringify(prefillData));
    }
  }

  return (
    <div>
      <Hero
        key="local-hero"
        onSearch={onSearch}
        onEditStart={onEditStart}
        onStepChange={onStepChange}
        onTripEditOpenChange={onTripEditOpenChange}
        visibleTabs={['local']}
        hideBackground={true}
        embedCompactLayout
        embedStretchToShell={embedStretchToShell}
        summaryBackHref={summaryBackHref}
        embedDesktopCardLayout={embedDesktopCardLayout}
        embedDesktopCardTitle={embedDesktopCardTitle}
      />
    </div>
  );
} 