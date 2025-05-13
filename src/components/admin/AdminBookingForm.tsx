
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import CabOptions from '@/components/CabOptions';
import { TripMode, TripType } from '@/lib/tripTypes';
import { CabType } from '@/types/cab';
import { BookingRequest } from '@/types/api';
import { cn } from '@/lib/utils';

// Mock cab types (in a real app, fetch these from API)
const mockCabTypes: CabType[] = [
  {
    id: 'sedan',
    name: 'Sedan',
    description: 'Comfortable sedan for up to 4 passengers',
    image: '/cars/sedan.png',
    capacity: 4,
    basePrice: 1500,
    pricePerKm: 15,
    amenities: ['AC', 'Water', 'Music'],
    luggageCapacity: 3,
    ac: true,
  },
  {
    id: 'suv',
    name: 'SUV',
    description: 'Spacious SUV for up to 6 passengers',
    image: '/cars/suv.png',
    capacity: 6,
    basePrice: 2500,
    pricePerKm: 20,
    amenities: ['AC', 'Water', 'Music', 'Extra Space'],
    luggageCapacity: 5,
    ac: true,
  },
  {
    id: 'tempo',
    name: 'Tempo Traveller',
    description: 'For large groups up to 12 passengers',
    image: '/cars/tempo.png',
    capacity: 12,
    basePrice: 3500,
    pricePerKm: 25,
    amenities: ['AC', 'Water', 'Music', 'Spacious'],
    luggageCapacity: 8,
    ac: true,
  },
];

// Local trip package options
const localPackages = [
  { value: '4hrs40km', label: '4 hours / 40 km' },
  { value: '8hrs80km', label: '8 hours / 80 km' },
  { value: '12hrs120km', label: '12 hours / 120 km' },
];

// Hours options
const hoursOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString().padStart(2, '0'),
  label: i.toString().padStart(2, '0'),
}));

// Minutes options
const minutesOptions = Array.from({ length: 12 }, (_, i) => ({
  value: (i * 5).toString().padStart(2, '0'),
  label: (i * 5).toString().padStart(2, '0'),
}));

interface AdminBookingFormProps {
  onSubmit: (bookingData: BookingRequest & { discount?: number; discountType?: 'percentage' | 'fixed' }) => void;
  isSubmitting: boolean;
}

