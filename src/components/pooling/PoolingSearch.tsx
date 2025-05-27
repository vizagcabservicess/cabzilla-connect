
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PoolingSearchRequest, RideType } from '@/types/pooling';

interface PoolingSearchProps {
  onSearch: (searchParams: PoolingSearchRequest) => void;
  isLoading?: boolean;
}

export const PoolingSearch: React.FC<PoolingSearchProps> = ({ onSearch, isLoading }) => {
  const [formData, setFormData] = useState({
    fromLocation: '',
    toLocation: '',
    departureDate: '',
    passengers: 1,
    type: undefined as RideType | undefined
  });
  const [selectedDate, setSelectedDate] = useState<Date>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const searchParams: PoolingSearchRequest = {
      fromLocation: formData.fromLocation,
      toLocation: formData.toLocation,
      departureDate: formData.departureDate,
      passengers: formData.passengers,
      type: formData.type
    };

    onSearch(searchParams);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setFormData(prev => ({
        ...prev,
        departureDate: format(date, 'yyyy-MM-dd')
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Find Your Ride
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromLocation">From</Label>
              <Input
                id="fromLocation"
                placeholder="Departure city"
                value={formData.fromLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, fromLocation: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="toLocation">To</Label>
              <Input
                id="toLocation"
                placeholder="Destination city"
                value={formData.toLocation}
                onChange={(e) => setFormData(prev => ({ ...prev, toLocation: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Departure Date</Label>
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
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passengers">Passengers</Label>
              <Input
                id="passengers"
                type="number"
                min="1"
                max="8"
                value={formData.passengers}
                onChange={(e) => setFormData(prev => ({ ...prev, passengers: parseInt(e.target.value) }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as RideType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Car Pool</SelectItem>
                  <SelectItem value="bus">Bus</SelectItem>
                  <SelectItem value="shared-taxi">Shared Taxi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Search className="mr-2 h-4 w-4 animate-spin" />
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
