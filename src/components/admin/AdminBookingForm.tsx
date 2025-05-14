
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { TabTripSelector } from '@/components/TabTripSelector';
import { LocationInput } from '@/components/LocationInput';
import { DateTimePicker } from '@/components/DateTimePicker';
import { CabOptions } from '@/components/CabOptions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { TripType, TripMode, ensureCustomerTripType } from '@/lib/tripTypes';
import { hourlyPackages } from '@/lib/packageData';
import { cabTypes } from '@/lib/cabData';
import { convertToApiLocation } from '@/lib/locationUtils';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';

const hourlyPackageOptions = [
  { value: "8hrs-80km", label: "8 Hours / 80 KM" },
  { value: "10hrs-100km", label: "10 Hours / 100 KM" }
];

export function AdminBookingForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Customer details
  const [passengerName, setPassengerName] = useState('');
  const [passengerPhone, setPassengerPhone] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  
  // Trip details
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [tripType, setTripType] = useState<TripType>('outstation');
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [hourlyPackage, setHourlyPackage] = useState(hourlyPackageOptions[0].value);
  
  // Vehicle selection
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [distance, setDistance] = useState(0);
  
  // Admin-specific fields
  const [adminNotes, setAdminNotes] = useState('');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [markAsPaid, setMarkAsPaid] = useState(false);
  
  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Handle distance calculation from map component
  const handleDistanceCalculated = (calculatedDistance: number, calculatedDuration: number) => {
    setDistance(calculatedDistance);
  };
  
  // Calculate pricing logic based on selected vehicle, distance, trip type
  const calculatePrice = () => {
    if (!selectedCab) return 0;
    
    let basePrice = 0;
    
    if (tripType === 'airport') {
      // Airport transfer pricing logic
      basePrice = selectedCab.price;
    } else if (tripType === 'local') {
      // Local package pricing logic
      basePrice = hourlyPackage === '8hrs-80km' ? 
        selectedCab.price * 0.8 : selectedCab.price * 1;
    } else if (tripType === 'outstation') {
      // Outstation pricing logic
      const baseKmRate = selectedCab.pricePerKm || 10;
      basePrice = selectedCab.price + (distance * baseKmRate);
      
      // Add driver allowance
      basePrice += 250;
      
      // For round trip
      if (tripMode === 'round-trip' && returnDate) {
        const days = Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        basePrice *= days > 0 ? days : 1;
      }
    }
    
    return Math.ceil(basePrice);
  };
  
  // Calculate final price after discount
  const calculateFinalPrice = () => {
    const basePrice = calculatePrice();
    
    if (discountType === 'none' || discountValue <= 0) {
      return basePrice;
    }
    
    if (discountType === 'percentage') {
      const discount = basePrice * (discountValue / 100);
      return Math.max(0, basePrice - discount);
    }
    
    if (discountType === 'fixed') {
      return Math.max(0, basePrice - discountValue);
    }
    
    return basePrice;
  };
  
  // Validate form fields
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!passengerName.trim()) {
      newErrors.passengerName = 'Passenger name is required';
    }
    
    if (!passengerPhone.trim()) {
      newErrors.passengerPhone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(passengerPhone.replace(/\D/g, ''))) {
      newErrors.passengerPhone = 'Enter a valid 10-digit phone number';
    }
    
    if (!passengerEmail.trim()) {
      newErrors.passengerEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(passengerEmail)) {
      newErrors.passengerEmail = 'Enter a valid email address';
    }
    
    if (!pickupLocation) {
      newErrors.pickupLocation = 'Pickup location is required';
    }
    
    if ((tripType === 'outstation' || tripType === 'airport') && !dropLocation) {
      newErrors.dropLocation = 'Drop location is required';
    }
    
    if (tripMode === 'round-trip' && !returnDate) {
      newErrors.returnDate = 'Return date is required for round trips';
    }
    
    if (!selectedCab) {
      newErrors.selectedCab = 'Please select a vehicle';
    }
    
    if (discountType !== 'none') {
      if (discountValue < 0) {
        newErrors.discountValue = 'Discount cannot be negative';
      }
      
      if (discountType === 'percentage' && discountValue > 100) {
        newErrors.discountValue = 'Percentage discount cannot exceed 100%';
      }
      
      if (discountType === 'fixed' && discountValue > calculatePrice()) {
        newErrors.discountValue = 'Fixed discount cannot exceed total price';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Form Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const basePrice = calculatePrice();
      const finalPrice = calculateFinalPrice();
      const discountAmount = basePrice - finalPrice;
      
      const bookingData: BookingRequest = {
        pickupLocation: pickupLocation?.address || pickupLocation?.name || '',
        dropLocation: dropLocation?.address || dropLocation?.name || '',
        pickupDate: pickupDate?.toISOString() || '',
        returnDate: returnDate?.toISOString() || null,
        cabType: selectedCab?.name || '',
        distance: distance,
        tripType: tripType,
        tripMode: tripMode,
        totalAmount: finalPrice,
        passengerName: passengerName,
        passengerPhone: passengerPhone,
        passengerEmail: passengerEmail,
        hourlyPackage: tripType === 'local' ? hourlyPackage : null,
        // Admin-specific fields
        adminNotes: adminNotes,
        discountAmount: discountAmount > 0 ? discountAmount : 0,
        discountType: discountType !== 'none' ? discountType : null,
        discountValue: discountValue > 0 ? discountValue : 0,
        isPaid: markAsPaid,
        createdBy: 'admin',
      };
      
      // Call API to create booking
      const response = await bookingAPI.createBooking(bookingData);
      
      toast({
        title: "Booking Created Successfully",
        description: `Booking #${response.booking_number || response.id} has been created.`,
      });
      
      // Navigate to booking details or bookings list
      navigate(`/admin/bookings`);
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Error Creating Booking",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Customer Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="passengerName">Full Name <span className="text-red-500">*</span></Label>
            <Input 
              id="passengerName" 
              value={passengerName} 
              onChange={(e) => setPassengerName(e.target.value)} 
              className={errors.passengerName ? "border-red-500" : ""}
            />
            {errors.passengerName && (
              <p className="text-xs text-red-500">{errors.passengerName}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="passengerPhone">Phone Number <span className="text-red-500">*</span></Label>
            <Input 
              id="passengerPhone" 
              value={passengerPhone} 
              onChange={(e) => setPassengerPhone(e.target.value)}
              className={errors.passengerPhone ? "border-red-500" : ""}
            />
            {errors.passengerPhone && (
              <p className="text-xs text-red-500">{errors.passengerPhone}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="passengerEmail">Email <span className="text-red-500">*</span></Label>
            <Input 
              id="passengerEmail" 
              type="email" 
              value={passengerEmail} 
              onChange={(e) => setPassengerEmail(e.target.value)}
              className={errors.passengerEmail ? "border-red-500" : ""}
            />
            {errors.passengerEmail && (
              <p className="text-xs text-red-500">{errors.passengerEmail}</p>
            )}
          </div>
        </div>
      </Card>
      
      {/* Trip Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Trip Information</h2>
        
        {/* Trip Type Selection */}
        <div className="mb-6">
          <TabTripSelector
            selectedTab={ensureCustomerTripType(tripType)}
            tripMode={tripMode}
            onTabChange={(type) => setTripType(type as TripType)}
            onTripModeChange={setTripMode}
          />
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Pickup Location */}
          <div className="space-y-2">
            <Label>Pickup Location <span className="text-red-500">*</span></Label>
            <LocationInput
              label=""
              placeholder="Enter pickup location"
              value={pickupLocation ? convertToApiLocation(pickupLocation) : undefined}
              onLocationChange={setPickupLocation}
              isPickupLocation={true}
              isAirportTransfer={tripType === 'airport'}
            />
            {errors.pickupLocation && (
              <p className="text-xs text-red-500">{errors.pickupLocation}</p>
            )}
          </div>
          
          {/* Drop Location (for outstation & airport trips) */}
          {(tripType === 'outstation' || tripType === 'airport') && (
            <div className="space-y-2">
              <Label>Drop Location <span className="text-red-500">*</span></Label>
              <LocationInput
                label=""
                placeholder="Enter drop location"
                value={dropLocation ? convertToApiLocation(dropLocation) : undefined}
                onLocationChange={setDropLocation}
                isPickupLocation={false}
                isAirportTransfer={tripType === 'airport'}
              />
              {errors.dropLocation && (
                <p className="text-xs text-red-500">{errors.dropLocation}</p>
              )}
            </div>
          )}
          
          {/* Hourly Package (for local trips) */}
          {tripType === 'local' && (
            <div className="space-y-2">
              <Label>Hourly Package</Label>
              <Select
                value={hourlyPackage}
                onValueChange={setHourlyPackage}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  {hourlyPackageOptions.map((pkg) => (
                    <SelectItem key={pkg.value} value={pkg.value}>
                      {pkg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Pickup Date */}
          <div className="space-y-2">
            <Label>Pickup Date & Time <span className="text-red-500">*</span></Label>
            <DateTimePicker
              label=""
              date={pickupDate}
              onDateChange={setPickupDate}
              minDate={new Date()}
            />
          </div>
          
          {/* Return Date (for round trips) */}
          {tripType === 'outstation' && tripMode === 'round-trip' && (
            <div className="space-y-2">
              <Label>Return Date & Time <span className="text-red-500">*</span></Label>
              <DateTimePicker
                label=""
                date={returnDate}
                onDateChange={setReturnDate}
                minDate={pickupDate}
              />
              {errors.returnDate && (
                <p className="text-xs text-red-500">{errors.returnDate}</p>
              )}
            </div>
          )}
        </div>
        
        {/* Admin Notes */}
        <div className="space-y-2 mt-4">
          <Label htmlFor="adminNotes">Admin Notes</Label>
          <textarea
            id="adminNotes"
            className="w-full min-h-[100px] p-2 border rounded-md"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add any special instructions or notes for this booking"
          ></textarea>
        </div>
      </Card>
      
      {/* Vehicle Selection */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Vehicle Selection</h2>
        <CabOptions
          cabTypes={cabTypes}
          selectedCab={selectedCab}
          onSelectCab={setSelectedCab}
          distance={distance}
          tripType={tripType}
          tripMode={tripMode}
          hourlyPackage={hourlyPackage}
          pickupDate={pickupDate}
          returnDate={returnDate}
        />
        {errors.selectedCab && (
          <p className="text-xs text-red-500 mt-2">{errors.selectedCab}</p>
        )}
      </Card>
      
      {/* Pricing & Discount */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Pricing & Discount</h2>
        
        {/* Base Price */}
        <div className="flex justify-between py-2 border-b">
          <span className="text-gray-600">Base Price:</span>
          <span className="font-medium">₹{calculatePrice()}</span>
        </div>
        
        {/* Discount Options */}
        <div className="mt-4 space-y-4">
          <Label>Apply Discount</Label>
          <RadioGroup
            value={discountType}
            onValueChange={(value) => setDiscountType(value as 'none' | 'percentage' | 'fixed')}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="none" />
              <Label htmlFor="none">No Discount</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="percentage" id="percentage" />
              <Label htmlFor="percentage">Percentage Discount</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="fixed" />
              <Label htmlFor="fixed">Fixed Amount Discount</Label>
            </div>
          </RadioGroup>
          
          {/* Discount Value Input */}
          {discountType !== 'none' && (
            <div className="flex items-center mt-2">
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                min={0}
                max={discountType === 'percentage' ? 100 : calculatePrice()}
                className={`w-32 ${errors.discountValue ? "border-red-500" : ""}`}
              />
              <span className="ml-2">{discountType === 'percentage' ? '%' : '₹'}</span>
              
              {errors.discountValue && (
                <p className="text-xs text-red-500 ml-4">{errors.discountValue}</p>
              )}
            </div>
          )}
        </div>
        
        {/* Discount Amount */}
        {discountType !== 'none' && discountValue > 0 && (
          <div className="flex justify-between py-2 border-b mt-4">
            <span className="text-gray-600">Discount:</span>
            <span className="font-medium text-green-600">
              - ₹{(calculatePrice() - calculateFinalPrice()).toFixed(2)}
            </span>
          </div>
        )}
        
        {/* Final Price */}
        <div className="flex justify-between py-3 border-b border-t mt-4 text-lg">
          <span className="font-semibold">Final Price:</span>
          <span className="font-bold">₹{calculateFinalPrice()}</span>
        </div>
        
        {/* Payment Status */}
        <div className="mt-4 flex items-center space-x-2">
          <Checkbox 
            id="markAsPaid" 
            checked={markAsPaid} 
            onCheckedChange={() => setMarkAsPaid(!markAsPaid)}
          />
          <Label htmlFor="markAsPaid" className="font-medium">
            Mark as Paid
          </Label>
        </div>
      </Card>
      
      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" className="px-8 py-6">
          Create Booking
        </Button>
      </div>
    </form>
  );
}
