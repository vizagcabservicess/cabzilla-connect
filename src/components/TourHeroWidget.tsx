import React from 'react';
import { Hero } from './Hero';

interface TourHeroWidgetProps {
  onSearch?: (searchData: any) => void;
  onStepChange?: (step: number) => void;
  onEditStart?: () => void;
  onTripEditOpenChange?: (open: boolean) => void;
  embedStretchToShell?: boolean;
  summaryBackHref?: string;
}

/** Trip-locked tour booking widget for Araku / tour SEO landings. */
export function TourHeroWidget({
  onSearch,
  onStepChange,
  onEditStart,
  onTripEditOpenChange,
  embedStretchToShell,
  summaryBackHref,
}: TourHeroWidgetProps) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('tripType', 'tour');
    try {
      const rawPrefill = sessionStorage.getItem('routePrefillData');
      if (rawPrefill) {
        const parsed = JSON.parse(rawPrefill) as { tripType?: string };
        if (parsed?.tripType && parsed.tripType !== 'tour') {
          sessionStorage.removeItem('routePrefillData');
          sessionStorage.removeItem('pickupLocation');
          sessionStorage.removeItem('dropLocation');
          sessionStorage.removeItem('intermediateStops');
        }
      }
    } catch {
      sessionStorage.removeItem('routePrefillData');
    }
  }

  return (
    <div>
      <Hero
        key="tour-hero"
        onSearch={onSearch}
        onEditStart={onEditStart}
        onStepChange={onStepChange}
        onTripEditOpenChange={onTripEditOpenChange}
        visibleTabs={['tour']}
        pageDefaultTripType="tour"
        hideBackground
        embedCompactLayout
        embedStretchToShell={embedStretchToShell}
        summaryBackHref={summaryBackHref}
      />
    </div>
  );
}

export default TourHeroWidget;
