import { useEffect, useState } from 'react';
import type { Booking } from '@/types/api';
import { enrichTourBookingFromCatalog } from '@/utils/enrichTourBookingForConfirmation';
import {
  coalesceTourInclusionsExclusions,
  coalesceTourItinerary,
  isTourBooking,
  packageNarrativeFromBooking,
  resolveTourDurationForConfirmation,
} from '@/utils/tourConfirmationHelpers';

export function BookingTourItinerary({
  booking,
  variant = 'section',
}: {
  booking: Booking;
  variant?: 'section' | 'page';
}) {
  const tripType = String(booking.tripType ?? booking.trip_type ?? '');
  const isTour = isTourBooking(tripType, booking.tour_id ?? booking.tourId, booking);
  const [display, setDisplay] = useState<Booking>(booking);
  const [loading, setLoading] = useState(isTour);

  useEffect(() => {
    if (!isTour) {
      setDisplay(booking);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void enrichTourBookingFromCatalog(booking).then((enriched) => {
      if (cancelled) return;
      setDisplay(enriched);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [booking, isTour]);

  if (!isTour) return null;

  const days = coalesceTourItinerary(display);
  const inclusions = coalesceTourInclusionsExclusions(display, 'inclusions');
  const exclusions = coalesceTourInclusionsExclusions(display, 'exclusions');
  const tourName = String(display.tour_name ?? display.tourName ?? '').trim();
  const duration = resolveTourDurationForConfirmation(display);
  const tourRef = String(display.tour_id ?? display.tourId ?? '').trim();
  const packageNotes = packageNarrativeFromBooking(display);
  const shortInclusions = inclusions.filter((item) => item.length < 80);

  return (
    <div className={variant === 'section' ? 'mt-3 border-t pt-3' : undefined}>
      <h3 className={variant === 'section' ? 'text-sm font-medium mb-2 text-gray-700' : 'mb-3 text-base font-semibold text-gray-800'}>
        Tour itinerary
      </h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading package itinerary…</p>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-sm mb-1">
              <span className="font-medium">Tour:</span> {tourName || 'Tour package'}
            </p>
            {tourRef ? (
              <p className="text-sm mb-1">
                <span className="font-medium">Tour reference:</span> {tourRef}
              </p>
            ) : null}
            {duration ? (
              <p className="text-sm mb-1">
                <span className="font-medium">Duration:</span> {duration}
              </p>
            ) : null}
          </div>

          {days.length > 0 ? (
            <div className="space-y-2">
              {days.map((day) => (
                <div
                  key={`${day.day}-${day.title}`}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    Day {day.day}
                    {day.title ? ` · ${day.title}` : ''}
                  </p>
                  {day.description ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{day.description}</p>
                  ) : null}
                  {day.activities?.length ? (
                    <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-sm text-slate-700">
                      {day.activities.map((activity) => (
                        <li key={activity}>{activity}</li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              ))}
            </div>
          ) : packageNotes ? (
            <pre className="whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-sans text-sm text-slate-700">
              {packageNotes}
            </pre>
          ) : (
            <p className="text-sm text-gray-500">
              No day-wise itinerary is stored on this booking. Check Advanced Settings notes or the
              live tour page.
            </p>
          )}

          {shortInclusions.length > 0 ? (
            <p className="text-sm">
              <span className="font-medium">Inclusions:</span> {shortInclusions.join(', ')}
            </p>
          ) : null}
          {exclusions.length > 0 && exclusions.every((item) => item.length < 120) ? (
            <p className="text-sm">
              <span className="font-medium">Exclusions:</span> {exclusions.join(', ')}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
