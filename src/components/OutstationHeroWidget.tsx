import React, { useEffect, useMemo } from 'react';
import { Hero } from './Hero';
import { useLocation, useNavigate } from 'react-router-dom';
import { CITY_LOOKUP } from '@/lib/cityLookup';

export { CITY_LOOKUP } from '@/lib/cityLookup';

interface OutstationHeroWidgetProps {
  initialPickup?: string;
  initialDrop?: string;
  onSearch?: (searchData: any) => void;
  onStepChange?: (step: number) => void;
  onEditStart?: () => void;
  onTripEditOpenChange?: (open: boolean) => void;
  embedStretchToShell?: boolean;
  summaryBackHref?: string;
  embedDesktopCardLayout?: boolean;
  embedDesktopCardTitle?: string;
}

// Lookup for known cities (see @/lib/cityLookup)

function getLocationData(name: string) {
  const key = name.trim().replace(/ +/g, ' ');
  if (CITY_LOOKUP[key]) return CITY_LOOKUP[key];
  // Fallback: use name as city, unknown state, lat/lng 0
  return { city: key, state: 'Unknown', lat: 0, lng: 0 };
}

export function OutstationHeroWidget({
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
}: OutstationHeroWidgetProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse pickup/drop from URL or query string synchronously
  let pickup = initialPickup;
  let drop = initialDrop;

  // Read shared/query params (for auto search, dates, etc.)
  const searchParams = new URLSearchParams(location.search);
  const autoParam = searchParams.get('auto');
  const autoTriggerSearch = autoParam === '1' || autoParam === 'true';
  const dateParam = searchParams.get('date');
  const returnDateParam = searchParams.get('returnDate');
  const modeParam = searchParams.get('mode');

  if (!pickup || !drop) {
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    if (fromParam && toParam) {
      pickup = fromParam.replace(/\b\w/g, l => l.toUpperCase());
      drop = toParam.replace(/\b\w/g, l => l.toUpperCase());
    } else {
      const pathname = location.pathname;
      const match = pathname.match(/\/outstation-taxi\/([a-zA-Z0-9-]+)-to-([a-zA-Z0-9-]+)/);
      if (match) {
        const fromSlug = match[1];
        const toSlug = match[2];
        pickup = fromSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        drop = toSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }
  }

  // Parse coordinates from URL when present (from shared links)
  const fromLat = searchParams.get('fromLat');
  const fromLng = searchParams.get('fromLng');
  const toLat = searchParams.get('toLat');
  const toLng = searchParams.get('toLng');
  const pickupLat = fromLat != null && fromLng != null ? parseFloat(fromLat) : NaN;
  const pickupLng = fromLat != null && fromLng != null ? parseFloat(fromLng) : NaN;
  const dropLat = toLat != null && toLng != null ? parseFloat(toLat) : NaN;
  const dropLng = toLat != null && toLng != null ? parseFloat(toLng) : NaN;
  const hasUrlPickupCoords = !isNaN(pickupLat) && !isNaN(pickupLng) && !(pickupLat === 0 && pickupLng === 0);
  const hasUrlDropCoords = !isNaN(dropLat) && !isNaN(dropLng) && !(dropLat === 0 && dropLng === 0);
  const hasUrlCoords = hasUrlPickupCoords || hasUrlDropCoords;

  // Redirect to home only if drop is not a known city and we have no URL coordinates
  React.useEffect(() => {
    if (drop && !CITY_LOOKUP[drop] && !hasUrlCoords) {
      navigate('/', { replace: true });
    }
  }, [drop, navigate, hasUrlCoords]);

  // Use a stable key that only changes when pickup/drop change
  const heroKey = useMemo(() => (pickup && drop ? `${pickup}-${drop}` : 'default'), [pickup, drop]);

  // Keep cross-page redirect prefill (Hero → /outstation-taxi) when URL has no from/to.
  let hasCrossPagePrefill = false;
  try {
    const raw = sessionStorage.getItem('routePrefillData');
    if (raw) {
      const existing = JSON.parse(raw) as {
        pickupLocation?: { name?: string } | null;
        dropLocation?: { name?: string } | null;
        tripType?: string;
      };
      hasCrossPagePrefill = Boolean(
        existing?.pickupLocation?.name &&
          existing?.dropLocation?.name &&
          (!existing.tripType || existing.tripType === 'outstation')
      );
    }
  } catch {
    hasCrossPagePrefill = false;
  }

  sessionStorage.setItem('tripType', 'outstation');
  if (pickup && drop) {
    const pickupData = getLocationData(pickup);
    const dropData = getLocationData(drop);
    const parsedPickupDate = dateParam ? (() => {
      const d = dateParam.trim();
      if (d.includes('T') || d.includes('Z')) {
        return new Date(d);
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day, 7, 0, 0);
      }
      return new Date(d);
    })() : undefined;
    const parsedReturnDate = returnDateParam ? new Date(returnDateParam) : undefined;
    const tripMode = modeParam === 'round-trip' ? 'round-trip' : 'one-way';

    const prefillData = {
      pickupLocation: {
        name: pickup,
        address: pickup,
        id: 'prefill-pickup',
        city: pickupData.city,
        state: pickupData.state,
        lat: hasUrlPickupCoords ? pickupLat : pickupData.lat,
        lng: hasUrlPickupCoords ? pickupLng : pickupData.lng,
        type: 'other' as const,
        popularityScore: 0,
      },
      dropLocation: {
        name: drop,
        address: drop,
        id: 'prefill-drop',
        city: dropData.city,
        state: dropData.state,
        lat: hasUrlDropCoords ? dropLat : dropData.lat,
        lng: hasUrlDropCoords ? dropLng : dropData.lng,
        type: 'other' as const,
        popularityScore: 0,
      },
      tripType: 'outstation',
      tripMode,
      pickupDate: parsedPickupDate ? parsedPickupDate.toISOString() : undefined,
      returnDate: parsedReturnDate ? parsedReturnDate.toISOString() : undefined,
      autoTriggerSearch
    };
    sessionStorage.setItem('routePrefillData', JSON.stringify(prefillData));
    sessionStorage.setItem('pickupLocation', JSON.stringify(prefillData.pickupLocation));
    sessionStorage.setItem('dropLocation', JSON.stringify(prefillData.dropLocation));
  } else if (!hasCrossPagePrefill) {
    // Only clear when this visit is a blank outstation landing (not a service-page redirect)
    sessionStorage.removeItem('routePrefillData');
    sessionStorage.removeItem('pickupLocation');
    sessionStorage.removeItem('dropLocation');
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Don't clear immediately, let the Hero component handle the cleanup
      // This prevents race conditions between widget cleanup and Hero initialization
    };
  }, [location.pathname, location.search]);

  return (
    <div>
      <Hero
        key={`outstation-hero-${pickup || 'none'}-${drop || 'none'}`}
        onSearch={onSearch}
        onEditStart={onEditStart}
        onStepChange={onStepChange}
        onTripEditOpenChange={onTripEditOpenChange}
        visibleTabs={['outstation']}
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