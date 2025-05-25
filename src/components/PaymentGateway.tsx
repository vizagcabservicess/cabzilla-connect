
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BookingRequest } from "@/types/api";
import { 
  initRazorpay, 
  createRazorpayOrder, 
  openRazorpayCheckout, 
  verifyRazorpayPayment,
  RazorpayResponse 
} from "@/services/razorpayService";

interface PaymentGatewayProps {
  booking: BookingRequest;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentError: (error: string) => void;
}

export function PaymentGateway({ booking, onPaymentSuccess, onPaymentError }: PaymentGatewayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    const loadRazorpay = async () => {
      try {
        const loaded = await initRazorpay() as boolean;
        setRazorpayLoaded(loaded);
        if (!loaded) {
          toast.error("Payment gateway failed to load. Please refresh the page.");
        }
      } catch (error) {
        console.error("Failed to load Razorpay:", error);
        setRazorpayLoaded(false);
      }
    };

    loadRazorpay();
  }, []);

  const handlePayment = async () => {
    if (!razorpayLoaded) {
      toast.error("Payment gateway is not ready. Please try again.");
      return;
    }

    setIsLoading(true);

    try {
      // Create order
      const order = await createRazorpayOrder(booking.totalAmount);
      if (!order) {
        throw new Error("Failed to create payment order");
      }

      // Open Razorpay checkout
      openRazorpayCheckout(
        {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
          amount: order.amount,
          currency: order.currency,
          name: "VizagCabs",
          description: `Booking: ${booking.pickupLocation} to ${booking.dropLocation || 'Multiple locations'}`,
          order_id: order.id,
          handler: async (response: RazorpayResponse) => {
            try {
              // Verify payment
              const verified = await verifyRazorpayPayment(
                response.razorpay_payment_id,
                response.razorpay_order_id,
                response.razorpay_signature
              );

              if (verified) {
                onPaymentSuccess(response.razorpay_payment_id);
                toast.success("Payment successful!");
              } else {
                throw new Error("Payment verification failed");
              }
            } catch (error) {
              console.error("Payment verification error:", error);
              onPaymentError("Payment verification failed");
              toast.error("Payment verification failed. Please contact support.");
            }
          },
          prefill: {
            name: booking.passengerName,
            email: booking.passengerEmail,
            contact: booking.passengerPhone,
          },
          theme: {
            color: "#3B82F6",
          },
        },
        (response: RazorpayResponse) => {
          // Success handled in handler above
        },
        (error: any) => {
          console.error("Payment error:", error);
          onPaymentError(error.description || "Payment failed");
          toast.error("Payment failed. Please try again.");
        }
      );
    } catch (error) {
      console.error("Payment initiation error:", error);
      onPaymentError("Failed to initiate payment");
      toast.error("Failed to initiate payment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Complete Payment</CardTitle>
        <CardDescription>
          Secure payment powered by Razorpay
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Passenger:</span>
            <span className="font-medium">{booking.passengerName}</span>
          </div>
          <div className="flex justify-between">
            <span>Trip:</span>
            <span className="font-medium">
              {booking.pickupLocation} {booking.dropLocation && `→ ${booking.dropLocation}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Amount:</span>
            <span className="font-bold text-lg">₹{booking.totalAmount}</span>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-2">
          <Badge variant="outline">Secure</Badge>
          <Badge variant="outline">Encrypted</Badge>
        </div>

        <Button 
          onClick={handlePayment}
          disabled={isLoading || !razorpayLoaded}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            `Pay ₹${booking.totalAmount}`
          )}
        </Button>

        {!razorpayLoaded && (
          <p className="text-sm text-muted-foreground text-center">
            Loading payment gateway...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
