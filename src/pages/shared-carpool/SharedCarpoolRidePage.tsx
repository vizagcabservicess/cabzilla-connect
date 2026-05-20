import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { SelectedRidePanel } from '@/components/shared-carpooling/SelectedRidePanel';
import { fetchSharedRides } from '@/components/shared-carpooling/rideMapper';
import { getDefaultSearchParams, enrichSearchWithRide } from '@/components/shared-carpooling/searchUtils';
import type { CarpoolSearchParams } from '@/components/shared-carpooling/types';
import type { SharedRide } from '@/components/shared-carpooling/constants';

type RidePageLocationState = {
  search?: CarpoolSearchParams;
  rides?: SharedRide[];
  selectedRideId?: string;
};

export default function SharedCarpoolRidePage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navState = (location.state as RidePageLocationState | null) ?? {};
  const search = useMemo(
    () => navState.search ?? getDefaultSearchParams(),
    [navState.search],
  );
  const [ride, setRide] = useState<SharedRide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rides = await fetchSharedRides({});
      const found = rides.find((r) => r.id === id) ?? null;
      if (!cancelled) {
        setRide(found);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-700" />
      </div>
    );
  }

  if (!ride) {
    return (
      <>
        <CarpoolAppHeader title="Ride Not Found" showBack />
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <p className="text-gray-600">This ride is no longer available.</p>
          <Link to="/shared-carpooling/find" className="mt-4 inline-block text-sm font-semibold text-green-700">
            Search again
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{ride.pickup} → {ride.drop} | Vizag Taxi Hub</title>
      </Helmet>
      <CarpoolAppHeader title="Ride Details" showBack />
      <main className="mx-auto max-w-lg px-4 pb-8 pt-4">
        <SelectedRidePanel ride={ride} search={enrichSearchWithRide(search, ride)} />
      </main>
    </>
  );
}
