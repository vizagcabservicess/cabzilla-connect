import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { formatPrice } from '@/lib/cabData';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [paymentResponse, setPaymentResponse] = useState<RazorpayResponse | null>(null);

  useEffect(() => {
    // Load booking details from sessionStorage
    const storedDetails = sessionStorage.getItem('bookingDetails');
    if (storedDetails) {
      try {
        const details = JSON.parse(storedDetails);
        // Always use the latest totalPrice from sessionStorage
        if (typeof details.totalPrice === 'number') {
          details.totalPrice = details.totalPrice;
        } else {
          // fallback: try to get from summary or set to 0
          details.totalPrice = 0;
        }
        setBookingDetails(details);
        // Load the Razorpay SDK
        loadRazorpaySDK();
      } catch (error) {
        console.error('Error parsing booking details:', error);
        toast.error('Could not load booking details. Please try again.');
        navigate('/');
      }
    } else {
      // If no booking details, redirect to home
      toast.error('No booking information found. Please start a new booking.');
      navigate('/');
    }
  }, [navigate]);

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
      // Create a Razorpay order
      const amount = bookingDetails.totalPrice;
      const order = await createRazorpayOrder(amount);
      
      if (!order) {
        throw new Error('Failed to create payment order');
      }

      // Configure payment options
      const options = {
        key: 'rzp_test_41fJeGiVFyU9OQ', // Your Key ID
        amount: order.amount,
        currency: order.currency,
        name: 'Cab Booking',
        description: `Booking for ${bookingDetails.tripType} trip`,
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
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            toast('Payment cancelled. You can try again later.');
          }
        }
      };

      // Open Razorpay checkout
      openRazorpayCheckout(
        options,
        (response) => {
          handlePaymentSuccess(response);
        },
        (error) => {
          handlePaymentError(error);
        }
      );
    } catch (error) {
      handlePaymentError(error);
    }
  };

  const handlePaymentSuccess = async (response: RazorpayResponse) => {
    setPaymentResponse(response);
    try {
      // Verify payment with backend
      const verified = await verifyRazorpayPayment(
        response.razorpay_payment_id,
        response.razorpay_order_id,
        response.razorpay_signature
      );

      if (verified) {
        // Update booking with payment information
        const updateData: Partial<Booking> = {
          status: 'payment_received' as BookingStatus,
          paymentMethod: 'razorpay',
          // Remove razorpay_payment_id as it's not in the Booking interface
        };

        await bookingAPI.updateBooking(bookingDetails.bookingId, updateData);

        setPaymentStatus('success');
        toast.success('Payment successful!');
        setTimeout(() => {
          navigate('/booking-confirmation');
        }, 2000);
      } else {
        setPaymentStatus('failed');
        toast.error('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Error in payment verification:', error);
      setPaymentStatus('failed');
      toast.error('Payment processing error. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    setIsLoading(false);
    setPaymentStatus('failed');
    toast.error(error.message || 'Payment failed. Please try again later.');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleTryAgain = () => {
    setPaymentStatus('pending');
    setPaymentResponse(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <button 
            onClick={handleGoBack} 
            className="flex items-center text-blue-600 mb-4"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Back</span>
          </button>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold mb-6">Complete Your Payment</h1>
            
            {!bookingDetails ? (
              <div className="flex justify-center items-center py-12">
                <span className="text-gray-500">Loading booking details...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border rounded-md p-4 bg-gray-50">
                  <h2 className="font-semibold text-lg mb-2">Booking Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <p className="text-sm text-gray-500">Amount</p>
                      <p className="font-medium text-lg">{formatPrice(bookingDetails.totalPrice || 0)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center p-6 border rounded-md">
                  <CreditCard size={48} className="text-blue-500 mb-3" />
                  <h3 className="text-xl font-semibold mb-1">Ready to Pay</h3>
                  <p className="text-gray-600 mb-6 text-center">Click the button below to proceed with Razorpay secure payment</p>
                  
                  <Button 
                    onClick={handlePayment} 
                    disabled={!sdkReady || isLoading || !bookingDetails}
                    size="lg"
                    className="w-full md:w-auto px-8"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <span>Pay Now - {formatPrice(bookingDetails.totalPrice || 0)}</span>
                    )}
                  </Button>
                </div>
              </div>
            )}
            
            {paymentStatus === 'success' && (
              <div className="flex flex-col items-center py-8">
                <CheckCircle size={64} className="text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h2>
                <p className="text-gray-600 mb-4 text-center">Your booking has been confirmed. You will be redirected to the confirmation page.</p>
                <p className="text-sm text-gray-500 mb-4">Transaction ID: {paymentResponse?.razorpay_payment_id}</p>
              </div>
            )}
            
            {paymentStatus === 'failed' && (
              <div className="flex flex-col items-center py-8">
                <XCircle size={64} className="text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-red-700 mb-2">Payment Failed</h2>
                <p className="text-gray-600 mb-4 text-center">We couldn't process your payment. Please try again or use a different payment method.</p>
                <Button onClick={handleTryAgain} variant="outline" className="mt-2">
                  Try Again
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
