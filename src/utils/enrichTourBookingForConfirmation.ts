import type { Booking } from '@/types/api';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';
import {
  coalesceStructuredTourItinerary,
  isGenericTourName,
  isTourBooking,
  mergeTourDetailIntoBooking,
  mergeTourListItemIntoBooking,
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
  const hasStructuredItin = coalesceStructuredTourItinerary(booking).length > 0;
  const name = String(booking.tour_name ?? booking.tourName ?? '').trim();
  if (hasStructuredItin && hasRef && !isGenericTourName(name)) return booking;

  try {
    const tours = await tourDetailAPI.getTours();
    if (!tours.length) return booking;

    const byName = pickTourListItemByName(tours, booking);
    const byContext = byName ? null : pickTourListItemFromBookingContext(tours, booking);
    const listed = byName || byContext;
    let next = listed ? mergeTourListItemIntoBooking(booking, listed) : booking;

    let detail = tid ? await tourDetailAPI.getTourDetail(tid) : null;
    if (!detail && listed?.tourId) {
      detail = await tourDetailAPI.getTourDetail(listed.tourId);
    }

    if (!detail) return next;
    return mergeTourDetailIntoBooking(next, detail);
  } catch {
    return booking;
  }
}
