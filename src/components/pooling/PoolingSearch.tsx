
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, Users, Car, Bus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PoolingType, PoolingSearchRequest } from '@/types/pooling';
import { FixedLocationSelector } from './FixedLocationSelector';
import { getLocationById } from '@/lib/poolingData';

interface PoolingSearchProps {
  onSearch: (searchParams: PoolingSearchRequest) => void;
  isLoading?: boolean;
}

export function PoolingSearch({ onSearch, isLoading }: PoolingSearchProps) {
  const [searchType, setSearchType] = useState<PoolingType>('car');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [date, setDate] = useState<Date>();
  const [passengers, setPassengers] = useState(1);

  const handleSearch = () => {
    if (!fromLocationId || !toLocationId || !date) return;

    const fromLocation = getLocationById(fromLocationId);
    const toLocation = getLocationById(toLocationId);

    if (!fromLocation || !toLocation) return;

    const searchParams: PoolingSearchRequest = {
      type: searchType,
      from: fromLocation.name,
      to: toLocation.name,
      date: format(date, 'yyyy-MM-dd'),
      passengers,
      sortBy: 'time'
    };

    onSearch(searchParams);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Pooling Type Selector */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant={searchType === 'car' ? 'default' : 'outline'}
          onClick={() => setSearchType('car')}
          className="flex items-center space-x-2"
        >
          <Car size={16} />
          <span>Car Pool</span>
        </Button>
        <Button
          variant={searchType === 'bus' ? 'default' : 'outline'}
          onClick={() => setSearchType('bus')}
          className="flex items-center space-x-2"
        >
          <Bus size={16} />
          <span>Bus</span>
        </Button>
        <Button
          variant={searchType === 'shared-taxi' ? 'default' : 'outline'}
          onClick={() => setSearchType('shared-taxi')}
          className="flex items-center space-x-2"
        >
          <Car size={16} />
          <span>Shared Taxi</span>
        </Button>
      </div>

      {/* Search Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* From Location */}
        <FixedLocationSelector
          label="From"
          placeholder="Select departure city"
          value={fromLocationId}
          onChange={setFromLocationId}
          excludeLocation={toLocationId}
        />

        {/* To Location */}
        <FixedLocationSelector
          label="To"
          placeholder="Select destination city"
          value={toLocationId}
          onChange={setToLocationId}
          excludeLocation={fromLocationId}
        />

        {/* Date */}
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Passengers */}
        <div className="space-y-2">
          <Label htmlFor="passengers">Passengers</Label>
          <Select value={passengers.toString()} onValueChange={(value) => setPassengers(parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select passengers" />
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

        {/* Search Button */}
        <div className="flex items-end">
          <Button 
            onClick={handleSearch} 
            disabled={isLoading || !fromLocationId || !toLocationId || !date}
            className="w-full"
          >
            <Search className="mr-2 h-4 w-4" />
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
        </div>
      </div>
    </div>
  );
}
