import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { CarpoolAppHeader } from '@/components/shared-carpooling/app/CarpoolAppHeader';
import { CarpoolBottomNav } from '@/components/shared-carpooling/app/CarpoolBottomNav';
import { FindRideForm } from '@/components/shared-carpooling/app/FindRideForm';
import { getDefaultSearchParams, fetchMatchingRides } from '@/components/shared-carpooling/searchUtils';
import type { CarpoolSearchParams } from '@/components/shared-carpooling/types';

export default function SharedCarpoolFindPage() {
  const navigate = useNavigate();

  const handleSearch = async (values: { from: string; to: string; date: string; time: string; seats: number }) => {
    const search: CarpoolSearchParams = {
      ...getDefaultSearchParams(),
      from: values.from,
      to: values.to,
      date: format(new Date(`${values.date}T12:00:00`), 'dd MMM, yyyy'),
      time: values.time,
      seats: values.seats,
    };

    try {
      const matching = await fetchMatchingRides(search);
      const path = matching.length > 0 ? '/shared-carpooling/results' : '/shared-carpooling/no-rides';
      navigate(path, { state: { search, rides: matching } });
    } catch {
      toast.error('Could not search rides. Please try again.');
    }
  };

  return (
    <>
      <Helmet>
        <title>Find a Ride | Vizag Taxi Hub Carpooling</title>
      </Helmet>
      <CarpoolAppHeader showLogo />
      <main className="mx-auto max-w-lg px-4 pb-24 py-6">
        <h1 className="text-xl font-bold text-gray-900">Find a Shared Ride</h1>
        <p className="mt-1 text-sm text-gray-500">Enter your route and travel details</p>
        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <FindRideForm onSearch={handleSearch} />
        </div>
      </main>
      <CarpoolBottomNav />
    </>
  );
}
