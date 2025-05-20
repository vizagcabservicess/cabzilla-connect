
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/cabData';

interface GuestDetailsFormProps {
  onSubmit: (data: GuestDetails) => void;
  onBack?: () => void;
  totalPrice: number;
  isLoading?: boolean;
}

interface GuestDetails {
  name: string;
  phone: string;
  email: string;
}

export const GuestDetailsForm: React.FC<GuestDetailsFormProps> = ({ 
  onSubmit, 
  onBack, 
  totalPrice, 
  isLoading = false 
}) => {
  const { register, handleSubmit, formState: { errors, isValid } } = useForm<GuestDetails>({
    mode: 'onChange',
    defaultValues: {
      name: sessionStorage.getItem('guestName') || '',
      phone: sessionStorage.getItem('guestPhone') || '',
      email: sessionStorage.getItem('guestEmail') || ''
    }
  });
  
  const onFormSubmit = (data: GuestDetails) => {
    // Save to session storage for future use
    sessionStorage.setItem('guestName', data.name);
    sessionStorage.setItem('guestPhone', data.phone);
    sessionStorage.setItem('guestEmail', data.email);
    
    onSubmit(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      <div className="space-y-3">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          className="mobile-input"
          placeholder="Enter your full name"
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </div>
      
      <div className="space-y-3">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          className="mobile-input"
          placeholder="Enter your phone number"
          type="tel"
          {...register('phone', { 
            required: 'Phone number is required',
            pattern: {
              value: /^\+?[0-9]{10,12}$/,
              message: 'Please enter a valid phone number'
            }
          })}
        />
        {errors.phone && (
          <p className="text-red-500 text-sm">{errors.phone.message}</p>
        )}
      </div>
      
      <div className="space-y-3">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          className="mobile-input"
          placeholder="Enter your email address"
          type="email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Please enter a valid email'
            }
          })}
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}
      </div>
      
      <div className="pt-4 flex flex-col md:flex-row items-center gap-4 md:justify-between">
        {onBack && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onBack}
            className="w-full md:w-auto mobile-button order-2 md:order-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        )}
        
        <Button 
          type="submit" 
          className="w-full md:w-auto mobile-button order-1 md:order-2"
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <>
              Confirm Booking - ₹{formatPrice(totalPrice)}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
