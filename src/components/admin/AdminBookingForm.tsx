import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { CabOptions } from '@/components/CabOptions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Location } from '@/lib/locationData';
import { CabType } from '@/types/cab';
import { TripType, TripMode } from '@/lib/tripTypes';
import { cabTypes } from '@/lib/cabData';
import { bookingAPI } from '@/services/api';
import { BookingRequest } from '@/types/api';
import { useFare } from '@/hooks/useFare';
import { formatPrice } from '@/lib/cabData';
import { formatDateForAPI } from '@/lib/dateUtils';
import { AdminSearchWidget } from './AdminSearchWidget';

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
  
  // Trip details - managed by search widget
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [pickupDate, setPickupDate] = useState<Date>(new Date());
  const [returnDate, setReturnDate] = useState<Date | null>(null);
  const [tripType, setTripType] = useState<TripType>('outstation');
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [hourlyPackage, setHourlyPackage] = useState(hourlyPackageOptions[0].value);
  const [distance, setDistance] = useState(0);
  
  // Vehicle selection
  const [selectedCab, setSelectedCab] = useState<CabType | null>(null);
  const [selectedFare, setSelectedFare] = useState<number>(0);
  const [selectedFareBreakdown, setSelectedFareBreakdown] = useState<any>(null);
  
  // Admin-specific fields
  const [adminNotes, setAdminNotes] = useState('');
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [markAsPaid, setMarkAsPaid] = useState(false);
  
  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Add useFare for unified fare calculation
  const { fareData, isLoading: isFareLoading, error: fareError } = useFare(
    selectedCab?.id || '',
    tripType,
    distance,
    tripType === 'local' ? hourlyPackage : undefined,
    pickupDate
  );
  
  // Handle search from widget
  const handleSearch = (searchData: {
    pickupLocation: Location | null;
    dropLocation: Location | null;
    pickupDate: Date;
    returnDate: Date | null;
    tripType: TripType;
    tripMode: TripMode;
    hourlyPackage: string;
    distance: number;
  }) => {
    setPickupLocation(searchData.pickupLocation);
    setDropLocation(searchData.dropLocation);
    setPickupDate(searchData.pickupDate);
    setReturnDate(searchData.returnDate);
    setTripType(searchData.tripType);
    setTripMode(searchData.tripMode);
    setHourlyPackage(searchData.hourlyPackage);
    setDistance(searchData.distance);
    
    // Clear previous cab selection when search changes
    setSelectedCab(null);
    setSelectedFare(0);
    setSelectedFareBreakdown(null);
  };
  
  // Handle cab selection with fare and breakdown
  const handleCabSelect = (cab: CabType, fare: number, breakdown?: any) => {
    setSelectedCab(cab);
    setSelectedFare(fare);
    setSelectedFareBreakdown(breakdown || null);
  };
  
  // Add this helper at the top, after selectedFareBreakdown:
  const sumBreakdown = (breakdown: any) => {
    if (!breakdown) return 0;
    const fields = [
      'basePrice',
      'driverAllowance',
      'nightCharges',
      'extraDistanceFare',
      'extraHourCharge',
      'airportFee',
    ];
    let total = 0;
    for (const key of fields) {
      const val = breakdown[key];
      if (typeof val === 'number' && !isNaN(val)) {
        total += val;
      }
    }
    return total;
  };
  
  // Update calculatePrice to use sumBreakdown:
  const calculatePrice = () => {
    return sumBreakdown(selectedFareBreakdown) || selectedFare || 0;
  };
  
  // Update calculateFinalPrice to use the new calculatePrice:
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
      newErrors.pickupLocation = 'Please complete the trip search first';
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
        pickupDate: formatDateForAPI(pickupDate) || '',
        returnDate: returnDate ? formatDateForAPI(returnDate) : null,
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
    <form onSubmit={handleSubmit} className="bg-gray-50 min-h-screen py-6 px-2 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Trip Search Widget */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Trip Information</h2>
          <AdminSearchWidget
            onSearch={handleSearch}
            initialData={{
              pickupLocation,
              dropLocation,
              pickupDate,
              returnDate,
              tripType,
              tripMode,
              hourlyPackage
            }}
            isLoading={false}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Customer Information */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
              <h2 className="text-base font-semibold text-gray-700 mb-3">Customer Information</h2>
              <div className="grid grid-cols-1 gap-3">
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
                
                <div className="space-y-2">
                  <Label htmlFor="adminNotes">Admin Notes</Label>
                  <textarea
                    id="adminNotes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Add any internal notes or special instructions..."
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Right: Vehicle, Pricing, Actions */}
          <div className="space-y-4">
            {pickupLocation ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                <h2 className="text-base font-semibold text-gray-700 mb-3">Vehicle Selection</h2>
                <CabOptions
                  cabTypes={cabTypes}
                  selectedCab={selectedCab}
                  onSelectCab={handleCabSelect}
                  distance={distance}
                  tripType={tripType}
                  tripMode={tripMode}
                  hourlyPackage={hourlyPackage}
                  pickupDate={pickupDate}
                  returnDate={returnDate}
                  isCalculatingFares={false}
                />
                {errors.selectedCab && (
                  <p className="text-xs text-red-500 mt-2">{errors.selectedCab}</p>
                )}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Complete Trip Search</h3>
                  <p className="text-gray-500">Please complete the trip search above to view available vehicles</p>
                </div>
              </div>
            )}
            
            {selectedCab ? (
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                <h2 className="text-base font-semibold text-gray-700 mb-3">Pricing & Discount</h2>
                {selectedFareBreakdown && (
                  <div className="mb-4">
                    <h3 className="text-md font-semibold mb-2">Fare Breakup</h3>
                    <div className="space-y-2">
                      {selectedFareBreakdown.basePrice !== undefined && (
                        <div className="flex justify-between text-gray-800">
                          <span>Base fare</span>
                          <span>{formatPrice(selectedFareBreakdown.basePrice)}</span>
                        </div>
                      )}
                      {selectedFareBreakdown.driverAllowance !== undefined && (
                        <div className="flex justify-between text-gray-800">
                          <span>Driver allowance</span>
                          <span>{formatPrice(selectedFareBreakdown.driverAllowance)}</span>
                        </div>
                      )}
                      {selectedFareBreakdown.nightCharges !== undefined && selectedFareBreakdown.nightCharges > 0 && (
                        <div className="flex justify-between text-gray-800">
                          <span>Night charges</span>
                          <span>{formatPrice(selectedFareBreakdown.nightCharges)}</span>
                        </div>
                      )}
                      {selectedFareBreakdown.extraDistanceFare !== undefined && selectedFareBreakdown.extraDistanceFare > 0 && (
                        <div className="flex justify-between text-gray-800">
                          <span>Extra distance charges</span>
                          <span>{formatPrice(selectedFareBreakdown.extraDistanceFare)}</span>
                        </div>
                      )}
                      {selectedFareBreakdown.extraHourCharge !== undefined && selectedFareBreakdown.extraHourCharge > 0 && (
                        <div className="flex justify-between text-gray-800">
                          <span>Extra hour charges</span>
                          <span>{formatPrice(selectedFareBreakdown.extraHourCharge)}</span>
                        </div>
                      )}
                      {Object.keys(selectedFareBreakdown).length === 1 && selectedFareBreakdown.basePrice !== undefined && (
                        <div className="text-gray-500 text-sm">No detailed breakup available.</div>
                      )}
                    </div>
                    <div className="flex justify-between font-bold border-t pt-2 mt-2 text-lg">
                      <span>Total Price</span>
                      <span>{formatPrice(calculatePrice())}</span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Base Price:</span>
                  <span className="font-medium">{formatPrice(calculatePrice())}</span>
                </div>
                
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
                
                {discountType !== 'none' && discountValue > 0 && (
                  <div className="flex justify-between py-2 border-b mt-4">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-green-600">
                      - {formatPrice(calculatePrice() - calculateFinalPrice())}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between py-3 border-b border-t mt-4 text-lg">
                  <span className="font-semibold">Final Price:</span>
                  <span className="font-bold">{formatPrice(calculateFinalPrice())}</span>
                </div>
                
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
                <div className="flex justify-end mt-4">
                  <Button type="submit" className="px-6 py-2 text-sm rounded-full bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition">Create Booking</Button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Vehicle</h3>
                  <p className="text-gray-500">Please select a vehicle to view pricing and create booking</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
