
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { TabsContent, Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SocialLogin } from "@/components/SocialLogin";
import { EditableContactDetailsForm } from "@/components/EditableContactDetailsForm";

interface GuestDetailsFormProps {
  onSubmit: (details: any) => void;
  totalPrice: number;
}

export function GuestDetailsForm({ onSubmit, totalPrice }: GuestDetailsFormProps) {
  const [authTab, setAuthTab] = useState<string>("contact");
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  // Enhanced highlight effect when the component mounts
  useEffect(() => {
    if (formRef.current) {
      // Scroll to form when component mounts with smooth behavior
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Add highlight effect with pulsing animation
      formRef.current.classList.add('animate-pulse', 'border-blue-500', 'border-2', 'bg-blue-50');
      
      // Remove highlight after a delay
      const timer = setTimeout(() => {
        if (formRef.current) {
          formRef.current.classList.remove('animate-pulse', 'border-blue-500', 'border-2', 'bg-blue-50');
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle social login success
  const handleLoginSuccess = (userData: any) => {
    toast({
      title: "Login Successful",
      description: `Welcome, ${userData.name}!`,
      duration: 3000,
    });
    
    // Auto-fill the guest details form with user data
    const guestDetails = {
      name: userData.name,
      email: userData.email,
      phone: "", // Social login typically doesn't provide phone number
    };
    
    // Show another toast prompting the user to complete their phone number
    toast({
      title: "One More Step",
      description: "Please enter your phone number to complete the booking.",
      duration: 5000,
    });
    
    // Switch to the contact tab
    setAuthTab("contact");
  };

  return (
    <div ref={formRef} className="transition-all duration-300 rounded-lg">
      <Tabs value={authTab} onValueChange={setAuthTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contact">Contact Details</TabsTrigger>
          <TabsTrigger value="social">Social Login</TabsTrigger>
        </TabsList>
        
        <TabsContent value="contact" className="mt-4">
          <EditableContactDetailsForm 
            onSubmit={onSubmit}
            totalPrice={totalPrice}
          />
        </TabsContent>
        
        <TabsContent value="social" className="mt-4">
          <div className="space-y-4 bg-white rounded-lg shadow-sm border p-6">
            <p className="text-sm text-gray-600">
              Login with your social account to quickly complete your booking.
            </p>
            <SocialLogin onLoginSuccess={handleLoginSuccess} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
