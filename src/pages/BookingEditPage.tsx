import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GuestDetailsForm } from "@/components/GuestDetailsForm";
import { DateTimePicker } from "@/components/DateTimePicker";
import { LocationInput } from "@/components/LocationInput";
import { BookingStatusManager } from "@/components/BookingStatusManager";
import { bookingAPI, authAPI } from '@/services/api';
import { Booking, Location, BookingStatus } from '@/types/api';
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import { safeGetString } from '@/lib/safeStringUtils';

export default function BookingEditPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<Location>({ 
    id: 'pickup', 
    name: 'Pickup Location',
    address: '' 
  });
  const [dropLocation, setDropLocation] = useState<Location>({ 
    id: 'drop', 
    name: 'Drop Location',
    address: '' 
  });
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  const [extraCharges, setExtraCharges] = useState<{ amount: number; description: string }[]>([]);
  const [newExtraAmount, setNewExtraAmount] = useState('');
  const [newExtraDesc, setNewExtraDesc] = useState('');
  const isAdmin = authAPI.isAdmin();

  useEffect(() => {
    if (!authAPI.isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please login to edit your booking",
        variant: "destructive",
      });
      navigate('/login', { state: { redirectTo: `/booking/${bookingId}/edit` } });
      return;
    }

    const fetchBooking = async () => {
      if (!bookingId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const bookingIdNumber = parseInt(bookingId, 10);
        
        const response = await bookingAPI.getBookingById(bookingIdNumber);
        
        if (!response) {
          throw new Error('Booking not found');
        }
        
        setBooking(response);
        
        if (response.pickupLocation) {
          setPickupLocation({ 
            id: 'pickup',
            name: 'Pickup Location',
            address: response.pickupLocation 
          });
        }
        
        if (response.dropLocation) {
          setDropLocation({ 
            id: 'drop',
            name: 'Drop Location',
            address: response.dropLocation 
          });
        }
        
        if (response.pickupDate) {
          let dateObj: Date;
          if (response.pickupDate.includes(' ')) {
            const [datePart, timePart] = response.pickupDate.split(' ');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute, second] = timePart.split(':').map(Number);
            dateObj = new Date(year, month - 1, day, hour, minute, second);
          } else {
            dateObj = new Date(response.pickupDate);
          }
          
          if (!isNaN(dateObj.getTime())) {
            setPickupDate(dateObj);
          }
        }

        // IMPROVED: Standardized handling of extraCharges with consistent format
        const standardizedExtraCharges = standardizeExtraCharges(response);
        setExtraCharges(standardizedExtraCharges);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load booking details';
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, navigate, toast]);

  // NEW: Helper function to standardize extraCharges format from various sources
  const standardizeExtraCharges = (bookingData: any): { amount: number; description: string }[] => {
    // Case 1: extraCharges array with consistent structure
    if (bookingData.extraCharges && Array.isArray(bookingData.extraCharges)) {
      return bookingData.extraCharges.map((charge: any) => ({
        amount: typeof charge.amount === 'string' ? parseFloat(charge.amount) : Number(charge.amount),
        description: charge.description || charge.label || '',
      }));
    }
    
    // Case 2: extra_charges array (alternative field name)
    if (bookingData.extra_charges && Array.isArray(bookingData.extra_charges)) {
      return bookingData.extra_charges.map((charge: any) => ({
        amount: typeof charge.amount === 'string' ? parseFloat(charge.amount) : Number(charge.amount),
        description: charge.description || charge.label || '',
      }));
    }
    
    // Case 3: JSON string that needs parsing
    if (typeof bookingData.extraCharges === 'string' && bookingData.extraCharges.trim() !== '') {
      try {
        const parsedCharges = JSON.parse(bookingData.extraCharges);
        if (Array.isArray(parsedCharges)) {
          return parsedCharges.map((charge: any) => ({
            amount: typeof charge.amount === 'string' ? parseFloat(charge.amount) : Number(charge.amount),
            description: charge.description || charge.label || '',
          }));
        }
      } catch (e) {
        console.error("Failed to parse extraCharges string:", e);
      }
    }
    
    // Case 4: Similar for extra_charges as string
    if (typeof bookingData.extra_charges === 'string' && bookingData.extra_charges.trim() !== '') {
      try {
        const parsedCharges = JSON.parse(bookingData.extra_charges);
        if (Array.isArray(parsedCharges)) {
          return parsedCharges.map((charge: any) => ({
            amount: typeof charge.amount === 'string' ? parseFloat(charge.amount) : Number(charge.amount),
            description: charge.description || charge.label || '',
          }));
        }
      } catch (e) {
        console.error("Failed to parse extra_charges string:", e);
      }
    }
    
    // Default: return empty array if no valid format found
    return [];
  };

  const handleStatusChange = async (newStatus: BookingStatus) => {
    if (!booking || !bookingId) return;
    
    try {
      const bookingIdNumber = parseInt(bookingId, 10);
      
      const response = await bookingAPI.updateBookingStatus(bookingIdNumber, newStatus);
      
      if (response) {
        setBooking({
          ...booking,
          status: newStatus,
          updatedAt: response.updatedAt || booking.updatedAt
        });
        toast({
          title: "Status Updated",
          description: `Booking status changed to ${newStatus.replace('_', ' ').toUpperCase()}`,
        });
      }
    } catch (error) {
      console.error("Status update error:", error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBooking = async () => {
    if (!bookingId || !isAdmin) return;
    
    try {
      const bookingIdNumber = parseInt(bookingId, 10);
      
      await bookingAPI.deleteBooking(bookingIdNumber);
      toast({
        title: "Booking Deleted",
        description: "The booking has been successfully deleted",
      });
      navigate('/dashboard');
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete booking",
        variant: "destructive",
      });
    }
  };

  const handleAddExtraCharge = () => {
    if (!newExtraAmount || isNaN(Number(newExtraAmount)) || Number(newExtraAmount) <= 0) return;
    // Ensure amount is saved as a number, not a string
    setExtraCharges([...extraCharges, { 
      amount: parseFloat(newExtraAmount), 
      description: newExtraDesc 
    }]);
    setNewExtraAmount('');
    setNewExtraDesc('');
  };

  const handleRemoveExtraCharge = (idx: number) => {
    setExtraCharges(extraCharges.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (contactDetails: any) => {
    if (!booking || !bookingId) return;
    setIsSubmitting(true);
    try {
      // IMPROVED: Ensure extra charges have consistent field names
      const standardizedExtraCharges = extraCharges.map(c => ({
        amount: Number(c.amount), // Ensure it's a number
        description: c.description // Use description as the standard field
      }));

      const updatedData = {
        passengerName: contactDetails.name,
        passengerPhone: contactDetails.phone,
        passengerEmail: contactDetails.email,
        pickupLocation: pickupLocation?.address || '',
        dropLocation: dropLocation?.address || '',
        pickupDate: pickupDate ? pickupDate.toISOString() : undefined,
        extraCharges: standardizedExtraCharges
      };
      
      const bookingIdNumber = parseInt(bookingId, 10);
      const result = await bookingAPI.updateBooking(bookingIdNumber, updatedData);
      
      if (result) {
        // IMPROVED: Update the local state with the server response, ensuring data consistency
        const updatedBooking = {
          ...booking,
          passengerName: result.passengerName || contactDetails.name,
          passengerPhone: result.passengerPhone || contactDetails.phone,
          passengerEmail: result.passengerEmail || contactDetails.email,
          pickupLocation: result.pickupLocation || pickupLocation?.address || '',
          dropLocation: result.dropLocation || dropLocation?.address || '',
          pickupDate: result.pickupDate || (pickupDate ? pickupDate.toISOString() : undefined),
          // Explicit standardization of extraCharges to ensure consistency
          extraCharges: standardizeExtraCharges(result),
          // Preserve other fields from the response
          updatedAt: result.updatedAt || booking.updatedAt,
          status: result.status || booking.status,
          totalAmount: result.totalAmount || booking.totalAmount
        };
        
        setBooking(updatedBooking);
        // Also update extraCharges state to make sure it's consistent
        setExtraCharges(standardizeExtraCharges(result));
        
        toast({ title: "Booking Updated", description: "Your booking has been updated successfully!" });
      }
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({ title: "Update Failed", description: error instanceof Error ? error.message : 'Failed to update booking', variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTripType = (tripType?: string, tripMode?: string): string => {
    if (!tripType) return 'Standard';
    
    const type = tripType.charAt(0).toUpperCase() + tripType.slice(1);
    const mode = tripMode ? ` (${tripMode.replace('-', ' ')})` : '';
    
    return `${type}${mode}`;
  };

  const calculatePriceBreakdown = (totalAmount: number) => {
    if (typeof totalAmount !== 'number' || isNaN(totalAmount) || totalAmount <= 0) {
      return { baseFare: 0, taxes: 0 };
    }
    const baseFare = Math.round(totalAmount * 0.85);
    const taxes = Math.round(totalAmount * 0.15);
    return { baseFare, taxes };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-500">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error || 'Booking not found'}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Return to Dashboard
        </Button>
      </div>
    );
  }

  const totalAmount = typeof booking.totalAmount === 'number' 
    ? booking.totalAmount 
    : parseFloat(String(booking.totalAmount)) || 0;
    
  const { baseFare, taxes } = calculatePriceBreakdown(totalAmount);

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Booking #{booking.bookingNumber}</h1>
            <p className="text-gray-500">ID: {booking.id}</p>
          </div>
        </div>
        <BookingStatusManager
          currentStatus={booking.status as BookingStatus}
          onStatusChange={handleStatusChange}
          isAdmin={isAdmin}
          onDelete={isAdmin ? handleDeleteBooking : undefined}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
              <CardDescription>Information about your current booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Trip Type</p>
                <p className="text-gray-700">{formatTripType(booking.tripType, booking.tripMode)}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Vehicle</p>
                <p className="text-gray-700">{booking.cabType}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Base Fare</p>
                <p className="text-gray-700">₹{baseFare.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Taxes & Fees</p>
                <p className="text-gray-700">₹{taxes.toLocaleString('en-IN')}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Total Amount</p>
                <p className="text-gray-700 text-lg font-semibold">
                  ₹{totalAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Editable Fields</CardTitle>
              <CardDescription>These details can be modified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Pickup Location</p>
                <LocationInput
                  location={pickupLocation}
                  onLocationChange={(location: Location) => {
                    setPickupLocation(location);
                  }}
                  placeholder="Enter pickup location"
                  className="w-full"
                />
              </div>
              {booking.dropLocation && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1">Drop Location</p>
                    <LocationInput
                      location={dropLocation}
                      onLocationChange={(location: Location) => {
                        setDropLocation(location);
                      }}
                      placeholder="Enter drop location"
                      className="w-full"
                    />
                  </div>
                </>
              )}
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Pickup Date & Time</p>
                <DateTimePicker
                  date={pickupDate}
                  onDateChange={setPickupDate}
                  minDate={new Date()}
                />
              </div>
            </CardContent>
          </Card>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Extra Charges</CardTitle>
              <CardDescription>Add or edit extra charges for this booking</CardDescription>
            </CardHeader>
            <CardContent>
              {extraCharges.length === 0 && <div className="text-gray-500 mb-2">No extra charges added</div>}
              {extraCharges.length > 0 && (
                <ul className="mb-4">
                  {extraCharges.map((charge, idx) => (
                    <li key={idx} className="flex items-center mb-2">
                      <span className="mr-2">₹{charge.amount}</span>
                      <span className="mr-2">{charge.description}</span>
                      <button type="button" className="ml-2 text-red-500 hover:text-red-700" onClick={() => handleRemoveExtraCharge(idx)}>
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Amount (₹)"
                  className="border rounded px-2 py-1 w-28"
                  value={newExtraAmount}
                  onChange={e => setNewExtraAmount(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Description"
                  className="border rounded px-2 py-1 flex-1"
                  value={newExtraDesc}
                  onChange={e => setNewExtraDesc(e.target.value)}
                />
                <button type="button" className="bg-blue-500 text-white px-3 py-1 rounded flex items-center" onClick={handleAddExtraCharge}>
                  <Plus size={16} className="mr-1" /> Add
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Passenger Information</CardTitle>
              <CardDescription>Update passenger contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <GuestDetailsForm
                onSubmit={handleSubmit}
                totalPrice={totalAmount}
                initialData={{
                  name: booking.passengerName || '',
                  email: booking.passengerEmail || '',
                  phone: booking.passengerPhone || ''
                }}
                bookingId={bookingId}
                isEditing={true}
                isSubmitting={isSubmitting}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
