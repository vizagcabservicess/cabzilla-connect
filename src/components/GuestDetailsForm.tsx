
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, User, Phone, Mail, CreditCard, MessageSquare, Search } from 'lucide-react';
import { formatPrice } from '@/lib/cabData';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { countryCodes, CountryCode } from '@/lib/countryCodes';

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
  countryCode: string;
  email: string;
  additionalRequirements?: string;
  totalPrice: number;
  paymentMode?: 'partial' | 'full';
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
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(countryCodes[0]); // Default to India
  
  // Ensure selectedCountry is always valid
  useEffect(() => {
    if (!selectedCountry) {
      setSelectedCountry(countryCodes[0]);
    }
  }, [selectedCountry]);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  
  const { register, handleSubmit, formState: { errors, isValid }, watch, setValue, trigger } = useForm<GuestDetails>({
    mode: 'onChange',
    defaultValues: {
      name: sessionStorage.getItem('guestName') || '',
      phone: sessionStorage.getItem('guestPhone') || '',
      countryCode: sessionStorage.getItem('countryCode') || '+91',
      email: sessionStorage.getItem('guestEmail') || '',
      additionalRequirements: sessionStorage.getItem('additionalRequirements') || '',
      totalPrice: totalPrice,
      paymentMode: (sessionStorage.getItem('paymentMode') as 'partial' | 'full') || 'partial',
      gstEnabled: sessionStorage.getItem('gstEnabled') === 'true' || false,
      gstNumber: sessionStorage.getItem('gstNumber') || '',
      companyName: sessionStorage.getItem('companyName') || '',
      companyAddress: sessionStorage.getItem('companyAddress') || '',
      companyEmail: sessionStorage.getItem('companyEmail') || ''
    }
  });
  
  const watchedValues = watch();
  
  // Filter countries based on search term
  const filteredCountries = countryCodes.filter(country => 
    country.name.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
    country.dialCode.includes(countrySearchTerm)
  );

  // Function to highlight search term in text
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };
  
  // Initialize selected country from session storage or default
  useEffect(() => {
    const savedCountryCode = sessionStorage.getItem('countryCode') || '+91';
    const country = countryCodes.find(c => c.dialCode === savedCountryCode);
    if (country) {
      setSelectedCountry(country);
    }
    
    // Clear any corrupted additional requirements data
    const additionalReqs = sessionStorage.getItem('additionalRequirements');
    if (additionalReqs && (additionalReqs.includes('Country') || additionalReqs.includes('digits') || additionalReqs.includes('+91') || additionalReqs.includes('United States'))) {
      sessionStorage.removeItem('additionalRequirements');
      console.log('Cleared corrupted additional requirements data');
      // Reset the form field to empty
      setValue('additionalRequirements', '');
    }
  }, []);

  // Update phone validation rules when country changes
  useEffect(() => {
    // Re-register the phone field with new validation rules
    register('phone', { 
      required: 'Phone number is required',
      pattern: {
        value: new RegExp(`^[0-9]{${selectedCountry.maxLength}}$`),
        message: `Please enter a valid ${selectedCountry.maxLength} digit phone number`
      }
    });
    
    // Trigger validation if there's already a phone number entered
    if (watchedValues.phone) {
      trigger('phone');
    }
  }, [selectedCountry, register, trigger, watchedValues.phone]);

  // Clear search term when component unmounts or when country changes
  useEffect(() => {
    return () => {
      setCountrySearchTerm('');
    };
  }, []);
  
  const onFormSubmit = (data: GuestDetails) => {
    // countryCode is not a registered input — always use the dropdown value so API gets correct dial code (e.g. +1 vs +91)
    const countryCode = selectedCountry.dialCode;
    // Save to session storage for future use
    sessionStorage.setItem('guestName', data.name);
    sessionStorage.setItem('guestPhone', data.phone);
    sessionStorage.setItem('countryCode', countryCode);
    sessionStorage.setItem('guestEmail', data.email);
    sessionStorage.setItem('additionalRequirements', data.additionalRequirements || '');
    sessionStorage.setItem('paymentMode', data.paymentMode || 'partial');
    sessionStorage.setItem('gstEnabled', String(!!data.gstEnabled));
    if (data.gstEnabled) {
      sessionStorage.setItem('gstNumber', data.gstNumber || '');
      sessionStorage.setItem('companyName', data.companyName || '');
      sessionStorage.setItem('companyAddress', data.companyAddress || '');
      sessionStorage.setItem('companyEmail', data.companyEmail || '');
    }
    
    onSubmit({ ...data, countryCode, totalPrice });
  };

  // Calculate payment amounts
  const partialAmount = Math.round(totalPrice * 0.3);
  const fullAmount = totalPrice;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto"
    >
      <Card className="shadow-lg border-0 bg-white">
        <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-gray-900">Contact details</CardTitle>
              <p className="text-xs sm:text-sm text-gray-600">Booking details will be sent to</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {/* Full Name Field */}
            <div className="space-y-1">
              <Label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Full Name
              </Label>
              <Input
                id="name"
                className={`w-full px-3 py-2 h-10 sm:h-11 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
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
            
            {/* Phone Number Field with Country Code */}
            <div className="space-y-1">
              <Label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </Label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {/* Country Code Selector */}
                <div>
                  <Select
                    value={selectedCountry?.code || 'IN'}
                    onValueChange={(value) => {
                      const country = countryCodes.find(c => c.code === value);
                      if (country) {
                        setSelectedCountry(country);
                        setValue('countryCode', country.dialCode);
                        setCountrySearchTerm(''); // Clear search term when country is selected
                        // Trigger phone validation with new country rules
                        setTimeout(() => {
                          trigger('phone');
                        }, 100);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full px-2 sm:px-3 py-2 h-10 sm:h-11 text-xs sm:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <SelectValue>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <span className="text-sm sm:text-base">{selectedCountry?.flag || '🇮🇳'}</span>
                          <span className="text-xs sm:text-sm">{selectedCountry?.dialCode || '+91'}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {/* Search Input */}
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search countries..."
                            value={countrySearchTerm}
                            onChange={(e) => setCountrySearchTerm(e.target.value)}
                            className="h-8 text-sm pl-8"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      
                      {/* Country List */}
                      <div className="max-h-48 overflow-y-auto">
                        {filteredCountries.length > 0 ? (
                          filteredCountries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              <div className="flex items-center gap-2">
                                <span>{country.flag}</span>
                                <span 
                                  className="text-sm"
                                  dangerouslySetInnerHTML={{ 
                                    __html: highlightSearchTerm(country.dialCode, countrySearchTerm) 
                                  }}
                                />
                                <span 
                                  className="text-xs text-gray-500"
                                  dangerouslySetInnerHTML={{ 
                                    __html: highlightSearchTerm(country.name, countrySearchTerm) 
                                  }}
                                />
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-gray-500 text-center">
                            No countries found
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Phone Number Input */}
                <div className="col-span-2">
                  <Input
                    id="phone"
                    className={`w-full px-3 py-2 h-10 sm:h-11 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                      errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                    } ${watchedValues.phone ? 'border-green-300' : ''}`}
                    placeholder={`Enter ${selectedCountry.maxLength} digit number`}
                    type="tel"
                    inputMode="tel"
                    maxLength={selectedCountry.maxLength}
                    {...register('phone')}
                  />
                </div>
              </div>
              
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
            <div className="space-y-1">
              <Label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Email ID
              </Label>
              <Input
                id="email"
                className={`w-full px-3 py-2 h-10 sm:h-11 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                  errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
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


            {/* Additional Requirements Field */}
            <div className="space-y-1">
              <Label htmlFor="additionalRequirements" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Additional Requirements
              </Label>
              <Textarea
                id="additionalRequirements"
                className={`w-full min-h-20 px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none ${
                  errors.additionalRequirements ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-300'
                } ${watchedValues.additionalRequirements ? 'border-green-300' : ''}`}
                placeholder="Enter flight number, special requests, or any other requirements..."
                {...register('additionalRequirements')}
              />
              <p className="text-xs text-gray-500">
                Optional: Include flight details, accessibility needs, or any special requests
              </p>
            </div>

            {/* Payment Options */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                </div>
                <div>
                  <h5 className="text-base sm:text-lg font-semibold text-gray-900">Payment Options</h5>
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <label className="flex items-center justify-between p-2.5 sm:p-3 bg-white rounded-lg border border-gray-200 cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-sm gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <input
                      type="radio"
                      name="paymentMode"
                      value="partial"
                      checked={watchedValues.paymentMode === 'partial'}
                      onChange={() => setValue('paymentMode', 'partial', { shouldDirty: true, shouldValidate: true })}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-900 text-sm sm:text-base block">Part Pay</span>
                      <div className="text-xs sm:text-sm text-gray-500">Pay 30% now, rest to the driver</div>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 text-sm sm:text-base whitespace-nowrap ml-2">{formatPrice(partialAmount)}</span>
                </label>
                
                <label className="flex items-center justify-between p-2.5 sm:p-3 bg-white rounded-lg border border-gray-200 cursor-pointer transition-all duration-200 hover:border-blue-300 hover:shadow-sm gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <input
                      type="radio"
                      name="paymentMode"
                      value="full"
                      checked={watchedValues.paymentMode === 'full'}
                      onChange={() => setValue('paymentMode', 'full', { shouldDirty: true, shouldValidate: true })}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-gray-900 text-sm sm:text-base block">Full Pay</span>
                      <div className="text-xs sm:text-sm text-gray-500">Pay total amount</div>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 text-sm sm:text-base whitespace-nowrap ml-2">{formatPrice(fullAmount)}</span>
                </label>
              </div>
            </div>

            {/* GST Billing Details (Optional) */}
            <div className="mt-2 border rounded-xl p-3 sm:p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">I have a GST number</p>
                  <p className="text-xs sm:text-sm text-gray-500">Optional</p>
                </div>
                <Switch
                  checked={!!watchedValues.gstEnabled}
                  onCheckedChange={(checked) => setValue('gstEnabled', checked, { shouldDirty: true, shouldValidate: true })}
                  aria-label="Toggle GST details"
                  className="flex-shrink-0"
                />
              </div>

              {watchedValues.gstEnabled && (
                <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
                  <Input
                    id="gstNumber"
                    placeholder="GSTIN"
                    className={`h-10 sm:h-11 text-sm sm:text-base ${errors.gstNumber ? 'border-red-300' : ''}`}
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
                    <p className="text-xs sm:text-sm text-red-500">{String(errors.gstNumber.message)}</p>
                  )}

                  <Input
                    id="companyName"
                    placeholder="Business Name"
                    className={`h-10 sm:h-11 text-sm sm:text-base ${errors.companyName ? 'border-red-300' : ''}`}
                    {...register('companyName', {
                      required: watchedValues.gstEnabled ? 'Business name is required' : false,
                    })}
                  />
                  {errors.companyName && (
                    <p className="text-xs sm:text-sm text-red-500">{String(errors.companyName.message)}</p>
                  )}

                  <Input
                    id="companyAddress"
                    placeholder="Business Address"
                    className="h-10 sm:h-11 text-sm sm:text-base"
                    {...register('companyAddress')}
                  />

                  <Input
                    id="companyEmail"
                    placeholder="Business Email"
                    type="email"
                    inputMode="email"
                    className={`h-10 sm:h-11 text-sm sm:text-base ${errors.companyEmail ? 'border-red-300' : ''}`}
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
                    <p className="text-xs sm:text-sm text-red-500">{String(errors.companyEmail.message)}</p>
                  )}

                  <Alert className="bg-orange-50 border-orange-200 text-orange-800">
                    <AlertDescription className="text-xs sm:text-sm">
                      In case of invalid/cancelled GSTIN, this booking shall be considered as personal booking. Additional 18% GST will be charged on the total amount.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="pt-4 sm:pt-6 space-y-2 sm:space-y-3">
              {/* Legal Disclaimer */}
              <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                <p className="text-[10px] sm:text-xs text-gray-600 text-center leading-relaxed">
                  By proceeding to book, I agree to Vizag Taxi Hub's{' '}
                  <a href="/privacy-policy" className="text-blue-600 hover:text-blue-800 underline">
                    Privacy Policy
                  </a>
                  ,{' '}
                  <a href="/terms-of-service" className="text-blue-600 hover:text-blue-800 underline">
                    Terms of Service
                  </a>
                  ,{' '}
                  <a href="/user-agreement" className="text-blue-600 hover:text-blue-800 underline">
                    User Agreement
                  </a>
                  {' '}&{' '}
                  <a href="https://vizagtaxihub.com/cancellation-refund-policy" className="text-blue-600 hover:text-blue-800 underline">
                    Cancellation Rules
                  </a>
                </p>
              </div>

              {onBack && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onBack}
                  className="w-full h-11 sm:h-12 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              
              <Button 
                type="submit" 
                className={`w-full h-11 sm:h-12 text-base sm:text-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 rounded-lg ${
                  isValid && !isLoading 
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                disabled={!isValid || isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm sm:text-base">Processing...</span>
                  </div>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4" />
                    <span className="text-sm sm:text-base">{paymentEnabled ? 'Proceed to Payment' : 'Confirm Booking'} - {formatPrice(watchedValues.paymentMode === 'partial' ? partialAmount : fullAmount)}</span>
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
