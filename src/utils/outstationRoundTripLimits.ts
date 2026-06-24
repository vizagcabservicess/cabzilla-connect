/** Included km per calendar day on outstation round trips (matches fareCalculationService). */
export const OUTSTATION_KM_PER_DAY = 300;

export function countOutstationBillingDays(
  pickupDate?: string | Date | null,
  returnDate?: string | Date | null
): number {
  if (!pickupDate) return 1;
  const pickup = new Date(pickupDate);
  const returnD = returnDate ? new Date(returnDate) : pickup;
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(returnD.getTime())) return 1;

  const pickupDateOnly = new Date(pickup.getFullYear(), pickup.getMonth(), pickup.getDate());
  const returnDateOnly = new Date(returnD.getFullYear(), returnD.getMonth(), returnD.getDate());
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const dayDiff = Math.floor((returnDateOnly.getTime() - pickupDateOnly.getTime()) / MS_PER_DAY);
  return Math.max(1, dayDiff + 1);
}

export function computeOutstationRoundTripIncludedKm(
  pickupDate?: string | Date | null,
  returnDate?: string | Date | null
): number {
  return countOutstationBillingDays(pickupDate, returnDate) * OUTSTATION_KM_PER_DAY;
}
