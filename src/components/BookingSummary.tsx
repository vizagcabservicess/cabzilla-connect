
import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Calendar, MapPin, Truck, User, Clock, Info } from "lucide-react";
import {
  Location,
  formatTravelTime,
} from "@/lib/locationData";
import { formatPrice } from "@/lib/cabData";
import { CabType } from "@/types/cab";
import { TripType, TripMode } from "@/lib/tripTypes";
import { hourlyPackages } from "@/lib/packageData";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface BookingSummaryProps {
  pickupLocation?: Location | null;
  dropLocation?: Location | null;
  pickupDate?: Date | undefined;
  returnDate?: Date | null | undefined;
  selectedCab?: CabType | null;
  distance: number;
  tripType: TripType;
  tripMode: string;
  totalPrice?: number;
  hourlyPackage?: string;
  className?: string;
  isReviewPage?: boolean;
  customTitle?: string;
  isShortVersion?: boolean;
  isPanel?: boolean;
}

interface FareBreakdown {
  baseFare: number;
  extraDistanceFare: number;
  driverAllowance: number;
  nightHalt: number;
  gst: number;
  extraKmCharge: number;
  packageKm: number;
  discount: number;
  surcharge: number;
  nightCharge: number;
  earlyMorningCharge: number;
}

// Helper function to calculate and format fare breakdown components
const getFareBreakdown = (
  tripType: TripType,
  tripMode: string,
  distance: number,
  basePrice: number,
  totalPrice: number,
  pricePerKm?: number,
  hourlyPackage?: string
): FareBreakdown => {
  // Default values
  let breakdown: FareBreakdown = {
    baseFare: basePrice || 0,
    extraDistanceFare: 0,
    driverAllowance: 0,
    nightHalt: 0,
    gst: 0,
    extraKmCharge: pricePerKm || 0,
    packageKm: 0,
    discount: 0,
    surcharge: 0,
    nightCharge: 0,
    earlyMorningCharge: 0
  };

  // Local trip package details
  if (tripType === "local" && hourlyPackage) {
    const packageDetails = hourlyPackages.find(pkg => pkg.id === hourlyPackage);
    if (packageDetails) {
      breakdown.packageKm = packageDetails.kilometers;
      breakdown.baseFare = packageDetails.basePrice;

      // Calculate extra distance fare if applicable
      if (distance > packageDetails.kilometers && pricePerKm) {
        const extraKm = distance - packageDetails.kilometers;
        breakdown.extraDistanceFare = extraKm * (pricePerKm || 0);
        breakdown.extraKmCharge = pricePerKm;
      }
    }
  }

  // Outstation trip specific breakdown
  if (tripType === "outstation") {
    const isRoundTrip = tripMode === "round-trip";
    const driverDailyAllowance = 250;
    const nightHaltCharge = 500;

    breakdown.driverAllowance = driverDailyAllowance;
    
    if (isRoundTrip) {
      breakdown.nightHalt = nightHaltCharge;
    }

    // For outstation, apply reasonable base + per km formulas
    if (pricePerKm) {
      breakdown.extraKmCharge = pricePerKm;
      
      // For estimation, assume base fare covers ~300km
      const coveredKm = 300;
      if (distance > coveredKm) {
        breakdown.extraDistanceFare = (distance - coveredKm) * pricePerKm;
      }
    }
  }

  // Airport trip specific breakdown
  if (tripType === "airport") {
    // Airport trips may have fixed rates or base + distance model
    if (pricePerKm && distance > 0) {
      breakdown.extraKmCharge = pricePerKm;
      // For airports - base fare typically covers a shorter distance
      const airportBaseCoverage = 15; // 15 km base coverage
      if (distance > airportBaseCoverage) {
        breakdown.extraDistanceFare = (distance - airportBaseCoverage) * pricePerKm;
      }
    }
  }

  // Calculate GST (5% is typical for cabs)
  breakdown.gst = Math.round(totalPrice * 0.05);

  return breakdown;
};

