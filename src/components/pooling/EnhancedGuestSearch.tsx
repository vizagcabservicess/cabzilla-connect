import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Bus, Users, Search, MapPin, Calendar, UserCheck, IndianRupee, SlidersHorizontal } from 'lucide-react';
import { PoolingType } from '@/types/pooling';
import { LocationInput } from '@/components/LocationInput';
import { useGoogleMaps } from '@/providers/GoogleMapsProvider';
import { Location } from '@/types/location';

interface SearchFormData {
  type: PoolingType;
  from: string;
  to: string;
  date: string;
  time: string;
  passengers: number;
  maxPrice?: number;
  sortBy: 'time' | 'price' | 'rating';
}

interface EnhancedGuestSearchProps {
  onSearch: (params: SearchFormData) => void;
  isLoading?: boolean;
  onFromLocationChange?: (location: Location) => void;
  onToLocationChange?: (location: Location) => void;
}

export function EnhancedGuestSearch({ onSearch, isLoading, onFromLocationChange, onToLocationChange }: EnhancedGuestSearchProps) {
  const { isLoaded } = useGoogleMaps();
  const [searchForm, setSearchForm] = useState<SearchFormData>({
    type: 'car',
    from: '',
    to: '',
    date: '',
    time: '',
    passengers: 1,
    sortBy: 'time'
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [fromLocation, setFromLocation] = useState<Location | null>(null);
  const [toLocation, setToLocation] = useState<Location | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSearch = () => {
    if (!searchForm.from || !searchForm.to || !searchForm.date || !searchForm.time) return;
    
    // Track search analytics
    console.log('Search performed:', searchForm);
    
    onSearch(searchForm);
  };

  const handleFromLocationChange = (location: Location) => {
    setFromLocation(location);
    setSearchForm((prev) => ({ ...prev, from: location.name || location.address || "" }));
    if (onFromLocationChange) onFromLocationChange(location);
  };

  const handleToLocationChange = (location: Location) => {
    setToLocation(location);
    setSearchForm((prev) => ({ ...prev, to: location.name || location.address || "" }));
    if (onToLocationChange) onToLocationChange(location);
  };

  const vehicleTypes = [
    { type: 'car' as PoolingType, icon: Car, title: 'Car Pool', desc: 'Share rides with passengers' },
    { type: 'bus' as PoolingType, icon: Bus, title: 'Bus Travel', desc: 'Scheduled bus routes' },
    { type: 'shared-taxi' as PoolingType, icon: Users, title: 'Shared Taxi', desc: 'Door-to-door taxi rides' }
  ];

  const passengerOptions = [1, 2, 3, 4, 5, 6, 7, 8];
  const sortOptions = [
    { value: 'time', label: 'Departure Time' },
    { value: 'price', label: 'Price (Low to High)' },
    { value: 'rating', label: 'Provider Rating' }
  ];

  return (
    <Card className="w-full shadow-lg">
      <CardContent className="p-6">
        <Tabs value={searchForm.type} onValueChange={(value) => setSearchForm({...searchForm, type: value as PoolingType})}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {vehicleTypes.map(({ type, icon: Icon, title }) => (
              <TabsTrigger key={type} value={type} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {title}
              </TabsTrigger>
            ))}
          </TabsList>

          {vehicleTypes.map(({ type, title, desc }) => (
            <TabsContent key={type} value={type}>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                <p className="text-gray-600 text-sm">{desc}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    From
                  </Label>
                  {isLoaded ? (
                    <LocationInput
                      placeholder="Departure city"
                      value={fromLocation && typeof fromLocation === 'object' ? fromLocation.name : searchForm.from}
                      onChange={(value) => {
                        setSearchForm((prev) => ({ ...prev, from: value }));
                      }}
                      onLocationChange={handleFromLocationChange}
                      isPickupLocation={false}
                    />
                  ) : (
                    <Input
                      placeholder="Departure city"
                      value={searchForm.from}
                      onChange={(e) => setSearchForm({...searchForm, from: e.target.value})}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    To
                  </Label>
                  {isLoaded ? (
                    <LocationInput
                      placeholder="Destination city"
                      value={toLocation && typeof toLocation === 'object' ? toLocation.name : searchForm.to}
                      onChange={(value) => {
                        setSearchForm((prev) => ({ ...prev, to: value }));
                      }}
                      onLocationChange={handleToLocationChange}
                    />
                  ) : (
                    <Input
                      placeholder="Destination city"
                      value={searchForm.to}
                      onChange={(e) => setSearchForm({...searchForm, to: e.target.value})}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Date
                  </Label>
                  <Input
                    type="date"
                    value={searchForm.date}
                    onChange={(e) => setSearchForm({...searchForm, date: e.target.value})}
                    min={minDate}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Time
                  </Label>
                  <Input
                    type="time"
                    value={searchForm.time}
                    onChange={(e) => setSearchForm({...searchForm, time: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Passengers
                  </Label>
                  <Select 
                    value={searchForm.passengers.toString()} 
                    onValueChange={(value) => setSearchForm({...searchForm, passengers: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {passengerOptions.map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'Passenger' : 'Passengers'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button 
                    onClick={handleSearch} 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={
                      isLoading ||
                      !searchForm.from?.trim() ||
                      !searchForm.to?.trim() ||
                      !searchForm.date?.trim() ||
                      !searchForm.time?.trim()
                    }
                    aria-label="Search for rides"
                  >
                    {isLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search Rides
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Advanced Filters */}
              <div className="border-t pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="mb-4"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Advanced Filters
                </Button>

                {showAdvancedFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        Max Price per Seat
                      </Label>
                      <Input
                        type="number"
                        placeholder="Enter maximum price"
                        value={searchForm.maxPrice || ''}
                        onChange={(e) => setSearchForm({
                          ...searchForm, 
                          maxPrice: e.target.value ? parseFloat(e.target.value) : undefined
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Sort By</Label>
                      <Select 
                        value={searchForm.sortBy} 
                        onValueChange={(value: 'time' | 'price' | 'rating') => 
                          setSearchForm({...searchForm, sortBy: value})
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sortOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
