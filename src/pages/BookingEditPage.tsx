
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GuestDetailsForm } from "@/components/GuestDetailsForm";
import { DateTimePicker } from "@/components/DateTimePicker";
import { LocationInput } from "@/components/LocationInput";
import { bookingAPI, authAPI } from '@/services/api';
import { Booking, Location } from '@/types/api';
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

export default function BookingEditPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<Location>({ address: '' });
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    // Check authentication
    if (!authAPI.isAuthenticated()) {
      toast({
        title: "Authentication Required",
        description: "Please login to edit your booking",
        variant: "destructive",
      });
      navigate('/login', { state: { redirectTo: `/booking/${bookingId}/edit` } });
      return;
    }

    // Fetch booking details
    const fetchBooking = async () => {
      if (!bookingId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await bookingAPI.getBookingById(bookingId);
        setBooking(data);
        
        // Initialize form fields
        setPickupLocation({ address: data.pickupLocation });
        setPickupDate(new Date(data.pickupDate));
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

  const handleSubmit = async (contactDetails: any) => {
    if (!booking || !bookingId) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare updated booking data
      const updatedData = {
        passengerName: contactDetails.name,
        passengerPhone: contactDetails.phone,
        passengerEmail: contactDetails.email,
        pickupLocation: pickupLocation.address,
        pickupDate: pickupDate ? pickupDate.toISOString() : undefined // Convert to ISO string
      };
      
      // Update booking in API
      await bookingAPI.updateBooking(bookingId, updatedData);
      
      toast({
        title: "Booking Updated",
        description: "Your booking has been updated successfully!",
      });
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update booking';
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => navigate('/dashboard')} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Booking #{booking?.bookingNumber}</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking details */}
        <div>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
              <CardDescription>Information about your current booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Trip Type</p>
                <p className="text-gray-700">{booking.tripType.toUpperCase()} - {booking.tripMode}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Vehicle</p>
                <p className="text-gray-700">{booking.cabType}</p>
              </div>
              <Separator />
              {booking.dropLocation && (
                <>
                  <div>
                    <p className="text-sm font-medium mb-1">Drop Location</p>
                    <p className="text-gray-700">{booking.dropLocation}</p>
                  </div>
                  <Separator />
                </>
              )}
              <div>
                <p className="text-sm font-medium mb-1">Total Amount</p>
                <p className="text-gray-700 text-lg font-semibold">₹{booking.totalAmount.toLocaleString('en-IN')}</p>
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
                  onLocationChange={(location: Location) => setPickupLocation(location)}
                  placeholder="Enter pickup location"
                  className="w-full"
                />
              </div>
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
        </div>
        
        {/* Contact information form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Passenger Information</CardTitle>
              <CardDescription>Update passenger contact details</CardDescription>
            </CardHeader>
            <CardContent>
              <GuestDetailsForm
                onSubmit={handleSubmit}
                totalPrice={booking?.totalAmount || 0}
                initialData={{
                  name: booking?.passengerName || '',
                  email: booking?.passengerEmail || '',
                  phone: booking?.passengerPhone || ''
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
