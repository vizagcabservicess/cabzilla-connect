import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, Check, Copy, Phone, Download, Star, MapPin, Calendar, Car, Clock, CreditCard } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import { bookingAPI } from '../services/api/bookingAPI';
import { Booking } from '../types/api';
import { formatDate, formatTime, formatDateTime } from '../lib/dateUtils';
import { formatPrice } from '../lib/cabData';
// Receipt component removed - no longer needed
import { MobileNavigation } from '../components/MobileNavigation';

type NormalizedBooking = Booking & {
  bookingNumber?: string;
  pickupLocation?: string;
  dropLocation?: string;
  pickupDate?: string;
  returnDate?: string;
  cabType?: string;
  distance?: number;
  tripType?: string;
  tripMode?: string;
  totalAmount?: number;
  status?: string;
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  razorpayPaymentId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
};

function BookingConfirmationPage() {
  const location = useLocation();
  const { bookingId: bookingIdParam } = useParams<{ bookingId?: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState<NormalizedBooking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const paymentStatus = booking?.paymentStatus || booking?.status || 'Pending';

  // Debug logging for payment details
  useEffect(() => {
    if (booking) {
      console.log('Payment Status:', paymentStatus);
      console.log('Advance Paid Amount:', booking.advance_paid_amount);
      console.log('Total Amount:', booking.totalAmount);
      console.log('Payment Status Check:', paymentStatus === 'payment_pending' || paymentStatus === 'pending');
      console.log('Advance Amount Check:', booking.advance_paid_amount && booking.advance_paid_amount > 0);
    }
  }, [booking, paymentStatus]);

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
      console.log('Raw booking data from API:', bookingData);
      if (bookingData) {
        const mappedBooking = mapBackendBooking(bookingData);
        console.log('Mapped booking data:', mappedBooking);
        setBooking(mappedBooking);
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

  // Poll the booking briefly to catch status flip after returning from Razorpay
  useEffect(() => {
    const idToPoll = booking?.id || (sessionStorage.getItem('bookingDetails') ? JSON.parse(sessionStorage.getItem('bookingDetails') as string).bookingId : null);
    if (!idToPoll) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts += 1;
      try {
        const b = await bookingAPI.getBookingById(idToPoll as any);
        const normalized = mapBackendBooking(b);
        setBooking(normalized);
        if ((normalized.paymentStatus || normalized.status)?.toLowerCase() === 'paid') {
          clearInterval(interval);
        }
        if (attempts >= 6) {
          clearInterval(interval);
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  const copyBookingId = () => {
    if (booking?.bookingNumber) {
      navigator.clipboard.writeText(booking.bookingNumber);
      toast({
        title: "Booking ID copied!",
        description: `Booking ID ${booking.bookingNumber} copied to clipboard`,
        duration: 3000,
      });
    }
  };

  // Add a mapping function to normalize backend fields to frontend usage
  function mapBackendBooking(booking: any) {
    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber || booking.booking_number,
      pickupLocation: booking.pickupLocation || booking.pickup_location || 'N/A',
      dropLocation: booking.dropLocation || booking.drop_location || 'N/A',
      pickupDate: booking.pickupDate || booking.pickup_date || '',
      returnDate: booking.returnDate || booking.return_date || '',
      cabType: booking.cabType || booking.cab_type || 'N/A',
      distance: booking.distance || 0,
      tripType: booking.tripType || booking.trip_type || 'N/A',
      tripMode: booking.tripMode || booking.trip_mode || 'N/A',
      totalAmount: booking.totalAmount || booking.total_amount || 0,
      status: booking.status,
      passengerName: booking.passengerName || booking.passenger_name || 'N/A',
      passengerPhone: booking.passengerPhone || booking.passenger_phone || 'N/A',
      passengerEmail: booking.passengerEmail || booking.passenger_email || 'N/A',
      paymentStatus: booking.payment_status || booking.status,
      paymentMethod: booking.payment_method || '',
      createdAt: booking.createdAt || booking.created_at || '',
      updatedAt: booking.updatedAt || booking.updated_at || '',
      razorpayPaymentId: booking.razorpay_payment_id || '',
      driverName: booking.driver_name || '',
      driverPhone: booking.driver_phone || '',
      vehicleNumber: booking.vehicle_number || '',
      advance_paid_amount: booking.advance_paid_amount || 0,
    };
  }

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
            <h1 className="text-2xl font-medium text-red-600 mb-4">Error</h1>
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading booking details...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>{error}</p>
                <button
                  onClick={() => navigate('/')}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Go to Home
                </button>
              </div>
            </div>
          ) : booking ? (
            <div className="max-w-4xl mx-auto">
              {/* Success Header */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h1 className="text-2xl font-bold text-green-800">Booking Confirmed!</h1>
                    <p className="text-green-700">Your booking has been successfully confirmed.</p>
                  </div>
                </div>
              </div>

              {/* Receipt Section Removed - PDF receipt is now attached to emails */}

              {/* Booking Details */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Booking Details</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Trip Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Trip Information</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Booking Number:</span>
                        <p className="text-gray-900 font-semibold">{booking.bookingNumber}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Pickup Location:</span>
                        <p className="text-gray-900">{booking.pickupLocation}</p>
                      </div>
                      {booking.dropLocation && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Drop Location:</span>
                          <p className="text-gray-900">{booking.dropLocation}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-500">Pickup Date & Time:</span>
                        <p className="text-gray-900">{formatDateTime(booking.pickupDate)}</p>
                      </div>
                      {booking.returnDate && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Return Date & Time:</span>
                          <p className="text-gray-900">{formatDateTime(booking.returnDate)}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-500">Vehicle Type:</span>
                        <p className="text-gray-900">{booking.cabType}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Trip Type:</span>
                        <p className="text-gray-900">{booking.tripType}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Mode:</span>
                        <p className="text-gray-900">{booking.tripMode}</p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-3">Payment Information</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Payment Status:</span>
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            paymentStatus === 'payment_pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {paymentStatus === 'paid' ? 'PAID' : 
                             paymentStatus === 'payment_pending' ? 'PARTIAL PAYMENT' : 'PENDING'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Payment Method:</span>
                        <p className="text-gray-900">{booking.payment_method || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Total Amount:</span>
                        <p className="text-gray-900 font-semibold">{formatPrice(booking.totalAmount || 0)}</p>
                      </div>
                      
                      {/* Partial Payment Details */}
                      {(paymentStatus === 'payment_pending' || paymentStatus === 'pending') && booking?.advance_paid_amount && booking.advance_paid_amount > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-green-600">
                            Paid: {formatPrice(booking.advance_paid_amount)}
                          </p>
                          <p className="text-sm text-orange-600">
                            Balance: {formatPrice((booking.totalAmount || 0) - (booking.advance_paid_amount || 0))}
                          </p>
                          <p className="text-xs text-gray-500">
                            Partial payment received. Balance to be paid before trip.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Passenger Name:</span>
                    <p className="text-gray-900">{booking.passengerName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Phone Number:</span>
                    <p className="text-gray-900">{booking.passengerPhone}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Email:</span>
                    <p className="text-gray-900">{booking.passengerEmail}</p>
                  </div>
                </div>
              </div>

              {/* Support Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-blue-800 mb-3">Need Help?</h2>
                <p className="text-blue-700 mb-3">
                  If you have any questions or need to modify your booking, please contact our customer support:
                </p>
                <div className="space-y-2">
                  <p className="text-blue-700">
                    <span className="font-medium">Phone:</span> +91 9966363662
                  </p>
                  <p className="text-blue-700">
                    <span className="font-medium">Email:</span> info@vizagtaxihub.com
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Book Another Trip
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Print Confirmation
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <MobileNavigation />
    </div>
  );
}

export default BookingConfirmationPage;
