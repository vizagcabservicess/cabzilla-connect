import React, { useEffect } from 'react';
import { Hero } from './Hero';

interface OutstationHeroWidgetProps {
  initialPickup?: string;
  initialDrop?: string;
}

export function OutstationHeroWidget({ initialPickup, initialDrop }: OutstationHeroWidgetProps) {
  // We'll need a way to pass these initial values to the Hero component.
  // The Hero component seems to load from sessionStorage.
  // We can write to sessionStorage before rendering the Hero component.

  useEffect(() => {
    // On mount, clear previous locations to ensure Hero validation runs correctly
    sessionStorage.removeItem('pickupLocation');
    sessionStorage.removeItem('dropLocation');
    
    // Always set trip type to outstation for this widget
    sessionStorage.setItem('tripType', 'outstation');

    if (initialPickup && initialDrop) {
      const prefillData = {
        pickupLocation: {
            name: initialPickup,
            address: initialPickup,
            // We need to add other properties to satisfy the Location type.
            // Let's check the type again.
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
        tripType: 'outstation',
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
      <style>
        {`
          /* This targets the container for the tab buttons, hiding them */
          #tab-trip-selector > .mb-4 {
            display: none !important;
          }
        `}
      </style>
      <Hero onSearch={() => { /* The hero component handles navigation */ }} />
    </div>
  );
} 