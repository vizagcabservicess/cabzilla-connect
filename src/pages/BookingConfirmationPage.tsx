
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Calendar, Car, CircleDollarSign, CheckCircle2, ArrowRight, Mail } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default function BookingConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(10);

  // Check if this is a new booking, which would trigger automatic redirect
  const isNewBooking = location.state?.newBooking === true;

  useEffect(() => {
    const bookingDetailsFromStorage = sessionStorage.getItem('bookingDetails');
    if (bookingDetailsFromStorage) {
      try {
        const parsedDetails = JSON.parse(bookingDetailsFromStorage);
        setBookingDetails(parsedDetails);
      } catch (error) {
        console.error('Error parsing booking details:', error);
      }
    }
  }, []);

  // Auto redirect after 10 seconds if it's a new booking
  useEffect(() => {
    if (isNewBooking) {
      const intervalId = setInterval(() => {
        setSecondsRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalId);
            navigate('/dashboard', { state: { fromBooking: true } });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [isNewBooking, navigate]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-2xl font-bold mb-4">No Booking Found</h1>
            <p className="text-gray-600 mb-6">We couldn't find any booking details. Please try again.</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Return to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-green-500 p-6 text-white text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Booking Confirmed!</h1>
            <p className="mt-2">Your booking has been successfully confirmed.</p>
            {bookingDetails.bookingNumber && (
              <div className="mt-3 bg-white text-green-800 py-2 px-4 rounded-md inline-block font-bold">
                Booking #: {bookingDetails.bookingNumber}
              </div>
            )}
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">Trip Details</h2>
                
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Pickup Location</p>
                    <p className="font-medium">{bookingDetails.pickupLocation?.name || bookingDetails.pickupLocation}</p>
                  </div>
                </div>
                
                {bookingDetails.dropLocation && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Drop Location</p>
                      <p className="font-medium">{bookingDetails.dropLocation?.name || bookingDetails.dropLocation}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Pickup Date & Time</p>
                    <p className="font-medium">{formatDate(bookingDetails.pickupDate)}</p>
                  </div>
                </div>
                
                {bookingDetails.bookingType === 'tour' && bookingDetails.tourName && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Tour Package</p>
                      <p className="font-medium">{bookingDetails.tourName}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">Booking Details</h2>
                
                <div className="flex items-start">
                  <Car className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Vehicle Type</p>
                    <p className="font-medium">{bookingDetails.selectedCab?.name}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CircleDollarSign className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="font-bold text-lg">₹{bookingDetails.totalPrice?.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                
                <div className="flex items-start mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                  <Mail className="h-5 w-5 mr-3 text-blue-500 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Email Confirmation</p>
                    <p className="text-sm text-blue-600">
                      A confirmation has been sent to your email{' '}
                      {bookingDetails.guestDetails?.email && (
                        <span className="font-medium">{bookingDetails.guestDetails.email}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-6 flex flex-col-reverse md:flex-row justify-between items-center gap-4">
              {isNewBooking ? (
                <p className="text-gray-600">
                  Redirecting to your dashboard in {secondsRemaining} seconds...
                </p>
              ) : (
                <p className="text-gray-600">
                  A confirmation has been sent to your registered email and phone number.
                </p>
              )}
              <Button onClick={() => navigate('/dashboard', { state: { fromBooking: true } })} size="lg" className="bg-blue-600 hover:bg-blue-700 flex items-center">
                View My Bookings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
