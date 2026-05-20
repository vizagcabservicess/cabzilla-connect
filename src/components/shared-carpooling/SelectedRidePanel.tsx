import { useState, lazy, Suspense, useEffect, useCallback } from 'react';
import {
  CalendarDays,
  Clock,
  Headphones,
  Loader2,
  MapPin,
  Music,
  Send,
  Share2,
  ShieldCheck,
  Snowflake,
  Star,
  Users,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { BRAND_GREEN, BRAND_GREEN_LIGHT, PER_SEAT_ONE_WAY_LABEL, type SharedRide } from './constants';
import { PerSeatPrice } from './PerSeatPrice';
import { RideScheduleBadge } from './RideScheduleBadge';
import { isScheduleAmenity } from './scheduleUtils';
import type { CarpoolSearchParams } from './types';
import { buildWhatsAppMeUrl } from '@/utils/whatsappPrefillMessage';
import { useCarpoolUserOptional } from '@/providers/CarpoolUserProvider';
import { carpoolLoginPath } from '@/components/shared-carpooling/carpoolAuthRoutes';
import { sharedCarpoolPublicAPI } from '@/services/api/sharedCarpoolAPI';
import {
  saveRideRequestState,
  type RideRequestSubmittedState,
} from '@/components/shared-carpooling/requestSubmittedState';

const CarpoolRouteMap = lazy(() =>
  import('./CarpoolRouteMap').then((m) => ({ default: m.CarpoolRouteMap })),
);

type SelectedRidePanelProps = {
  ride: SharedRide;
  search: CarpoolSearchParams;
  requireAuthToBook?: boolean;
};

function groupLabel(pref: CarpoolSearchParams['groupPreference']): string {
  if (pref === 'mixed') return 'Mixed Group';
  if (pref === 'men') return 'Men Only';
  return 'Women Only';
}

const AMENITY_ICONS: Record<string, typeof Clock> = {
  'Daily commute': CalendarDays,
  'Mon to Fri': CalendarDays,
  'Mon to Sat': CalendarDays,
  'Punctual & verified driver': ShieldCheck,
  'Women friendly': Users,
  'Music: Soft': Music,
  'AC Available': Snowflake,
};

export function SelectedRidePanel({ ride, search, requireAuthToBook = true }: SelectedRidePanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const carpoolUser = useCarpoolUserOptional();
  const isPhoneVerified = carpoolUser?.isPhoneVerified ?? false;
  const [submitting, setSubmitting] = useState(false);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);
  const waHelp = buildWhatsAppMeUrl('/shared-carpooling/results');

  useEffect(() => {
    setRouteDuration(null);
  }, [ride.pickup, ride.drop]);

  const handleRouteMeta = useCallback((meta: { durationText: string }) => {
    setRouteDuration(meta.durationText);
  }, []);

  const estTimeLabel =
    routeDuration?.trim() || ride.estDuration?.trim() || '25–30 min';

  const handleShare = async () => {
    const text = `Shared ride: ${ride.pickup} → ${ride.drop} at ${ride.time}, ₹${ride.pricePerSeat} ${PER_SEAT_ONE_WAY_LABEL} on Vizag Taxi Hub`;
    if (navigator.share) {
      await navigator.share({ title: 'Shared Ride', text, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const handleSendRequest = async () => {
    const fullName = search.fullName.trim() || carpoolUser?.user?.fullName?.trim() || '';
    const phone = search.waDigits.replace(/\D/g, '') || carpoolUser?.user?.phone?.replace(/\D/g, '') || '';

    if (requireAuthToBook && !isPhoneVerified) {
      const returnTo = `${location.pathname}${location.search}`;
      navigate(carpoolLoginPath(returnTo));
      toast.message('Log in with your email to send a ride request');
      return;
    }

    if (!fullName || phone.length < 10) {
      toast.error('Please complete your name and WhatsApp number in the search form');
      navigate('/shared-carpooling#commute-form');
      return;
    }

    setSubmitting(true);
    try {
      const bookingId = await sharedCarpoolPublicAPI.submitRideRequest({
        ride_id: Number(ride.id),
        full_name: fullName,
        phone,
        seats: search.seats || 1,
        travel_date: search.date,
        company: search.company || carpoolUser?.user?.company || '',
        group_preference: search.groupPreference,
      });

      const payload: RideRequestSubmittedState = {
        bookingId,
        ride,
        search,
        phone,
        submittedAt: new Date().toISOString(),
      };
      saveRideRequestState(payload);
      navigate('/shared-carpooling/request-submitted', { replace: true, state: payload });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sticky top-24 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="relative h-40 bg-gray-100">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-gray-100">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          }
        >
          <CarpoolRouteMap
            pickup={ride.pickup}
            drop={ride.drop}
            height={160}
            onRouteMeta={handleRouteMeta}
          />
        </Suspense>
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute bottom-3 left-3 z-[2] rounded-lg bg-white/95 px-3 py-1.5 shadow">
          <p className="text-[10px] font-medium leading-tight text-gray-500">Est. Time</p>
          <p className="text-xs font-bold leading-tight text-gray-900">{estTimeLabel}</p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-900">Selected Ride</h3>
          {ride.isBestMatch && (
            <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: BRAND_GREEN }}>
              Best Match
            </span>
          )}
        </div>

        <p className="mt-1 text-sm font-semibold text-gray-700">
          {ride.time}, {search.date}
        </p>
        <RideScheduleBadge schedule={ride.schedule} className="mt-2" showIcon />

        <div className="mt-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BRAND_GREEN }} />
              <span className="my-1 h-8 w-px bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-xs text-gray-500">Pickup · {ride.time}, {search.date}</p>
                <p className="text-sm font-semibold text-gray-900">{ride.pickup}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Drop-off · {ride.dropTime ?? '—'}</p>
                <p className="text-sm font-semibold text-gray-900">{ride.drop}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl bg-gray-50 p-3">
          <img src={ride.driverAvatar} alt={ride.driverName} className="h-12 w-12 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{ride.driverName}</p>
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm text-gray-600">{ride.rating}</span>
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: BRAND_GREEN }}>
                Verified Driver
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{ride.vehicle}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-gray-100 p-3 text-center">
          <div>
            <p className="text-xs text-gray-500">Seats</p>
            <p className="text-sm font-bold text-gray-900">{ride.seatsLeft} Left</p>
          </div>
          <div className="border-x border-gray-100 px-1">
            <p className="text-xs text-gray-500">Price</p>
            <PerSeatPrice amount={ride.pricePerSeat} align="center" amountClassName="text-sm" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Group</p>
            <p className="text-sm font-bold text-gray-900">{groupLabel(search.groupPreference)}</p>
          </div>
        </div>

        {ride.amenities && ride.amenities.filter((a) => !isScheduleAmenity(a)).length > 0 && (
          <div className="mt-5">
            <h4 className="text-sm font-bold text-gray-900">About this ride</h4>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {ride.amenities.filter((a) => !isScheduleAmenity(a)).map((a) => {
                const Icon = AMENITY_ICONS[a] ?? MapPin;
                return (
                  <div key={a} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-gray-700" style={{ backgroundColor: BRAND_GREEN_LIGHT }}>
                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: BRAND_GREEN }} />
                    <span>{a}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSendRequest}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: BRAND_GREEN }}
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Send Ride Request
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Share2 className="h-4 w-4" />
            Share This Ride
          </button>
        </div>

        <a
          href={waHelp}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-gray-700"
        >
          <Headphones className="h-3.5 w-3.5" />
          Have questions? Chat with us on WhatsApp
        </a>
      </div>
    </div>
  );
}
