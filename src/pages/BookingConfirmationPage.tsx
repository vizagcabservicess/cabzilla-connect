import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ArrowLeft, Check, Copy, Phone, Download, Star, MapPin, Calendar, Car, Clock, CreditCard } from 'lucide-react';
import { useToast } from '../components/ui/use-toast';
import { bookingAPI } from '../services/api/bookingAPI';
import { Booking, BookingStatus } from '../types/api';
import { formatDate, formatTime, formatDateTime } from '../lib/dateUtils';
import { formatPrice } from '../lib/cabData';
import { formatLocationForDisplay } from '../utils/locationUtils';
// Receipt component removed - no longer needed
import { MobileNavigation } from '../components/MobileNavigation';

type NormalizedBooking = Booking & {
  // Additional properties for frontend usage
  razorpayPaymentId?: string;
  passengerCountryCode?: string;
  additionalRequirements?: string;
};

function BookingConfirmationPage() {
  const location = useLocation();
  const { bookingId: bookingIdParam } = useParams<{ bookingId?: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState<NormalizedBooking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const paymentStatus = booking?.payment_status || booking?.paymentStatus || booking?.status || 'Pending';

  // Debug logging for payment details
  useEffect(() => {
    if (booking) {
      console.log('=== BOOKING CONFIRMATION DEBUG ===');
      console.log('Full booking object:', booking);
      console.log('Payment Status (payment_status):', booking.payment_status);
      console.log('Payment Status (paymentStatus):', booking.paymentStatus);
      console.log('Status:', booking.status);
      console.log('Final Payment Status:', paymentStatus);
      console.log('Advance Paid Amount:', booking.advance_paid_amount);
      console.log('Total Amount:', booking.totalAmount);
      console.log('Payment Status Check:', paymentStatus === 'payment_pending' || paymentStatus === 'pending');
      console.log('Advance Amount Check:', booking.advance_paid_amount && booking.advance_paid_amount > 0);
      console.log('Pickup Date Raw:', booking.pickupDate);
      console.log('Pickup Date Formatted:', booking.pickupDate ? formatDateTime(booking.pickupDate) : 'N/A');
      console.log('=== END DEBUG ===');
    }
  }, [booking, paymentStatus]);

  useEffect(() => {
    // If we have a booking ID in the URL, fetch that booking
    if (bookingIdParam) {
      fetchBookingById(bookingIdParam);
    } else {
      // Otherwise, try to get the booking from session storage
      try {
        // Check both 'bookingDetails' and 'lastBooking' keys
        let bookingDetails = sessionStorage.getItem('bookingDetails');
        let lastBooking = sessionStorage.getItem('lastBooking');
        
        console.log('SessionStorage bookingDetails:', bookingDetails);
        console.log('SessionStorage lastBooking:', lastBooking);
        
        if (bookingDetails) {
          const parsedDetails = JSON.parse(bookingDetails);
          if (parsedDetails.bookingId) {
            fetchBookingById(parsedDetails.bookingId);
          } else {
            setError('No booking ID found in session storage');
            setLoading(false);
          }
        } else if (lastBooking) {
          const parsedLastBooking = JSON.parse(lastBooking);
          if (parsedLastBooking.id) {
            fetchBookingById(parsedLastBooking.id);
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
        // Fallback to sessionStorage if API returns no data
        console.log('API returned no data, falling back to sessionStorage');
        let sessionData = sessionStorage.getItem('bookingDetails');
        if (!sessionData) {
          sessionData = sessionStorage.getItem('lastBooking');
        }
        if (sessionData) {
          try {
            const parsedData = JSON.parse(sessionData);
                         console.log('SessionStorage data:', parsedData);
             // Map sessionStorage data to the same format
             const mappedSessionData: NormalizedBooking = {
               id: parsedData.bookingId || parsedData.id,
               user_id: 0, // Default for guest bookings
               bookingNumber: parsedData.bookingNumber || parsedData.bookingId || parsedData.id,
               pickup_location: parsedData.pickupLocation?.name || parsedData.pickupLocation?.address || '',
               pickupLocation: parsedData.pickupLocation?.name || parsedData.pickupLocation?.address || '',
               drop_location: parsedData.dropLocation?.name || parsedData.dropLocation?.address || '',
               dropLocation: parsedData.dropLocation?.name || parsedData.dropLocation?.address || '',
               pickup_date: parsedData.pickupDate || '',
               pickupDate: parsedData.pickupDate || '',
               return_date: parsedData.returnDate || '',
               trip_type: parsedData.tripType || '',
               tripType: parsedData.tripType || '',
               trip_mode: parsedData.tripMode || '',
               tripMode: parsedData.tripMode || '',
               vehicle_type: parsedData.selectedCab?.name || '',
               cabType: parsedData.selectedCab?.name || '',
               fare: parsedData.totalPrice || parsedData.totalAmount || 0,
               totalAmount: parsedData.totalPrice || parsedData.totalAmount || 0,
               status: 'confirmed' as BookingStatus,
               payment_status: parsedData.paymentStatus || 'pending',
               payment_method: '',
               advance_paid_amount: parsedData.advance_paid_amount || 0,
               created_at: new Date().toISOString(),
               updated_at: new Date().toISOString(),
               updatedAt: new Date().toISOString(),
               passengerName: parsedData.guestDetails?.name || '',
               passengerPhone: parsedData.guestDetails?.phone || '',
               passengerCountryCode: parsedData.guestDetails?.countryCode || '+91',
               passengerEmail: parsedData.guestDetails?.email || '',
               additionalRequirements: parsedData.guestDetails?.additionalRequirements || '',
               driverName: parsedData.driverName || '',
               driverPhone: parsedData.driverPhone || '',
               vehicleNumber: parsedData.vehicleNumber || '',
               razorpayPaymentId: '',
             };
                         console.log('Mapped sessionStorage data:', mappedSessionData);
             setBooking(mappedSessionData);
          } catch (sessionError) {
            console.error('Error parsing sessionStorage data:', sessionError);
            setError('Error loading booking details');
          }
        } else {
          setError('Booking not found');
        }
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      // Fallback to sessionStorage on API error
      console.log('API error, falling back to sessionStorage');
      let sessionData = sessionStorage.getItem('bookingDetails');
      if (!sessionData) {
        sessionData = sessionStorage.getItem('lastBooking');
      }
      if (sessionData) {
        try {
          const parsedData = JSON.parse(sessionData);
          console.log('SessionStorage data (fallback):', parsedData);
                                // Map sessionStorage data to the same format
            const mappedSessionData: NormalizedBooking = {
              id: parsedData.bookingId || parsedData.id,
              user_id: 0, // Default for guest bookings
              bookingNumber: parsedData.bookingNumber || parsedData.bookingId || parsedData.id,
              pickup_location: parsedData.pickupLocation?.name || parsedData.pickupLocation?.address || '',
              pickupLocation: parsedData.pickupLocation?.name || parsedData.pickupLocation?.address || '',
              drop_location: parsedData.dropLocation?.name || parsedData.dropLocation?.address || '',
              dropLocation: parsedData.dropLocation?.name || parsedData.dropLocation?.address || '',
              pickup_date: parsedData.pickupDate || '',
              pickupDate: parsedData.pickupDate || '',
              return_date: parsedData.returnDate || '',
              trip_type: parsedData.tripType || '',
              tripType: parsedData.tripType || '',
              trip_mode: parsedData.tripMode || '',
              tripMode: parsedData.tripMode || '',
              vehicle_type: parsedData.selectedCab?.name || '',
              cabType: parsedData.selectedCab?.name || '',
              fare: parsedData.totalPrice || parsedData.totalAmount || 0,
              totalAmount: parsedData.totalPrice || parsedData.totalAmount || 0,
              status: 'confirmed' as BookingStatus,
              payment_status: parsedData.paymentStatus || 'pending',
              payment_method: '',
              advance_paid_amount: parsedData.advance_paid_amount || 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              passengerName: parsedData.guestDetails?.name || '',
              passengerPhone: parsedData.guestDetails?.phone || '',
              passengerCountryCode: parsedData.guestDetails?.countryCode || '+91',
              passengerEmail: parsedData.guestDetails?.email || '',
              additionalRequirements: parsedData.guestDetails?.additionalRequirements || '',
              driverName: parsedData.driverName || '',
              driverPhone: parsedData.driverPhone || '',
              vehicleNumber: parsedData.vehicleNumber || '',
              razorpayPaymentId: '',
            };
                                             console.log('Mapped sessionStorage data (fallback):', mappedSessionData);
             setBooking(mappedSessionData);
        } catch (sessionError) {
          console.error('Error parsing sessionStorage data:', sessionError);
          setError('Error loading booking details');
        }
      } else {
        setError('Error loading booking details');
      }
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
        if ((normalized.payment_status || normalized.status)?.toLowerCase() === 'paid') {
          clearInterval(interval);
        }
        if (attempts >= 6) {
          clearInterval(interval);
        }
      } catch (e) {
        console.log('Polling stopped due to error:', e);
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

  const handleDownloadReceipt = async () => {
    try {
      // Show loading state
      toast({
        title: "Generating Receipt",
        description: "Please wait while we prepare your receipt...",
        duration: 2000,
      });

      // Get the print content
      const printContent = document.getElementById('print-content');
      if (!printContent) {
        toast({
          title: "Error",
          description: "Receipt content not found. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast({
          title: "Error",
          description: "Please allow popups to download the receipt.",
          variant: "destructive",
        });
        return;
      }

      // Get the receipt content
      const receiptContent = printContent.innerHTML;
      
      // Create the HTML document
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Receipt - ${booking?.bookingNumber || 'N/A'}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              background: white;
              color: #000;
              line-height: 1.4;
            }
            
            .invoice-container {
              background: white;
              padding: 32px;
              min-height: 100vh;
              font-family: Arial, sans-serif;
              color: #000;
            }
            
            .invoice-header {
              border-bottom: 2px solid #ccc;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            
            .invoice-section {
              margin-bottom: 24px;
            }
            
            .invoice-section h3 {
              font-size: 18px;
              font-weight: 600;
              color: #000;
              margin-bottom: 12px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 8px;
            }
            
            .invoice-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            
            .invoice-amount-box {
              background: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              padding: 16px;
            }
            
            .invoice-footer {
              border-top: 1px solid #eee;
              padding-top: 16px;
              margin-top: 24px;
            }
            
            @media print {
              body { margin: 0; padding: 0; }
              .invoice-container { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
        </html>
      `;

      // Write content to the new window
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };

      toast({
        title: "Receipt Ready",
        description: "Your receipt has been prepared for download.",
        duration: 3000,
      });

    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: "Error",
        description: "Failed to generate receipt. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Add a mapping function to normalize backend fields to frontend usage
  function mapBackendBooking(booking: any): NormalizedBooking {
    console.log('Mapping booking data:', booking);
    
    return {
      id: booking.id,
      user_id: booking.userId || 0,
      bookingNumber: booking.bookingNumber || '',
      pickup_location: booking.pickupLocation || '',
      pickupLocation: booking.pickupLocation || '',
      drop_location: booking.dropLocation || '',
      dropLocation: booking.dropLocation || '',
      pickup_date: booking.pickupDate || '',
      pickupDate: booking.pickupDate || '',
      return_date: booking.returnDate || '',
      trip_type: booking.tripType || '',
      tripType: booking.tripType || '',
      trip_mode: booking.tripMode || '',
      tripMode: booking.tripMode || '',
      vehicle_type: booking.cabType || '',
      cabType: booking.cabType || '',
      fare: booking.totalAmount || 0,
      totalAmount: booking.totalAmount || 0,
      status: booking.status || 'confirmed',
      payment_status: booking.payment_status || 'pending',
      payment_method: booking.payment_method || '',
      advance_paid_amount: booking.advance_paid_amount || 0,
      created_at: booking.createdAt || new Date().toISOString(),
      updated_at: booking.updatedAt || new Date().toISOString(),
      updatedAt: booking.updatedAt || new Date().toISOString(),
      passengerName: booking.passengerName || '',
      passengerPhone: booking.passengerPhone || '',
      passengerCountryCode: booking.passengerCountryCode || booking.passenger_country_code || '+91',
      passengerEmail: booking.passengerEmail || '',
      additionalRequirements: booking.additionalRequirements || booking.additional_requirements || '',
      driverName: booking.driverName || '',
      driverPhone: booking.driverPhone || '',
      vehicleNumber: booking.vehicleNumber || '',
      razorpayPaymentId: booking.razorpayPaymentId || '',
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
              <Button onClick={() => navigate('/local-taxi')}>
                Book a New Ride
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Booking Confirmed - Vizag Taxi Hub | Your Trip is Confirmed</title>
        <meta name="description" content="Your cab booking has been successfully confirmed with Vizag Taxi Hub. View booking details, driver information, and download your receipt." />
        <meta name="keywords" content="booking confirmed, cab booking confirmation, taxi booking success, vizag taxi booking" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Print Styles */}
        <style>{`
          /* Hide print-only content on screen */
          .print-only { 
            display: none !important; 
          }
          
          /* Show print-only content when printing */
          @media print {
            * { 
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            .no-print { 
              display: none !important; 
            }
            
            .print-only { 
              display: block !important; 
              border: none !important;
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            
            body { 
              margin: 0 !important; 
              padding: 0 !important; 
              background: white !important; 
            }
            
            .invoice-container { 
              display: block !important; 
              background: white !important; 
              color: black !important;
              font-family: Arial, sans-serif !important;
              width: 100% !important;
              height: auto !important;
            }
            
            .invoice-header { 
              border-bottom: 2px solid #ccc !important; 
              padding-bottom: 16px !important; 
              margin-bottom: 24px !important; 
            }
            
            .invoice-section { 
              margin-bottom: 24px !important; 
            }
            
            .invoice-section h3 { 
              font-size: 18px !important; 
              font-weight: 600 !important; 
              color: #000 !important; 
              margin-bottom: 12px !important; 
              border-bottom: 1px solid #ddd !important; 
              padding-bottom: 4px !important; 
            }
            
            .invoice-grid { 
              display: grid !important; 
              grid-template-columns: 1fr 1fr !important; 
              gap: 16px !important; 
            }
            
            .invoice-grid-3 { 
              display: grid !important; 
              grid-template-columns: 1fr 1fr 1fr !important; 
              gap: 16px !important; 
            }
            
            .invoice-amount-box { 
              background: #f5f5f5 !important; 
              padding: 16px !important; 
              border-radius: 4px !important; 
            }
            
            .invoice-footer { 
              border-top: 1px solid #ccc !important; 
              padding-top: 16px !important; 
              margin-top: 32px !important; 
            }
          }
        `}</style>
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/booking-confirmation" />
        <meta property="og:title" content="Booking Confirmed - Vizag Taxi Hub | Your Trip is Confirmed" />
        <meta property="og:description" content="Your cab booking has been successfully confirmed with Vizag Taxi Hub. View booking details and driver information." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Vizag Taxi Hub" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/booking-confirmation" />
        <meta property="twitter:title" content="Booking Confirmed - Vizag Taxi Hub | Your Trip is Confirmed" />
        <meta property="twitter:description" content="Your cab booking has been successfully confirmed with Vizag Taxi Hub." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://vizagtaxihub.com/booking-confirmation" />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="no-print">
          <Navbar />
        </div>
        <main className="flex-1 no-print">
          <div className="container mx-auto px-4 py-8 no-print">
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
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 mt-24">
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
                          {(() => {
                            const pickup = formatLocationForDisplay(booking.pickupLocation);
                            return (
                              <div>
                                <p className="text-gray-900 font-semibold">{pickup.name}</p>
                                {pickup.address && pickup.address !== pickup.name && (
                                  <p className="text-sm text-gray-600 mt-1">{pickup.address}</p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        {booking.dropLocation && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Drop Location:</span>
                            {(() => {
                              const drop = formatLocationForDisplay(booking.dropLocation);
                              return (
                                <div>
                                  <p className="text-gray-900 font-semibold">{drop.name}</p>
                                  {drop.address && drop.address !== drop.name && (
                                    <p className="text-sm text-gray-600 mt-1">{drop.address}</p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-gray-500">Pickup Date & Time:</span>
                          <p className="text-gray-900">
                            {booking.pickupDate ? (
                              <>
                                {formatDateTime(booking.pickupDate)}
                                <br />
                                
                              </>
                            ) : 'N/A'}
                          </p>
                        </div>
                                             {booking.return_date && (
                           <div>
                             <span className="text-sm font-medium text-gray-500">Return Date & Time:</span>
                             <p className="text-gray-900">{formatDateTime(booking.return_date)}</p>
                           </div>
                         )}
                        <div>
                          <span className="text-sm font-medium text-gray-500">Vehicle Type:</span>
                          <p className="text-gray-900">{booking.cabType || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Trip Type:</span>
                          <p className="text-gray-900">{booking.tripType || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Mode:</span>
                          <p className="text-gray-900">{booking.tripMode || 'N/A'}</p>
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
                      <p className="text-gray-900">{booking.passengerName || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Phone Number:</span>
                      <p className="text-gray-900">{booking.passengerPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Email:</span>
                      <p className="text-gray-900">{booking.passengerEmail || 'N/A'}</p>
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
                    onClick={handleDownloadReceipt}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    Download Receipt
                  </button>
                </div>

                {/* Print-Only Invoice Layout */}
                <div className="print-only" id="print-content">
                  
                  <div className="invoice-container" style={{ 
                    background: 'white', 
                    padding: '32px', 
                    minHeight: '100vh',
                    fontFamily: 'Arial, sans-serif',
                    color: '#000'
                  }}>
                    {/* Invoice Header */}
                    <div className="invoice-header">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ marginBottom: '8px' }}>
                                <img 
                                  src="https://vizagtaxihub.com/uploads/vizagtaxihub-logo.png" 
                                  alt="Vizag Taxi Hub Logo"
                                  style={{ 
                                    width: '182px', 
                                    height: '48px', 
                                    objectFit: 'contain'
                                  }}
                                />
                              </div>
                              <div>
                                <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '2px', color: '#000', lineHeight: '1.1' }}>
                                  VIZAG TAXI HUB
                                </h1>
                                
                              </div>
                            </div>
                          
                        </div>
                        <div style={{ textAlign: 'right', flex: 1 }}>
                          <div style={{ 
                            backgroundColor: '#f8f9fa', 
                            padding: '16px', 
                            borderRadius: '8px',
                            border: '1px solid #e9ecef'
                          }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '6px', color: '#000' }}>PAYMENT RECEIPT</h2>
                            <p style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}><strong>Receipt #:</strong> {booking?.bookingNumber}</p>
                            <p style={{ fontSize: '12px', color: '#666', marginBottom: '3px' }}><strong>Date:</strong> {booking?.pickupDate ? formatDateTime(booking.pickupDate) : 'N/A'}</p>
                            <p style={{ fontSize: '10px', color: '#999' }}>Generated: {new Date().toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="invoice-section">
                      <h3 style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#000', 
                        marginBottom: '12px',
                        borderBottom: '1px solid #1e40af',
                        paddingBottom: '4px'
                      }}>👤 Booking Details</h3>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr 1fr', 
                        gap: '12px',
                        backgroundColor: '#f8f9fa',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div>
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer Name</span>
                            <p style={{ fontSize: '11px', color: '#000', margin: '2px 0 0 0', fontWeight: '500' }}>{booking?.passengerName || 'N/A'}</p>
                          </div>
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</span>
                            <p style={{ fontSize: '11px', color: '#000', margin: '2px 0 0 0', fontWeight: '500' }}>{booking?.passengerPhone || 'N/A'}</p>
                          </div>
                          <div>
                            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</span>
                            <p style={{ fontSize: '11px', color: '#000', margin: '2px 0 0 0', fontWeight: '500' }}>{booking?.passengerEmail || 'N/A'}</p>
                          </div>
                        </div>
                        <div>
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Booking ID</span>
                            <p style={{ fontSize: '11px', color: '#000', margin: '2px 0 0 0', fontWeight: '500' }}>{booking?.bookingNumber}</p>
                          </div>
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trip Type</span>
                            <p style={{ fontSize: '11px', color: '#000', margin: '2px 0 0 0', fontWeight: '500' }}>{booking?.tripType?.toUpperCase() || 'N/A'}</p>
                          </div>
                          <div>
                            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trip Mode</span>
                            <p style={{ fontSize: '11px', color: '#000', margin: '2px 0 0 0', fontWeight: '500' }}>{booking?.tripMode || 'N/A'}</p>
                          </div>
                        </div>
                        <div>
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle Type</span>
                            <p style={{ fontSize: '11px', color: '#000', margin: '2px 0 0 0', fontWeight: '500' }}>{booking?.vehicle_type || 'N/A'}</p>
                          </div>
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Driver</span>
                            <p style={{ fontSize: '11px', color: '#000', margin: '2px 0 0 0', fontWeight: '500' }}>{booking?.driverName || 'To be assigned'}</p>
                          </div>
                          <div>
                            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                            <p style={{ fontSize: '11px', color: '#000', margin: '2px 0 0 0', fontWeight: '500' }}>{booking?.status || 'Confirmed'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trip Details */}
                    <div className="invoice-section">
                      <h3 style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#000', 
                        marginBottom: '12px',
                        borderBottom: '1px solid #1e40af',
                        paddingBottom: '4px'
                      }}>🚗 Trip Details</h3>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '12px',
                        marginBottom: '12px'
                      }}>
                        <div style={{
                          backgroundColor: '#e8f5e8',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid #c3e6c3'
                        }}>
                          <h4 style={{ fontSize: '10px', fontWeight: '600', marginBottom: '4px', color: '#2d5a2d', display: 'flex', alignItems: 'center' }}>
                            📍 PICKUP LOCATION
                          </h4>
                          {(() => {
                            const pickup = formatLocationForDisplay(booking?.pickupLocation || '');
                            return (
                              <div>
                                <p style={{ fontSize: '12px', color: '#000', fontWeight: '500', marginBottom: '2px' }}>{pickup.name}</p>
                                {pickup.address && pickup.address !== pickup.name && (
                                  <p style={{ fontSize: '10px', color: '#666', margin: '0' }}>{pickup.address}</p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{
                          backgroundColor: '#ffe8e8',
                          padding: '8px',
                          borderRadius: '6px',
                          border: '1px solid #ffc3c3'
                        }}>
                          <h4 style={{ fontSize: '10px', fontWeight: '600', marginBottom: '4px', color: '#5a2d2d', display: 'flex', alignItems: 'center' }}>
                            📍 DROP LOCATION
                          </h4>
                          {(() => {
                            const drop = formatLocationForDisplay(booking?.dropLocation || '');
                            return (
                              <div>
                                <p style={{ fontSize: '12px', color: '#000', fontWeight: '500', marginBottom: '2px' }}>{drop.name}</p>
                                {drop.address && drop.address !== drop.name && (
                                  <p style={{ fontSize: '10px', color: '#666', margin: '0' }}>{drop.address}</p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div style={{ 
                        backgroundColor: '#f8f9fa',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                          <div>
                            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pickup Date & Time</span>
                            <p style={{ fontSize: '12px', color: '#000', margin: '2px 0 0 0', fontWeight: '500' }}>{booking?.pickupDate ? formatDateTime(booking.pickupDate) : 'N/A'}</p>
                          </div>
                          <div>
                            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Status</span>
                          <p style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: paymentStatus === 'paid' ? '#dcfce7' : 
                                           paymentStatus === 'payment_pending' ? '#fef3c7' : '#fecaca',
                            color: paymentStatus === 'paid' ? '#166534' : 
                                   paymentStatus === 'payment_pending' ? '#92400e' : '#991b1b'
                          }}>
                            {paymentStatus === 'paid' ? 'PAID' : 
                             paymentStatus === 'payment_pending' ? 'PARTIAL PAYMENT' : 'PENDING'}
                          </p>
                          </div>
                          <div>

                            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Method</span>
                          <p style={{ fontSize: '12px', color: '#000', margin: '2px 0 0 0', fontWeight: '500' }}>{booking?.payment_method || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                   

                    {/* Payment Summary */}
                    <div className="invoice-section">
                      <h3>Payment Summary</h3>
                      <div className="invoice-amount-box">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', color: '#666' }}>Total Amount:</span>
                          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>{formatPrice(booking?.totalAmount || 0)}</span>
                        </div>
                        {booking?.advance_paid_amount && booking.advance_paid_amount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '14px', color: '#666' }}>Advance Paid:</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>{formatPrice(booking.advance_paid_amount)}</span>
                          </div>
                        )}
                        {booking?.advance_paid_amount && booking.advance_paid_amount > 0 && booking?.totalAmount && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
                            <span style={{ fontSize: '14px', color: '#666' }}>Remaining Amount:</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#ea580c' }}>
                              {formatPrice(booking.totalAmount - booking.advance_paid_amount)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Trip Details and Limits */}
                    <div className="invoice-section">
                      <h3 style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#000', 
                        marginBottom: '12px',
                        borderBottom: '1px solid #1e40af',
                        paddingBottom: '4px'
                      }}>📋 Trip Details & Limits</h3>
                      
                      {/* Kilometers Limit */}
                      <div style={{ 
                        backgroundColor: '#f8f9fa',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef',
                        marginBottom: '12px'
                      }}>
                        <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#000' }}>🛣️ Kilometers Limit</h4>
                        <p style={{ fontSize: '11px', color: '#000', margin: '0' }}>
                          {booking?.tripType === 'local' 
                            ? `${booking?.km_included || '80'} km included. Extra charges apply beyond limit.`
                            : booking?.tripType === 'outstation' 
                              ? `${(booking as any).distance || 'N/A'} km total distance${booking?.tripMode === 'round-trip' ? ' (round-trip)' : ''}`
                              : 'N/A'
                          }
                        </p>
                      </div>

                      {/* Inclusions */}
                      <div style={{ 
                        backgroundColor: '#e8f5e8',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #c3e6c3',
                        marginBottom: '12px'
                      }}>
                        <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#2d5a2d' }}>✅ Inclusions</h4>
                        <div style={{ fontSize: '11px', color: '#000' }}>
                          {booking?.inclusions && booking.inclusions.length > 0 ? (
                            <ul style={{ margin: '0', paddingLeft: '16px' }}>
                              {booking.inclusions.map((inclusion: string, index: number) => (
                                <li key={index} style={{ marginBottom: '4px' }}>{inclusion}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: '0', fontStyle: 'italic' }}>Standard inclusions apply</p>
                          )}
                        </div>
                      </div>

                      {/* Exclusions */}
                      <div style={{ 
                        backgroundColor: '#ffe8e8',
                        padding: '12px',
                        borderRadius: '6px',
                        border: '1px solid #ffc3c3'
                      }}>
                        <h4 style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#5a2d2d' }}>❌ Exclusions</h4>
                        <div style={{ fontSize: '11px', color: '#000' }}>
                          {booking?.exclusions && booking.exclusions.length > 0 ? (
                            <ul style={{ margin: '0', paddingLeft: '16px' }}>
                              {booking.exclusions.map((exclusion: string, index: number) => (
                                <li key={index} style={{ marginBottom: '4px' }}>{exclusion}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: '0', fontStyle: 'italic' }}>Standard exclusions apply</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="invoice-footer">
                      <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', marginBottom: '16px' }}>
                        <p>Thank you for choosing VIZAG TAXI HUB!</p>
                        <p>For any queries, contact us at +91 9966363662 or info@vizagtaxihub.com</p>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#999' }}>
                        <p>Receipt generated on: {new Date().toLocaleString()}</p>
                        <p>www.vizagtaxihub.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>
        <div className="no-print">
          <MobileNavigation />
        </div>
      </div>
    </>
  );
}

export default BookingConfirmationPage;