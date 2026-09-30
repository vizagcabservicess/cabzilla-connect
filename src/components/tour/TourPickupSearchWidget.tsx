import { useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  LayoutGrid,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import '@/lib/fonts-tours';
import { DateTimePicker, type DateTimePickerHandle } from '@/components/DateTimePicker';
import { LocationInput } from '@/components/LocationInput';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import type { Location } from '@/lib/locationData';
import { isValidTripDate } from '@/lib/dateUtils';
import { isWithinTourPickupRadius } from '@/lib/locationUtils';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { cn } from '@/lib/utils';

const SPRITE_URL = 'https://vizagtaxihub.com/uploads/sprite-sheet-vizagtaxihub.png';
const SPRITE_W = 1536;
const SPRITE_H = 1024;

function SpriteArt({
  x,
  y,
  w,
  h,
  height,
  className,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  height: number;
  className?: string;
}) {
  const scale = height / h;
  return (
    <div
      className={cn('shrink-0 bg-no-repeat', className)}
      style={{
        width: Math.round(w * scale),
        height,
        backgroundImage: `url(${SPRITE_URL})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${SPRITE_W * scale}px ${SPRITE_H * scale}px`,
        backgroundPosition: `-${x * scale}px -${y * scale}px`,
      }}
      aria-hidden
    />
  );
}

interface TourPickupSearchWidgetProps {
  pickupLocation: Location | null;
  onPickupLocationChange: (location: Location | null) => void;
  pickupDate: Date | undefined;
  onPickupDateChange: (date: Date | undefined) => void;
  isSearching: boolean;
  onSearch: () => void;
  onClearFilters: () => void;
  onShowAllPackages?: () => void;
  selectedTourCount: number;
  submitLabel: string;
}

export function TourPickupSearchWidget({
  pickupLocation,
  onPickupLocationChange,
  pickupDate,
  onPickupDateChange,
  isSearching,
  onSearch,
  onClearFilters,
  onShowAllPackages,
  selectedTourCount,
  submitLabel,
}: TourPickupSearchWidgetProps) {
  const { toast } = useToast();
  const { isLoaded, google } = useGoogleMaps();
  const pickerRef = useRef<DateTimePickerHandle>(null);
  const [locating, setLocating] = useState(false);
  const pickupOk = !pickupLocation || isWithinTourPickupRadius(pickupLocation);
  const canSearch =
    Boolean(pickupLocation) && isWithinTourPickupRadius(pickupLocation) && !isSearching;
  const dateIsValid = isValidTripDate(pickupDate);

  const clearPickup = () => {
    onPickupLocationChange(null);
    try {
      sessionStorage.removeItem('pickupLocation');
    } catch {
      /* ignore */
    }
  };

  const persistLocation = (location: Location) => {
    onPickupLocationChange(location);
    try {
      sessionStorage.setItem('pickupLocation', JSON.stringify(location));
    } catch {
      /* ignore */
    }
  };

  const persistDate = (date: Date | undefined) => {
    onPickupDateChange(date);
    if (!date) return;
    try {
      sessionStorage.setItem('pickupDate', JSON.stringify(date));
    } catch {
      /* ignore */
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Location unavailable',
        description: 'Your browser does not support current location.',
        variant: 'destructive',
      });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const finish = (name: string, address: string) => {
          persistLocation({
            id: `geo_${lat}_${lng}`,
            name,
            address,
            lat,
            lng,
            city: 'Visakhapatnam',
            state: 'Andhra Pradesh',
            type: 'other',
            popularityScore: 50,
          });
          setLocating(false);
        };
        if (!isLoaded || !google?.maps?.Geocoder) {
          finish('Current location', 'Current location');
          return;
        }
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results?.[0]) {
            finish(results[0].formatted_address, results[0].formatted_address);
            return;
          }
          finish('Current location', 'Current location');
        });
      },
      () => {
        setLocating(false);
        toast({
          title: 'Could not read location',
          description: 'Please allow location access or search for a pickup point.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const fieldClass =
    'flex min-h-[3.6rem] items-center rounded-[1.2rem] border border-slate-200/90 bg-white px-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:px-4 lg:min-h-[4.25rem] lg:rounded-[1.35rem]';

  return (
    <div className="relative overflow-x-clip rounded-[2rem] bg-gradient-to-br from-[#eef6ff] via-[#f7fbff] to-white px-3 py-6 md:px-6 md:py-8">
      <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-sky-200/40 blur-2xl" />
      <div className="pointer-events-none absolute -right-10 bottom-0 h-36 w-36 rounded-full bg-blue-200/35 blur-2xl" />
      <div
        id="tour-checkout-form"
        className="relative mx-auto max-w-6xl min-w-0 overflow-x-clip rounded-[1.75rem] border border-white/80 bg-white/95 p-4 shadow-[0_24px_60px_rgba(37,99,235,0.12)] md:p-6"
      >
        <div className="mb-5 flex min-w-0 items-center justify-between gap-4">
          <div className="relative hidden shrink-0 items-start lg:flex">
            <SpriteArt x={0} y={4} w={340} h={290} height={120} />
            <p className="pointer-events-none mt-1 w-[5.2rem] text-center font-script text-[1.05rem] leading-[1.08] text-slate-500">
              Start Your Journey Here
            </p>
          </div>
          <div className="min-w-0 flex-1 px-2 text-center">
            <p className="mb-1 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600">
              <MapPin className="h-3.5 w-3.5" />
              Plan Your Journey
            </p>
            <h2 className="text-[1.55rem] font-extrabold tracking-[-0.03em] text-slate-900 sm:text-[1.85rem]">
              Pickup location <span className="text-blue-600">&amp; time</span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your pickup location, date and time for your selected tour
              {selectedTourCount > 1 ? 's' : ''}.
            </p>
          </div>
          <div className="relative hidden shrink-0 items-start justify-end lg:flex">
            <p className="pointer-events-none mr-1 mt-0 w-[5.6rem] text-right font-script text-[0.98rem] leading-[1.08] text-sky-700">
              Safe Rides Great Journeys Vizag
            </p>
            <SpriteArt x={348} y={8} w={500} h={280} height={120} />
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_11.25rem]">
          <div className={cn(fieldClass, 'relative pr-16')}>
            <LocationInput
              id="tour-checkout-pickup"
              label="PICKUP LOCATION"
              placeholder="Search pickup location"
              location={pickupLocation || undefined}
              onLocationChange={(loc) => {
                if (!loc?.id) {
                  clearPickup();
                  return;
                }
                persistLocation(loc);
              }}
              isPickupLocation
              tripType="tour"
              variant="infield"
              compact
              hideClearButton
              className="w-full min-w-0 [&>p]:hidden"
            />
            <button
              type="button"
              aria-label="Clear pickup location"
              className="absolute right-10 top-1/2 z-[2] flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={clearPickup}
            >
              <X className="h-4 w-4" />
            </button>
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <div className={fieldClass}>
            <DateTimePicker
              ref={pickerRef}
              label="TRAVEL DATE & TIME"
              date={pickupDate}
              onDateChange={persistDate}
              minDate={new Date()}
              variant="split"
              className="w-full"
            />
          </div>
          <button
            type="button"
            className={cn(fieldClass, 'w-full gap-2 text-left')}
            onClick={() => pickerRef.current?.open()}
          >
            <Clock className="h-5 w-5 shrink-0 text-blue-600" />
            <span className="min-w-0 flex-1 truncate text-base font-bold tabular-nums text-slate-900">
              {dateIsValid ? format(pickupDate, 'hh:mm a') : 'Select time'}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1">
          <p
            className={cn(
              'inline-flex items-center gap-1.5 text-[12px] font-semibold',
              pickupOk ? 'text-emerald-600' : 'text-rose-600'
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            Pickup must be within 20 km of Vizag Taxi Hub.
          </p>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
          >
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
            Use my current location
          </button>
        </div>

        <Button
          type="button"
          onClick={onSearch}
          disabled={!canSearch}
          className="mt-4 h-12 w-full rounded-xl bg-blue-600 text-[15px] font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-600/40 disabled:text-white/80"
        >
          {isSearching ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              {submitLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <div className="mt-3 flex items-center justify-center gap-3 text-[13px] font-semibold text-slate-500">
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 hover:text-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear filters
          </button>
          {onShowAllPackages ? (
            <>
              <span className="h-4 w-px bg-slate-200" />
              <button
                type="button"
                onClick={onShowAllPackages}
                className="inline-flex items-center gap-1.5 hover:text-slate-800"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Show all packages
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
