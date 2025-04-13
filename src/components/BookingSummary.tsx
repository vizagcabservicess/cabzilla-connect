
import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Calendar, ArrowRight, ArrowDown, Car, User, PlusCircle, InfoIcon } from 'lucide-react';
import { formatPrice, shouldShowDriverAllowance } from '@/lib';
import { CabType } from '@/types/cab';
import { Location } from '@/lib/locationData';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { formatTravelTime } from '@/lib/locationData';

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate: Date | undefined;
  returnDate?: Date | undefined;
  selectedCab: CabType | null;
  distance: number;
  travelTime?: number;
  totalPrice: number;
  extraCharges?: Record<string, number>;
  tripType: string;
  tripMode?: string;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  pickupLocation,
  dropLocation,
  pickupDate,
  returnDate,
  selectedCab,
  distance,
  travelTime,
  totalPrice,
  extraCharges = {},
  tripType,
  tripMode = 'one-way'
}) => {
  const { isLoaded } = useGoogleMaps();
  const [baseFare, setBaseFare] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(0);
  const [extraKmCharge, setExtraKmCharge] = useState<number>(0);
  const [nightHaltCharge, setNightHaltCharge] = useState<number>(0);
  const [formattedTravelTime, setFormattedTravelTime] = useState<string>('');
  
  // CRITICAL FIX: Use shouldShowDriverAllowance helper with explicit check
  const showDriverAllowance = shouldShowDriverAllowance(tripType, tripMode);
  
  useEffect(() => {
    if (travelTime) {
      setFormattedTravelTime(formatTravelTime(travelTime));
    }
  }, [travelTime]);
  
  useEffect(() => {
    let basePrice = totalPrice;
    let driverAllowanceAmount = 0;
    
    if (selectedCab) {
      // CRITICAL FIX: Always check tripType first - ensures airport transfers never include driver allowance
      if (tripType === 'airport') {
        // For airport transfers, driver allowance is ALWAYS zero
        driverAllowanceAmount = 0;
        basePrice = totalPrice;
      } else if (tripType === 'local' || tripType === 'outstation') {
        // For local and outstation trips, calculate driver allowance
        driverAllowanceAmount = selectedCab.driverAllowance || 250;
        
        // Ensure driver allowance is not greater than the total price
        if (driverAllowanceAmount > totalPrice) {
          driverAllowanceAmount = Math.max(0, totalPrice - 500); // Keep at least 500 for base fare
        }
        
        basePrice = totalPrice - driverAllowanceAmount;
      }
    }

    if (basePrice < 0) basePrice = 0;
    
    setBaseFare(basePrice);
    setDriverAllowance(driverAllowanceAmount);
    
    if (extraCharges.extraKm) {
      setExtraKmCharge(extraCharges.extraKm);
    }
    
    if (extraCharges.nightHalt) {
      setNightHaltCharge(extraCharges.nightHalt);
    }
  }, [selectedCab, totalPrice, tripType, tripMode, extraCharges]);

  return (
    <Card className="shadow-md">
      <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
        <CardTitle className="text-xl flex items-center justify-between">
          <span>Booking Summary</span>
          {tripType && (
            <Badge variant="outline" className="uppercase bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              {tripType}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5 pb-0">
        {pickupLocation && (
          <div className="mb-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">PICKUP</h3>
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 mt-0.5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-medium">{pickupLocation.name}</p>
                {pickupLocation.address && (
                  <p className="text-sm text-muted-foreground mt-1">{pickupLocation.address}</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {dropLocation && (
          <>
            <div className="flex justify-center my-2">
              {tripMode === 'roundtrip' ? (
                <ArrowDown className="h-6 w-6 text-gray-400" />
              ) : (
                <ArrowRight className="h-6 w-6 text-gray-400" />
              )}
            </div>
            
            <div className="mb-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">DROP-OFF</h3>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-0.5 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-medium">{dropLocation.name}</p>
                  {dropLocation.address && (
                    <p className="text-sm text-muted-foreground mt-1">{dropLocation.address}</p>
                  )}
                  
                  {distance > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      <span>{Math.round(distance)} km</span>
                      {formattedTravelTime && (
                        <>
                          <span className="mx-1">•</span>
                          <span>{formattedTravelTime}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        
        <div className="mb-5">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">PICKUP DATE & TIME</h3>
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 mt-0.5 text-blue-500 flex-shrink-0" />
            <div>
              <p className="font-medium">
                {pickupDate?.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {pickupDate?.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: 'numeric',
                  hour12: true 
                })}
              </p>
            </div>
          </div>
        </div>
        
        {tripMode === 'round-trip' && returnDate && (
          <div className="mb-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">RETURN DATE & TIME</h3>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 mt-0.5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  {returnDate.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {returnDate.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: 'numeric',
                    hour12: true 
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {selectedCab && (
          <div className="mb-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">CAB TYPE</h3>
            <div className="flex items-start gap-3">
              <Car className="h-5 w-5 mt-0.5 text-blue-500 flex-shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{selectedCab.name}</p>
                  <p className="text-sm text-muted-foreground">
                    • {selectedCab.capacity} persons • {selectedCab.luggageCapacity} bags
                  </p>
                </div>
                {selectedCab.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedCab.description}</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-6 pt-5 border-t">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base fare</span>
              <span>{formatPrice(baseFare)}</span>
            </div>
            
            {/* CRITICAL FIX: Double check we never show driver allowance for airport transfers */}
            {showDriverAllowance && driverAllowance > 0 && tripType !== 'airport' && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Driver allowance</span>
                <span>{formatPrice(driverAllowance)}</span>
              </div>
            )}
            
            {extraKmCharge > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Extra km charges</span>
                <span>{formatPrice(extraKmCharge)}</span>
              </div>
            )}
            
            {nightHaltCharge > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Night halt charges</span>
                <span>{formatPrice(nightHaltCharge)}</span>
              </div>
            )}
            
            {Object.entries(extraCharges).map(([key, value]) => {
              if (key === 'extraKm' || key === 'nightHalt') return null;
              if (value <= 0) return null;
              
              return (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                  <span>{formatPrice(value)}</span>
                </div>
              );
            })}
          </div>
          
          <Separator className="my-4" />
          
          <div className="flex justify-between items-center font-semibold text-lg">
            <span>Total Amount</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
          
          <p className="text-xs text-muted-foreground text-right mt-1">
            Includes taxes & fees (Tolls & Permits Extra)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
