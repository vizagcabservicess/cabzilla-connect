import React from 'react';
import { useLocation } from 'react-router-dom';
import { Hero } from './Hero';
import { getLocationBySlug } from '@/lib/locationData';
import type { Location } from '@/lib/locationData';

// Helper to convert slug to readable name (e.g. "mvp-colony" -> "MVP Colony")
function unslugify(slug: string) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Build full Location from slug (uses real coordinates for map/route calculation)
function locationFromSlug(slug: string, id: string): Location {
  const resolved = getLocationBySlug(slug);
  const name = unslugify(slug);
  return {
    id,
    name: resolved.name || name,
    address: resolved.address || name,
    city: resolved.city || 'Visakhapatnam',
    state: resolved.state || 'Andhra Pradesh',
    lat: resolved.lat,
    lng: resolved.lng,
    type: (resolved.type as Location['type']) || 'other',
    popularityScore: resolved.popularityScore ?? 0,
  };
}

interface AirportHeroWidgetProps {
  initialPickup?: string;
  initialDrop?: string;
  onSearch?: (searchData: any) => void;
  onStepChange?: (step: number) => void;
  onEditStart?: () => void;
}

export function AirportHeroWidget({ initialPickup, initialDrop, onSearch, onStepChange, onEditStart }: AirportHeroWidgetProps) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const pickupFromQuery = searchParams.get('from') || undefined;
  const dropFromQuery = searchParams.get('to') || undefined;
  const effectivePickup = initialPickup || pickupFromQuery;
  const effectiveDrop = initialDrop || dropFromQuery;

  // Synchronously prepare prefill data so Hero sees it on first render
  if (typeof window !== 'undefined') {
    // Always set trip type to airport for this widget
    sessionStorage.setItem('tripType', 'airport');

    const dateFromQuery = searchParams.get('date') || undefined;
    const autoParam = searchParams.get('auto');
    const autoFromQuery = autoParam === '1' || autoParam === 'true';

    if (effectivePickup && effectiveDrop) {
      const pickupDate = dateFromQuery ? new Date(dateFromQuery) : undefined;
      const pickupLocation = locationFromSlug(effectivePickup, 'prefill-pickup');
      const dropLocation = locationFromSlug(effectiveDrop, 'prefill-drop');

      // Override with URL coordinates when present (from shared links)
      const fromLat = searchParams.get('fromLat');
      const fromLng = searchParams.get('fromLng');
      const toLat = searchParams.get('toLat');
      const toLng = searchParams.get('toLng');
      if (fromLat != null && fromLng != null) {
        const lat = parseFloat(fromLat);
        const lng = parseFloat(fromLng);
        if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)) {
          pickupLocation.lat = lat;
          pickupLocation.lng = lng;
        }
      }
      if (toLat != null && toLng != null) {
        const lat = parseFloat(toLat);
        const lng = parseFloat(toLng);
        if (!isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0)) {
          dropLocation.lat = lat;
          dropLocation.lng = lng;
        }
      }

      const prefillData = {
        pickupLocation,
        dropLocation,
        tripType: 'airport',
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
        key={`airport-hero-${effectivePickup || 'none'}-${effectiveDrop || 'none'}`}
        onSearch={onSearch} 
        onEditStart={onEditStart} 
        onStepChange={onStepChange}
        visibleTabs={['airport']} 
        hideBackground={true}
        embedCompactLayout
      />
    </div>
  );
} 