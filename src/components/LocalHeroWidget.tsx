import React from 'react';
import { Hero } from './Hero';

interface LocalHeroWidgetProps {
  initialPickup?: string;
  initialDrop?: string;
  onSearch?: (searchData: any) => void;
  onStepChange?: (step: number) => void;
  onEditStart?: () => void;
}

export function LocalHeroWidget({ initialPickup, initialDrop, onSearch, onStepChange, onEditStart }: LocalHeroWidgetProps) {
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

    if (effectivePickup && effectiveDrop) {
      const pickupName = effectivePickup;
      const dropName = effectiveDrop;
      const pickupDate = dateFromQuery ? new Date(dateFromQuery) : undefined;

      const prefillData = {
        pickupLocation: {
          name: pickupName,
          address: pickupName,
          id: 'prefill-pickup',
          city: pickupName,
          state: 'Unknown',
          lat: 0,
          lng: 0,
          type: 'other' as const,
          popularityScore: 0,
        },
        dropLocation: {
          name: dropName,
          address: dropName,
          id: 'prefill-drop',
          city: dropName,
          state: 'Unknown',
          lat: 0,
          lng: 0,
          type: 'other' as const,
          popularityScore: 0,
        },
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
        visibleTabs={['local']} 
        hideBackground={true} 
      />
    </div>
  );
} 