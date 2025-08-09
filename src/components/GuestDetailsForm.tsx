
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, User, Phone, Mail, CreditCard } from 'lucide-react';
import { formatPrice } from '@/lib/cabData';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  totalPrice: number;
  gstEnabled?: boolean;
  gstNumber?: string;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
}

export const GuestDetailsForm: React.FC<GuestDetailsFormProps> = ({ 
  onSubmit, 
  onBack, 
  totalPrice, 
  isLoading = false,
  paymentEnabled = true
}) => {
  const { register, handleSubmit, formState: { errors, isValid }, watch, setValue } = useForm<GuestDetails>({
    mode: 'onChange',
    defaultValues: {
      name: sessionStorage.getItem('guestName') || '',
      phone: sessionStorage.getItem('guestPhone') || '',
      email: sessionStorage.getItem('guestEmail') || '',
      totalPrice: totalPrice,
      gstEnabled: sessionStorage.getItem('gstEnabled') === 'true' || false,
      gstNumber: sessionStorage.getItem('gstNumber') || '',
      companyName: sessionStorage.getItem('companyName') || '',
      companyAddress: sessionStorage.getItem('companyAddress') || '',
      companyEmail: sessionStorage.getItem('companyEmail') || ''
    }
  });
  
  const watchedValues = watch();
  
  const onFormSubmit = (data: GuestDetails) => {
    // Save to session storage for future use
    sessionStorage.setItem('guestName', data.name);
    sessionStorage.setItem('guestPhone', data.phone);
    sessionStorage.setItem('guestEmail', data.email);
    sessionStorage.setItem('gstEnabled', String(!!data.gstEnabled));
    if (data.gstEnabled) {
      sessionStorage.setItem('gstNumber', data.gstNumber || '');
      sessionStorage.setItem('companyName', data.companyName || '');
      sessionStorage.setItem('companyAddress', data.companyAddress || '');
      sessionStorage.setItem('companyEmail', data.companyEmail || '');
    }
    
    onSubmit({ ...data, totalPrice });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-md mx-auto"
    >
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Guest Information
          </CardTitle>
          <p className="text-sm text-gray-600">Please provide your contact details to continue</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
            {/* Full Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User size={16} className="text-blue-500" />
                Full Name
              </Label>
              <Input
                id="name"
                className={`h-12 px-4 text-base border-2 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                } ${watchedValues.name ? 'border-green-300' : ''}`}
                placeholder="Enter your full name"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm flex items-center gap-1"
                >
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.name.message}
                </motion.p>
              )}
            </div>
            
            {/* Phone Number Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Phone size={16} className="text-blue-500" />
                Phone Number
              </Label>
              <Input
                id="phone"
                className={`h-12 px-4 text-base border-2 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                } ${watchedValues.phone ? 'border-green-300' : ''}`}
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
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm flex items-center gap-1"
                >
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.phone.message}
                </motion.p>
              )}
            </div>
            
            {/* Email Address Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail size={16} className="text-blue-500" />
                Email Address
              </Label>
              <Input
                id="email"
                className={`h-12 px-4 text-base border-2 transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 ${
                  errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200'
                } ${watchedValues.email ? 'border-green-300' : ''}`}
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
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-500 text-sm flex items-center gap-1"
                >
                  <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.email.message}
                </motion.p>
              )}
            </div>

            {/* GST Billing Details (Optional) */}
            <div className="mt-2 border rounded-xl p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">I have a GST number</p>
                  <p className="text-sm text-gray-500">Optional</p>
                </div>
                <Switch
                  checked={!!watchedValues.gstEnabled}
                  onCheckedChange={(checked) => setValue('gstEnabled', checked, { shouldDirty: true, shouldValidate: true })}
                  aria-label="Toggle GST details"
                />
              </div>

              {watchedValues.gstEnabled && (
                <div className="mt-4 space-y-4">
                  <Input
                    id="gstNumber"
                    placeholder="GSTIN"
                    className={`h-11 ${errors.gstNumber ? 'border-red-300' : ''}`}
                    {...register('gstNumber', {
                      required: watchedValues.gstEnabled ? 'GSTIN is required' : false,
                      pattern: watchedValues.gstEnabled
                        ? {
                            // Basic GSTIN validation pattern for India
                            value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
                            message: 'Enter a valid GSTIN'
                          }
                        : undefined,
                    })}
                  />
                  {errors.gstNumber && (
                    <p className="text-sm text-red-500">{String(errors.gstNumber.message)}</p>
                  )}

                  <Input
                    id="companyName"
                    placeholder="Business Name"
                    className={`h-11 ${errors.companyName ? 'border-red-300' : ''}`}
                    {...register('companyName', {
                      required: watchedValues.gstEnabled ? 'Business name is required' : false,
                    })}
                  />
                  {errors.companyName && (
                    <p className="text-sm text-red-500">{String(errors.companyName.message)}</p>
                  )}

                  <Input
                    id="companyAddress"
                    placeholder="Business Address"
                    className="h-11"
                    {...register('companyAddress')}
                  />

                  <Input
                    id="companyEmail"
                    placeholder="Business Email"
                    type="email"
                    inputMode="email"
                    className={`h-11 ${errors.companyEmail ? 'border-red-300' : ''}`}
                    {...register('companyEmail', {
                      required: watchedValues.gstEnabled ? 'Business email is required' : false,
                      pattern: watchedValues.gstEnabled
                        ? {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Enter a valid email'
                          }
                        : undefined,
                    })}
                  />
                  {errors.companyEmail && (
                    <p className="text-sm text-red-500">{String(errors.companyEmail.message)}</p>
                  )}

                  <Alert className="bg-orange-50 border-orange-200 text-orange-800">
                    <AlertDescription>
                      In case of invalid/cancelled GSTIN, this booking shall be considered as personal booking
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="pt-6 space-y-3">
              {onBack && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onBack}
                  className="w-full h-12 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              
              <Button 
                type="submit" 
                className={`w-full h-12 text-base font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  isValid && !isLoading 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                disabled={!isValid || isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    {paymentEnabled ? 'Proceed to Payment' : 'Confirm Booking'} - {formatPrice(totalPrice)}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};
