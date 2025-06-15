import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { TabTripSelector } from '@/components/TabTripSelector';
import { CabOptions } from '@/components/CabOptions';
import { BookingSummary } from '@/components/BookingSummary';
import { GuestDetailsForm } from '@/components/GuestDetailsForm';
import { PaymentGateway } from '@/components/PaymentGateway';
import { CabType, TripDetails, GuestDetails } from '@/types/cab';
import { ErrorBoundary } from 'react-error-boundary';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { Card } from '@/components/ui/card';
import { useCabOptions } from './cab-options/useCabOptions';

interface CabBookingInterfaceProps {
    initialTripDetails?: Partial<TripDetails>;
}

export const CabBookingInterface = ({ initialTripDetails }: CabBookingInterfaceProps) => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1);
    const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
    let tripType = initialTripDetails?.tripType || searchParams.get('tripType') || 'outstation';
    if (location.pathname.startsWith('/outstation-taxi')) {
        tripType = 'outstation';
    }

    // Get current date and time in required formats
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const currentDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const [tripDetails, setTripDetails] = useState<TripDetails>({
        tripType,
        from: initialTripDetails?.from || searchParams.get('from') || '',
        to: initialTripDetails?.to || searchParams.get('to') || '',
        pickupDate: initialTripDetails?.pickupDate || searchParams.get('date') || currentDate,
        pickupTime: initialTripDetails?.pickupTime || searchParams.get('time') || currentTime,
        returnDate: initialTripDetails?.returnDate || searchParams.get('returnDate') || '',
    });

    // Use the cab options hook with the correct tripType
    const { cabOptions, isLoading: isCabsLoading } = useCabOptions({ tripType: tripDetails.tripType });

    // Debug log: print tripDetails on every render
    console.log('[CabBookingInterface] tripDetails:', tripDetails);
    console.log('[CabBookingInterface] from:', tripDetails.from, 'to:', tripDetails.to);

    useEffect(() => {
        // Debug log: print tripDetails whenever it changes
        console.log('[CabBookingInterface][useEffect] tripDetails changed:', tripDetails);
    }, [tripDetails]);

    const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);

    const handleTripDetailsChange = (details: TripDetails) => {
        setTripDetails(details);
        if (step > 1) {
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

    return (
        <>
            <Card className="p-4 md:p-6 mb-8 shadow-none border-0">
                <TabTripSelector onTripDetailsChange={handleTripDetailsChange} initialTripDetails={tripDetails} />
            </Card>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                    <ErrorBoundary FallbackComponent={ApiErrorFallback} key={tripDetails.tripType}>
                        <Suspense fallback={<div>Loading cabs...</div>}>
                            <CabOptions
                                cabTypes={cabOptions}
                                tripType={tripDetails.tripType}
                                onSelectCab={handleCabSelect}
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
        </>
    );
};
