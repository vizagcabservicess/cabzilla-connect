
import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TabTripSelector } from '@/components/TabTripSelector';
import { CabOptions } from '@/components/CabOptions';
import { BookingSummary } from '@/components/BookingSummary';
import { GuestDetailsForm } from '@/components/GuestDetailsForm';
import { PaymentGateway } from '@/components/PaymentGateway';
import { CabType } from '@/types/cab';
import { TripDetails, GuestDetails } from '@/types/trip';
import { ErrorBoundary } from 'react-error-boundary';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { Card } from '@/components/ui/card';
import { useCabOptions } from './cab-options/useCabOptions';
import { useDistance } from '@/hooks/useDistance';
import { parse, isValid } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface CabBookingInterfaceProps {
    initialTripDetails?: Partial<TripDetails>;
}

export const CabBookingInterface = ({ initialTripDetails }: CabBookingInterfaceProps) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [step, setStep] = useState(1);
    const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
    const [totalPrice, setTotalPrice] = useState<number>(0);
    const [tripDetails, setTripDetails] = useState<TripDetails>({
        tripType: (initialTripDetails?.tripType || searchParams.get('tripType') || 'outstation') as TripDetails['tripType'],
        from: initialTripDetails?.from || searchParams.get('from') || 'Visakhapatnam',
        to: initialTripDetails?.to || searchParams.get('to') || '',
        pickupDate: initialTripDetails?.pickupDate || searchParams.get('date') || '',
        pickupTime: initialTripDetails?.pickupTime || searchParams.get('time') || '',
        returnDate: initialTripDetails?.returnDate || searchParams.get('returnDate') || '',
        tripMode: (initialTripDetails?.tripMode || searchParams.get('tripMode') || 'one-way') as 'one-way' | 'round-trip',
        hourlyPackage: initialTripDetails?.hourlyPackage || searchParams.get('package') || '8hrs-80km',
    });
    
    const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);

    const { distance } = useDistance(tripDetails.from, tripDetails.to);

    const { cabOptions, isLoading: isLoadingCabs } = useCabOptions({
        tripType: tripDetails.tripType,
        tripMode: tripDetails.tripMode,
        distance: distance,
    });
    
    useEffect(() => {
        if (distance > 0) {
            setTripDetails(prev => ({ ...prev, distance }));
        }
    }, [distance]);

    const handleTripDetailsChange = (details: Partial<TripDetails>) => {
        const newDetails = { ...tripDetails, ...details };
        setTripDetails(newDetails);
        
        const params = new URLSearchParams(searchParams);
        Object.entries(newDetails).forEach(([key, value]) => {
            if(value) params.set(key, String(value));
        });
        setSearchParams(params);

        if (step > 1) {
            setStep(1);
            setSelectedCab(null);
            setTotalPrice(0);
        }
    };

    const handleCabSelect = (cab: CabType, fare: number) => {
        setSelectedCab(cab);
        setTotalPrice(fare);
        setStep(2);
        const summaryElement = document.getElementById('booking-summary');
        if (summaryElement) {
            summaryElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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

    const pickupDateObj = tripDetails.pickupDate ? parse(tripDetails.pickupDate, 'yyyy-MM-dd', new Date()) : new Date();
    const returnDateObj = tripDetails.returnDate ? parse(tripDetails.returnDate, 'yyyy-MM-dd', new Date()) : null;

    return (
        <>
            <Card className="p-4 md:p-6 mb-8 shadow-none border-0 bg-transparent">
                <TabTripSelector onTripDetailsChange={handleTripDetailsChange} initialTripDetails={tripDetails} />
            </Card>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                    <ErrorBoundary FallbackComponent={ApiErrorFallback} key={tripDetails.tripType}>
                        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                            <CabOptions
                                cabTypes={cabOptions}
                                selectedCab={selectedCab}
                                onSelectCab={handleCabSelect}
                                distance={distance}
                                tripType={tripDetails.tripType}
                                tripMode={tripDetails.tripMode || 'one-way'}
                                hourlyPackage={tripDetails.hourlyPackage}
                                pickupDate={isValid(pickupDateObj) ? pickupDateObj : undefined}
                                returnDate={returnDateObj && isValid(returnDateObj) ? returnDateObj : null}
                                isCalculatingFares={isLoadingCabs}
                            />
                        </Suspense>
                    </ErrorBoundary>
                </div>

                <div className="lg:col-span-1 sticky top-8" id="booking-summary">
                    {selectedCab && (
                        <BookingSummary
                            selectedCab={selectedCab}
                            tripDetails={tripDetails}
                            totalPrice={totalPrice}
                            onEdit={handleBack}
                        />
                    )}
                </div>
            </div>

            {step === 2 && selectedCab && (
                <GuestDetailsForm
                    onSubmit={handleGuestDetailsSubmit}
                    onBack={handleBack}
                    totalPrice={totalPrice}
                />
            )}

            {step === 3 && selectedCab && tripDetails && guestDetails && (
                <PaymentGateway
                    selectedCab={selectedCab}
                    tripDetails={tripDetails}
                    guestDetails={guestDetails}
                    totalPrice={totalPrice}
                />
            )}
        </>
    );
};
