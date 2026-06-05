import '@/lib/fonts-poppins';
import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CarpoolingHero } from '@/components/shared-carpooling/CarpoolingHero';
import { QuickAccessBar } from '@/components/shared-carpooling/QuickAccessBar';
import { CommuteForm } from '@/components/shared-carpooling/CommuteForm';
import { AvailableRides } from '@/components/shared-carpooling/AvailableRides';
import { ScheduleAndRoutes } from '@/components/shared-carpooling/ScheduleAndRoutes';
import { FeaturesHowItWorks } from '@/components/shared-carpooling/FeaturesHowItWorks';
import { CarpoolingFooter } from '@/components/shared-carpooling/CarpoolingFooter';
import { SharedCarpoolPublicLayout } from '@/components/shared-carpooling/SharedCarpoolPublicLayout';
import { SharedCarpoolSeoHead } from '@/components/shared-carpooling/SharedCarpoolSeoHead';
import type { CommuteFormData, CarpoolSearchParams } from '@/components/shared-carpooling/types';
import type { GroupPreference } from '@/components/shared-carpooling/constants';
import type { Location } from '@/lib/locationData';
import { fetchMatchingRides, formatCarpoolDisplayDate, formatCarpoolTimeLabel, getDefaultSearchParams } from '@/components/shared-carpooling/searchUtils';
import {
  COMMUTE_SEARCH_RETURN,
  clearPendingCommuteSearch,
  loadPendingCommuteSearch,
  savePendingCommuteSearch,
} from '@/components/shared-carpooling/pendingCommuteSearch';
import { trackCarpoolCommuteSearch } from '@/components/shared-carpooling/carpoolTrackSearch';
import { carpoolSignupPath } from '@/components/shared-carpooling/carpoolAuthRoutes';
import { useCarpoolUserOptional } from '@/providers/CarpoolUserProvider';

function scrollToForm() {
  document.getElementById('commute-form')?.scrollIntoView({ behavior: 'smooth' });
}

function SharedCarpoolingLandingContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const carpoolUser = useCarpoolUserOptional();
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchFromLocation, setSearchFromLocation] = useState<Location | undefined>();
  const [searchToLocation, setSearchToLocation] = useState<Location | undefined>();
  const [searchDate, setSearchDate] = useState(format(new Date(), 'dd MMM, yyyy'));
  const [searchTime, setSearchTime] = useState('Any time');
  const [searchSeats, setSearchSeats] = useState(1);
  const [commuteContext, setCommuteContext] = useState<{
    from: string;
    to: string;
    budget: string;
    pickupTime: string;
    pickupDate: string;
    seats: number;
    groupPreference: GroupPreference;
  }>({ from: '', to: '', budget: '', pickupTime: '', pickupDate: '', seats: 1, groupPreference: 'mixed' });
  const [findingRides, setFindingRides] = useState(false);
  const [heroSearching, setHeroSearching] = useState(false);

  const handleSearch = async (params: {
    from: string;
    to: string;
    date: string;
    time: string;
    seats: number;
    fromLocation?: Location;
    toLocation?: Location;
  }) => {
    setSearchFrom(params.from);
    setSearchTo(params.to);
    if (params.fromLocation) setSearchFromLocation(params.fromLocation);
    if (params.toLocation) setSearchToLocation(params.toLocation);
    try {
      setSearchDate(format(new Date(`${params.date}T12:00:00`), 'dd MMM, yyyy'));
    } catch {
      setSearchDate(format(new Date(), 'dd MMM, yyyy'));
    }
    setSearchTime(formatCarpoolTimeLabel(params.time));
    setSearchSeats(params.seats);

    setHeroSearching(true);
    try {
      const search: CarpoolSearchParams = {
        ...getDefaultSearchParams(),
        from: params.from,
        to: params.to,
        date: format(new Date(`${params.date}T12:00:00`), 'dd MMM, yyyy'),
        time: formatCarpoolTimeLabel(params.time),
        seats: params.seats,
      };
      const matching = await fetchMatchingRides(search);
      if (matching.length > 0) {
        document.getElementById('available-rides')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        toast.message('No rides on this route yet', {
          description: 'Tell us about your daily commute below — we\'ll notify you when a ride matches.',
        });
        scrollToForm();
      }
    } catch {
      toast.error('Could not search rides. Please try again.');
    } finally {
      setHeroSearching(false);
    }
  };

  const runCommuteSearch = useCallback(async (search: CarpoolSearchParams, showDashboardHint = false) => {
    setFindingRides(true);
    try {
      const matching = await fetchMatchingRides(search);
      const path = matching.length > 0 ? '/shared-carpooling/results' : '/shared-carpooling/no-rides';
      navigate(path, { state: { search, rides: matching } });
      if (showDashboardHint) {
        toast.success('Signed in successfully!', {
          description: 'Open My Dashboard anytime from the top menu or bottom bar.',
          action: {
            label: 'Dashboard',
            onClick: () => navigate('/shared-carpooling/home'),
          },
        });
      }
    } catch {
      toast.error('Could not search rides. Please try again.');
    } finally {
      setFindingRides(false);
    }
  }, [navigate]);

  const handleFindRides = async (form: CommuteFormData) => {
    const formattedDate = formatCarpoolDisplayDate(form.pickupDate) || searchDate;

    trackCarpoolCommuteSearch(form);

    const search: CarpoolSearchParams = {
      ...form,
      from: form.from,
      to: form.to,
      date: formattedDate,
      time: form.pickupTime || searchTime,
      seats: form.seats,
      budget: form.budget || '150',
    };

    setSearchFrom(form.from);
    setSearchTo(form.to);
    setSearchDate(formattedDate);
    setSearchTime(form.pickupTime || searchTime);
    setSearchSeats(form.seats);
    savePendingCommuteSearch(search);

    if (!carpoolUser?.isPhoneVerified) {
      navigate(carpoolSignupPath(COMMUTE_SEARCH_RETURN));
      toast.message('Create a free account to find matching rides');
      return;
    }

    clearPendingCommuteSearch();
    await runCommuteSearch(search);
  };

  useEffect(() => {
    if (searchParams.get('resume') !== '1') return;
    if (carpoolUser?.loading) return;
    if (!carpoolUser?.isPhoneVerified) return;

    const pending = loadPendingCommuteSearch();
    if (!pending) {
      setSearchParams({}, { replace: true });
      return;
    }

    setSearchFrom(pending.from);
    setSearchTo(pending.to);
    clearPendingCommuteSearch();
    setSearchParams({}, { replace: true });

    void runCommuteSearch(pending, true);
  }, [searchParams, setSearchParams, carpoolUser?.loading, carpoolUser?.isPhoneVerified, runCommuteSearch]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <CarpoolingHero onSearch={handleSearch} isSearching={heroSearching} />
      <QuickAccessBar />

      <section className="mx-auto min-w-0 max-w-[1400px] overflow-x-hidden px-3 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(0,520px)_minmax(0,1fr)] xl:gap-8">
          <CommuteForm
            onFindRides={handleFindRides}
            onContextChange={setCommuteContext}
            isSubmitting={findingRides}
            defaultFrom={searchFrom}
            defaultTo={searchTo}
            defaultFromLocation={searchFromLocation}
            defaultToLocation={searchToLocation}
            defaultFullName={carpoolUser?.user?.fullName ?? ''}
            defaultWaDigits={carpoolUser?.user?.phone?.replace(/\D/g, '').slice(-10) ?? ''}
            defaultCompany={carpoolUser?.user?.company ?? ''}
            submitLabel={carpoolUser?.isPhoneVerified ? 'Find Matching Rides' : 'Sign Up & Find Matching Rides'}
          />
          <AvailableRides
            searchFrom={searchFrom || commuteContext.from}
            searchTo={searchTo || commuteContext.to}
            searchDate={commuteContext.pickupDate ? formatCarpoolDisplayDate(commuteContext.pickupDate) : searchDate}
            searchTime={commuteContext.pickupTime || searchTime}
            searchSeats={commuteContext.seats || searchSeats}
            searchBudget={commuteContext.budget}
            searchGroupPreference={commuteContext.groupPreference}
          />
        </div>
      </section>

      <ScheduleAndRoutes />
      <FeaturesHowItWorks />
      <CarpoolingFooter />
    </main>
  );
}

export default function SharedCarpoolingLandingPage() {
  return (
    <>
      <SharedCarpoolSeoHead />

      <SharedCarpoolPublicLayout onBookSeat={scrollToForm}>
        <SharedCarpoolingLandingContent />
      </SharedCarpoolPublicLayout>
    </>
  );
}
