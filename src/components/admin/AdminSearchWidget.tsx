import React, { useState, useEffect } from 'react';
import { LocationInput } from '@/components/LocationInput';
import { DateTimePicker } from '@/components/DateTimePicker';
import { TabTripSelector } from '@/components/TabTripSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Location } from '@/lib/locationData';
import { TripType, TripMode, ensureCustomerTripType } from '@/lib/tripTypes';
import { convertToApiLocation } from '@/lib/locationUtils';
import { calculateDistanceMatrix } from '@/lib/distanceService';
import { ChevronRight, Search } from 'lucide-react';

const hourlyPackageOptions = [
  { value: "8hrs-80km", label: "8 Hours / 80 KM" },
  { value: "10hrs-100km", label: "10 Hours / 100 KM" }
];

interface AdminSearchWidgetProps {
  onSearch: (searchData: {
    pickupLocation: Location | null;
    dropLocation: Location | null;
    pickupDate: Date;
    returnDate: Date | null;
    tripType: TripType;
    tripMode: TripMode;
    hourlyPackage: string;
    distance: number;
  }) => void;
  initialData?: {
    pickupLocation?: Location | null;
    dropLocation?: Location | null;
    pickupDate?: Date;
    returnDate?: Date | null;
    tripType?: TripType;
    tripMode?: TripMode;
    hourlyPackage?: string;
  };
  isLoading?: boolean;
}

