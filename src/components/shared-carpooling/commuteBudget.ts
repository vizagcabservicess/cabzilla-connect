import type { Location } from '@/lib/locationData';
import { fetchCarpoolSedanPerSeatFare, type CarpoolSedanFareResult } from './carpoolSedanFare';

/** Swift Dzire airport tier fare ÷ 4 seats (see admin Airport Fare Management). */
export async function fetchCommuteBudgetPerSeat(
  from: Location,
  to: Location,
): Promise<CarpoolSedanFareResult | null> {
  return fetchCarpoolSedanPerSeatFare(from, to);
}
