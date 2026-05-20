import '@/lib/fonts-poppins';
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Bell,
  Car,
  CheckCircle2,
  Clock,
  Headphones,
  Hourglass,
  Loader2,
  MapPin,
  MessageCircle,
  Network,
  PartyPopper,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { SharedCarpoolPublicLayout } from '@/components/shared-carpooling/SharedCarpoolPublicLayout';
import { CarpoolingFooter } from '@/components/shared-carpooling/CarpoolingFooter';
import { BRAND_GREEN, BRAND_GREEN_LIGHT, type SharedRide } from '@/components/shared-carpooling/constants';
import { fetchMatchingRides } from '@/components/shared-carpooling/searchUtils';
import {
  formatRequestId,
  formatSubmittedDateTime,
  groupPreferenceLabel,
  readRideRequestState,
  type RideRequestSubmittedState,
} from '@/components/shared-carpooling/requestSubmittedState';
import { buildWhatsAppMeUrl } from '@/utils/whatsappPrefillMessage';
import { sharedCarpoolPublicAPI, type SeatBooking, type SeatBookingStatus } from '@/services/api/sharedCarpoolAPI';
import { useCarpoolUserOptional } from '@/providers/CarpoolUserProvider';

const WHY_RIDE = [
  { icon: ShieldCheck, label: 'Verified Drivers' },
  { icon: ShieldCheck, label: 'Safe & Reliable' },
  { icon: Wallet, label: 'Affordable Fares' },
  { icon: Clock, label: 'On-time Pickup' },
] as const;

