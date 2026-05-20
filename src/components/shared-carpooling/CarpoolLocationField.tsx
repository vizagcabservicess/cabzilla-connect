import { MapPin } from 'lucide-react';
import { LocationInput } from '@/components/LocationInput';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { BRAND_GREEN } from './constants';
import type { Location } from '@/lib/locationData';

type CarpoolLocationFieldProps = {
  id: string;
  label: string;
  value: string;
  location?: Location;
  onChange: (value: string) => void;
  onLocationChange: (location: Location) => void;
  isPickup?: boolean;
  placeholder?: string;
  labelClassName?: string;
  wrapperClassName?: string;
};

export function CarpoolLocationField({
  id,
  label,
  value,
  location,
  onChange,
  onLocationChange,
  isPickup = false,
  placeholder = 'Search location',
  labelClassName = 'mb-1.5 block text-sm font-medium text-gray-700',
  wrapperClassName = '',
}: CarpoolLocationFieldProps) {
  const { isLoaded } = useGoogleMaps();
  const pinColor = isPickup ? BRAND_GREEN : '#ef4444';

  return (
    <div className="min-w-0 w-full max-w-full">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div
        className={`relative min-w-0 w-full max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20 ${wrapperClassName}`}
      >
        <MapPin
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2"
          style={{ color: pinColor }}
        />
        {isLoaded ? (
          <LocationInput
            id={id}
            variant="desktop"
            hideLeadingIcon
            placeholder={placeholder}
            value={location?.name || location?.address || value}
            onChange={onChange}
            onLocationChange={onLocationChange}
            isPickupLocation={isPickup}
            tripType="local"
            restrictToVizagRadius
            className="carpool-location-input min-w-0 w-full [&_.ios-search-input-wrapper]:min-h-[3rem] [&_.ios-search-input-wrapper]:w-full [&_.ios-search-input-wrapper]:min-w-0 [&_.ios-search-input-wrapper]:border-0 [&_.ios-search-input-wrapper]:bg-transparent [&_.ios-search-input-wrapper]:pl-8 [&_.ios-search-input-wrapper]:shadow-none [&_input]:min-w-0 [&_input]:w-full [&_input]:max-w-full [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-sm [&_input]:shadow-none [&_input]:focus-visible:ring-0"
          />
        ) : (
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}

export function hasValidCarpoolLocation(location: Location | undefined, fallbackText = ''): boolean {
  if (location?.lat && location?.lng && location.id) return true;
  return fallbackText.trim().length >= 3;
}

export function carpoolLocationLabel(location: Location | undefined, fallbackText: string): string {
  return (location?.name || location?.address || fallbackText).trim();
}
