
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Phone, Mail, User, CreditCard } from "lucide-react";

interface GuestDetails {
  name: string;
  email: string;
  phone: string;
}

interface GuestDetailsFormProps {
  onSubmit: (details: GuestDetails) => void;
  totalPrice: number;
}

export function GuestDetailsForm({ onSubmit, totalPrice }: GuestDetailsFormProps) {
  const { toast } = useToast();
  const [guestDetails, setGuestDetails] = useState<GuestDetails>({
    name: "",
    email: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGuestDetails((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!guestDetails.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return false;
    }

    if (!guestDetails.email.trim() || !guestDetails.email.includes('@')) {
      toast({
        title: "Valid Email Required",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return false;
    }

    if (!guestDetails.phone.trim() || guestDetails.phone.length < 10) {
      toast({
        title: "Valid Phone Required",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleContinue = () => {
    if (validateForm()) {
      setShowPaymentOptions(true);
    }
  };

  const handlePaymentMethod = (method: string) => {
    setIsSubmitting(true);
    
    // Simulate payment processing
    setTimeout(() => {
      toast({
        title: "Payment Successful",
        description: `Your payment of ₹${totalPrice.toLocaleString('en-IN')} via ${method} was successful.`,
        variant: "default",
      });
      
      setIsSubmitting(false);
      onSubmit(guestDetails);
    }, 1500);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Guest Details</CardTitle>
        <CardDescription>
          Please provide your contact information for booking confirmation
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!showPaymentOptions ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  id="name"
                  name="name"
                  className="pl-10"
                  placeholder="John Doe"
                  value={guestDetails.name}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  className="pl-10"
                  placeholder="john@example.com"
                  value={guestDetails.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  id="phone"
                  name="phone"
                  className="pl-10"
                  placeholder="9876543210"
                  value={guestDetails.phone}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Payment Options</h3>
            <p className="text-sm text-gray-500">Select your preferred payment method</p>
            
            <div className="grid gap-3">
              <Button 
                variant="outline" 
                className="justify-start h-14"
                onClick={() => handlePaymentMethod('UPI')}
                disabled={isSubmitting}
              >
                <img src="https://www.logo.wine/a/logo/Unified_Payments_Interface/Unified_Payments_Interface-Logo.wine.svg" 
                  alt="UPI" className="h-8 w-8 mr-3" />
                <div className="flex flex-col items-start">
                  <span>UPI Payment</span>
                  <span className="text-xs text-gray-500">Pay using any UPI app</span>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start h-14"
                onClick={() => handlePaymentMethod('Credit/Debit Card')}
                disabled={isSubmitting}
              >
                <CreditCard className="h-5 w-5 mr-3 text-blue-600" />
                <div className="flex flex-col items-start">
                  <span>Card Payment</span>
                  <span className="text-xs text-gray-500">Pay using Credit/Debit card</span>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start h-14"
                onClick={() => handlePaymentMethod('Net Banking')}
                disabled={isSubmitting}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-3 text-green-600">
                  <path d="M2 3h20"></path>
                  <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path>
                  <path d="M7 21h10"></path>
                  <path d="M12 17v4"></path>
                </svg>
                <div className="flex flex-col items-start">
                  <span>Net Banking</span>
                  <span className="text-xs text-gray-500">Pay using Net Banking</span>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start h-14"
                onClick={() => handlePaymentMethod('Cash')}
                disabled={isSubmitting}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-3 text-yellow-600">
                  <rect width="20" height="12" x="2" y="6" rx="2"></rect>
                  <circle cx="12" cy="12" r="2"></circle>
                  <path d="M6 12h.01M18 12h.01"></path>
                </svg>
                <div className="flex flex-col items-start">
                  <span>Cash on Pickup</span>
                  <span className="text-xs text-gray-500">Pay cash to driver</span>
                </div>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        {!showPaymentOptions ? (
          <Button onClick={handleContinue}>Continue to Payment</Button>
        ) : (
          <Button variant="outline" onClick={() => setShowPaymentOptions(false)}>
            Back to Details
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
