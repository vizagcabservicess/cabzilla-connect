import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Check, Copy, Phone, Download, Star, MapPin, Calendar, Car, Clock, CreditCard } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { bookingAPI } from '@/services/api';
import { Booking } from '@/types/api';
import { formatDate, formatTime } from '@/lib/dateUtils';
import { formatPrice } from '@/lib/cabData';

function BookingConfirmationPage() {
  const location = useLocation();
  const { bookingId: bookingIdParam } = useParams<{ bookingId?: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we have a booking ID in the URL, fetch that booking
    if (bookingIdParam) {
      fetchBookingById(bookingIdParam);
    } else {
      // Otherwise, try to get the booking from session storage
      try {
        const bookingDetails = sessionStorage.getItem('bookingDetails');
        
        if (bookingDetails) {
          const parsedDetails = JSON.parse(bookingDetails);
          if (parsedDetails.bookingId) {
            fetchBookingById(parsedDetails.bookingId);
          } else {
            setError('No booking ID found in session storage');
            setLoading(false);
          }
        } else {
          setError('No booking found in session storage');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error retrieving booking from session storage:', error);
        setError('Error retrieving booking details');
        setLoading(false);
      }
    }
  }, [bookingIdParam]);

  const fetchBookingById = async (id: string | number) => {
    try {
      setLoading(true);
      const bookingData = await bookingAPI.getBookingById(id);
      if (bookingData) {
        setBooking(bookingData);
      } else {
        setError('Booking not found');
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError('Error loading booking details');
    } finally {
      setLoading(false);
    }
  };

  const copyBookingId = () => {
    if (booking?.booking_number) {
      navigator.clipboard.writeText(booking.booking_number);
      toast({
        title: "Booking ID copied!",
        description: `Booking ID ${booking.booking_number} copied to clipboard`,
        duration: 3000,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-lg mx-auto bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
            <p className="text-gray-700 mb-6">{error}</p>
            <div className="flex justify-between">
              <Button onClick={() => navigate('/')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
              <Button onClick={() => navigate('/cabs')}>
                Book a New Ride
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Button variant="outline" onClick={() => navigate('/')} className="text-gray-600">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            {booking?.id && (
              <Link to={`/receipt/${booking.id}`}>
                <Button variant="outline" className="text-gray-600">
                  <Download className="mr-2 h-4 w-4" />
                  View Receipt
                </Button>
              </Link>
            )}
          </div>
          
          <Card className="p-6 border rounded-lg shadow-sm bg-white">
            <div className="mb-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-green-100 p-4">
                  <Check className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
              {booking?.booking_number && (
                <div className="flex items-center justify-center gap-2">
                  <p className="text-gray-500">Booking ID: <span className="font-medium">{booking.booking_number}</span></p>
                  <button onClick={copyBookingId} className="text-blue-500 hover:text-blue-600">
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              {booking?.payment_status && (
                <div className="mt-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    booking.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                    booking.payment_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    <CreditCard className="mr-1 h-3 w-3" />
                    Payment {booking.payment_status === 'paid' ? 'Completed' : 'Pending'}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div>
                <h2 className="font-semibold text-lg mb-4">Trip Details</h2>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Pickup Location</p>
                      <p className="font-medium">{booking?.pickup_location}</p>
                    </div>
                  </div>
                  
                  {booking?.drop_location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Drop Location</p>
                        <p className="font-medium">{booking.drop_location}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Pickup Date & Time</p>
                      <p className="font-medium">
                        {booking?.pickup_date ? (
                          <>
                            {formatDate(new Date(booking.pickup_date))} at {formatTime(new Date(booking.pickup_date))}
                          </>
                        ) : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  
                  {booking?.return_date && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Return Date & Time</p>
                        <p className="font-medium">
                          {formatDate(new Date(booking.return_date))} at {formatTime(new Date(booking.return_date))}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <Car className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Vehicle Type</p>
                      <p className="font-medium">{booking?.cab_type}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Trip Type</p>
                      <p className="font-medium capitalize">
                        {booking?.trip_type} {booking?.trip_mode && `(${booking.trip_mode.replace('-', ' ')})`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="font-semibold text-lg mb-4">Passenger & Payment</h2>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-5 w-5 flex items-center justify-center text-blue-500 mt-0.5">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contact</p>
                      <p className="font-medium">{booking?.passenger_name}</p>
                      <p className="text-sm">{booking?.passenger_phone}</p>
                      <p className="text-sm">{booking?.passenger_email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Payment Details</p>
                      <p className="font-medium">
                        ₹{booking?.total_amount ? formatPrice(booking.total_amount) : '0'}
                      </p>
                      <p className="text-sm capitalize">
                        Status: <span className={`
                          ${booking?.payment_status === 'paid' ? 'text-green-600' : 
                            booking?.payment_status === 'pending' ? 'text-yellow-600' : 'text-red-600'}
                        `}>
                          {booking?.payment_status || 'Pending'}
                        </span>
                      </p>
                      
                      {booking?.payment_method && (
                        <p className="text-sm">
                          Method: <span className="capitalize">{booking.payment_method}</span>
                        </p>
                      )}
                      
                      {booking?.razorpay_payment_id && (
                        <p className="text-sm">
                          Razorpay ID: <span className="font-mono text-xs">{booking.razorpay_payment_id}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {booking?.driver_name && (
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-5 flex items-center justify-center text-green-500 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Driver</p>
                        <p className="font-medium">{booking.driver_name}</p>
                        {booking.driver_phone && <p className="text-sm">{booking.driver_phone}</p>}
                        {booking.vehicle_number && <p className="text-sm text-gray-600">Vehicle: {booking.vehicle_number}</p>}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-8">
                  {booking?.payment_status !== 'paid' && (
                    <Link to="/payment">
                      <Button className="w-full">
                        Complete Payment
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-6 mt-8">
              <p className="text-center text-gray-500 text-sm">
                Thank you for booking with us! If you have any questions or need assistance,
                please contact our customer support.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default BookingConfirmationPage;
