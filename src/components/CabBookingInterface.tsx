import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { TabTripSelector } from '@/components/TabTripSelector';
import { CabOptions } from '@/components/CabOptions';
import { BookingSummary } from '@/components/BookingSummary';
import { GuestDetailsForm } from '@/components/GuestDetailsForm';
import { PaymentGateway } from '@/components/PaymentGateway';
import { CabType } from '@/types/cab';
import { ErrorBoundary } from 'react-error-boundary';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { Card } from '@/components/ui/card';
import { useCabOptions } from './cab-options/useCabOptions';
import { useDistance } from '@/hooks/useDistance';
import { TripType } from '@/types/trip';
import { calculateOutstationRoundTripFare } from '@/lib/fareCalculationService';
import { getOutstationFaresForVehicle } from '@/services/fareService';

export interface TripDetails {
  tripType: TripType;
  from: string;
  to: string;
  pickupDate: string;
  pickupTime: string;
  returnDate?: string;
  tripMode?: 'one-way' | 'round-trip';
  package?: string;
}

export interface GuestDetails {
  name: string;
  phone: string;
  email?: string;
  specialRequest?: string;
}

interface CabBookingInterfaceProps {
    initialTripDetails?: Partial<TripDetails>;
}

export const CabBookingInterface = ({ initialTripDetails }: CabBookingInterfaceProps) => {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [step, setStep] = useState(1);
    const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
    const [fare, setFare] = useState<number | null>(null);
    const [fareBreakdown, setFareBreakdown] = useState<any>(null);
    const [bookNowFare, setBookNowFare] = useState<number | null>(null);

    let tripType: TripType = (initialTripDetails?.tripType || searchParams.get('tripType') || 'outstation') as TripType;
    if (location.pathname.startsWith('/outstation-taxi')) {
        tripType = 'outstation';
    }

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
        tripMode: 'one-way',
        package: initialTripDetails?.package || '',
    });

    const { distance, isLoading: isDistanceLoading } = useDistance(tripDetails.from, tripDetails.to);
    const { cabOptions, isLoading: isCabsLoading } = useCabOptions({ tripType: tripDetails.tripType });

    const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);

    useEffect(() => {
        async function recalcFareIfNeeded() {
            if (
                selectedCab &&
                tripDetails.tripType === 'outstation' &&
                tripDetails.tripMode === 'round-trip' &&
                tripDetails.pickupDate &&
                tripDetails.returnDate &&
                distance > 0
            ) {
                const outstationFares = await getOutstationFaresForVehicle(selectedCab.id);
                const perKmRate = outstationFares.pricePerKm;
                const nightAllowancePerNight = outstationFares.nightHaltCharge;
                const driverAllowancePerDay = outstationFares.driverAllowance;
                const actualDistance = distance * 2;
                const breakdown = calculateOutstationRoundTripFare({
                    pickupDate: new Date(tripDetails.pickupDate),
                    returnDate: new Date(tripDetails.returnDate),
                    actualDistance,
                    perKmRate,
                    nightAllowancePerNight,
                    driverAllowancePerDay
                });
                setFare(breakdown.totalFare);
                setFareBreakdown(breakdown);
            }
        }
        recalcFareIfNeeded();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCab, tripDetails.pickupDate, tripDetails.returnDate, distance, tripDetails.tripType, tripDetails.tripMode]);

    const handleTripDetailsChange = (details: TripDetails) => {
        setTripDetails(details);
        if (step > 1) {
            setStep(1);
            setSelectedCab(null);
        }
    };

    const handleActualCabSelect = (cab: CabType, calculatedFare: number, breakdown?: any) => {
        setBookNowFare(null);
        if (
            tripDetails.tripType === 'outstation' &&
            tripDetails.tripMode === 'round-trip' &&
            breakdown && breakdown.totalFare
        ) {
            setSelectedCab(cab);
            setFare(breakdown.totalFare);
            setFareBreakdown(breakdown);
        } else {
            setSelectedCab(cab);
            setFare(calculatedFare);
            setFareBreakdown(breakdown);
        }
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

    const isOutstationRoundTrip = tripDetails.tripType === 'outstation' && tripDetails.tripMode === 'round-trip';
    const summaryFare = isOutstationRoundTrip && fareBreakdown?.totalFare ? fareBreakdown.totalFare : fare;
    const summaryBreakdown = isOutstationRoundTrip && fareBreakdown ? fareBreakdown : undefined;

    const bookNowTotal = isOutstationRoundTrip && bookNowFare !== null
        ? bookNowFare
        : fareBreakdown?.totalFare ?? fare ?? 0;

    return (
        <>
            <Card className="p-4 md:p-6 mb-8 shadow-none border-0">
                <TabTripSelector
                    selectedTab={tripDetails.tripType}
                    tripMode={tripDetails.tripMode}
                    onTabChange={(tab) => setTripDetails(prev => ({ ...prev, tripType: tab }))}
                    onTripModeChange={(mode) => setTripDetails(prev => ({ ...prev, tripMode: mode }))}
                />
            </Card>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                    <ErrorBoundary FallbackComponent={ApiErrorFallback} key={tripDetails.tripType}>
                        <Suspense fallback={<div>Loading cabs...</div>}>
                            <CabOptions
                                cabTypes={cabOptions}
                                tripType={tripDetails.tripType}
                                onSelectCab={handleActualCabSelect}
                                selectedCab={selectedCab}
                                isCalculatingFares={isCabsLoading || isDistanceLoading}
                                distance={distance}
                                tripMode={tripDetails.tripMode}
                                hourlyPackage={tripDetails.package}
                                pickupDate={tripDetails.pickupDate ? new Date(tripDetails.pickupDate) : undefined}
                                returnDate={tripDetails.returnDate ? new Date(tripDetails.returnDate) : undefined}
                                selectedCabBreakdown={fareBreakdown}
                            />
                        </Suspense>
                    </ErrorBoundary>
                </div>

                <div className="lg:col-span-1 sticky top-8">
                    {selectedCab && fare !== null && (
                        <BookingSummary
                            selectedCab={selectedCab}
                            pickupDate={tripDetails.pickupDate ? new Date(tripDetails.pickupDate) : undefined}
                            returnDate={tripDetails.returnDate ? new Date(tripDetails.returnDate) : undefined}
                            tripType={tripDetails.tripType}
                            tripMode={tripDetails.tripMode}
                            totalPrice={isOutstationRoundTrip && fareBreakdown?.totalFare !== undefined ? fareBreakdown.totalFare : fare}
                            hourlyPackage={tripDetails.package || ''}
                            distance={distance}
                            pickupLocation={null}
                            dropLocation={null}
                            onFinalTotalChange={isOutstationRoundTrip ? setBookNowFare : undefined}
                        />
                    )}
                </div>
            </div>

            {step === 2 && selectedCab && fare !== null && (
                <GuestDetailsForm
                    onSubmit={handleGuestDetailsSubmit}
                    onBack={handleBack}
                    totalPrice={bookNowTotal}
                />
            )}

            {step === 3 && selectedCab && tripDetails && guestDetails && fare !== null && (
                <PaymentGateway
                    totalAmount={bookNowTotal}
                    onPaymentComplete={() => {}}
                />
            )}
        </>
    );
};
