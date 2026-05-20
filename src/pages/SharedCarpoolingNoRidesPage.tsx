import '@/lib/fonts-poppins';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SharedCarpoolPublicLayout } from '@/components/shared-carpooling/SharedCarpoolPublicLayout';
import { SearchSummaryBar } from '@/components/shared-carpooling/SearchSummaryBar';
import { NoRidesHero } from '@/components/shared-carpooling/NoRidesHero';
import { PostCommuteRequestForm } from '@/components/shared-carpooling/PostCommuteRequestForm';
import { WhatHappensNext } from '@/components/shared-carpooling/WhatHappensNext';
import { OtherOptions } from '@/components/shared-carpooling/OtherOptions';
import { PopularRoutesDemand } from '@/components/shared-carpooling/PopularRoutesDemand';
import { CarpoolingFooter } from '@/components/shared-carpooling/CarpoolingFooter';
import { getDefaultSearchParams, NO_RIDES_PAGE_URL } from '@/components/shared-carpooling/searchUtils';
import type { CarpoolSearchParams } from '@/components/shared-carpooling/types';

export default function SharedCarpoolingNoRidesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const search = (location.state as { search?: CarpoolSearchParams } | null)?.search ?? getDefaultSearchParams();

  return (
    <>
      <Helmet>
        <title>No Shared Rides Available | Vizag Taxi Hub</title>
        <meta
          name="description"
          content="No matching shared rides right now. Post your commute request and get notified when a ride becomes available in Visakhapatnam."
        />
        <link rel="canonical" href={NO_RIDES_PAGE_URL} />
        <meta property="og:url" content={NO_RIDES_PAGE_URL} />
      </Helmet>

      <SharedCarpoolPublicLayout onBookSeat={() => navigate('/shared-carpooling#commute-form')}>
      <div className="min-h-screen bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 lg:px-8">
            <Link
              to="/shared-carpooling"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Search
            </Link>
          </div>
        </div>

        <SearchSummaryBar search={search} />
        <NoRidesHero />
        <PostCommuteRequestForm search={search} />
        <WhatHappensNext />
        <OtherOptions />
        <PopularRoutesDemand />
        <CarpoolingFooter />
      </div>
      </SharedCarpoolPublicLayout>
    </>
  );
}
