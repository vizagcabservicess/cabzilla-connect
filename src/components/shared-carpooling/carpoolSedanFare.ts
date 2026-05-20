import type { Location } from '@/lib/locationData';
import { getAirportTransferFare } from '@/lib/airportFareForBooking';
import { cabTypes } from '@/lib/cabData';
import { calculateDistanceMatrix } from '@/lib/distanceService';
import { getAirportFaresForVehicle } from '@/services/fareService';

/** 4-seater sedan (Swift Dzire class) used for shared commute fare estimates. */
export const CARPOOL_SEDAN_VEHICLE_ID = 'sedan';
export const CARPOOL_SEDAN_SEATS = 4;

export type CarpoolSedanFareResult = {
  distanceKm: number;
  totalFare: number;
  perSeatFare: number;
};

function getSedanCab() {
  return cabTypes.find((c) => c.id === CARPOOL_SEDAN_VEHICLE_ID) ?? cabTypes[0];
}

export function hasCarpoolRouteCoordinates(from?: Location, to?: Location): boolean {
  return Boolean(
    from?.lat &&
      from?.lng &&
      to?.lat &&
      to?.lng &&
      !(from.lat === 0 && from.lng === 0) &&
      !(to.lat === 0 && to.lng === 0),
  );
}

/** Swift Dzire airport tier fare ÷ {@link CARPOOL_SEDAN_SEATS} seats (admin Airport Fare Management). */
export async function fetchCarpoolSedanPerSeatFare(
  from: Location,
  to: Location,
): Promise<CarpoolSedanFareResult | null> {
  if (!hasCarpoolRouteCoordinates(from, to)) return null;

  const { distance } = await calculateDistanceMatrix(from, to);
  if (distance <= 0) return null;

  const sedan = getSedanCab();
  let airportFares = sedan.airportFares;
  try {
    airportFares = await getAirportFaresForVehicle(CARPOOL_SEDAN_VEHICLE_ID);
  } catch {
    /* use cab defaults merged in getAirportTransferFare */
  }

  const cabWithFares = { ...sedan, airportFares };
  const totalFare = getAirportTransferFare(cabWithFares, distance);
  if (totalFare <= 0) return null;

  const perSeatFare = Math.round(totalFare / CARPOOL_SEDAN_SEATS);
  return { distanceKm: distance, totalFare, perSeatFare };
}
