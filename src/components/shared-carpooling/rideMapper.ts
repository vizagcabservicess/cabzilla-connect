import type { CarpoolRide } from '@/services/api/sharedCarpoolAPI';
import { sharedCarpoolPublicAPI } from '@/services/api/sharedCarpoolAPI';
import type { SharedRide } from './constants';
import { resolveRideSchedule } from './scheduleUtils';

const DEFAULT_VEHICLE_IMAGE = 'https://vizagtaxihub.com/uploads/toyota-glanza-vizagtaxihub.png';

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function mapCarpoolRideToShared(ride: CarpoolRide): SharedRide {  const via = ride.via_route?.trim();
  return {
    id: String(ride.id),
    time: ride.pickup_time,
    period: ride.period,
    pickup: ride.pickup,
    drop: ride.drop_location,
    via: via ? (via.startsWith('Via:') ? via : `Via: ${via}`) : undefined,
    dropTime: ride.drop_time_est,
    vehicle: ride.vehicle,
    vehicleImage: DEFAULT_VEHICLE_IMAGE,
    plate: '',
    driverName: ride.driver_name,
    driverAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driver_name)}&background=008744&color=fff&size=64`,
    rating: toNumber(ride.driver_rating),
    seatsLeft: toNumber(ride.seats_left),
    pricePerSeat: toNumber(ride.price_per_seat),    isBestMatch: ride.is_best_match,
    amenities: ride.amenities,
    schedule: resolveRideSchedule(ride.schedule_text, ride.amenities),
    estDuration: ride.est_duration,
  };
}

export async function fetchSharedRides(params?: {
  from?: string;
  to?: string;
  period?: string;
}): Promise<SharedRide[]> {
  const rides = await sharedCarpoolPublicAPI.searchRides(params ?? {});
  return rides.map(mapCarpoolRideToShared);
}
