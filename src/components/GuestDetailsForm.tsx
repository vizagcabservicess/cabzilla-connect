
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, User, Phone, Mail } from 'lucide-react';
import { formatPrice } from '@/lib/cabData';
import { motion } from 'framer-motion';

interface GuestDetailsFormProps {
  onSubmit: (data: GuestDetails) => void;
  onBack?: () => void;
  totalPrice: number;
  isLoading?: boolean;
  paymentEnabled?: boolean;
}

export interface GuestDetails {
  name: string;
  phone: string;
  email: string;
}

export const GuestDetailsForm: React.FC<GuestDetailsFormProps> = ({ 
  onSubmit, 
  onBack, 
  totalPrice, 
  isLoading = false,
  paymentEnabled = true
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
        <div className="mobile-form-group">
          <Label htmlFor="name" className="mobile-label flex items-center gap-2">
            <User size={16} className="text-blue-500" />
            <span>Full Name</span>
          </Label>
          <Input
            id="name"
            className="mobile-input"
            placeholder="Enter your full name"
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>
        
        <div className="mobile-form-group">
          <Label htmlFor="phone" className="mobile-label flex items-center gap-2">
            <Phone size={16} className="text-blue-500" />
            <span>Phone Number</span>
          </Label>
          <Input
            id="phone"
            className="mobile-input"
            placeholder="Enter your phone number"
            type="tel"
            inputMode="tel"
            {...register('phone', { 
              required: 'Phone number is required',
              pattern: {
                value: /^\+?[0-9]{10,12}$/,
                message: 'Please enter a valid phone number'
              }
            })}
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
          )}
        </div>
        
        <div className="mobile-form-group">
          <Label htmlFor="email" className="mobile-label flex items-center gap-2">
            <Mail size={16} className="text-blue-500" />
            <span>Email Address</span>
          </Label>
          <Input
            id="email"
            className="mobile-input"
            placeholder="Enter your email address"
            type="email"
            inputMode="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Please enter a valid email'
              }
            })}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>
        
        <div className="pt-4 flex flex-col md:flex-row items-center gap-4 md:justify-between">
          {onBack && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onBack}
              className="w-full md:w-auto mobile-button bg-gray-100 order-2 md:order-1 flex items-center justify-center"
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
                {paymentEnabled ? 'Proceed to Payment' : 'Confirm Booking'} - ₹{formatPrice(totalPrice)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
};