export function AdminSearchWidget({ onSearch, initialData, isLoading = false }: AdminSearchWidgetProps) {
  // Trip details
  const [pickupLocation, setPickupLocation] = useState<Location | null>(initialData?.pickupLocation || null);
  const [dropLocation, setDropLocation] = useState<Location | null>(initialData?.dropLocation || null);
  const [pickupDate, setPickupDate] = useState<Date>(initialData?.pickupDate || new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(initialData?.returnDate || null);
  const [tripType, setTripType] = useState<TripType>(initialData?.tripType || 'outstation');
  const [tripMode, setTripMode] = useState<TripMode>(initialData?.tripMode || 'one-way');
  const [hourlyPackage, setHourlyPackage] = useState(initialData?.hourlyPackage || hourlyPackageOptions[0].value);
  
  // Distance calculation
  const [distance, setDistance] = useState(0);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Handle location changes
  const handlePickupLocationChange = (location: Location | null) => {
    setPickupLocation(location);
    setValidationError(null);
  };

  const handleDropLocationChange = (location: Location | null) => {
    setDropLocation(location);
    setValidationError(null);
  };

  // Handle trip type changes
  const handleTabChange = (type: TripType) => {
    setTripType(type);
    setDistance(0);
    
    // Clear drop location for local trips
    if (type === 'local') {
      setDropLocation(null);
    }
  };

  // Calculate distance when locations change
  useEffect(() => {
    const fetchDistance = async () => {
      if (tripType === 'local') {
        // For local trips, use the package distance
        const selectedPackage = hourlyPackageOptions.find((pkg) => pkg.value === hourlyPackage);
        if (selectedPackage) {
          const kmMatch = selectedPackage.label.match(/(\d+)\s*KM/);
          if (kmMatch) {
            setDistance(parseInt(kmMatch[1]));
          }
        }
        return;
      }

      if (pickupLocation && dropLocation) {
        setIsCalculatingDistance(true);
        try {
          const result = await calculateDistanceMatrix(pickupLocation, dropLocation);
          if (result.status === 'OK') {
            setDistance(result.distance);
          } else {
            setDistance(0);
          }
        } catch (error) {
          console.error('Error calculating distance:', error);
          setDistance(0);
        } finally {
          setIsCalculatingDistance(false);
        }
      } else {
        setDistance(0);
      }
    };

    fetchDistance();
  }, [pickupLocation, dropLocation, tripType, hourlyPackage]);

  // Validate form before search
  const validateForm = () => {
    if (!pickupLocation) {
      setValidationError('Pickup location is required');
      return false;
    }

    if ((tripType === 'outstation' || tripType === 'airport') && !dropLocation) {
      setValidationError('Drop location is required for outstation and airport trips');
      return false;
    }

    if (tripMode === 'round-trip' && !returnDate) {
      setValidationError('Return date is required for round trips');
      return false;
    }

    setValidationError(null);
    return true;
  };

  // Handle search
  const handleSearch = () => {
    if (!validateForm()) {
      return;
    }

    onSearch({
      pickupLocation,
      dropLocation,
      pickupDate,
      returnDate,
      tripType,
      tripMode,
      hourlyPackage,
      distance
    });
  };

  // Check if form is valid for search button
  const isFormValid = pickupLocation && 
    ((tripType === 'outstation' || tripType === 'airport') ? dropLocation : true) &&
    (tripMode === 'round-trip' ? returnDate : true);

  return (
    <Card className="w-full bg-white border border-gray-200 rounded-2xl shadow-lg p-6">
      <div className="space-y-6">
        {/* Trip Type Selector */}
        <div className="w-full">
          <TabTripSelector
            selectedTab={ensureCustomerTripType(tripType)}
            tripMode={tripMode}
            onTabChange={handleTabChange}
            onTripModeChange={setTripMode}
          />
        </div>

        {/* Main Booking Container */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-0">
          <div className="flex flex-col lg:flex-row items-stretch gap-0">
            {/* From Location */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 p-4">
                <div className="flex-1 min-w-0">
                  <LocationInput
                    label="Pickup location"
                    placeholder="Enter pickup location"
                    value={pickupLocation ? convertToApiLocation(pickupLocation) : undefined}
                    onLocationChange={handlePickupLocationChange}
                    isPickupLocation={true}
                    tripType={tripType}
                    className="border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 placeholder:text-gray-400 focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            {(tripType === 'outstation' || tripType === 'airport') && (
              <div className="hidden lg:block w-px bg-gray-200 mx-2"></div>
            )}

            {/* To Location */}
            {(tripType === 'outstation' || tripType === 'airport') && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 p-4">
                  <div className="flex-1 min-w-0">
                    <LocationInput
                      label="Drop location"
                      placeholder="Enter drop location"
                      value={dropLocation ? convertToApiLocation(dropLocation) : undefined}
                      onLocationChange={handleDropLocationChange}
                      isPickupLocation={false}
                      tripType={tripType}
                      className="border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 placeholder:text-gray-400 focus:ring-0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Package Selection for Local */}
            {tripType === 'local' && (
              <>
                <div className="hidden lg:block w-px bg-gray-200 mx-2"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center relative w-full h-full p-4">
                    <Select value={hourlyPackage} onValueChange={setHourlyPackage}>
                      <SelectTrigger className="h-[3.5rem] pl-4 text-[1rem] lg:text-[1.2rem] flex items-center border border-gray-300 bg-white font-semibold">
                        <SelectValue placeholder="Package" />
                      </SelectTrigger>
                      <SelectContent>
                        {hourlyPackageOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Vertical Divider */}
            <div className="hidden lg:block w-px bg-gray-200 mx-2"></div>

            {/* Date Picker */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 p-4">
                <div className="flex-1 min-w-0">
                  <DateTimePicker
                    date={pickupDate}
                    onDateChange={setPickupDate}
                    minDate={new Date()}
                    className="h-auto border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Return Date for Round Trip */}
            {tripType === 'outstation' && tripMode === 'round-trip' && (
              <>
                <div className="hidden lg:block w-px bg-gray-200 mx-2"></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 p-4">
                    <div className="flex-1 min-w-0">
                      <DateTimePicker
                        date={returnDate}
                        onDateChange={setReturnDate}
                        minDate={pickupDate}
                        className="h-auto border-0 bg-transparent p-0 text-[1rem] lg:text-[1.2rem] font-semibold text-gray-900 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Error Message */}
          {validationError && (
            <div className="text-red-600 text-sm mt-3 px-4 py-2 bg-red-50 rounded-lg">{validationError}</div>
          )}
        </div>

        {/* Loading State */}
        {isCalculatingDistance && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
            <p className="text-gray-600 font-medium">Calculating route distance...</p>
          </div>
        )}

        {/* Trip Summary */}
        {pickupLocation && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-gray-900">
                {pickupLocation.name}
              </span>
              {(tripType === 'outstation' || tripType === 'airport') && dropLocation && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-900">
                    {dropLocation.name}
                  </span>
                </>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {pickupDate.toLocaleString(undefined, { 
                weekday: 'short', 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
              {tripMode === 'round-trip' && returnDate && (
                <span className="ml-2">
                  • Return: {returnDate.toLocaleString(undefined, { 
                    day: '2-digit', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </div>
            {distance > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                Distance: {Math.round(distance)} km
              </div>
            )}
          </div>
        )}

        {/* Search Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSearch}
            disabled={!isFormValid || isCalculatingDistance || isLoading}
            className="w-full sm:w-[300px] bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-base font-semibold rounded-full shadow-lg flex items-center justify-center transition-all duration-300"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                <span>Searching...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <Search className="w-5 h-5 mr-3" />
                Search Cabs
              </div>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

