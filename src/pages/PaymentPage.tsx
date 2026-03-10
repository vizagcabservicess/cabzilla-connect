import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import { toast } from 'sonner';
import { 
  initRazorpay, 
  createRazorpayOrder, 
  openRazorpayCheckout, 
  verifyRazorpayPayment,
  RazorpayResponse
} from '@/services/razorpayService';
import { bookingAPI } from '@/services/api';
import { Booking } from '@/types/api';
import { getTourUrl } from '@/utils/tourUrlUtils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { formatPrice } from '@/lib/cabData';
import { API_BASE_URL } from '@/config';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [paymentResponse, setPaymentResponse] = useState<RazorpayResponse | null>(null);
  const [isFetchingBooking, setIsFetchingBooking] = useState(false);
  const hasNotifiedAbandoned = useRef(false);
  // Refs ensure event handlers always have current values (avoids stale closures)
  const bookingIdRef = useRef<number | string | null>(null);
  const paymentStatusRef = useRef<string>(paymentStatus);
  bookingIdRef.current = bookingDetails?.bookingId ?? null;
  paymentStatusRef.current = paymentStatus;

  const sendAbandonedNotification = (reason: string) => {
    const bid = bookingIdRef.current;
    if (paymentStatusRef.current === 'success' || !bid || hasNotifiedAbandoned.current) return;
    hasNotifiedAbandoned.current = true;
    // Use API_BASE_URL - window.location.origin fails when app is on CDN/different host
    const url = `${API_BASE_URL}/api/send-pending-notification.php`;
    const payload = JSON.stringify({ booking_id: bid, reason });
    // Use both sendBeacon and fetch keepalive for max reliability (server dedupes in 5 min)
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    }
    fetch(url, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {});
  };

  // Notify when user closes browser/tab or navigates away (beforeunload + pagehide)
  useEffect(() => {
    const handleUnload = () => sendAbandonedNotification('browser_closed');
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload); // More reliable on mobile
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, []);

  // Notify when user navigates away within SPA (e.g. clicks navbar, back)
  useEffect(() => {
    return () => {
      sendAbandonedNotification('abandoned');
    };
  }, []);

  useEffect(() => {
    const loadBooking = async () => {
      // 1. Try sessionStorage first (user came from booking flow)
      const storedDetails = sessionStorage.getItem('bookingDetails');
      if (storedDetails) {
        try {
          const details = JSON.parse(storedDetails);
          details.totalPrice = typeof details.totalPrice === 'number' ? details.totalPrice : (details.totalAmount || 0);
          setBookingDetails(details);
          loadRazorpaySDK();
          return;
        } catch (error) {
          console.error('Error parsing booking details:', error);
        }
      }

      // 2. Try URL param (user clicked "Complete Payment Now" from email)
      const bookingIdFromUrl = searchParams.get('bookingId');
      const expParam = searchParams.get('exp');
      if (bookingIdFromUrl) {
        if (expParam) {
          const expiryTime = parseInt(expParam, 10) * 1000;
          if (Date.now() > expiryTime) {
            toast.error('This payment link has expired. Please contact us at +91 9966363662 to complete payment.');
            navigate('/');
            return;
          }
        }
        setIsFetchingBooking(true);
        try {
          const bookingData = await bookingAPI.getBookingById(bookingIdFromUrl);
          const paymentStatusFromApi = bookingData.payment_status ?? bookingData.paymentStatus ?? bookingData.status;
          if (bookingData && !['paid', 'completed'].includes(String(paymentStatusFromApi || '').toLowerCase())) {
            const details = {
              bookingId: bookingData.id,
              bookingNumber: bookingData.bookingNumber || bookingData.booking_number,
              pickupLocation: typeof bookingData.pickupLocation === 'string' ? { name: bookingData.pickupLocation, address: '' } : bookingData.pickupLocation,
              dropLocation: typeof bookingData.dropLocation === 'string' ? { name: bookingData.dropLocation, address: '' } : bookingData.dropLocation,
              pickupDate: bookingData.pickupDate || bookingData.pickup_date,
              returnDate: bookingData.returnDate || bookingData.return_date,
              selectedCab: { name: bookingData.cabType || bookingData.cab_type || 'Standard' },
              totalPrice: bookingData.totalAmount ?? bookingData.total_amount ?? 0,
              tripType: bookingData.tripType || bookingData.trip_type,
              tripMode: bookingData.tripMode || bookingData.trip_mode,
              guestDetails: {
                name: bookingData.passengerName || bookingData.passenger_name,
                phone: bookingData.passengerPhone || bookingData.passenger_phone,
                email: bookingData.passengerEmail || bookingData.passenger_email,
                countryCode: bookingData.passengerCountryCode || '+91',
              },
            };
            setBookingDetails(details);
            sessionStorage.setItem('bookingDetails', JSON.stringify(details));
            sessionStorage.setItem('paymentMode', 'partial');
            loadRazorpaySDK();
          } else {
            toast.error('This booking has already been paid.');
            navigate('/');
          }
        } catch (error) {
          console.error('Error fetching booking:', error);
          toast.error('Could not load booking. Please check the link or start a new booking.');
          navigate('/');
        } finally {
          setIsFetchingBooking(false);
        }
        return;
      }

      // 3. No sessionStorage and no URL param
      toast.error('No booking information found. Please start a new booking.');
      navigate('/');
    };

    loadBooking();
  }, [navigate, searchParams]);

  const loadRazorpaySDK = async () => {
    try {
      const result = await initRazorpay();
      setSdkReady(result);
      if (!result) {
        toast.error('Failed to load payment gateway. Please try again later.');
      }
    } catch (error) {
      console.error('Error loading Razorpay SDK:', error);
      toast.error('Failed to load payment gateway. Please try again later.');
    }
  };

  const handlePayment = async () => {
    if (!bookingDetails || !sdkReady) {
      toast.error('Payment gateway is not ready. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      // Get payment mode from sessionStorage (set in GuestDetailsForm)
      const paymentMode = sessionStorage.getItem('paymentMode') as 'partial' | 'full' || 'partial';
      
      // Amount based on selection: partial (30%) or full
      const amount = paymentMode === 'partial'
        ? Math.round((bookingDetails.totalPrice || 0) * 0.3)
        : (bookingDetails.totalPrice || 0);
      const order = await createRazorpayOrder(amount, bookingDetails.bookingId);
      
      if (!order) {
        throw new Error('Failed to create payment order');
      }

      // Configure payment options
      const options = {
        key: 'rzp_live_R6nt1S648RxpNC', // Your Live Key ID
        amount: order.amount,
        currency: order.currency,
        name: 'Cab Booking',
          description: `Booking for ${bookingDetails.tripType} trip (${paymentMode === 'partial' ? '30% advance' : 'full payment'})`,
        order_id: order.id,
        handler: (response: RazorpayResponse) => {
          handlePaymentSuccess(response);
        },
        prefill: {
          name: bookingDetails.guestDetails?.name || '',
          email: bookingDetails.guestDetails?.email || '',
          contact: bookingDetails.guestDetails?.phone || ''
        },
        theme: {
          color: '#3399FF'
        }
        // Note: ondismiss is handled by openRazorpayCheckout to track cancellations
      };

      // Open Razorpay checkout with booking data for tracking
      openRazorpayCheckout(
        options,
        (response) => {
          handlePaymentSuccess(response);
        },
        (error) => {
          handlePaymentError(error);
        },
        {
          bookingId: bookingDetails.bookingId,
          bookingNumber: bookingDetails.bookingNumber,
          amount: amount
        },
        () => {
          // Handle modal dismissal - notify admin and customer that payment was cancelled
          setIsLoading(false);
          bookingAPI.notifyPendingPayment(bookingDetails.bookingId, 'cancelled').catch(() => {});
          toast('Payment cancelled. You can try again later.');
        }
      );
    } catch (error) {
      handlePaymentError(error);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    try {
      setPaymentStatus('processing');
      
      // Get payment mode from sessionStorage
      const paymentMode = (sessionStorage.getItem('paymentMode') as 'partial' | 'full') || 'partial';
      console.log('Payment Mode from sessionStorage:', paymentMode);
      
      // Calculate the amount based on payment mode
      const amount = paymentMode === 'partial'
        ? Math.round((bookingDetails.totalPrice || 0) * 0.3)
        : (bookingDetails.totalPrice || 0);
      
      // Update booking with payment details
      const paymentStatus = paymentMode === 'partial' ? 'payment_pending' : 'paid';
      console.log('Setting payment status to:', paymentStatus, 'for payment mode:', paymentMode);
      
      const updateData = {
        payment_status: paymentStatus,
        payment_method: 'razorpay',
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_signature: response.razorpay_signature,
        advance_paid_amount: amount,
        payment_timestamp: new Date().toISOString()
      };

      // Debug: Log booking details
      console.log('Payment Success - Booking Details:', {
        bookingId: bookingDetails.bookingId,
        bookingNumber: bookingDetails.bookingNumber,
        totalPrice: bookingDetails.totalPrice
      });
      
      // First update the booking
      await bookingAPI.updateBooking(bookingDetails.bookingId, updateData);
      
      // Then verify the payment to trigger email sending
      try {
        const verificationData = {
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
          booking_id: bookingDetails.bookingId,
          amount: amount // Send the actual amount paid
        };
        
        await bookingAPI.verifyPayment(verificationData);
        console.log('Payment verified and email sent successfully');
      } catch (verificationError) {
        console.warn('Payment verification failed, but booking was updated successfully:', verificationError);
      }

      setPaymentStatus('success');
      
      // Store booking details in session storage for confirmation page
      sessionStorage.setItem('lastBooking', JSON.stringify({
        id: bookingDetails.bookingId,
        bookingNumber: bookingDetails.bookingNumber,
        paymentStatus: paymentMode === 'partial' ? 'payment_pending' : 'paid',
        totalAmount: bookingDetails.totalPrice,
        advance_paid_amount: amount
      }));
      
      // Navigate to confirmation page
      navigate('/booking-confirmation');
      
    } catch (error) {
      console.error('Error processing payment success:', error);
      setPaymentStatus('failed');
      toast.error('Failed to process payment. Please contact support.');
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    setIsLoading(false);
    setPaymentStatus('failed');
    toast.error(error.message || 'Payment failed. Please try again later.');
  };

  const handleGoBack = () => {
    // Notify admin that customer left without payment (abandoned)
    if (paymentStatus !== 'success' && bookingDetails?.bookingId && !hasNotifiedAbandoned.current) {
      hasNotifiedAbandoned.current = true;
      bookingAPI.notifyPendingPayment(bookingDetails.bookingId, 'abandoned').catch(() => {});
    }
    // Check if we came from a tour booking
    const storedDetails = sessionStorage.getItem('bookingDetails');
    if (storedDetails) {
      try {
        const details = JSON.parse(storedDetails);
        // If this is a tour booking, go back to the tour details page
        if (details.bookingType === 'tour' && details.tourId) {
          navigate(getTourUrl({ tourId: details.tourId }));
          return;
        }
      } catch (error) {
        console.error('Error parsing booking details:', error);
      }
    }
    
    // Fallback to browser history
    navigate(-1);
  };

  const handleTryAgain = () => {
    setPaymentStatus('pending');
    setPaymentResponse(null);
  };

  // Get payment mode and calculate amounts
  const paymentMode = sessionStorage.getItem('paymentMode') as 'partial' | 'full' || 'partial';
  const partialAmount = Math.round((bookingDetails?.totalPrice || 0) * 0.3);
  const fullAmount = bookingDetails?.totalPrice || 0;
  const currentAmount = paymentMode === 'partial' ? partialAmount : fullAmount;

  return (
    <>
      <Helmet>
        <title>Payment - Vizag Taxi Hub | Secure Cab Booking Payment</title>
        <meta name="description" content="Complete your secure payment for cab booking with Vizag Taxi Hub. Multiple payment options available including online payment and cash on delivery." />
        <meta name="keywords" content="cab booking payment, taxi payment vizag, secure payment, online payment, cash on delivery" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/payment" />
        <meta property="og:title" content="Payment - Vizag Taxi Hub | Secure Cab Booking Payment" />
        <meta property="og:description" content="Complete your secure payment for cab booking with Vizag Taxi Hub. Multiple payment options available." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Vizag Taxi Hub" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/payment" />
        <meta property="twitter:title" content="Payment - Vizag Taxi Hub | Secure Cab Booking Payment" />
        <meta property="twitter:description" content="Complete your secure payment for cab booking with Vizag Taxi Hub." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://vizagtaxihub.com/payment" />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="max-w-3xl mx-auto">
            <button 
              onClick={handleGoBack} 
              className="flex items-center text-blue-600 mb-4 text-sm sm:text-base"
            >
              <ArrowLeft size={16} className="mr-1" />
              <span>Back</span>
            </button>
            
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h1 className="text-xl sm:text-2xl font-medium mb-4 sm:mb-6">Complete Your Payment</h1>
              
              {!bookingDetails ? (
                <div className="flex justify-center items-center py-12">
                  <span className="text-gray-500">{isFetchingBooking ? 'Loading your booking...' : 'Loading booking details...'}</span>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  <div className="border rounded-md p-3 sm:p-4 bg-gray-50">
                    <h2 className="font-semibold text-base sm:text-lg mb-3 sm:mb-2">Booking Summary</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Trip Type</p>
                        <p className="font-medium">{bookingDetails.tripType} ({bookingDetails.tripMode})</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Cab Type</p>
                        <p className="font-medium">{bookingDetails.selectedCab?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pickup Location</p>
                        <p className="font-medium">{bookingDetails.pickupLocation?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Drop Location</p>
                        <p className="font-medium">{bookingDetails.dropLocation?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Pickup Date</p>
                        <p className="font-medium">{bookingDetails.pickupDate ? new Date(bookingDetails.pickupDate).toLocaleString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500">Amount</p>
                        <p className="font-medium text-base sm:text-lg">{formatPrice(bookingDetails.totalPrice || 0)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center p-4 sm:p-6 border rounded-md">
                    <CreditCard size={40} className="sm:hidden text-blue-500 mb-2" />
                    <CreditCard size={48} className="hidden sm:block text-blue-500 mb-3" />
                    <h3 className="text-lg sm:text-xl font-semibold mb-1">Payment Summary</h3>
                    <div className="w-full max-w-md mx-auto mb-4">
                      <div className="border rounded-lg p-3 sm:p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm sm:text-base">Payment Mode:</span>
                          <span className="font-semibold capitalize text-sm sm:text-base">{paymentMode === 'partial' ? 'Part Pay (30%)' : 'Full Pay'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm sm:text-base">Amount to Pay:</span>
                          <span className="font-semibold text-base sm:text-lg">{formatPrice(currentAmount)}</span>
                        </div>
                        {paymentMode === 'partial' && (
                          <div className="mt-2 text-xs sm:text-sm text-gray-600">
                            <p>Remaining amount: {formatPrice(fullAmount - partialAmount)} (to be paid to driver)</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handlePayment} 
                      disabled={!sdkReady || isLoading || !bookingDetails}
                      size="lg"
                      className="w-full sm:w-auto px-6 sm:px-8 text-sm sm:text-base h-11 sm:h-12"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <span>Pay Now - {formatPrice(currentAmount)}</span>
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              {paymentStatus === 'success' && (
                <div className="flex flex-col items-center py-6 sm:py-8 px-2">
                  <CheckCircle size={48} className="sm:hidden text-green-500 mb-3" />
                  <CheckCircle size={64} className="hidden sm:block text-green-500 mb-4" />
                  <h2 className="text-xl sm:text-2xl font-medium text-green-700 mb-2 text-center">Payment Successful!</h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 text-center px-2">Your booking has been confirmed. You will be redirected to the confirmation page.</p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-4 text-center break-all px-2">Transaction ID: {paymentResponse?.razorpay_payment_id}</p>
                </div>
              )}
              
              {paymentStatus === 'failed' && (
                <div className="flex flex-col items-center py-6 sm:py-8 px-2">
                  <XCircle size={48} className="sm:hidden text-red-500 mb-3" />
                  <XCircle size={64} className="hidden sm:block text-red-500 mb-4" />
                  <h2 className="text-xl sm:text-2xl font-medium text-red-700 mb-2 text-center">Payment Failed</h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 text-center px-2">We couldn't process your payment. Please try again or use a different payment method.</p>
                  <Button onClick={handleTryAgain} variant="outline" className="mt-2 w-full sm:w-auto">
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentPage;
