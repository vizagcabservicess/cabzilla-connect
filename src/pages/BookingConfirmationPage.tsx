
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Calendar, Car, CircleDollarSign, CheckCircle2, ArrowRight, Mail, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { toast } from "sonner";

export default function BookingConfirmationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(10);
  const [emailStatus, setEmailStatus] = useState<'sent' | 'failed' | 'pending' | 'unknown'>('unknown');

  const isNewBooking = location.state?.newBooking === true;
  const emailSent = location.state?.emailSent;

  useEffect(() => {
    if (isNewBooking) {
      if (emailSent === true) {
        setEmailStatus('sent');
        toast.success("Booking confirmation email sent successfully!");
      } else if (emailSent === false) {
        setEmailStatus('failed');
        toast.error("Failed to send confirmation email. We'll try again later.");
      } else if (emailSent === undefined) {
        setEmailStatus('pending');
        toast.info("Email confirmation status is pending. Please check your inbox in a few minutes.");
      }
    }

    // Enhanced booking details retrieval ensuring fare consistency
    let bookingDetailsFromStorage = null;
    try {
      const detailsStr = sessionStorage.getItem('bookingDetails');
      if (detailsStr) {
        const parsedDetails = JSON.parse(detailsStr);
        
        // CRITICAL FIX: Check for consistent fare from global booking fare key
        if (parsedDetails.selectedCab && parsedDetails.tripType) {
          const cabId = parsedDetails.selectedCab.id;
          const tripType = parsedDetails.tripType;
          
          // Try to get the fare from the global booking fare key
          const globalFareLookupKey = `fareBooking_${cabId}_${tripType}`;
          const globalFareStr = localStorage.getItem(globalFareLookupKey) || sessionStorage.getItem(globalFareLookupKey);
          
          if (globalFareStr) {
            try {
              const globalFareData = JSON.parse(globalFareStr);
              
              if (globalFareData.fare && 
                  typeof globalFareData.fare === 'number' && 
                  globalFareData.fare > 0) {
                // Use the fare from the booking fare key
                console.log(`BookingConfirmation: Using consistent fare from booking key: ₹${globalFareData.fare} (Original: ₹${parsedDetails.totalPrice})`);
                parsedDetails.totalPrice = globalFareData.fare;
              }
            } catch (e) {
              console.error('Error parsing global fare data:', e);
            }
          } else {
            // Try alternative approach with simplified key
            const simplifiedKey = `${tripType}_fare_${cabId.toLowerCase()}`;
            const simplifiedFareStr = localStorage.getItem(simplifiedKey) || sessionStorage.getItem(simplifiedKey);
            
            if (simplifiedFareStr) {
              try {
                const simplifiedFareData = JSON.parse(simplifiedFareStr);
                if (simplifiedFareData.fare && 
                    typeof simplifiedFareData.fare === 'number' && 
                    simplifiedFareData.fare > 0) {
                  console.log(`BookingConfirmation: Using consistent fare from simplified key: ₹${simplifiedFareData.fare} (Original: ₹${parsedDetails.totalPrice})`);
                  parsedDetails.totalPrice = simplifiedFareData.fare;
                }
              } catch (e) {
                console.error('Error parsing simplified fare data:', e);
              }
            }
          }
        }
        
        bookingDetailsFromStorage = parsedDetails;
      }
    } catch (error) {
      console.error('Error parsing booking details:', error);
    }
    
    if (bookingDetailsFromStorage) {
      setBookingDetails(bookingDetailsFromStorage);
      console.log('Retrieved booking details:', bookingDetailsFromStorage);
    } else {
      console.error('No booking details found in storage');
    }
  }, [isNewBooking, emailSent]);

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
            {bookingDetails?.bookingNumber && (
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
                    <p className="font-medium">{bookingDetails?.pickupLocation?.name || bookingDetails?.pickupLocation}</p>
                  </div>
                </div>
                
                {bookingDetails?.dropLocation && (
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
                    <p className="font-medium">{bookingDetails?.pickupDate ? formatDate(bookingDetails.pickupDate) : ''}</p>
                  </div>
                </div>

                {bookingDetails?.bookingType === 'airport' && (
                  <>
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Trip Type</p>
                        <p className="font-medium">Airport Transfer</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Total Distance</p>
                        <p className="font-medium">{bookingDetails.distance} KM</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="space-y-4">
                <h2 className="text-lg font-semibold border-b pb-2">Booking Details</h2>
                
                <div className="flex items-start">
                  <Car className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Vehicle Type</p>
                    <p className="font-medium">{bookingDetails?.selectedCab?.name}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CircleDollarSign className="h-5 w-5 mr-3 text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="font-bold text-lg">₹{bookingDetails?.totalPrice?.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                
                <div className={`flex items-start mt-4 p-3 rounded-md border ${
                  emailStatus === 'sent' 
                    ? 'bg-blue-50 border-blue-100' 
                    : emailStatus === 'failed' 
                      ? 'bg-amber-50 border-amber-100' 
                      : emailStatus === 'pending'
                        ? 'bg-purple-50 border-purple-100'
                        : 'bg-gray-50 border-gray-100'
                }`}>
                  {emailStatus === 'sent' ? (
                    <Mail className="h-5 w-5 mr-3 text-blue-500 mt-1" />
                  ) : emailStatus === 'failed' ? (
                    <AlertTriangle className="h-5 w-5 mr-3 text-amber-500 mt-1" />
                  ) : emailStatus === 'pending' ? (
                    <Loader2 className="h-5 w-5 mr-3 text-purple-500 mt-1 animate-spin" />
                  ) : (
                    <Mail className="h-5 w-5 mr-3 text-gray-500 mt-1" />
                  )}
                  
                  <div>
                    <p className={`text-sm font-medium ${
                      emailStatus === 'sent' 
                        ? 'text-blue-800' 
                        : emailStatus === 'failed' 
                          ? 'text-amber-800' 
                          : emailStatus === 'pending'
                            ? 'text-purple-800'
                            : 'text-gray-800'
                    }`}>
                      {emailStatus === 'sent' 
                        ? 'Email Confirmation Sent' 
                        : emailStatus === 'failed' 
                          ? 'Email Delivery Failed' 
                          : emailStatus === 'pending'
                            ? 'Email Delivery in Progress'
                            : 'Email Confirmation'}
                    </p>
                    <p className={`text-sm ${
                      emailStatus === 'sent' 
                        ? 'text-blue-600' 
                        : emailStatus === 'failed' 
                          ? 'text-amber-600' 
                          : emailStatus === 'pending'
                            ? 'text-purple-600'
                            : 'text-gray-600'
                    }`}>
                      {emailStatus === 'sent' 
                        ? `A confirmation has been sent to ${bookingDetails?.guestDetails?.email || bookingDetails?.passengerEmail || 'your email'}`
                        : emailStatus === 'failed' 
                          ? 'We could not send an email confirmation. Please save your booking number.'
                          : emailStatus === 'pending'
                            ? 'Your confirmation email is being processed. Please check your inbox in a few minutes.'
                            : 'Please check your email for booking details'}
                    </p>
                    
                    {emailStatus === 'failed' && (
                      <div className="mt-3">
                        <p className="text-sm text-amber-700 mb-2">
                          Please make a note of your booking number shown above. You can also view your booking in your dashboard.
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-amber-700 border-amber-300 hover:bg-amber-50"
                          onClick={() => {
                            if (bookingDetails?.bookingNumber) {
                              navigator.clipboard.writeText(bookingDetails.bookingNumber);
                              toast.success("Booking number copied to clipboard");
                            }
                          }}
                        >
                          Copy Booking Number
                        </Button>
                      </div>
                    )}
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