function StatusStep({
  done,
  active,
  icon: Icon,
  title,
  subtitle,
}: {
  done?: boolean;
  active?: boolean;
  icon: LucideIcon | typeof FaWhatsapp;
  title: string;
  subtitle: string;
}) {
  const circleClass = done
    ? 'bg-green-600 text-white'
    : active
      ? 'border-2 border-green-600 bg-green-50 text-green-700'
      : 'border border-gray-200 bg-gray-50 text-gray-400';

  return (
    <div className="flex min-w-[140px] flex-1 flex-col items-center text-center">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full ${circleClass}`}>
        {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <p className={`mt-2 text-xs font-semibold ${done || active ? 'text-gray-900' : 'text-gray-500'}`}>{title}</p>
      <p className="mt-0.5 text-[10px] text-gray-500">{subtitle}</p>
    </div>
  );
}

function NearbyRideRow({ ride, onView }: { ride: SharedRide; onView: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-gray-100 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-900">{ride.time}</p>
        <p className="truncate text-xs text-gray-600">
          {ride.pickup} → {ride.drop}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] font-bold uppercase text-green-700">{ride.seatsLeft} Seats Left</p>
        <p className="text-xs font-semibold text-gray-900">₹{ride.pricePerSeat}/seat</p>
        <button type="button" onClick={onView} className="text-xs font-semibold" style={{ color: BRAND_GREEN }}>
          View
        </button>
      </div>
    </div>
  );
}

function resolvePhone(request: RideRequestSubmittedState, sessionPhone?: string): string {
  return (
    request.phone?.replace(/\D/g, '') ||
    sessionPhone?.replace(/\D/g, '') ||
    request.search.waDigits?.replace(/\D/g, '') ||
    ''
  );
}

function buildStatusSteps(
  status: SeatBookingStatus,
  submittedLabel: string,
  booking: SeatBooking | null,
): Array<{ done?: boolean; active?: boolean; icon: LucideIcon | typeof FaWhatsapp; title: string; subtitle: string }> {
  const hasDriver = Boolean(booking?.driver_name?.trim());

  if (status === 'cancelled') {
    return [
      { done: true, icon: CheckCircle2, title: 'Request Sent', subtitle: submittedLabel },
      { done: true, icon: XCircle, title: 'Request Cancelled', subtitle: 'Not confirmed' },
      { icon: Car, title: 'Driver Assigned', subtitle: '—' },
      { icon: FaWhatsapp, title: 'WhatsApp Notification', subtitle: '—' },
    ];
  }

  if (status === 'confirmed') {
    return [
      { done: true, icon: CheckCircle2, title: 'Request Sent', subtitle: submittedLabel },
      { done: true, icon: CheckCircle2, title: 'Confirmed', subtitle: 'Seat reserved' },
      hasDriver
        ? { done: true, icon: Car, title: 'Driver Assigned', subtitle: booking!.driver_name! }
        : { active: true, icon: Car, title: 'Driver Assigned', subtitle: 'Assigning soon' },
      {
        active: !hasDriver,
        done: hasDriver,
        icon: FaWhatsapp,
        title: 'WhatsApp Notification',
        subtitle: hasDriver ? 'Check WhatsApp' : 'Upcoming',
      },
    ];
  }

  return [
    { done: true, icon: CheckCircle2, title: 'Request Sent', subtitle: submittedLabel },
    { active: true, icon: Hourglass, title: 'Waiting for Confirmation', subtitle: 'In Progress' },
    { icon: Car, title: 'Driver Assigned', subtitle: 'Upcoming' },
    { icon: FaWhatsapp, title: 'WhatsApp Notification', subtitle: 'Upcoming' },
  ];
}

export default function SharedCarpoolRequestSubmittedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const carpoolUser = useCarpoolUserOptional();
  const request = readRideRequestState(location.state);
  const [nearbyRides, setNearbyRides] = useState<SharedRide[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [notifySimilar, setNotifySimilar] = useState(true);
  const [bookingStatus, setBookingStatus] = useState<SeatBookingStatus>('pending');
  const [liveBooking, setLiveBooking] = useState<SeatBooking | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const lookupPhone = request ? resolvePhone(request, carpoolUser?.user?.phone) : '';

  useEffect(() => {
    if (!request || lookupPhone.length < 10) {
      setStatusLoading(false);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const booking = await sharedCarpoolPublicAPI.getBookingStatus(request.bookingId, lookupPhone);
        if (!cancelled) {
          setLiveBooking(booking);
          setBookingStatus(booking.status);
        }
      } catch {
        /* keep last known status */
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    };

    void poll();
    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [request, lookupPhone]);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    void (async () => {
      setLoadingNearby(true);
      try {
        const rides = await fetchMatchingRides(request.search);
        if (!cancelled) {
          setNearbyRides(rides.filter((r) => r.id !== request.ride.id).slice(0, 3));
        }
      } catch {
        if (!cancelled) setNearbyRides([]);
      } finally {
        if (!cancelled) setLoadingNearby(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request]);

  const submittedLabel = useMemo(
    () => (request ? formatSubmittedDateTime(request.submittedAt) : ''),
    [request],
  );

  const statusSteps = useMemo(
    () => buildStatusSteps(bookingStatus, submittedLabel, liveBooking),
    [bookingStatus, submittedLabel, liveBooking],
  );

  const headerCopy = useMemo(() => {
    if (bookingStatus === 'confirmed') {
      return {
        title: 'Your Ride is Confirmed!',
        subtitle: liveBooking?.driver_name
          ? `${liveBooking.driver_name} will pick you up. Check WhatsApp for full ride details.`
          : 'Your seat is reserved. We will assign a driver and notify you on WhatsApp shortly.',
      };
    }
    if (bookingStatus === 'cancelled') {
      return {
        title: 'Request Cancelled',
        subtitle: 'This seat request was not confirmed. Chat with us on WhatsApp if you need help.',
      };
    }
    return {
      title: 'Your Ride Request is Submitted!',
      subtitle:
        "We're checking seat availability and matching your route. You'll get notified on WhatsApp once we confirm your ride.",
    };
  }, [bookingStatus, liveBooking?.driver_name]);

  if (!request) {
    return <Navigate to="/shared-carpooling/find" replace />;
  }

  const { bookingId, ride, search } = request;
  const waHelp = buildWhatsAppMeUrl('/shared-carpooling/request-submitted');
  const budgetLabel = search.budget?.trim()
    ? `Up to ₹${search.budget.replace(/\D/g, '')}/day`
    : `₹${ride.pricePerSeat}/seat`;

  const openResults = (selectedRideId?: string) => {
    navigate('/shared-carpooling/results', {
      state: { search, rides: nearbyRides.length ? [ride, ...nearbyRides] : undefined, selectedRideId },
    });
  };

  const body = (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: bookingStatus === 'cancelled' ? '#dc2626' : BRAND_GREEN }}
            >
              {bookingStatus === 'cancelled' ? (
                <XCircle className="h-9 w-9 text-white" />
              ) : (
                <CheckCircle2 className="h-9 w-9 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{headerCopy.title}</h1>
            <p className="mt-2 max-w-xl text-sm text-gray-500">{headerCopy.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            {/* Request details */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900">Your Requested Ride Details</h2>
                <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  Request ID: {formatRequestId(bookingId)}
                </span>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'From', value: ride.pickup, sub: ride.via ? `Via: ${ride.via}` : undefined },
                  { label: 'To', value: ride.drop, sub: ride.dropTime ? `Est. ${ride.dropTime}` : undefined },
                  { label: 'Date', value: search.date },
                  { label: 'Pickup Time', value: ride.time },
                  { label: 'Seats Requested', value: `${search.seats || 1} Seat${(search.seats || 1) > 1 ? 's' : ''}` },
                  { label: 'Group Preference', value: groupPreferenceLabel(search.groupPreference) },
                  { label: 'Budget', value: budgetLabel },
                  { label: 'Ride Type', value: 'Daily Commute' },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
                    {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
                  </div>
                ))}
              </div>
            </section>

            {/* Status stepper */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-gray-900">Request Status</h2>
                {statusLoading && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Updating…
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">We&apos;ll update you at every step of the process</p>
              <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
                {statusSteps.map((step) => (
                  <StatusStep key={step.title} {...step} />
                ))}
              </div>
              {bookingStatus === 'confirmed' && liveBooking?.driver_name && (
                <div className="mt-4 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-gray-800">
                  <span className="font-semibold">Driver:</span> {liveBooking.driver_name}
                  {liveBooking.driver_phone && (
                    <span className="text-gray-600"> · {liveBooking.driver_phone}</span>
                  )}
                  {liveBooking.vehicle && (
                    <span className="block text-xs text-gray-600">Vehicle: {liveBooking.vehicle}</span>
                  )}
                </div>
              )}
            </section>

            {/* Good news banner */}
            {bookingStatus === 'pending' && nearbyRides.length > 0 && (
              <div
                className="flex items-start gap-3 rounded-2xl border border-green-100 p-4"
                style={{ backgroundColor: BRAND_GREEN_LIGHT }}
              >
                <PartyPopper className="mt-0.5 h-5 w-5 shrink-0" style={{ color: BRAND_GREEN }} />
                <p className="text-sm text-gray-800">
                  <span className="font-bold">Good news!</span>{' '}
                  {nearbyRides.length} more commuter{nearbyRides.length > 1 ? 's' : ''} requested similar routes today.
                  High chance of confirmation within 15 minutes.
                </p>
              </div>
            )}

            {/* What happens next */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-gray-900">What happens next?</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Network, text: 'We match with other commuters on your route.' },
                  { icon: Car, text: 'A driver is assigned by Vizag Taxi Hub.' },
                  { icon: MessageCircle, text: "You'll get ride details on WhatsApp." },
                  { icon: Users, text: 'Board & enjoy your ride!' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex flex-col items-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <Icon className="h-5 w-5 text-gray-700" />
                    </div>
                    <p className="mt-2 text-xs text-gray-600">{text}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Notification preferences */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-gray-900">Notification Preferences</h2>
              <ul className="mt-4 space-y-3">
                {[
                  { id: 'wa', label: 'Notify me on WhatsApp', icon: FaWhatsapp, checked: notifyWhatsApp, set: setNotifyWhatsApp },
                  { id: 'similar', label: 'Notify me when similar rides are available', icon: Bell, checked: notifySimilar, set: setNotifySimilar },
                ].map(({ id, label, icon: Icon, checked, set }) => (
                  <li key={id} className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" style={{ color: BRAND_GREEN }} />
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      onClick={() => set(!checked)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-green-600' : 'bg-gray-300'}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {/* Need help */}
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-bold text-gray-900">Need Help?</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={waHelp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white"
                  style={{ backgroundColor: BRAND_GREEN }}
                >
                  <FaWhatsapp className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Headphones className="h-4 w-4" />
                  Mon – Sat, 6:00 AM – 10:00 PM · +91 9966363662
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="relative h-36 bg-gradient-to-br from-green-50 to-gray-100">
                <img
                  src="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=60"
                  alt=""
                  className="h-full w-full object-cover opacity-90"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="h-10 w-10 text-green-700 drop-shadow" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-900">Track Your Request</h3>
                <p className="mt-1 text-xs text-gray-500">View status updates in My Bookings</p>
                <Link
                  to="/shared-carpooling/bookings"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white"
                  style={{ backgroundColor: BRAND_GREEN }}
                >
                  Track Request
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-gray-900">Nearby Available Rides</h3>
              {loadingNearby ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-green-700" />
                </div>
              ) : nearbyRides.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">No other rides on this route right now.</p>
              ) : (
                <div className="mt-2">
                  {nearbyRides.map((r) => (
                    <NearbyRideRow key={r.id} ride={r} onView={() => openResults(r.id)} />
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => openResults()}
                className="mt-3 flex w-full items-center justify-center gap-1 text-sm font-semibold"
                style={{ color: BRAND_GREEN }}
              >
                View More Rides
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-gray-900">Why ride with Vizag Taxi Hub?</h3>
              <ul className="mt-3 space-y-2">
                {WHY_RIDE.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-sm text-gray-600">
                    <Icon className="h-4 w-4 shrink-0" style={{ color: BRAND_GREEN }} />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-green-100 p-4" style={{ backgroundColor: BRAND_GREEN_LIGHT }}>
              <p className="text-sm font-bold text-gray-900">Did you know?</p>
              <p className="mt-1 text-xs text-gray-700">
                Carpooling daily can save up to 60% on commute costs while reducing traffic and building a trusted
                commuter community in Vizag.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <div className="border-t border-green-100 py-6 text-center text-sm" style={{ backgroundColor: BRAND_GREEN_LIGHT }}>
        <p className="font-semibold text-gray-800">
          Thank you for choosing Vizag Taxi Hub! You&apos;re helping us build a smarter, greener Vizag.
        </p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide" style={{ color: BRAND_GREEN }}>
          #RideTogetherSaveTogether
        </p>
      </div>

      <CarpoolingFooter />
    </div>
  );

  return (
    <>
      <Helmet>
        <title>Ride Request Submitted | Vizag Taxi Hub</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <SharedCarpoolPublicLayout onBookSeat={() => navigate('/shared-carpooling#commute-form')}>
        {body}
      </SharedCarpoolPublicLayout>
    </>
  );
}
