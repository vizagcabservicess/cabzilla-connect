export const BOOKING_HOME_RESET_EVENT = 'bookingHomeReset';

const BOOKING_SESSION_KEYS = [
  'routePrefillData',
  'pickupLocation',
  'dropLocation',
  'pickupDate',
  'returnDate',
  'selectedCab',
  'tripType',
  'tripMode',
  'hourlyPackage',
] as const;

export function clearBookingSessionStorage(): void {
  for (const key of BOOKING_SESSION_KEYS) {
    sessionStorage.removeItem(key);
  }
}

export function dispatchBookingHomeReset(): void {
  clearBookingSessionStorage();
  window.dispatchEvent(new CustomEvent(BOOKING_HOME_RESET_EVENT));
}
