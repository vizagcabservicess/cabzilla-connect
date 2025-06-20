import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LocationInput } from './LocationInput';
import { DateTimePicker } from './DateTimePicker';
import { CabOptions } from './CabOptions';
import { TourPackages } from './TourPackages';
import { useSearchParams } from 'react-router-dom';

interface HeroProps {
  onSearch?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onSearch }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('local');
  
  // Check if we're in booking mode and set the appropriate tab
  useEffect(() => {
    const isBooking = searchParams.get('booking');
    const tabParam = searchParams.get('tab');
    
    if (isBooking && tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [pickupDate, setPickupDate] = useState<Date | null>(null);

  const handleSearch = () => {
    if (onSearch) {
      onSearch();
    }
    console.log('Searching for cabs...', pickupLocation, dropLocation, pickupDate);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 opacity-30"></div>
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-blue-900 opacity-10"></div>
      <div className="absolute top-1/4 right-0 w-1/2 h-1/2 bg-blue-500 rounded-full mix-blend-overlay filter blur-2xl opacity-20"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Your Journey, Our Priority
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Book reliable and comfortable taxi services in Visakhapatnam for all your travel needs
          </p>
        </div>

        <Card className="max-w-4xl mx-auto bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="local">Local</TabsTrigger>
                <TabsTrigger value="outstation">Outstation</TabsTrigger>
                <TabsTrigger value="airport">Airport</TabsTrigger>
                <TabsTrigger value="tour">Tours</TabsTrigger>
              </TabsList>

              <TabsContent value="local" className="space-y-4">
                <LocationInput 
                  label="Pickup Location" 
                  value={pickupLocation} 
                  onChange={(e) => setPickupLocation(e.target.value)} 
                />
                <LocationInput 
                  label="Drop Location" 
                  value={dropLocation} 
                  onChange={(e) => setDropLocation(e.target.value)} 
                />
                <DateTimePicker 
                  label="Pickup Date & Time" 
                  selected={pickupDate} 
                  onChange={(date) => setPickupDate(date)} 
                />
                <CabOptions />
                <Button className="w-full" onClick={handleSearch}>
                  Search Local Cabs
                </Button>
              </TabsContent>

              <TabsContent value="outstation" className="space-y-4">
                <LocationInput 
                  label="Pickup Location" 
                  value={pickupLocation} 
                  onChange={(e) => setPickupLocation(e.target.value)} 
                />
                <LocationInput 
                  label="Drop Location" 
                  value={dropLocation} 
                  onChange={(e) => setDropLocation(e.target.value)} 
                />
                <DateTimePicker 
                  label="Pickup Date & Time" 
                  selected={pickupDate} 
                  onChange={(date) => setPickupDate(date)} 
                />
                <CabOptions />
                <Button className="w-full" onClick={handleSearch}>
                  Search Outstation Cabs
                </Button>
              </TabsContent>

              <TabsContent value="airport" className="space-y-4">
                <LocationInput 
                  label="Pickup Location" 
                  value={pickupLocation} 
                  onChange={(e) => setPickupLocation(e.target.value)} 
                />
                <LocationInput 
                  label="Drop Location" 
                  value={dropLocation} 
                  onChange={(e) => setDropLocation(e.target.value)} 
                />
                <DateTimePicker 
                  label="Pickup Date & Time" 
                  selected={pickupDate} 
                  onChange={(date) => setPickupDate(date)} 
                />
                <CabOptions />
                <Button className="w-full" onClick={handleSearch}>
                  Search Airport Cabs
                </Button>
              </TabsContent>

              <TabsContent value="tour" className="space-y-4">
                <TourPackages 
                  selectedTourId={searchParams.get('id')}
                  selectedVehicle={searchParams.get('vehicle')}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