export function AdminBookingForm({ onSubmit, isSubmitting }: AdminBookingFormProps) {
  const [tripType, setTripType] = useState<string>('local');
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [pickupLocation, setPickupLocation] = useState<string>('');
  const [dropLocation, setDropLocation] = useState<string>('');
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [pickupTime, setPickupTime] = useState({ hour: '09', minute: '00' });
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [returnTime, setReturnTime] = useState({ hour: '18', minute: '00' });
  const [selectedPackage, setSelectedPackage] = useState<string>('8hrs80km');
  const [distance, setDistance] = useState<number>(0);
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discount, setDiscount] = useState<number>(0);
  const [finalAmount, setFinalAmount] = useState<number>(0);
  const [passengerName, setPassengerName] = useState<string>('');
  const [passengerPhone, setPassengerPhone] = useState<string>('');
  const [passengerEmail, setPassengerEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Calculate final amount whenever total amount or discount changes
  useEffect(() => {
    let calculatedAmount = totalAmount;
    
    if (discount > 0) {
      if (discountType === 'percentage') {
        calculatedAmount = totalAmount - (totalAmount * discount / 100);
      } else {
        calculatedAmount = totalAmount - discount;
      }
    }
    
    // Ensure final amount is never negative
    setFinalAmount(Math.max(0, calculatedAmount));
  }, [totalAmount, discount, discountType]);

  // Set estimated distance based on trip type
  useEffect(() => {
    if (tripType === 'local') {
      // For local trips, extract distance from package
      if (selectedPackage === '4hrs40km') {
        setDistance(40);
      } else if (selectedPackage === '8hrs80km') {
        setDistance(80);
      } else if (selectedPackage === '12hrs120km') {
        setDistance(120);
      }
    }
  }, [tripType, selectedPackage]);

  const handleCabSelect = (cab: CabType) => {
    setSelectedCab(cab);
    
    // Calculate estimated fare based on cab type and distance
    let estimatedFare = 0;
    if (tripType === 'local') {
      // Local package pricing
      if (cab.id === 'sedan') estimatedFare = 2500;
      else if (cab.id === 'suv') estimatedFare = 3500;
      else if (cab.id === 'tempo') estimatedFare = 5500;
    } else if (tripType === 'outstation') {
      // Outstation pricing: base + distance * per km rate
      estimatedFare = cab.basePrice + (distance * cab.pricePerKm);
      if (tripMode === 'round-trip') {
        estimatedFare *= 1.8; // Round trip factor
      }
    } else if (tripType === 'airport') {
      // Airport transfer pricing
      if (cab.id === 'sedan') estimatedFare = 1200;
      else if (cab.id === 'suv') estimatedFare = 1800;
      else if (cab.id === 'tempo') estimatedFare = 2500;
    }
    
    setTotalAmount(estimatedFare);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Format dates with time
    const formattedPickupDate = new Date(pickupDate);
    formattedPickupDate.setHours(parseInt(pickupTime.hour), parseInt(pickupTime.minute));

    let formattedReturnDate = null;
    if (tripMode === 'round-trip' && returnDate) {
      formattedReturnDate = new Date(returnDate);
      formattedReturnDate.setHours(parseInt(returnTime.hour), parseInt(returnTime.minute));
    }

    // Prepare booking data
    const bookingData: BookingRequest & { discount?: number; discountType?: 'percentage' | 'fixed' } = {
      pickupLocation,
      dropLocation: tripType !== 'local' ? dropLocation : undefined,
      pickupDate: formattedPickupDate.toISOString(),
      returnDate: formattedReturnDate ? formattedReturnDate.toISOString() : undefined,
      cabType: selectedCab?.id || '',
      distance,
      tripType,
      tripMode,
      totalAmount: finalAmount, // Use the final amount after discount
      passengerName,
      passengerPhone,
      passengerEmail,
      notes,
      hourlyPackage: tripType === 'local' ? selectedPackage : undefined,
    };

    // Add discount information if a discount is applied
    if (discount > 0) {
      bookingData.discount = discount;
      bookingData.discountType = discountType;
    }

    onSubmit(bookingData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Trip Type Tabs */}
      <Tabs defaultValue="local" value={tripType} onValueChange={setTripType} className="w-full">
        <TabsList className="grid grid-cols-3 mb-2">
          <TabsTrigger value="local">Local</TabsTrigger>
          <TabsTrigger value="outstation">Outstation</TabsTrigger>
          <TabsTrigger value="airport">Airport Transfer</TabsTrigger>
        </TabsList>
        
        <TabsContent value="local" className="space-y-4">
          {/* Local trip fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickupLocation">Pickup Location</Label>
              <Input
                id="pickupLocation"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                required
                placeholder="Enter pickup address"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="localPackage">Package</Label>
              <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                <SelectTrigger id="localPackage">
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {localPackages.map((pkg) => (
                    <SelectItem key={pkg.value} value={pkg.value}>{pkg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="outstation" className="space-y-4">
          {/* Outstation trip fields */}
          <div className="space-y-4">
            <RadioGroup defaultValue="one-way" value={tripMode} onValueChange={(value) => setTripMode(value as TripMode)} className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="one-way" id="one-way" />
                <Label htmlFor="one-way">One Way</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="round-trip" id="round-trip" />
                <Label htmlFor="round-trip">Round Trip</Label>
              </div>
            </RadioGroup>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="outPickupLocation">Pickup Location</Label>
                <Input
                  id="outPickupLocation"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  required
                  placeholder="Enter pickup address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dropLocation">Drop Location</Label>
                <Input
                  id="dropLocation"
                  value={dropLocation}
                  onChange={(e) => setDropLocation(e.target.value)}
                  required
                  placeholder="Enter destination address"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="distance">Estimated Distance (km)</Label>
              <Input
                id="distance"
                type="number"
                min="0"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                required
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="airport" className="space-y-4">
          {/* Airport transfer fields */}
          <RadioGroup defaultValue="one-way" value={tripMode} onValueChange={(value) => setTripMode(value as TripMode)} className="flex space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pickup" id="airport-pickup" />
              <Label htmlFor="airport-pickup">Airport Pickup</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="drop" id="airport-drop" />
              <Label htmlFor="airport-drop">Airport Drop</Label>
            </div>
          </RadioGroup>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="airportPickupLocation">
                {tripMode === 'pickup' ? 'From Airport to' : 'From Location to Airport'}
              </Label>
              <Input
                id="airportPickupLocation"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                required
                placeholder={tripMode === 'pickup' ? 'Destination address' : 'Pickup address'}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Date and Time Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Pickup Date & Time</Label>
          <div className="flex space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {pickupDate ? format(pickupDate, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={pickupDate}
                  onSelect={(date) => date && setPickupDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <div className="flex items-center space-x-1">
              <Select value={pickupTime.hour} onValueChange={(value) => setPickupTime(prev => ({ ...prev, hour: value }))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hoursOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <span>:</span>
              
              <Select value={pickupTime.minute} onValueChange={(value) => setPickupTime(prev => ({ ...prev, minute: value }))}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {minutesOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {tripMode === 'round-trip' && (
          <div className="space-y-2">
            <Label>Return Date & Time</Label>
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {returnDate ? format(returnDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={returnDate || undefined}
                    onSelect={(date) => date && setReturnDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <div className="flex items-center space-x-1">
                <Select value={returnTime.hour} onValueChange={(value) => setReturnTime(prev => ({ ...prev, hour: value }))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hoursOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <span>:</span>
                
                <Select value={returnTime.minute} onValueChange={(value) => setReturnTime(prev => ({ ...prev, minute: value }))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minutesOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Cab Selection */}
      <div className="space-y-2">
        <Label>Select Cab</Label>
        <Card className="p-4">
          <CabOptions
            cabTypes={mockCabTypes}
            selectedCab={selectedCab}
            onSelectCab={handleCabSelect}
            distance={distance}
            tripType={tripType}
            tripMode={tripMode}
            hourlyPackage={selectedPackage}
            pickupDate={pickupDate}
            returnDate={returnDate}
          />
        </Card>
      </div>
      
      {/* Customer Information */}
      <div>
        <h3 className="text-lg font-medium mb-4">Customer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="passengerName">Customer Name</Label>
            <Input
              id="passengerName"
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              required
              placeholder="Enter customer name"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="passengerPhone">Phone Number</Label>
            <Input
              id="passengerPhone"
              value={passengerPhone}
              onChange={(e) => setPassengerPhone(e.target.value)}
              required
              placeholder="Enter phone number"
              type="tel"
            />
          </div>
          
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="passengerEmail">Email Address</Label>
            <Input
              id="passengerEmail"
              value={passengerEmail}
              onChange={(e) => setPassengerEmail(e.target.value)}
              required
              placeholder="Enter email address"
              type="email"
            />
          </div>
        </div>
      </div>
      
      {/* Discount Section */}
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="text-lg font-medium text-blue-800 mb-4">Apply Discount</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="discountType">Discount Type</Label>
            <Select value={discountType} onValueChange={(value) => setDiscountType(value as 'percentage' | 'fixed')}>
              <SelectTrigger id="discountType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="discountValue">Discount Value</Label>
            <Input
              id="discountValue"
              type="number"
              min="0"
              max={discountType === 'percentage' ? 100 : totalAmount}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              placeholder={discountType === 'percentage' ? 'Enter percentage' : 'Enter amount'}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Final Amount</Label>
            <div className="h-10 flex items-center px-3 border rounded-md bg-white font-medium">
              ₹{finalAmount.toFixed(2)}
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-blue-700">
          {discount > 0 && (
            <p>
              {discountType === 'percentage' 
                ? `${discount}% discount applied (₹${(totalAmount * discount / 100).toFixed(2)})`
                : `₹${discount} discount applied`}
            </p>
          )}
        </div>
      </div>
      
      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any special instructions or notes here"
        />
      </div>
      
      {/* Summary and Submit */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="text-lg font-medium mb-2">Booking Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Trip Type:</span>
            <span className="font-medium">
              {tripType === 'local' ? 'Local' : tripType === 'outstation' ? 'Outstation' : 'Airport Transfer'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Selected Cab:</span>
            <span className="font-medium">{selectedCab?.name || 'Not selected'}</span>
          </div>
          
          <div className="flex justify-between">
            <span>Original Amount:</span>
            <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
          </div>
          
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount:</span>
              <span>
                {discountType === 'percentage'
                  ? `₹${(totalAmount * discount / 100).toFixed(2)} (${discount}%)`
                  : `₹${discount.toFixed(2)}`}
              </span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between font-bold">
            <span>Final Amount:</span>
            <span>₹{finalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={!selectedCab || isSubmitting || pickupLocation === '' || passengerName === '' || passengerPhone === '' || passengerEmail === ''}
          className="px-8"
        >
          {isSubmitting ? 'Creating...' : 'Create Booking'}
        </Button>
      </div>
    </form>
  );
}
