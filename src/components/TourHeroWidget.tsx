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
        hideBackground
        embedCompactLayout
        embedStretchToShell={embedStretchToShell}
        summaryBackHref={summaryBackHref}
      />
    </div>
  );
}

export default TourHeroWidget;
