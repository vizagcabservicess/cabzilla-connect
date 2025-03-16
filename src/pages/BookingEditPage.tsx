
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { BookingSummary } from '@/components/BookingSummary';
import { GuestDetailsForm } from '@/components/GuestDetailsForm';
import { bookingAPI, authAPI } from '@/services/api';
import { Booking } from '@/types/api';
import { 
  AlertCircle, 
  ArrowLeft, 
  Calendar, 
  CheckCircle, 
  MapPin, 
  Trash2,  
  AlertTriangle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function BookingEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    // Check auth
    if (!authAPI.isAuthenticated()) {
      toast.error('Please login to access this page');
      navigate('/login', { state: { returnTo: `/booking/${id}/edit` } });
      return;
    }

    const fetchBookingDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (!id) {
          throw new Error('Booking ID is missing');
        }

        const data = await bookingAPI.getBooking(id);
        console.log('Booking details:', data);
        setBooking(data);
        setTotalPrice(data.totalAmount);
      } catch (error) {
        console.error('Failed to fetch booking details:', error);
        setError(error instanceof Error ? error.message : 'Failed to load booking details');
        
        uiToast({
          title: "Error Loading Booking",
          description: error instanceof Error ? error.message : 'Failed to load booking details',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [id, navigate, uiToast]);

  const handleContactDetailsSubmit = async (details: { name: string; email: string; phone: string }) => {
    if (!booking || !id) return;
    
    try {
      setIsSubmitting(true);
      
      // Prepare updated data
      const updatedData = {
        passengerName: details.name,
        passengerEmail: details.email,
        passengerPhone: details.phone,
      };
      
      // Submit update
      const response = await bookingAPI.updateBooking(id, updatedData);
      console.log('Update response:', response);
      
      // Show success message
      toast.success('Booking details updated successfully!');
      
      // Update local state
      setBooking(prev => prev ? { ...prev, 
        passengerName: details.name,
        passengerEmail: details.email,
        passengerPhone: details.phone,
      } : null);
      
    } catch (error) {
      console.error('Failed to update booking:', error);
      
      uiToast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : 'Failed to update booking details',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !id) return;
    
    try {
      setIsSubmitting(true);
      
      // Cancel booking
      const response = await bookingAPI.cancelBooking(id);
      console.log('Cancellation response:', response);
      
      // Show success message
      toast.success('Booking cancelled successfully');
      
      // Navigate back to dashboard
      navigate('/dashboard', { state: { fromCancellation: true } });
      
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      
      uiToast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : 'Failed to cancel booking',
        variant: "destructive",
      });
      
      setIsSubmitting(false);
    }
  };

  const handleViewReceipt = () => {
    if (!id) return;
    window.open(`/receipt/${id}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-center p-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Return to Dashboard
        </Button>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Booking Not Found</AlertTitle>
          <AlertDescription>The booking you're looking for could not be found.</AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Return to Dashboard
        </Button>
      </div>
    );
  }

  // Check if booking can be modified
  const canModify = ['pending', 'confirmed'].includes(booking.status.toLowerCase());
  
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Edit Booking</h1>
          <p className="text-gray-500">Booking #{booking.bookingNumber}</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Button>
      </div>

      {!canModify && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Booking Cannot Be Modified</AlertTitle>
          <AlertDescription>
            This booking has a status of "{booking.status}" and can no longer be modified.
            You can still view the booking details and receipt.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
              <CardDescription>Trip and vehicle information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <MapPin className="text-blue-500 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="text-xs text-gray-500">PICKUP</p>
                  <p className="font-medium text-gray-800">{booking.pickupLocation}</p>
                </div>
              </div>
              
              {booking.dropLocation && (
                <div className="flex items-start space-x-3">
                  <MapPin className="text-blue-500 mt-1 flex-shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-500">DROP-OFF</p>
                    <p className="font-medium text-gray-800">{booking.dropLocation}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-3">
                <Calendar className="text-blue-500 mt-1 flex-shrink-0" size={18} />
                <div>
                  <p className="text-xs text-gray-500">PICKUP DATE & TIME</p>
                  <p className="font-medium text-gray-800">
                    {new Date(booking.pickupDate).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {booking.returnDate && (
                <div className="flex items-start space-x-3">
                  <Calendar className="text-blue-500 mt-1 flex-shrink-0" size={18} />
                  <div>
                    <p className="text-xs text-gray-500">RETURN DATE & TIME</p>
                    <p className="font-medium text-gray-800">
                      {new Date(booking.returnDate).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-xs text-gray-500">CAB TYPE</p>
                <p className="font-medium text-gray-800">{booking.cabType}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500">TRIP TYPE</p>
                <p className="font-medium text-gray-800">
                  {booking.tripType.toUpperCase()} - {booking.tripMode}
                </p>
              </div>

              {booking.distance > 0 && (
                <div>
                  <p className="text-xs text-gray-500">DISTANCE</p>
                  <p className="font-medium text-gray-800">{booking.distance} km</p>
                </div>
              )}

              {booking.hourlyPackage && (
                <div>
                  <p className="text-xs text-gray-500">PACKAGE</p>
                  <p className="font-medium text-gray-800">{booking.hourlyPackage}</p>
                </div>
              )}

              <Separator />

              <div>
                <p className="text-xs text-gray-500">TOTAL AMOUNT</p>
                <p className="font-bold text-lg">₹{booking.totalAmount.toLocaleString('en-IN')}</p>
              </div>
            </CardContent>
          </Card>

          {(booking.driverName || booking.driverPhone || booking.vehicleNumber) && (
            <Card>
              <CardHeader>
                <CardTitle>Driver & Vehicle</CardTitle>
                <CardDescription>Assigned driver information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {booking.driverName && (
                  <div>
                    <p className="text-xs text-gray-500">DRIVER NAME</p>
                    <p className="font-medium text-gray-800">{booking.driverName}</p>
                  </div>
                )}
                
                {booking.driverPhone && (
                  <div>
                    <p className="text-xs text-gray-500">DRIVER PHONE</p>
                    <p className="font-medium text-gray-800">{booking.driverPhone}</p>
                  </div>
                )}
                
                {booking.vehicleNumber && (
                  <div>
                    <p className="text-xs text-gray-500">VEHICLE NUMBER</p>
                    <p className="font-medium text-gray-800">{booking.vehicleNumber}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between gap-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleViewReceipt}
            >
              View Receipt
            </Button>
            {canModify && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    className="flex items-center gap-2 flex-1"
                    disabled={isSubmitting}
                  >
                    <Trash2 size={16} /> Cancel Booking
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this booking? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No, Keep Booking</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleCancelBooking}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Yes, Cancel Booking
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div>
          <GuestDetailsForm
            onSubmit={handleContactDetailsSubmit}
            totalPrice={totalPrice}
            initialData={booking ? {
              name: booking.passengerName,
              email: booking.passengerEmail,
              phone: booking.passengerPhone
            } : undefined}
            bookingId={id}
            isEditing={canModify}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