export function BookingSummary({
  pickupLocation,
  dropLocation,
  pickupDate,
  returnDate,
  selectedCab,
  distance,
  tripType,
  tripMode,
  totalPrice = 0,
  hourlyPackage,
  className,
  isReviewPage = false,
  customTitle,
  isShortVersion = false,
  isPanel = false,
}: BookingSummaryProps) {
  const [formattedPickupDate, setFormattedPickupDate] = useState<string>("");
  const [formattedReturnDate, setFormattedReturnDate] = useState<string>("");
  const [farePrice, setFarePrice] = useState<number>(totalPrice || 0);
  const previousPriceRef = useRef(totalPrice);
  const cabUpdateTimeRef = useRef<number | null>(null);
  const isMobile = useIsMobile();
  
  // Calculate fare breakdown
  const breakdown = getFareBreakdown(
    tripType, 
    tripMode, 
    distance, 
    selectedCab?.price || 0,
    totalPrice || 0,
    selectedCab?.pricePerKm,
    hourlyPackage
  );

  // Format dates when they change
  useEffect(() => {
    try {
      if (pickupDate) {
        setFormattedPickupDate(format(pickupDate, "EEE, dd MMM yyyy, hh:mm a"));
      }
      if (returnDate) {
        setFormattedReturnDate(format(returnDate, "EEE, dd MMM yyyy, hh:mm a"));
      }
    } catch (error) {
      console.error("Error formatting dates:", error);
    }
  }, [pickupDate, returnDate]);

  // Listen for fare updates
  useEffect(() => {
    const handleFareUpdate = (event: CustomEvent) => {
      try {
        const { cabId, fare, tripType: eventTripType } = event.detail;
        
        // Only update if it matches our current cab and trip type
        if (
          selectedCab && 
          cabId?.toLowerCase() === selectedCab.id?.toLowerCase() &&
          eventTripType === tripType
        ) {
          console.log(`BookingSummary: Received fare update for ${cabId}: ${fare}`);
          cabUpdateTimeRef.current = Date.now();
          
          if (typeof fare === 'number' && fare > 0) {
            setFarePrice(fare);
          }
        }
      } catch (error) {
        console.error("Error handling fare update event:", error);
      }
    };

    window.addEventListener('fare-calculated', handleFareUpdate as EventListener);
    window.addEventListener('cab-selected-with-fare', handleFareUpdate as EventListener);
    
    return () => {
      window.removeEventListener('fare-calculated', handleFareUpdate as EventListener);
      window.removeEventListener('cab-selected-with-fare', handleFareUpdate as EventListener);
    };
  }, [selectedCab, tripType, distance]);

  // Update fare price when props change
  useEffect(() => {
    // Check if the total price from props is different from what we have
    if (typeof totalPrice === 'number' && totalPrice > 0 && totalPrice !== previousPriceRef.current) {
      console.log(`BookingSummary: Updating price from ${previousPriceRef.current} to ${totalPrice}`);
      setFarePrice(totalPrice);
      previousPriceRef.current = totalPrice;
    }
  }, [totalPrice]);

  // Get hourly package name if applicable
  const getHourlyPackageName = () => {
    if (hourlyPackage && tripType === 'local') {
      const pkg = hourlyPackages.find(p => p.id === hourlyPackage);
      return pkg ? pkg.name : hourlyPackage;
    }
    return null;
  };

  // Main component structure
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-lg shadow-sm",
        isPanel && "sticky top-4",
        isMobile ? "p-4" : "p-6",
        className
      )}
      id="booking-summary"
    >
      <h2 className="font-semibold text-xl mb-4">
        {customTitle || "Booking Summary"}
      </h2>

      <div className="space-y-4">
        <div className="border-b pb-4">
          <div className="flex items-start gap-2 mb-3">
            <Calendar className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">TRIP TYPE</p>
              <p className="font-medium capitalize">
                {tripType === 'outstation' ? `${tripType} (${tripMode})` : tripType}
                {tripType === 'local' && ` - ${hourlyPackage}`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 mb-3">
            <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">TOTAL DISTANCE</p>
              <p className="font-medium">{distance} KM</p>
            </div>
          </div>

          <div className="flex items-start gap-2 mb-3">
            <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">PICKUP LOCATION</p>
              <p className="font-medium text-sm">
                {pickupLocation?.name || pickupLocation?.address || "Not specified"}
              </p>
            </div>
          </div>
          
          {(tripType === "outstation" || tripType === "airport") && dropLocation && (
            <div className="flex items-start gap-2 mb-3">
              <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">DROP LOCATION</p>
                <p className="font-medium text-sm">
                  {dropLocation?.name || dropLocation?.address || "Not specified"}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 mb-3">
            <Clock className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-500">PICKUP TIME</p>
              <p className="font-medium text-sm">
                {formattedPickupDate || "Not specified"}
              </p>
            </div>
          </div>

          {tripMode === "round-trip" && returnDate && (
            <div className="flex items-start gap-2 mb-3">
              <Clock className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">RETURN TIME</p>
                <p className="font-medium text-sm">
                  {formattedReturnDate || "Not specified"}
                </p>
              </div>
            </div>
          )}

          {selectedCab && (
            <div className="flex items-start gap-2">
              <Truck className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">CAB TYPE</p>
                <p className="font-medium">
                  {selectedCab.name} ({selectedCab.capacity} Seater)
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-b pb-4">
          <h3 className="font-medium mb-3">Fare Breakdown</h3>

          <div className="space-y-2">
            <div className="flex justify-between items-center mb-2">
              <p className="text-gray-600">
                Base fare
                {tripType === "local" && " (includes " + breakdown.packageKm + " km)"}
              </p>
              <p className="font-medium">₹{formatPrice(breakdown.baseFare)}</p>
            </div>

            {breakdown.extraDistanceFare > 0 && (
              <div className="flex justify-between items-center mb-2 group">
                <div className="flex items-center gap-1">
                  <p className="text-gray-600">Extra distance charges</p>
                  <div className="relative">
                    <Info className="h-4 w-4 text-blue-500 cursor-help" />
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs p-2 rounded w-48 invisible group-hover:visible transition-opacity z-10">
                      {Math.round(breakdown.extraDistanceFare / (breakdown.extraKmCharge || 1))} km × ₹{breakdown.extraKmCharge || 0}/km
                    </div>
                  </div>
                </div>
                <p className="font-medium">₹{formatPrice(breakdown.extraDistanceFare)}</p>
              </div>
            )}

            {tripType === "outstation" && breakdown.driverAllowance > 0 && (
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-600">Driver allowance</p>
                <p className="font-medium">₹{formatPrice(breakdown.driverAllowance)}</p>
              </div>
            )}

            {tripType === "outstation" && tripMode === "round-trip" && breakdown.nightHalt > 0 && (
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-600">Night halt charges</p>
                <p className="font-medium">₹{formatPrice(breakdown.nightHalt)}</p>
              </div>
            )}

            {breakdown.gst > 0 && !isShortVersion && (
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-600">GST (5%)</p>
                <p className="font-medium">₹{formatPrice(breakdown.gst)}</p>
              </div>
            )}

            {breakdown.discount > 0 && (
              <div className="flex justify-between items-center mb-2 text-green-600">
                <p>Discount</p>
                <p className="font-medium">-₹{formatPrice(breakdown.discount)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <p className="font-semibold text-lg">Total Fare</p>
          <p className="font-bold text-xl text-blue-700">₹{formatPrice(farePrice)}</p>
        </div>
      </div>
    </div>
  );
}
