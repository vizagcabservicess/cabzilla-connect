
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Bus, Users, Search, MapPin, Calendar, UserCheck } from 'lucide-react';
import { PoolingType } from '@/types/pooling';

interface SearchFormData {
  type: PoolingType;
  from: string;
  to: string;
  date: string;
  passengers: number;
  maxPrice?: number;
  sortBy: 'time' | 'price' | 'rating';
}

interface EnhancedGuestSearchProps {
  onSearch: (params: SearchFormData) => void;
  isLoading?: boolean;
}

export function EnhancedGuestSearch({ onSearch, isLoading }: EnhancedGuestSearchProps) {
  const [searchForm, setSearchForm] = useState<SearchFormData>({
    type: 'car',
    from: '',
    to: '',
    date: '',
    passengers: 1,
    sortBy: 'time'
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSearch = () => {
    if (!searchForm.from || !searchForm.to || !searchForm.date) return;
    onSearch(searchForm);
  };

  const vehicleTypes = [
    { type: 'car' as PoolingType, icon: Car, title: 'Car Pool', desc: 'Share rides with passengers' },
    { type: 'bus' as PoolingType, icon: Bus, title: 'Bus Travel', desc: 'Scheduled bus routes' },
    { type: 'shared-taxi' as PoolingType, icon: Users, title: 'Shared Taxi', desc: 'Door-to-door taxi rides' }
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
                  <Input
                    placeholder="Departure city"
                    value={searchForm.from}
                    onChange={(e) => setSearchForm({...searchForm, from: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    To
                  </Label>
                  <Input
                    placeholder="Destination city"
                    value={searchForm.to}
                    onChange={(e) => setSearchForm({...searchForm, to: e.target.value})}
                  />
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
                    <UserCheck className="h-3 w-3" />
                    Passengers
                  </Label>
                  <Select value={searchForm.passengers.toString()} onValueChange={(value) => setSearchForm({...searchForm, passengers: parseInt(value)})}>
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
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading || !searchForm.from || !searchForm.to || !searchForm.date}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Max Price (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Maximum price per seat"
                    value={searchForm.maxPrice || ''}
                    onChange={(e) => setSearchForm({...searchForm, maxPrice: e.target.value ? parseInt(e.target.value) : undefined})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sort By</Label>
                  <Select value={searchForm.sortBy} onValueChange={(value) => setSearchForm({...searchForm, sortBy: value as 'time' | 'price' | 'rating'})}>
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
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
