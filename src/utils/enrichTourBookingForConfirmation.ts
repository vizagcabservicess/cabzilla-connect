import type { Booking } from '@/types/api';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';
import {
  coalesceTourItinerary,
  isTourBooking,
  mergeTourDetailIntoBooking,
  pickTourListItemByName,
  pickTourListItemFromBookingContext,
} from '@/utils/tourConfirmationHelpers';

/**
 * Loads catalog tour detail (itinerary, tour id, inclusions) when the booking row is missing it.
 */
export async function enrichTourBookingFromCatalog(booking: Booking): Promise<Booking> {
  const tid = String(booking.tour_id ?? booking.tourId ?? '').trim();
  const tripTypeRaw = String(booking.tripType ?? booking.trip_type ?? '');
  if (!isTourBooking(tripTypeRaw, tid || null, booking)) return booking;

  const hasRef = Boolean(tid);
  const hasItin = coalesceTourItinerary(booking).length > 0;
  if (hasItin && hasRef) return booking;

  try {
    const tours = await tourDetailAPI.getTours();
    if (!tours.length) return booking;

    let detail = tid ? await tourDetailAPI.getTourDetail(tid) : null;

    if (!detail) {
      const byName = pickTourListItemByName(tours, booking);
      if (byName) detail = await tourDetailAPI.getTourDetail(byName.tourId);
    }

    if (!detail) {
      const picked = pickTourListItemFromBookingContext(tours, booking);
      if (picked) detail = await tourDetailAPI.getTourDetail(picked.tourId);
    }

    if (!detail) return booking;
    return mergeTourDetailIntoBooking(booking, detail);
  } catch {
    return booking;
  }
}
