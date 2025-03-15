import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface GuestDetailsFormProps {
  onSubmit: (details: any) => void;
  totalPrice: number;
}

export function GuestDetailsForm({ onSubmit, totalPrice }: GuestDetailsFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const { toast } = useToast();

  const handleSubmit = (event: React.FormEvent) => {
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

    const guestDetails = {
      name,
      email,
      phone,
    };

    onSubmit(guestDetails);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <div className="flex justify-between items-center">
        <div>
          Total: 
          <span className="font-semibold ml-1">₹{totalPrice.toLocaleString('en-IN')}</span>
        </div>
        <Button type="submit">Confirm Booking</Button>
      </div>
    </form>
  );
}
