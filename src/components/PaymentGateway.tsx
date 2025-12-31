
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  CreditCard, 
  Smartphone, 
  Globe, 
  Wallet, 
  CheckCircle2,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  initRazorpay, 
  createRazorpayOrder, 
  openRazorpayCheckout, 
  verifyRazorpayPayment, 
  RazorpayResponse 
} from '@/services/razorpayService';

interface PaymentGatewayProps {
  totalAmount: number;
  onPaymentComplete: () => void;
  bookingDetails?: any;
}

export function PaymentGateway({ totalAmount, onPaymentComplete, bookingDetails }: PaymentGatewayProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("upi");
  const [upiId, setUpiId] = useState<string>("");
  const [cardNumber, setCardNumber] = useState<string>("");
  const [cardExpiry, setCardExpiry] = useState<string>("");
  const [cardCvv, setCardCvv] = useState<string>("");
  const [cardName, setCardName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState<boolean>(false);
  const { toast: useToastFn } = useToast();
  const navigate = useNavigate();
  
  // Load Razorpay on component mount
  useEffect(() => {
    const loadRazorpay = async () => {
      const loaded = await initRazorpay();
      setRazorpayLoaded(loaded);
    };
    
    loadRazorpay();
  }, []);

  const handleRazorpayPayment = async () => {
    if (!razorpayLoaded) {
      toast.error('Razorpay failed to load. Please refresh and try again.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Create order on server
      const order = await createRazorpayOrder(totalAmount);
      
      if (!order) {
        toast.error('Failed to create payment order');
        setIsProcessing(false);
        return;
      }
      
      // Configure Razorpay options
      const options = {
        key: "rzp_live_R6nt1S648RxpNC", // Your Live Key ID
        amount: order.amount,
        currency: order.currency,
        name: "CabBooking Service",
        description: "Cab Booking Payment",
        order_id: order.id,
        prefill: {
          name: bookingDetails?.customerName || "",
          email: bookingDetails?.customerEmail || "",
          contact: bookingDetails?.customerPhone || ""
        },
        theme: {
          color: "#3B82F6"
        },
        handler: function (response: RazorpayResponse) {
          // Handle success callback
          handlePaymentSuccess(response);
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
            toast.warning('Payment cancelled');
          }
        }
      };
      
      // Open Razorpay checkout
      openRazorpayCheckout(
        options,
        handlePaymentSuccess,
        (error) => {
          console.error('Razorpay error:', error);
          toast.error(error.description || 'Payment failed');
          setIsProcessing(false);
        }
      );
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };
  
  const handlePaymentSuccess = async (response: RazorpayResponse) => {
    try {
      // Verify payment on server
      const verified = await verifyRazorpayPayment(
        response.razorpay_payment_id, 
        response.razorpay_order_id, 
        response.razorpay_signature,
        bookingDetails?.id
      );
      
      if (verified) {
        toast.success(`Your payment of ₹${totalAmount.toLocaleString('en-IN')} was successful!`);
        onPaymentComplete();
      } else {
        toast.error('Payment verification failed. Please contact support.');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Payment verification failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDefaultPayment = () => {
    // Validate payment details based on selected method
    if (paymentMethod === "upi" && !upiId) {
      useToastFn({
        title: "UPI ID Required",
        description: "Please enter a valid UPI ID to proceed with payment",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "card") {
      if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
        useToastFn({
          title: "Card Details Required",
          description: "Please fill in all the required card details",
          variant: "destructive",
        });
        return;
      }
    }

    // Simulate payment processing
    setIsProcessing(true);
    
    setTimeout(() => {
      setIsProcessing(false);
      
      useToastFn({
        title: "Payment Successful",
        description: `Your payment of ₹${totalAmount.toLocaleString('en-IN')} was successful!`,
        duration: 5000,
      });
      
      onPaymentComplete();
    }, 2000);
  };
  
  const handlePayment = () => {
    if (paymentMethod === "razorpay") {
      handleRazorpayPayment();
    } else {
      handleDefaultPayment();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Payment Details</h3>
      
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs sm:text-sm font-medium text-gray-700">Amount to Pay</h4>
          <span className="text-lg sm:text-xl font-bold text-blue-600">₹{totalAmount.toLocaleString('en-IN')}</span>
        </div>
        <div className="text-xs text-green-600 flex items-center">
          <CheckCircle2 size={12} className="mr-1" />
          Secure Payment
        </div>
      </div>
      
      <Tabs defaultValue="upi" value={paymentMethod} onValueChange={setPaymentMethod} className="w-full">
        <TabsList className="grid grid-cols-5 mb-3 sm:mb-4 gap-1 sm:gap-2">
          <TabsTrigger value="upi" className="flex flex-col items-center py-2 sm:py-3 px-1 sm:px-2">
            <Smartphone size={14} className="sm:h-4 sm:w-4 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs">UPI</span>
          </TabsTrigger>
          <TabsTrigger value="card" className="flex flex-col items-center py-2 sm:py-3 px-1 sm:px-2">
            <CreditCard size={14} className="sm:h-4 sm:w-4 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs">Card</span>
          </TabsTrigger>
          <TabsTrigger value="netbanking" className="flex flex-col items-center py-2 sm:py-3 px-1 sm:px-2">
            <Globe size={14} className="sm:h-4 sm:w-4 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs leading-tight">Net Banking</span>
          </TabsTrigger>
          <TabsTrigger value="wallet" className="flex flex-col items-center py-2 sm:py-3 px-1 sm:px-2">
            <Wallet size={14} className="sm:h-4 sm:w-4 mb-0.5 sm:mb-1" />
            <span className="text-[10px] sm:text-xs">Wallet</span>
          </TabsTrigger>
          <TabsTrigger value="razorpay" className="flex flex-col items-center py-2 sm:py-3 px-1 sm:px-2">
            <img 
              src="https://razorpay.com/assets/razorpay-glyph.svg" 
              alt="Razorpay" 
              className="h-3 sm:h-4 mb-0.5 sm:mb-1" 
            />
            <span className="text-[10px] sm:text-xs leading-tight">Razorpay</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upi" className="mt-3 sm:mt-4">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="upi-id" className="text-sm sm:text-base">UPI ID</Label>
              <Input 
                id="upi-id" 
                placeholder="e.g. 9876543210@upi" 
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="mt-1 h-10 sm:h-11"
              />
              <p className="text-xs text-gray-500 mt-1">Enter your UPI ID or phone number</p>
            </div>
            
            <div>
              <Label className="text-xs sm:text-sm">Popular UPI Apps</Label>
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mt-2">
                {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                  <div 
                    key={app} 
                    className="border rounded-md p-1.5 sm:p-2 text-center text-[10px] sm:text-xs cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      toast.info(`${app} Selected, please enter your UPI ID to proceed`);
                    }}
                  >
                    {app}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="card" className="mt-3 sm:mt-4">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="card-number" className="text-sm sm:text-base">Card Number</Label>
              <Input 
                id="card-number" 
                placeholder="1234 5678 9012 3456" 
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="mt-1 h-10 sm:h-11"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="card-expiry" className="text-sm sm:text-base">Expiry Date</Label>
                <Input 
                  id="card-expiry" 
                  placeholder="MM/YY" 
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="mt-1 h-10 sm:h-11"
                />
              </div>
              <div>
                <Label htmlFor="card-cvv" className="text-sm sm:text-base">CVV</Label>
                <Input 
                  id="card-cvv" 
                  placeholder="123" 
                  type="password"
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value)}
                  className="mt-1 h-10 sm:h-11"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="card-name" className="text-sm sm:text-base">Cardholder Name</Label>
              <Input 
                id="card-name" 
                placeholder="John Doe" 
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="mt-1 h-10 sm:h-11"
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="netbanking" className="mt-3 sm:mt-4">
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-sm sm:text-base">Select Bank</Label>
            <RadioGroup defaultValue="hdfc">
              {[
                { value: "hdfc", label: "HDFC Bank" },
                { value: "sbi", label: "State Bank of India" },
                { value: "icici", label: "ICICI Bank" },
                { value: "axis", label: "Axis Bank" },
              ].map(bank => (
                <div key={bank.value} className="flex items-center space-x-2 border rounded-md p-2.5 sm:p-3">
                  <RadioGroupItem value={bank.value} id={bank.value} />
                  <Label htmlFor={bank.value} className="cursor-pointer w-full text-sm sm:text-base">
                    {bank.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </TabsContent>
        
        <TabsContent value="wallet" className="mt-3 sm:mt-4">
          <div className="space-y-3 sm:space-y-4">
            <Label className="text-sm sm:text-base">Select Wallet</Label>
            <RadioGroup defaultValue="paytm">
              {[
                { value: "paytm", label: "Paytm" },
                { value: "amazonpay", label: "Amazon Pay" },
                { value: "phonepe", label: "PhonePe" },
                { value: "mobikwik", label: "MobiKwik" },
              ].map(wallet => (
                <div key={wallet.value} className="flex items-center space-x-2 border rounded-md p-2.5 sm:p-3">
                  <RadioGroupItem value={wallet.value} id={wallet.value} />
                  <Label htmlFor={wallet.value} className="cursor-pointer w-full text-sm sm:text-base">
                    {wallet.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </TabsContent>
        
        <TabsContent value="razorpay" className="mt-3 sm:mt-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg flex items-start">
              <div className="mr-2 sm:mr-3 mt-0.5 sm:mt-1">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium text-blue-800 text-sm sm:text-base">Fast & Secure Payment</h3>
                <p className="text-xs sm:text-sm text-blue-600 mt-1">
                  Pay securely using Razorpay - India's trusted payment gateway. Your payment will be processed instantly.
                </p>
              </div>
            </div>
            
            {!razorpayLoaded && (
              <div className="bg-amber-50 p-3 sm:p-4 rounded-lg flex items-start">
                <div className="mr-2 sm:mr-3 mt-0.5 sm:mt-1">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-medium text-amber-800 text-sm sm:text-base">Loading Payment Gateway</h3>
                  <p className="text-xs sm:text-sm text-amber-600 mt-1">
                    Please wait while we connect to Razorpay...
                  </p>
                </div>
              </div>
            )}
            
            <div className="border rounded-md p-3 sm:p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs sm:text-sm font-medium">Total Amount</p>
                  <p className="text-lg sm:text-xl font-bold text-blue-600">₹{totalAmount.toLocaleString('en-IN')}</p>
                </div>
                <img 
                  src="https://razorpay.com/assets/razorpay-logo.svg" 
                  alt="Razorpay" 
                  className="h-6 sm:h-8" 
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <Button 
        onClick={handlePayment} 
        className="w-full mt-4 sm:mt-6 py-4 sm:py-6 text-sm sm:text-base h-12 sm:h-14"
        disabled={isProcessing}
      >
        {isProcessing ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processing...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            Pay ₹{totalAmount.toLocaleString('en-IN')} <ArrowRight className="ml-2" size={16} />
          </div>
        )}
      </Button>
    </div>
  );
}
