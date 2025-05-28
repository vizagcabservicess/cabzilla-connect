
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Bus, Users, Search } from 'lucide-react';
import { PoolingSearchRequest, PoolingType } from '@/types/pooling';
import { FixedLocationSelector } from './FixedLocationSelector';

interface EnhancedPoolingSearchProps {
  onSearch: (params: PoolingSearchRequest) => void;
  isLoading?: boolean;
}

export function EnhancedPoolingSearch({ onSearch, isLoading }: EnhancedPoolingSearchProps) {
  const [activeType, setActiveType] = useState<PoolingType>('car');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [date, setDate] = useState('');
  const [passengers, setPassengers] = useState(1);
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<'price' | 'time' | 'rating'>('time');

  // Get tomorrow's date as minimum date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSearch = () => {
    if (!fromLocation || !toLocation || !date) {
      return;
    }

    const searchParams: PoolingSearchRequest = {
      type: activeType,
      from: fromLocation,
      to: toLocation,
      date,
      passengers,
      maxPrice,
      sortBy
    };

    onSearch(searchParams);
  };

  const getTypeIcon = (type: PoolingType) => {
    switch (type) {
      case 'car': return <Car className="h-5 w-5" />;
      case 'bus': return <Bus className="h-5 w-5" />;
      case 'shared-taxi': return <Users className="h-5 w-5" />;
    }
  };

  const getTypeDescription = (type: PoolingType) => {
    switch (type) {
      case 'car': return 'Share rides with other passengers';
      case 'bus': return 'Book seats on scheduled bus routes';
      case 'shared-taxi': return 'Join others for door-to-door rides';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Travel Mode Tabs */}
          <Tabs value={activeType} onValueChange={(value) => setActiveType(value as PoolingType)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="car" className="flex items-center gap-2">
                {getTypeIcon('car')}
                Car Pool
              </TabsTrigger>
              <TabsTrigger value="bus" className="flex items-center gap-2">
                {getTypeIcon('bus')}
                Bus
              </TabsTrigger>
              <TabsTrigger value="shared-taxi" className="flex items-center gap-2">
                {getTypeIcon('shared-taxi')}
                Shared Taxi
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeType} className="mt-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-2">
                  {activeType === 'car' && 'Car Pool'}
                  {activeType === 'bus' && 'Bus Travel'}
                  {activeType === 'shared-taxi' && 'Shared Taxi'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {getTypeDescription(activeType)}
                </p>
              </div>

              {/* Search Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <FixedLocationSelector
                    label="From"
                    placeholder="Select departure city"
                    value={fromLocation}
                    onChange={setFromLocation}
                    excludeLocation={toLocation}
                  />
                </div>

                <div className="space-y-2">
                  <FixedLocationSelector
                    label="To"
                    placeholder="Select destination"
                    value={toLocation}
                    onChange={setToLocation}
                    excludeLocation={fromLocation}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={minDate}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Passengers</Label>
                  <Select value={passengers.toString()} onValueChange={(value) => setPassengers(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'Passenger' : 'Passengers'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={handleSearch} 
                    className="w-full"
                    disabled={isLoading || !fromLocation || !toLocation || !date}
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Search Rides
                  </Button>
                </div>
              </div>

              {/* Advanced Filters */}
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max Price (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Enter maximum price"
                      value={maxPrice || ''}
                      onChange={(e) => setMaxPrice(e.target.value ? parseInt(e.target.value) : undefined)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sort By</Label>
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'price' | 'time' | 'rating')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="time">Departure Time</SelectItem>
                        <SelectItem value="price">Price (Low to High)</SelectItem>
                        <SelectItem value="rating">Provider Rating</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
