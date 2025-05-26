
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Calendar, Users, Clock, ArrowRight } from 'lucide-react';
import { LocationInput, Location } from './LocationInput';
import { DateTimePicker } from './DateTimePicker';
import { TripModeSelector } from './TripModeSelector';
import { LocalTripSelector } from './LocalTripSelector';
import { useNavigate } from 'react-router-dom';

export interface HeroProps {
  title: string;
  subtitle: string;
}

type HeroTripMode = 'local' | 'outstation' | 'airport';

export const Hero: React.FC<HeroProps> = ({ title, subtitle }) => {
  const navigate = useNavigate();
  const [tripMode, setTripMode] = useState<HeroTripMode>('local');
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [toLocation, setToLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [passengers, setPassengers] = useState<number>(1);
  const [localTripType, setLocalTripType] = useState<string>('hourly');
  const [isSearching, setIsSearching] = useState(false);

  const handleFromLocationSelect = useCallback((location: Location) => {
    setFromLocation(location);
  }, []);

  const handleToLocationSelect = useCallback((location: Location) => {
    setToLocation(location);
  }, []);

  const handleTripModeChange = useCallback((mode: string) => {
    setTripMode(mode as HeroTripMode);
  }, []);

  const handleSearch = async () => {
    if (!isFormValid()) return;

    setIsSearching(true);
    try {
      const searchParams = {
        tripMode,
        from: fromLocation?.address || '',
        to: toLocation?.address || '',
        pickupDate: pickupDate.toISOString(),
        passengers,
        localTripType: tripMode === 'local' ? localTripType : undefined
      };

      // Navigate to search results
      navigate('/pooling', { state: { searchParams } });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const isFormValid = () => {
    if (tripMode === 'local') {
      return fromLocation && localTripType;
    }
    return fromLocation && toLocation;
  };

  return (
    <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black bg-opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-transparent"></div>
      </div>

      <div className="relative container mx-auto px-4 py-16 lg:py-24">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {title}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Search Form */}
          <Card className="bg-white/95 backdrop-blur-sm text-gray-900 p-6 lg:p-8 rounded-2xl shadow-2xl">
            <div className="space-y-6">
              {/* Trip Mode Selector */}
              <TripModeSelector 
                value={tripMode} 
                onChange={handleTripModeChange}
                options={[
                  { value: 'local', label: 'Local' },
                  { value: 'outstation', label: 'Outstation' },
                  { value: 'airport', label: 'Airport' }
                ]}
              />

              {/* Location Inputs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                    From
                  </label>
                  <LocationInput
                    value={fromLocation?.address || ''}
                    onChange={handleFromLocationSelect}
                    placeholder="Enter pickup location"
                  />
                </div>

                {tripMode !== 'local' && (
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-green-600" />
                      To
                    </label>
                    <LocationInput
                      value={toLocation?.address || ''}
                      onChange={handleToLocationSelect}
                      placeholder="Enter destination"
                    />
                  </div>
                )}
              </div>

              {/* Local Trip Options */}
              {tripMode === 'local' && (
                <LocalTripSelector
                  selectedType={localTripType}
                  onTypeChange={setLocalTripType}
                />
              )}

              {/* Date and Passengers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                    Pickup Date & Time
                  </label>
                  <DateTimePicker
                    date={pickupDate}
                    onDateChange={setPickupDate}
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Users className="w-4 h-4 mr-2 text-blue-600" />
                    Passengers
                  </label>
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>{num} Passenger{num > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <Button 
                onClick={handleSearch}
                disabled={!isFormValid() || isSearching}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isSearching ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Searching...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    Search Rides
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </div>
                )}
              </Button>
            </div>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-center">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">24/7 Service</h3>
              <p className="text-blue-100">Available round the clock for all your travel needs</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Verified Drivers</h3>
              <p className="text-blue-100">All our drivers are verified and experienced</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Tracking</h3>
              <p className="text-blue-100">Track your ride in real-time for peace of mind</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
