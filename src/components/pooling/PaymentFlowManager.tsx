
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Wallet, 
  Check, 
  Clock, 
  AlertCircle,
  Shield,
  IndianRupee
} from 'lucide-react';
import { PoolingRide, PoolingBooking, PaymentOrder } from '@/types/pooling';
import { usePoolingAuth } from '@/providers/PoolingAuthProvider';
import { toast } from 'sonner';

interface PaymentFlowManagerProps {
  ride: PoolingRide;
  booking: Partial<PoolingBooking>;
  onPaymentSuccess: (paymentData: any) => void;
  onPaymentCancel: () => void;
}

export function PaymentFlowManager({
  ride,
  booking,
  onPaymentSuccess,
  onPaymentCancel
}: PaymentFlowManagerProps) {
  const { user, wallet } = usePoolingAuth();
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card'>('card');
  const [processing, setProcessing] = useState(false);

  const totalAmount = (booking.seatsBooked || 1) * ride.pricePerSeat;
  const hasWalletBalance = wallet && wallet.balance >= totalAmount;

  const handlePayment = async () => {
    setProcessing(true);
    
    try {
      if (paymentMethod === 'wallet') {
        await processWalletPayment();
      } else {
        await processCardPayment();
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const processWalletPayment = async () => {
    if (!hasWalletBalance) {
      throw new Error('Insufficient wallet balance');
    }

    // Simulate wallet payment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const paymentData = {
      method: 'wallet',
      amount: totalAmount,
      transactionId: `wallet_${Date.now()}`,
      status: 'success'
    };

    onPaymentSuccess(paymentData);
    toast.success('Payment successful via wallet!');
  };

  const processCardPayment = async () => {
    // Simulate Razorpay integration
    const options = {
      key: 'rzp_test_key', // Replace with actual Razorpay key
      amount: totalAmount * 100, // Amount in paise
      currency: 'INR',
      name: 'Pooling Platform',
      description: `${ride.fromLocation} to ${ride.toLocation}`,
      order_id: `order_${Date.now()}`,
      handler: function (response: any) {
        const paymentData = {
          method: 'card',
          amount: totalAmount,
          transactionId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
          status: 'success'
        };
        onPaymentSuccess(paymentData);
        toast.success('Payment successful!');
      },
      prefill: {
        name: user?.name,
        email: user?.email,
        contact: user?.phone
      },
      theme: {
        color: '#3B82F6'
      }
    };

    // In a real implementation, you would load Razorpay SDK and create payment
    // For now, simulate successful payment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const paymentData = {
      method: 'card',
      amount: totalAmount,
      transactionId: `card_${Date.now()}`,
      status: 'success'
    };

    onPaymentSuccess(paymentData);
    toast.success('Payment successful!');
  };

  return (
    <div className="space-y-6">
      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between">
            <span>Route:</span>
            <span className="font-medium">
              {ride.fromLocation} → {ride.toLocation}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Departure:</span>
            <span className="font-medium">
              {new Date(ride.departureTime).toLocaleDateString()} at{' '}
              {new Date(ride.departureTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Seats:</span>
            <span className="font-medium">{booking.seatsBooked || 1}</span>
          </div>
          <div className="flex justify-between">
            <span>Price per seat:</span>
            <span className="font-medium">₹{ride.pricePerSeat}</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between text-lg font-bold">
            <span>Total Amount:</span>
            <span>₹{totalAmount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Wallet Option */}
          <div 
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              paymentMethod === 'wallet' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => hasWalletBalance && setPaymentMethod('wallet')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Wallet className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium">Wallet Payment</p>
                  <p className="text-sm text-gray-600">
                    Balance: ₹{wallet?.balance || 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {hasWalletBalance ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Insufficient
                  </Badge>
                )}
                {paymentMethod === 'wallet' && (
                  <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card Option */}
          <div 
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              paymentMethod === 'card' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setPaymentMethod('card')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-medium">Debit/Credit Card</p>
                  <p className="text-sm text-gray-600">
                    Secure payment via Razorpay
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-100 text-green-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Secure
                </Badge>
                {paymentMethod === 'card' && (
                  <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Secure Payment</p>
              <p className="text-sm text-green-700">
                Your payment information is encrypted and secure. 
                Money will be transferred to provider after ride completion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Actions */}
      <div className="flex space-x-4">
        <Button 
          variant="outline" 
          onClick={onPaymentCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          onClick={handlePayment}
          disabled={processing || (paymentMethod === 'wallet' && !hasWalletBalance)}
          className="flex-1"
        >
          {processing ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <IndianRupee className="mr-2 h-4 w-4" />
              Pay ₹{totalAmount}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
