import type { CabType } from '@/types/cab';
import type { Location } from '@/lib/locationData';
import type { TourDetail } from '@/types/tour';
import { TourMarketingLayout } from '@/components/tour/TourMarketingLayout';
import { getTourMarketingContent } from '@/components/tour/tourMarketingContent';

type PricedVehicle = CabType & { price: number };

interface ArakuDayTourLayoutProps {
  tour: TourDetail;
  pickup: Location;
  pickupDate: Date;
  selectedVehicle: PricedVehicle | null;
  onPickupChange: (location: Location) => void;
  onDateChange: (date: Date) => void;
  onVehicleSelect: (vehicle: PricedVehicle) => void;
  tripMode: 'one-way' | 'round-trip';
  onTripModeChange: (mode: 'one-way' | 'round-trip') => void;
  onBook: () => void;
}

/** Thin wrapper — Araku day tour keeps its marketing copy via the shared layout. */
export function ArakuDayTourLayout(props: ArakuDayTourLayoutProps) {
  const content = getTourMarketingContent('araku-valley-tour');
  if (!content) return null;
  return <TourMarketingLayout {...props} content={content} />;
}
