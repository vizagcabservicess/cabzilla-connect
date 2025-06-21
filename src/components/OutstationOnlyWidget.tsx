
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocationInput } from '@/components/LocationInput';
import { DateTimePicker } from '@/components/DateTimePicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroupTripMode } from '@/components/RadioGroupTripMode';
import { Search, MapPin, Calendar } from 'lucide-react';
import { Location } from '@/types/location';

interface OutstationOnlyWidgetProps {
  initialPickup?: string;
  initialDrop?: string;
  onSearch?: (searchData: any) => void;
  className?: string;
}

export function OutstationOnlyWidget({ 
  initialPickup, 
  initialDrop, 
  onSearch,
  className = ''
}: OutstationOnlyWidgetProps) {
  const navigate = useNavigate();
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupInputValue, setPickupInputValue] = useState(initialPickup || '');
  const [dropInputValue, setDropInputValue] = useState(initialDrop || '');
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [tripMode, setTripMode] = useState<'one-way' | 'round-trip'>('one-way');

  useEffect(() => {
    if (initialPickup) {
      setPickupLocation({
        id: `pickup-${Date.now()}`,
        name: initialPickup,
        address: initialPickup,
        city: "Visakhapatnam",
        state: "Andhra Pradesh",
        lat: 17.6868,
        lng: 83.2185,
        isInVizag: true,
        type: 'other',
        popularityScore: 0
      });
    }
    
    if (initialDrop) {
      setDropLocation({
        id: `drop-${Date.now()}`,
        name: initialDrop,
        address: initialDrop,
        city: initialDrop,
        state: "Andhra Pradesh",
        lat: 17.9784,
        lng: 82.9344,
        isInVizag: false,
        type: 'other',
        popularityScore: 0
      });
    }

    // Auto-trigger search if both locations are prefilled
    if (initialPickup && initialDrop && onSearch) {
      const searchData = {
        pickupLocation: {
          id: `pickup-search-${Date.now()}`,
          name: initialPickup,
          address: initialPickup,
          city: 'Visakhapatnam',
          state: 'Andhra Pradesh',
          lat: 17.6868,
          lng: 83.2185,
          isInVizag: true,
          type: 'other' as const,
          popularityScore: 0,
        },
        dropLocation: {
          id: `drop-search-${Date.now()}`,
          name: initialDrop,
          address: initialDrop,
          city: initialDrop,
          state: 'Andhra Pradesh',
          lat: 17.9784,
          lng: 82.9344,
          isInVizag: false,
          type: 'other' as const,
          popularityScore: 0,
        },
        pickupDate: new Date(),
        returnDate: tripMode === 'round-trip' ? returnDate : undefined,
        tripType: 'outstation',
        tripMode: tripMode
      };
      
      setTimeout(() => {
        onSearch(searchData);
      }, 100);
    }
  }, [initialPickup, initialDrop, onSearch, tripMode, returnDate]);

  const handleSearch = () => {
    if (!pickupLocation || !dropLocation) {
      return;
    }

    const searchData = {
      pickupLocation,
      dropLocation,
      pickupDate,
      returnDate: tripMode === 'round-trip' ? returnDate : undefined,
      tripType: 'outstation',
      tripMode
    };

    if (onSearch) {
      onSearch(searchData);
    } else {
      // Navigate to cabs page with search params
      const params = new URLSearchParams({
        from: pickupLocation.name,
        to: dropLocation.name,
        date: pickupDate.toISOString(),
        type: 'outstation',
        mode: tripMode
      });
      
      if (tripMode === 'round-trip' && returnDate) {
        params.append('returnDate', returnDate.toISOString());
      }
      
      navigate(`/cabs?${params.toString()}`);
    }
  };

  return (
    <Card className={`w-full max-w-4xl mx-auto shadow-lg ${className}`}>
      <CardContent className="p-6">
        <Tabs defaultValue="outstation" className="w-full">
          <TabsList className="grid w-full grid-cols-1 mb-6">
            <TabsTrigger value="outstation" className="text-lg py-3">
              Outstation
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="outstation" className="space-y-6">
            {/* Trip Mode Selection */}
            <div className="flex justify-center">
              <RadioGroupTripMode
                value={tripMode}
                onValueChange={(value) => setTripMode(value as 'one-way' | 'round-trip')}
              />
            </div>

            {/* Location and Date Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  From
                </label>
                <LocationInput
                  placeholder="Pickup location"
                  value={pickupInputValue}
                  onChange={setPickupInputValue}
                  onLocationChange={setPickupLocation}
                  tripType="outstation"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  To
                </label>
                <LocationInput
                  placeholder="Drop location"
                  value={dropInputValue}
                  onChange={setDropInputValue}
                  onLocationChange={setDropLocation}
                  tripType="outstation"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Pickup Date & Time
                </label>
                <DateTimePicker
                  date={pickupDate}
                  onDateChange={setPickupDate}
                />
              </div>
            </div>

            {/* Return Date for Round Trip */}
            {tripMode === 'round-trip' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div></div> {/* Empty space */}
                <div></div> {/* Empty space */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Return Date & Time
                  </label>
                  <DateTimePicker
                    date={returnDate}
                    onDateChange={setReturnDate}
                    minDate={pickupDate}
                  />
                </div>
              </div>
            )}

            {/* Search Button */}
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg rounded-xl"
                disabled={!pickupLocation || !dropLocation}
                size="lg"
              >
                <Search className="mr-2 h-5 w-5" />
                Search Cabs
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
