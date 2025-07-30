import React, { useEffect } from 'react';
import { Hero } from './Hero';

interface AirportHeroWidgetProps {
  initialPickup?: string;
  initialDrop?: string;
}

export function AirportHeroWidget({ initialPickup, initialDrop }: AirportHeroWidgetProps) {
  useEffect(() => {
    // On mount, clear previous locations to ensure Hero validation runs correctly
    sessionStorage.removeItem('pickupLocation');
    sessionStorage.removeItem('dropLocation');
    
    // Always set trip type to airport for this widget
    sessionStorage.setItem('tripType', 'airport');

    if (initialPickup && initialDrop) {
      const prefillData = {
        pickupLocation: {
            name: initialPickup,
            address: initialPickup,
            id: 'prefill-pickup',
            city: initialPickup,
            state: 'Unknown',
            lat: 0,
            lng: 0,
            type: 'other' as const,
            popularityScore: 0,
        },
        dropLocation: {
            name: initialDrop,
            address: initialDrop,
            id: 'prefill-drop',
            city: initialDrop,
            state: 'Unknown',
            lat: 0,
            lng: 0,
            type: 'other' as const,
            popularityScore: 0,
        },
        tripType: 'airport',
        tripMode: 'one-way',
        autoTriggerSearch: true
      };
      sessionStorage.setItem('routePrefillData', JSON.stringify(prefillData));
    } else {
      // Clear any previous prefill data if no locations are provided
      sessionStorage.removeItem('routePrefillData');
    }
  }, [initialPickup, initialDrop]);

  return (
    <div>
      <Hero onSearch={() => { /* The hero component handles navigation */ }} visibleTabs={['airport']} hideBackground={true} />
    </div>
  );
} 