import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RadioGroupTripMode } from '@/components/RadioGroupTripMode';
import { LocationInput } from '@/components/LocationInput';
import { Calendar, MapPin, Search, ArrowUpDown } from 'lucide-react';
import { TripMode } from '@/lib/tripTypes';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/location';
import { toast } from 'sonner';

export function OutstationOnlyWidget() {
  const navigate = useNavigate();
  const { isLoaded } = useGoogleMaps();
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [toLocation, setToLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pickupTime, setPickupTime] = useState('09:00');
  const [returnTime, setReturnTime] = useState('18:00');

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minReturnDate = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    if (!pickupDate) {
      setPickupDate(minReturnDate);
    }
  }, [minReturnDate]);

  useEffect(() => {
    if (tripMode === 'one-way') {
      setReturnDate('');
      setReturnTime('18:00');
    } else if (tripMode === 'round-trip' && !returnDate) {
      const returnDateObj = new Date(pickupDate || minReturnDate);
      returnDateObj.setDate(returnDateObj.getDate() + 1);
      setReturnDate(returnDateObj.toISOString().split('T')[0]);
    }
  }, [tripMode, pickupDate, minReturnDate]);

  const handleFromLocationChange = (location: Location) => {
    console.log('From location changed:', location);
    setFromLocation(location);
  };

  const handleToLocationChange = (location: Location) => {
    console.log('To location changed:', location);
    setToLocation(location);
  };

  const swapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  const handleSearch = () => {
    if (!fromLocation?.name || !toLocation?.name) {
      toast.error('Please select both pickup and drop locations');
      return;
    }

    if (!pickupDate || !pickupTime) {
      toast.error('Please select pickup date and time');
      return;
    }

    if (tripMode === 'round-trip' && (!returnDate || !returnTime)) {
      toast.error('Please select return date and time for round trip');
      return;
    }

    const searchParams = new URLSearchParams({
      tripType: 'outstation',
      from: fromLocation.name,
      to: toLocation.name,
      date: pickupDate,
      time: pickupTime,
      ...(tripMode === 'round-trip' && { 
        returnDate, 
        returnTime 
      }),
    });

    navigate(`/cabs?${searchParams.toString()}`);
  };

  return (
    <div className="w-full max-w-md mx-auto md:max-w-none">
      {/* Mobile RedBus-inspired Design */}
      <div className="block md:hidden bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
          <h2 className="text-white text-xl font-semibold">Cab Booking</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Trip Mode Selection */}
          <div className="flex bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setTripMode('one-way')}
              className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all ${
                tripMode === 'one-way'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              One Way
            </button>
            <button
              onClick={() => setTripMode('round-trip')}
              className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all ${
                tripMode === 'round-trip'
                  ? 'bg-white text-red-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Round Trip
            </button>
          </div>

          {/* Location Inputs */}
          <div className="space-y-3">
            <div className="relative">
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-medium block mb-1">From</label>
                    {isLoaded ? (
                      <LocationInput
                        placeholder="Pickup location"
                        value={fromLocation?.name || ''}
                        onChange={() => {}}
                        onLocationChange={handleFromLocationChange}
                        isPickupLocation={true}
                        className="border-0 p-0 bg-transparent text-base font-medium focus:ring-0"
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder="Pickup location"
                        className="w-full border-0 p-0 bg-transparent text-base font-medium focus:ring-0 focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Swap Button */}
              <button
                onClick={swapLocations}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-white border-2 border-gray-200 rounded-full p-2 shadow-sm hover:shadow-md transition-all"
              >
                <ArrowUpDown className="h-4 w-4 text-gray-600" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 font-medium block mb-1">To</label>
                  {isLoaded ? (
                    <LocationInput
                      placeholder="Drop location"
                      value={toLocation?.name || ''}
                      onChange={() => {}}
                      onLocationChange={handleToLocationChange}
                      isPickupLocation={false}
                      className="border-0 p-0 bg-transparent text-base font-medium focus:ring-0"
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder="Drop location"
                      className="w-full border-0 p-0 bg-transparent text-base font-medium focus:ring-0 focus:outline-none"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Date and Time Selection */}
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <label className="text-xs text-gray-500 font-medium block mb-1">Date of Journey</label>
                  <div className="flex items-center justify-between">
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      min={today}
                      className="border-0 p-0 bg-transparent text-base font-medium focus:ring-0 focus:outline-none"
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPickupDate(today)}
                        className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setPickupDate(minReturnDate)}
                        className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-medium"
                      >
                        Tomorrow
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <label className="text-xs text-gray-500 font-medium block mb-2">Pickup Time</label>
              <input
                type="time"
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full border-0 p-0 bg-transparent text-base font-medium focus:ring-0 focus:outline-none"
              />
            </div>

            {tripMode === 'round-trip' && (
              <>
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <label className="text-xs text-gray-500 font-medium block mb-2">Return Date</label>
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    min={pickupDate || minReturnDate}
                    className="w-full border-0 p-0 bg-transparent text-base font-medium focus:ring-0 focus:outline-none"
                  />
                </div>

                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <label className="text-xs text-gray-500 font-medium block mb-2">Return Time</label>
                  <input
                    type="time"
                    value={returnTime}
                    onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full border-0 p-0 bg-transparent text-base font-medium focus:ring-0 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* Search Button */}
          <Button
            onClick={handleSearch}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 rounded-xl text-lg font-semibold shadow-lg transition-all transform active:scale-95"
          >
            <Search className="mr-2 h-5 w-5" />
            Search Cabs
          </Button>
        </div>
      </div>

      {/* Desktop Version - Keep Existing Design */}
      <div className="hidden md:block bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
        {/* Trip Mode Selection */}
        <RadioGroupTripMode 
          value={tripMode} 
          onChange={setTripMode}
          className="mb-6"
        />

        {/* Location Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              From
            </label>
            {isLoaded ? (
              <LocationInput
                placeholder="Pickup location"
                value={fromLocation?.name || ''}
                onChange={() => {}}
                onLocationChange={handleFromLocationChange}
                isPickupLocation={true}
              />
            ) : (
              <input
                type="text"
                placeholder="Pickup location"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              To
            </label>
            {isLoaded ? (
              <LocationInput
                placeholder="Drop location"
                value={toLocation?.name || ''}
                onChange={() => {}}
                onLocationChange={handleToLocationChange}
                isPickupLocation={false}
              />
            ) : (
              <input
                type="text"
                placeholder="Drop location"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>
        </div>

        {/* Date and Time Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Pickup Date
            </label>
            <input
              type="date"
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              min={today}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Pickup Time</label>
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Return Date and Time for Round Trip */}
        {tripMode === 'round-trip' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Return Date</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={pickupDate || minReturnDate}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Return Time</label>
              <input
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 text-lg font-semibold rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          <Search className="mr-2 h-5 w-5" />
          Search Cabs
        </Button>
      </div>
    </div>
  );
}
