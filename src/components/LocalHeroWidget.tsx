import React, { useEffect } from 'react';
import { Hero } from './Hero';

interface LocalHeroWidgetProps {
  initialPickup?: string;
  initialDrop?: string;
}

export function LocalHeroWidget({ initialPickup, initialDrop }: LocalHeroWidgetProps) {
  useEffect(() => {
    // On mount, clear previous locations to ensure Hero validation runs correctly
    sessionStorage.removeItem('pickupLocation');
    sessionStorage.removeItem('dropLocation');
    
    // Always set trip type to local for this widget
    sessionStorage.setItem('tripType', 'local');

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
        tripType: 'local',
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
      <Hero onSearch={() => { /* The hero component handles navigation */ }} visibleTabs={['local']} />
    </div>
  );
} 