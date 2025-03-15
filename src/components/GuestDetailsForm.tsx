
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { EditableContactDetailsForm } from "@/components/EditableContactDetailsForm";

interface GuestDetailsFormProps {
  onSubmit: (details: any) => void;
  totalPrice: number;
}

export function GuestDetailsForm({ onSubmit, totalPrice }: GuestDetailsFormProps) {
  const formRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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

  return (
    <div ref={formRef} className="transition-all duration-300 rounded-lg">
      <EditableContactDetailsForm 
        onSubmit={onSubmit}
        totalPrice={totalPrice}
      />
    </div>
  );
}
