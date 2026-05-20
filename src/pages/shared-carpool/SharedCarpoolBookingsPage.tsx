import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2, Ticket } from 'lucide-react';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { CarpoolBottomNav } from '@/components/shared-carpooling/app/CarpoolBottomNav';
import { BRAND_GREEN } from '@/components/shared-carpooling/constants';
import { useCarpoolUser } from '@/providers/CarpoolUserProvider';
import { sharedCarpoolUserAPI, type SeatBooking } from '@/services/api/sharedCarpoolAPI';

function statusLabel(status: SeatBooking['status']) {
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'cancelled') return 'Cancelled';
  return 'Pending review';
}

function statusClass(status: SeatBooking['status']) {
  if (status === 'confirmed') return 'bg-green-100 text-green-800';
  if (status === 'cancelled') return 'bg-gray-100 text-gray-700';
  return 'bg-amber-100 text-amber-800';
}

export default function SharedCarpoolBookingsPage() {
  const { user } = useCarpoolUser();
  const [bookings, setBookings] = useState<SeatBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const phone = user?.phone?.replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        setBookings(await sharedCarpoolUserAPI.getMyBookings(phone));
      } catch {
        setBookings([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.phone]);

  return (
    <>
      <Helmet><title>My Bookings | Vizag Taxi Hub</title></Helmet>
      <CarpoolAppHeader title="My Bookings" showBack backTo="/shared-carpooling/home" />
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-green-700" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="pt-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Ticket className="h-8 w-8 text-gray-400" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">No bookings yet</h1>
            <p className="mt-2 text-sm text-gray-500">Your ride requests will appear here after you send a request</p>
            <Link
              to="/shared-carpooling/find"
              className="mt-6 inline-flex rounded-xl px-6 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND_GREEN }}
            >
              Find a Ride
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <article key={b.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{b.pickup} → {b.drop_location}</p>
                    <p className="mt-1 text-sm text-gray-500">{b.pickup_time} · {b.travel_date || 'Daily commute'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusClass(b.status)}`}>
                    {statusLabel(b.status)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                  <span>{b.vehicle ?? 'Shared cab'}</span>
                  <span>Driver: {b.driver_name ?? '—'}</span>
                  <span>{b.seats} seat{b.seats > 1 ? 's' : ''}</span>
                  <span>₹{b.amount}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <CarpoolBottomNav />
    </>
  );
}
