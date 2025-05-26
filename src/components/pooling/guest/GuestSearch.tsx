
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search, MapPin, Users, Clock, DollarSign } from 'lucide-react';
import { RideSearchFilters } from '@/types/poolingGuest';
import { POOLING_LOCATIONS } from '@/lib/poolingData';

interface GuestSearchProps {
  onSearch: (filters: RideSearchFilters) => void;
  isLoading?: boolean;
}

export const GuestSearch: React.FC<GuestSearchProps> = ({ onSearch, isLoading }) => {
  const [filters, setFilters] = useState<RideSearchFilters>({
    type: 'car',
    from: '',
    to: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    passengers: 1,
    sortBy: 'time'
  });
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filters.from || !filters.to) {
      return;
    }
    onSearch(filters);
  };

  const updateFilter = (key: keyof RideSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Find Your Perfect Ride
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSearch} className="space-y-6">
          {/* Ride Type Tabs */}
          <Tabs value={filters.type} onValueChange={(value) => updateFilter('type', value)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="car">Car Pool</TabsTrigger>
              <TabsTrigger value="bus">Bus</TabsTrigger>
              <TabsTrigger value="shared-taxi">Shared Taxi</TabsTrigger>
            </TabsList>

            <TabsContent value="car" className="mt-4">
              <p className="text-sm text-gray-600">Share rides with fellow travelers in private cars</p>
            </TabsContent>
            <TabsContent value="bus" className="mt-4">
              <p className="text-sm text-gray-600">Book seats on scheduled bus routes</p>
            </TabsContent>
            <TabsContent value="shared-taxi" className="mt-4">
              <p className="text-sm text-gray-600">Join others for door-to-door taxi rides</p>
            </TabsContent>
          </Tabs>

          {/* Main Search Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                From
              </Label>
              <Select value={filters.from} onValueChange={(value) => updateFilter('from', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select departure city" />
                </SelectTrigger>
                <SelectContent>
                  {POOLING_LOCATIONS.map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="to" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                To
              </Label>
              <Select value={filters.to} onValueChange={(value) => updateFilter('to', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination city" />
                </SelectTrigger>
                <SelectContent>
                  {POOLING_LOCATIONS.filter(loc => loc.name !== filters.from).map((location) => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        setSelectedDate(date);
                        updateFilter('date', format(date, 'yyyy-MM-dd'));
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Passengers
              </Label>
              <Select value={filters.passengers.toString()} onValueChange={(value) => updateFilter('passengers', parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'passenger' : 'passengers'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
            </Button>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Max Price (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="Enter max price"
                  value={filters.maxPrice || ''}
                  onChange={(e) => updateFilter('maxPrice', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
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

              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Time Range
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="time"
                    placeholder="From"
                    onChange={(e) => updateFilter('departureTimeRange', {
                      ...filters.departureTimeRange,
                      start: e.target.value
                    })}
                  />
                  <Input
                    type="time"
                    placeholder="To"
                    onChange={(e) => updateFilter('departureTimeRange', {
                      ...filters.departureTimeRange,
                      end: e.target.value
                    })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Search Button */}
          <Button
            type="submit"
            className="w-full md:w-auto"
            disabled={isLoading || !filters.from || !filters.to}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Search Rides
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
