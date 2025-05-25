
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TripModeSelector } from './TripModeSelector';
import { LocationInput } from './LocationInput';
import { DateTimePicker } from './DateTimePicker';
import { MapPin, Calendar, Clock } from 'lucide-react';

interface HeroProps {
  title?: string;
  subtitle?: string;
  showSearchForm?: boolean;
}

export function Hero({ 
  title = "Your Journey, Our Priority", 
  subtitle = "Comfortable and reliable transportation across Visakhapatnam",
  showSearchForm = true 
}: HeroProps) {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          {title}
        </h1>
        <p className="text-xl md:text-2xl mb-8 opacity-90">
          {subtitle}
        </p>
        
        {showSearchForm && (
          <Card className="max-w-4xl mx-auto mt-8">
            <CardContent className="p-6">
              <div className="mb-6">
                <TripModeSelector />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    From
                  </label>
                  <LocationInput
                    placeholder="Enter pickup location"
                    value=""
                    onLocationChange={() => {}}
                    isPickupLocation={true}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    To
                  </label>
                  <LocationInput
                    placeholder="Enter destination"
                    value=""
                    onLocationChange={() => {}}
                    isPickupLocation={false}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    When
                  </label>
                  <DateTimePicker
                    date={new Date()}
                    onDateChange={() => {}}
                    minDate={new Date()}
                  />
                </div>
              </div>
              
              <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                Search Rides
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
