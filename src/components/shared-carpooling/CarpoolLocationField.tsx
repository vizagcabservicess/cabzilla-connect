import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  /** boxed = bordered card field (default); ticket = Urbania-style in-field row (mobile hero). */
  layout?: 'boxed' | 'ticket';
  className?: string;
};

const TICKET_LOCATION_INPUT_CLASS =
  'min-w-0 w-full [&_.ios-search-input-wrapper]:min-h-0 [&_.ios-search-input-wrapper]:w-full [&_.ios-search-input-wrapper]:min-w-0 [&_.ios-search-input-wrapper]:border-0 [&_.ios-search-input-wrapper]:bg-transparent [&_.ios-search-input-wrapper]:p-0 [&_.ios-search-input-wrapper]:shadow-none [&_input]:min-w-0 [&_input]:w-full [&_input]:max-w-full [&_input]:border-0 [&_input]:bg-transparent [&_input]:!text-base [&_input]:font-bold [&_input]:placeholder:font-normal [&_input]:placeholder:text-gray-500 [&_input]:shadow-none [&_input]:focus-visible:ring-0';

const BOXED_LOCATION_INPUT_CLASS =
  'carpool-location-input min-w-0 w-full [&_.ios-search-input-wrapper]:min-h-[3rem] [&_.ios-search-input-wrapper]:w-full [&_.ios-search-input-wrapper]:min-w-0 [&_.ios-search-input-wrapper]:border-0 [&_.ios-search-input-wrapper]:bg-transparent [&_.ios-search-input-wrapper]:pl-8 [&_.ios-search-input-wrapper]:shadow-none [&_input]:min-w-0 [&_input]:w-full [&_input]:max-w-full [&_input]:border-0 [&_input]:bg-transparent [&_input]:!text-base [&_input]:shadow-none [&_input]:focus-visible:ring-0 sm:[&_input]:!text-sm';

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
  layout = 'boxed',
  className = '',
}: CarpoolLocationFieldProps) {
  const { isLoaded } = useGoogleMaps();
  const pinColor = isPickup ? BRAND_GREEN : '#ef4444';
  const isTicket = layout === 'ticket';

  if (isTicket) {
    return (
      <div className={cn('min-w-0 w-full max-w-full px-2 py-1.5', className)}>
        {isLoaded ? (
          <LocationInput
            id={id}
            variant="infield"
            hideLeadingIcon
            label={label}
            placeholder={placeholder}
            value={location?.name || location?.address || value}
            onChange={onChange}
            onLocationChange={onLocationChange}
            isPickupLocation={isPickup}
            tripType="local"
            restrictToVizagRadius
            className={TICKET_LOCATION_INPUT_CLASS}
          />
        ) : (
          <div>
            <label htmlFor={id} className="text-[11px] font-medium leading-none text-gray-500">
              {label}
            </label>
            <input
              id={id}
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="mt-1 w-full border-0 bg-transparent py-0 text-base font-bold text-gray-900 placeholder:font-normal placeholder:text-gray-500 focus:outline-none"
            />
          </div>
        )}
      </div>
    );
  }

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
            className={BOXED_LOCATION_INPUT_CLASS}
          />
        ) : (
          <input
            id={id}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl py-3 pl-10 pr-4 text-base focus:outline-none sm:text-sm"
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
