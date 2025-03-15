
import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { PaymentGateway } from "@/components/PaymentGateway";

interface GuestDetailsFormProps {
  onSubmit: (details: any) => void;
  totalPrice: number;
}

export function GuestDetailsForm({ onSubmit, totalPrice }: GuestDetailsFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  // Highlight effect when the component mounts
  useEffect(() => {
    if (formRef.current) {
      // Scroll to form when component mounts
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Add highlight effect
      formRef.current.classList.add('animate-pulse', 'border-blue-500', 'border-2');
      
      // Remove highlight after a delay
      const timer = setTimeout(() => {
        if (formRef.current) {
          formRef.current.classList.remove('animate-pulse', 'border-blue-500', 'border-2');
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleContactDetailsSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!name || !email || !phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format (basic check for 10 digits)
    if (!/^\d{10}$/.test(phone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number.",
        variant: "destructive",
      });
      return;
    }

    // Show payment gateway after contact details validation
    setShowPaymentGateway(true);
  };

  const handlePaymentComplete = () => {
    const guestDetails = {
      name,
      email,
      phone,
    };

    onSubmit(guestDetails);
  };

  return (
    <div className="space-y-6">
      {!showPaymentGateway ? (
        <form ref={formRef} onSubmit={handleContactDetailsSubmit} className="space-y-4 p-4 rounded-lg transition-all duration-300">
          <h3 className="text-xl font-semibold mb-4">Contact Information</h3>
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              type="text"
              id="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              type="email"
              id="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              type="tel"
              id="phone"
              placeholder="Enter your 10-digit phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-between items-center pt-2">
            <div>
              Total: 
              <span className="font-semibold ml-1">₹{totalPrice.toLocaleString('en-IN')}</span>
            </div>
            <Button type="submit">Proceed to Payment</Button>
          </div>
        </form>
      ) : (
        <PaymentGateway 
          totalAmount={totalPrice}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  );
}
