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
import { useFare } from '@/hooks/useFare';
import { normalizeVehicleId } from '@/utils/safeStringUtils';

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
    const [hasAutoSelected, setHasAutoSelected] = useState(false);

    const [guestDetails, setGuestDetails] = useState<GuestDetails | null>(null);

    // Helper function to calculate fare the same way CabList does
    const calculateFareForCab = async (cab: CabType): Promise<{ fare: number; breakdown: any } | null> => {
        if (!distance || distance <= 0) return null;

        const normalizedId = normalizeVehicleId(cab.id);
        const correctPackageType = tripDetails.tripType === 'outstation' ? tripDetails.tripMode : tripDetails.package;
        
        // For outstation round trips
        if (
            tripDetails.tripType === 'outstation' &&
            tripDetails.tripMode === 'round-trip' &&
            tripDetails.pickupDate &&
            tripDetails.returnDate &&
            distance > 0
        ) {
            try {
                const outstationFares = await getOutstationFaresForVehicle(normalizedId);
                const perKmRate = cab.pricePerKm ?? cab.outstationFares?.pricePerKm ?? outstationFares.pricePerKm ?? 15;
                const nightAllowancePerNight = cab.nightHaltCharge ?? cab.outstationFares?.nightHaltCharge ?? outstationFares.nightHaltCharge ?? 0;
                const driverAllowancePerDay = cab.driverAllowance ?? cab.outstationFares?.driverAllowance ?? outstationFares.driverAllowance ?? 250;
                const actualDistance = distance * 2;
                const breakdown = calculateOutstationRoundTripFare({
                    pickupDate: new Date(tripDetails.pickupDate),
                    returnDate: new Date(tripDetails.returnDate),
                    actualDistance,
                    perKmRate,
                    nightAllowancePerNight,
                    driverAllowancePerDay
                });
                return { fare: breakdown.totalFare, breakdown };
            } catch (e) {
                console.error('Error calculating round trip fare:', e);
                return null;
            }
        }

        // For other trip types, use useFare hook logic via direct calculation
        // We'll use a simpler approach: trigger the calculation and wait for it
        // Actually, we need to replicate the exact calculation from CabList
        // Let's use the useFare hook by creating a wrapper component or calculating directly
        
        // For now, return null and let the auto-select use the fare from CabList's calculation
        // This will be handled by the auto-select logic that triggers selection after fare is calculated
        return null;
    };

    // Calculate fare for first cab using useFare hook (for auto-selection)
    const firstCab = cabOptions.length > 0 ? cabOptions[0] : null;
    const normalizedFirstCabId = firstCab ? normalizeVehicleId(firstCab.id) : '';
    const correctPackageType = tripDetails.tripType === 'outstation' ? tripDetails.tripMode : tripDetails.package;
    const { fareData: firstCabFareData, isLoading: isFirstCabFareLoading } = useFare(
        normalizedFirstCabId,
        tripDetails.tripType,
        distance,
        correctPackageType,
        tripDetails.pickupDate ? new Date(tripDetails.pickupDate) : undefined,
        tripDetails.tripType === 'outstation' && tripDetails.tripMode === 'round-trip' && tripDetails.returnDate 
            ? new Date(tripDetails.returnDate) 
            : undefined
    );

    // Auto-select first cab when fare is calculated
    useEffect(() => {
        const autoSelectFirstCab = async () => {
            // Only auto-select if:
            // 1. First cab exists
            // 2. Distance is available and > 0
            // 3. No cab is currently selected
            // 4. We haven't auto-selected yet
            // 5. Fare data is available (or we're dealing with round trip)
            if (
                firstCab &&
                !selectedCab &&
                !hasAutoSelected &&
                distance > 0 &&
                tripDetails.from &&
                tripDetails.to
            ) {
                // For round trips, calculate fare directly
                if (
                    tripDetails.tripType === 'outstation' &&
                    tripDetails.tripMode === 'round-trip' &&
                    tripDetails.pickupDate &&
                    tripDetails.returnDate
                ) {
                    try {
                        const result = await calculateFareForCab(firstCab);
                        if (result) {
                            setSelectedCab(firstCab);
                            setFare(result.fare);
                            setFareBreakdown(result.breakdown);
                            setHasAutoSelected(true);
                            return;
                        }
                    } catch (e) {
                        console.error('Error auto-selecting first cab:', e);
                    }
                }
                
                // For other trip types, wait for fare data
                if (firstCabFareData && !isFirstCabFareLoading) {
                    // Calculate fare the same way CabList does
                    const sumBreakdown = (breakdown: any) => {
                        if (!breakdown) return 0;
                        const chargeFields = ['basePrice', 'driverAllowance', 'nightCharges', 'extraDistanceFare', 'airportFee', 'baseFare', 'nightAllowance', 'extraDistanceCharges'];
                        let total = 0;
                        for (const key of chargeFields) {
                            const val = breakdown[key];
                            if (typeof val === 'number' && !isNaN(val)) {
                                total += val;
                            }
                        }
                        return total;
                    };

                    let fare = 0;
                    let breakdown: {
                      basePrice?: number;
                      airportFee?: number;
                      extraDistanceFare?: number;
                      extraKmCharge?: number;
                      extraHourCharge?: number;
                      priceExtraKm?: number;
                      priceExtraHour?: number;
                    } = firstCabFareData.breakdown || {};

                    // For outstation one-way, use totalPrice directly (same as CabList does)
                    if (tripDetails.tripType === 'outstation' && (tripDetails.tripMode === 'one-way' || !tripDetails.tripMode)) {
                        fare = firstCabFareData.totalPrice;
                        // Ensure breakdown matches the totalPrice - use breakdown from fareData
                        breakdown = firstCabFareData.breakdown || {};
                    } else {
                        fare = sumBreakdown(firstCabFareData.breakdown) || firstCabFareData.totalPrice;
                    }

                    if (tripDetails.tripType === 'local') {
                        const localPackageLimits: Record<string, { km: number; hours: number }> = {
                            '4hrs-40km': { km: 40, hours: 4 },
                            '8hrs-80km': { km: 80, hours: 8 },
                            '10hrs-100km': { km: 100, hours: 10 },
                        };
                        const selectedPackage = localPackageLimits[tripDetails.package || '8hrs-80km'] || { km: 80, hours: 8 };
                        const extraKm = Math.max(0, distance - selectedPackage.km);
                        const extraKmCharge = breakdown.extraKmCharge || breakdown.priceExtraKm || 0;
                        const extraKmFare = extraKm * extraKmCharge;
                        fare = (breakdown.basePrice || fare) + extraKmFare;
                    }

                    if (tripDetails.tripType === 'airport') {
                        const base = breakdown.basePrice || 0;
                        const airportFee = breakdown.airportFee || 0;
                        const extra = breakdown.extraDistanceFare || 0;
                        fare = base + airportFee + extra;
                    }

                    if (fare > 0) {
                        console.log('Auto-selecting first cab:', {
                            cab: firstCab.name,
                            fare,
                            breakdown,
                            tripType: tripDetails.tripType,
                            tripMode: tripDetails.tripMode,
                            distance
                        });
                        handleActualCabSelect(firstCab, fare, breakdown);
                        setHasAutoSelected(true);
                    }
                }
            }
        };

        autoSelectFirstCab();
    }, [firstCab, firstCabFareData, isFirstCabFareLoading, distance, selectedCab, hasAutoSelected, tripDetails]);

    // Reset auto-selection when trip details change
    useEffect(() => {
        if (hasAutoSelected) {
            // If trip details change, reset to allow re-auto-selection
            const newTripKey = `${tripDetails.from}-${tripDetails.to}-${tripDetails.tripType}-${tripDetails.tripMode}-${distance}`;
            const storedKey = sessionStorage.getItem('lastAutoSelectedTrip');
            if (storedKey !== newTripKey) {
                setHasAutoSelected(false);
                setSelectedCab(null);
                setFare(null);
                setFareBreakdown(null);
                sessionStorage.setItem('lastAutoSelectedTrip', newTripKey);
            }
        }
    }, [tripDetails.from, tripDetails.to, tripDetails.tripType, tripDetails.tripMode, distance, hasAutoSelected]);

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
        }
        // Reset selection when trip details change
        setSelectedCab(null);
        setFare(null);
        setFareBreakdown(null);
        setHasAutoSelected(false);
    };

    const handleActualCabSelect = (cab: CabType, calculatedFare: number, breakdown?: any) => {
        console.log('handleActualCabSelect called:', {
            cab: cab.name,
            calculatedFare,
            breakdown,
            tripType: tripDetails.tripType,
            tripMode: tripDetails.tripMode
        });
        setBookNowFare(null);
        if (
            tripDetails.tripType === 'outstation' &&
            tripDetails.tripMode === 'round-trip' &&
            breakdown && breakdown.totalFare
        ) {
            console.log('Setting round-trip fare:', breakdown.totalFare);
            setSelectedCab(cab);
            setFare(breakdown.totalFare);
            setFareBreakdown(breakdown);
        } else {
            console.log('Setting fare:', calculatedFare, 'with breakdown:', breakdown);
            setSelectedCab(cab);
            setFare(calculatedFare);
            setFareBreakdown(breakdown);
        }
        // Don't automatically go to step 2 when auto-selecting - let user stay on step 1 to see the summary
        // setStep(2);
        // window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
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
            <Card className="p-6 md:p-8 mb-8 shadow-none border-0 ">
                <TabTripSelector
                    selectedTab={tripDetails.tripType}
                    tripMode={tripDetails.tripMode}
                    onTabChange={(tab) => {
                      if (tab === 'custom') return;
                      setTripDetails((prev) => ({ ...prev, tripType: tab }));
                    }}
                    onTripModeChange={(mode) => setTripDetails(prev => ({ ...prev, tripMode: mode }))}
                />
            </Card>

            <div className="grid lg:grid-cols-3 gap-8 items-start py-8">
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
                            hideInclusionsExclusions={true}
                            breakdown={fareBreakdown}
                        />
                    )}
                </div>
            </div>

            {step === 2 && selectedCab && fare !== null && (
                <div className="py-12">
                    <GuestDetailsForm
                        onSubmit={handleGuestDetailsSubmit}
                        onBack={handleBack}
                        totalPrice={bookNowTotal}
                    />
                </div>
            )}

            {step === 3 && selectedCab && tripDetails && guestDetails && fare !== null && (
                <div className="py-12">
                    <PaymentGateway
                        totalAmount={bookNowTotal}
                        onPaymentComplete={() => {}}
                    />
                </div>
            )}
        </>
    );
};
