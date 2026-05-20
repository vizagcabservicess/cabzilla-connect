import '@/lib/fonts-poppins';
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { SharedCarpoolPublicLayout } from '@/components/shared-carpooling/SharedCarpoolPublicLayout';
import { SearchSummaryBar } from '@/components/shared-carpooling/SearchSummaryBar';
import { MatchingRideList } from '@/components/shared-carpooling/MatchingRideList';
import { SelectedRidePanel } from '@/components/shared-carpooling/SelectedRidePanel';
import { SafetyTrustSections } from '@/components/shared-carpooling/SafetyTrustSections';
import { CarpoolingFooter } from '@/components/shared-carpooling/CarpoolingFooter';
import { RESULTS_PAGE_URL, type SharedRide } from '@/components/shared-carpooling/constants';
import { getDefaultSearchParams, fetchMatchingRides, enrichSearchWithRide } from '@/components/shared-carpooling/searchUtils';
import type { CarpoolSearchParams } from '@/components/shared-carpooling/types';

type ResultsLocationState = {
  search?: CarpoolSearchParams;
  rides?: SharedRide[];
  selectedRideId?: string;
};

export default function SharedCarpoolingResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as ResultsLocationState | null) ?? {};
  const search = useMemo(
    () => state.search ?? getDefaultSearchParams(),
    [state.search],
  );

  const [matchingRides, setMatchingRides] = useState<SharedRide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const rides = await fetchMatchingRides(search);
      if (!cancelled) {
        setMatchingRides(rides);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search]);

  useEffect(() => {
    if (!loading && matchingRides.length === 0) {
      navigate('/shared-carpooling/no-rides', { replace: true, state: { search } });
    }
  }, [loading, matchingRides.length, navigate, search]);

  const defaultSelected = useMemo(() => {
    if (state.selectedRideId) {
      const picked = matchingRides.find((r) => r.id === state.selectedRideId);
      if (picked) return picked;
    }
    return matchingRides.find((r) => r.isBestMatch) ?? matchingRides[0];
  }, [matchingRides, state.selectedRideId]);

  const [selectedRide, setSelectedRide] = useState<SharedRide | null>(defaultSelected ?? null);

  useEffect(() => {
    if (defaultSelected) setSelectedRide(defaultSelected);
  }, [defaultSelected]);

  const displaySearch = useMemo(
    () => enrichSearchWithRide(search, selectedRide),
    [search, selectedRide],
  );

  const scrollToForm = () => navigate('/shared-carpooling#commute-form');

  const body =
    loading || matchingRides.length === 0 || !selectedRide ? (
      <div className="flex min-h-[50vh] items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-green-700" />
      </div>
    ) : (
      <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">Matching Shared Rides</h1>
            <p className="mt-1 text-sm text-gray-500">
              We found {matchingRides.length} rides matching your preferences
            </p>
          </div>
        </div>

        <SearchSummaryBar search={displaySearch} />

        <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] xl:grid-cols-[minmax(0,1fr)_400px]">
            <MatchingRideList selectedId={selectedRide.id} onSelect={setSelectedRide} rides={matchingRides} />
            <SelectedRidePanel ride={selectedRide} search={displaySearch} />
          </div>
        </section>

        <SafetyTrustSections />
        <CarpoolingFooter />
      </div>
    );

  return (
    <>
      <Helmet>
        <title>Matching Shared Rides | Vizag Taxi Hub</title>
        <meta
          name="description"
          content="View matching shared rides for your daily commute in Visakhapatnam. Compare routes, drivers, and prices."
        />
        <link rel="canonical" href={RESULTS_PAGE_URL} />
        <meta property="og:url" content={RESULTS_PAGE_URL} />
        <meta property="og:title" content="Matching Shared Rides | Vizag Taxi Hub" />
      </Helmet>

      <SharedCarpoolPublicLayout onBookSeat={scrollToForm}>{body}</SharedCarpoolPublicLayout>
    </>
  );
}
