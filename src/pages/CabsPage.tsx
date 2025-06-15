
import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import { TabTripSelector } from '@/components/TabTripSelector';
import { CabOptions } from '@/components/CabOptions';
import { BookingSummary } from '@/components/BookingSummary';
import { GuestDetailsForm } from '@/components/GuestDetailsForm';
import { PaymentGateway } from '@/components/PaymentGateway';
import { CabType, TripDetails, GuestDetails, Location } from '@/types/cab';
import { ErrorBoundary } from 'react-error-boundary';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { Helmet } from 'react-helmet-async';
import { Card } from '@/components/ui/card';
import { ScrollToTop } from '@/components/ScrollToTop';

export const CabsPage = () => {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [tripDetails, setTripDetails] = useState<TripDetails>({
    tripType: searchParams.get('tripType') || 'outstation',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    pickupDate: searchParams.get('date') || '',
    pickupTime: searchParams.get('time') || '',
    returnDate: searchParams.get('returnDate') || '',
  });

  const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);

  const handleTripDetailsChange = (details: TripDetails) => {
    setTripDetails(details);
    if(step > 1) {
      setStep(1);
      setSelectedCab(null);
    }
  };
  
  const handleCabSelect = (cab: CabType) => {
    setSelectedCab(cab);
    setStep(2);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleGuestDetailsSubmit = (details: GuestDetails) => {
    setGuestDetails(details);
    setStep(3);
  };
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from && to) {
      setTripDetails(prev => ({ ...prev, from, to }));
    }
  }, [searchParams]);

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
          <Card className="p-4 md:p-6 mb-8">
            <TabTripSelector onTripDetailsChange={handleTripDetailsChange} initialTripDetails={tripDetails} />
          </Card>

          <div className="grid lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2">
              <ErrorBoundary FallbackComponent={ApiErrorFallback} key={tripDetails.tripType}>
                <Suspense fallback={<div>Loading cabs...</div>}>
                  <CabOptions
                    tripDetails={tripDetails}
                    onCabSelect={handleCabSelect}
                    selectedCab={selectedCab}
                  />
                </Suspense>
              </ErrorBoundary>
            </div>
            
            <div className="lg:col-span-1 sticky top-8">
              {selectedCab && (
                <BookingSummary
                  cab={selectedCab}
                  tripDetails={tripDetails}
                  onEdit={handleBack}
                />
              )}
            </div>
          </div>

          {step === 2 && selectedCab && (
            <GuestDetailsForm
              onSubmit={handleGuestDetailsSubmit}
              onBack={handleBack}
            />
          )}

          {step === 3 && selectedCab && tripDetails && guestDetails && (
            <PaymentGateway
              cab={selectedCab}
              tripDetails={tripDetails}
              guestDetails={guestDetails}
            />
          )}
        </main>
        <MobileNavigation />
      </div>
    </>
  );
};

export default CabsPage;
