import React from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { CabBookingInterface } from '@/components/CabBookingInterface';
import { TripDetails } from '@/types/cab';
import { Helmet } from 'react-helmet-async';
import { ScrollToTop } from '@/components/ScrollToTop';

export const CabsPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Parse from/to from the URL path if present
  const pathParts = location.pathname.split('/').filter(Boolean);
  // Example: ['', 'outstation-taxi', 'visakhapatnam', 'narsipatnam']
  let from = searchParams.get('from') || '';
  let to = searchParams.get('to') || '';
  if (pathParts.length >= 4) {
    from = from || decodeURIComponent(pathParts[2]);
    to = to || decodeURIComponent(pathParts[3]);
  }

  const initialTripDetails: Partial<TripDetails> = {
    tripType: searchParams.get('tripType') || 'outstation',
    from,
    to,
    pickupDate: searchParams.get('date') || '',
    pickupTime: searchParams.get('time') || '',
    returnDate: searchParams.get('returnDate') || '',
  };

  return (
    <>
      <Helmet>
        <title>Book Cabs in Visakhapatnam | Local, Outstation, Airport</title>
        <meta name="description" content="Easily book cabs online for local travel, outstation trips, and airport transfers in Visakhapatnam. Choose from a wide range of vehicles at the best prices." />
      </Helmet>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pb-24">
          <CabBookingInterface initialTripDetails={initialTripDetails} />
        </main>
        <MobileNavigation />
      </div>
    </>
  );
};

export default CabsPage;
