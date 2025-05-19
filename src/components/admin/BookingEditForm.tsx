import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Plus, X } from "lucide-react";
import { Booking, BookingStatus } from '@/types/api';
import { isBookingEditable } from '@/utils/bookingUtils';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface BookingEditFormProps {
  booking: Booking;
  onSave?: (updatedData: Partial<Booking>) => Promise<void>;
  onSubmit?: (updatedData: Partial<Booking>) => Promise<void>; // Add for backward compatibility
  onCancel: () => void;
  isSubmitting: boolean;
}

export function BookingEditForm({ 
  booking, 
  onSave, 
  onSubmit, 
  onCancel, 
  isSubmitting 
}: BookingEditFormProps) {
  const [formData, setFormData] = useState({
    passengerName: booking.passengerName || '',
    passengerPhone: booking.passengerPhone || '',
    passengerEmail: booking.passengerEmail || '',
    pickupLocation: booking.pickupLocation || '',
    dropLocation: booking.dropLocation || '',
    pickupDate: booking.pickupDate ? new Date(booking.pickupDate) : new Date(),
    billingAddress: booking.billingAddress || '',
  });

  // Reset form data when booking prop changes
  useEffect(() => {
    setFormData({
      passengerName: booking.passengerName || '',
      passengerPhone: booking.passengerPhone || '',
      passengerEmail: booking.passengerEmail || '',
      pickupLocation: booking.pickupLocation || '',
      dropLocation: booking.dropLocation || '',
      pickupDate: booking.pickupDate ? new Date(booking.pickupDate) : new Date(),
      billingAddress: booking.billingAddress || '',
    });
  }, [booking]);

  const extraCharges = booking.extraCharges && Array.isArray(booking.extraCharges)
    ? booking.extraCharges.map(charge => ({
        amount: typeof charge.amount === 'number' ? charge.amount : parseFloat(String(charge.amount)),
        description: charge.description || (charge as any).label || ''
      }))
    : [];

  const [newCharge, setNewCharge] = useState<{ amount: number; description: string }>({
    amount: 0,
    description: ''
  });

  const [pendingExtraCharges, setPendingExtraCharges] = useState<null | { amount: number; description: string }[]>(null);

  // Always use pendingExtraCharges if set, otherwise use booking.extraCharges
  const displayedExtraCharges = pendingExtraCharges !== null ? pendingExtraCharges : extraCharges;

  // Reset pendingExtraCharges whenever booking.extraCharges changes
  useEffect(() => {
    setPendingExtraCharges(null);
  }, [booking.extraCharges]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        pickupDate: date
      }));
      
      if (errors.pickupDate) {
        setErrors(prev => ({
          ...prev,
          pickupDate: ''
        }));
      }
    }
  };

  const handleNewChargeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCharge(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  // Update add/remove functions to work directly on extraCharges and submit the new array on save
  const addExtraCharge = () => {
    if (newCharge.description.trim() === '' || newCharge.amount <= 0) {
      return;
    }
    setPendingExtraCharges([
      ...displayedExtraCharges,
      { amount: newCharge.amount, description: newCharge.description }
    ]);
    setNewCharge({ amount: 0, description: '' });
  };

  const removeExtraCharge = (index: number) => {
    setPendingExtraCharges(displayedExtraCharges.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.passengerName.trim()) {
      newErrors.passengerName = 'Passenger name is required';
    }
    
    if (!formData.passengerPhone.trim()) {
      newErrors.passengerPhone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.passengerPhone.replace(/\D/g, ''))) {
      newErrors.passengerPhone = 'Invalid phone number format';
    }
    
    if (!formData.passengerEmail.trim()) {
      newErrors.passengerEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.passengerEmail)) {
      newErrors.passengerEmail = 'Invalid email format';
    }
    
    if (!formData.pickupLocation.trim()) {
      newErrors.pickupLocation = 'Pickup location is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // PATCH: Base fare is the original booking fare, total is base + extra charges
  const initialExtraCharges = Array.isArray(booking.extraCharges)
    ? booking.extraCharges.reduce((sum, c) => sum + (c.amount || 0), 0)
    : 0;
  const baseAmount = (typeof booking.totalAmount === 'number' ? booking.totalAmount : 0) - initialExtraCharges;
  const extraChargesTotal = displayedExtraCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const totalAmount = baseAmount + extraChargesTotal;

  console.log('booking.totalAmount', booking.totalAmount);
  console.log('booking.extraCharges', booking.extraCharges);
  console.log('initialExtraCharges', initialExtraCharges);
  console.log('baseAmount', baseAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const updatedData = {
        passengerName: formData.passengerName,
        passengerPhone: formData.passengerPhone,
        passengerEmail: formData.passengerEmail,
        pickupLocation: formData.pickupLocation,
        dropLocation: formData.dropLocation,
        pickupDate: formData.pickupDate.toISOString(),
        billingAddress: formData.billingAddress,
        extraCharges: displayedExtraCharges,
        totalAmount: totalAmount,
      };
      const submitHandler = onSubmit || onSave;
      if (submitHandler) {
        await submitHandler(updatedData);
        // Clear pending charges after successful save
        setPendingExtraCharges(null);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isEditable = isBookingEditable(booking.status);

  useEffect(() => {
    console.log('Booking prop in modal changed:', booking);
  }, [booking]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="passengerName">Passenger Name</Label>
          <Input
            id="passengerName"
            name="passengerName"
            value={formData.passengerName}
            onChange={handleInputChange}
            disabled={!isEditable || isSubmitting}
          />
          {errors.passengerName && (
            <p className="text-sm text-red-500">{errors.passengerName}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="passengerPhone">Phone Number</Label>
          <Input
            id="passengerPhone"
            name="passengerPhone"
            value={formData.passengerPhone}
            onChange={handleInputChange}
            disabled={!isEditable || isSubmitting}
          />
          {errors.passengerPhone && (
            <p className="text-sm text-red-500">{errors.passengerPhone}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="passengerEmail">Email</Label>
          <Input
            id="passengerEmail"
            name="passengerEmail"
            value={formData.passengerEmail}
            onChange={handleInputChange}
            disabled={!isEditable || isSubmitting}
          />
          {errors.passengerEmail && (
            <p className="text-sm text-red-500">{errors.passengerEmail}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pickupDate">Pickup Date & Time</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.pickupDate && "text-muted-foreground"
                )}
                disabled={!isEditable || isSubmitting}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.pickupDate ? (
                  format(formData.pickupDate, "PPP p")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.pickupDate}
                onSelect={handleDateChange}
                initialFocus
              />
              <div className="p-3 border-t">
                <Label htmlFor="pickupTime">Time</Label>
                <Input
                  id="pickupTime"
                  type="time"
                  className="mt-1"
                  value={formData.pickupDate ? format(formData.pickupDate, "HH:mm") : ""}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':').map(Number);
                    const newDate = new Date(formData.pickupDate);
                    newDate.setHours(hours, minutes);
                    handleDateChange(newDate);
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
          {errors.pickupDate && (
            <p className="text-sm text-red-500">{errors.pickupDate}</p>
          )}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="pickupLocation">Pickup Location</Label>
        <Input
          id="pickupLocation"
          name="pickupLocation"
          value={formData.pickupLocation}
          onChange={handleInputChange}
          disabled={!isEditable || isSubmitting}
        />
        {errors.pickupLocation && (
          <p className="text-sm text-red-500">{errors.pickupLocation}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="dropLocation">Drop Location</Label>
        <Input
          id="dropLocation"
          name="dropLocation"
          value={formData.dropLocation}
          onChange={handleInputChange}
          disabled={!isEditable || isSubmitting}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="billingAddress">Billing Address</Label>
        <Input
          id="billingAddress"
          name="billingAddress"
          value={formData.billingAddress}
          onChange={handleInputChange}
          disabled={!isEditable || isSubmitting}
        />
      </div>

      {/* Extra Charges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extra Charges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            {displayedExtraCharges.length > 0 ? (
              <div className="space-y-2">
                {displayedExtraCharges.map((charge, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-md">
                    <div>
                      <span className="font-medium">{charge.description}</span>
                      <span className="ml-2 text-sm text-gray-500">₹{charge.amount}</span>
                    </div>
                    {isEditable && !isSaving && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExtraCharge(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No extra charges added</p>
            )}
          </div>

          {isEditable && !isSaving && (
            <div className="grid grid-cols-3 gap-2 items-end mt-4">
              <div className="col-span-1">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="50"
                  value={newCharge.amount || ''}
                  onChange={handleNewChargeChange}
                  disabled={isSaving}
                />
              </div>
              <div className="col-span-1">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={newCharge.description}
                  onChange={handleNewChargeChange}
                  disabled={isSaving}
                />
              </div>
              <div className="col-span-1">
                <Button
                  type="button"
                  onClick={addExtraCharge}
                  disabled={!newCharge.description || newCharge.amount <= 0 || isSaving}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          )}

          <div className="mt-4 text-right">
            <p className="text-sm text-gray-500">Base Amount: ₹{baseAmount}</p>
            {displayedExtraCharges.length > 0 && (
              <p className="text-sm text-gray-500">
                Additional Charges: ₹{extraChargesTotal}
              </p>
            )}
            <p className="text-lg font-bold">
              Total Amount: ₹{totalAmount}
            </p>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isEditable || isSaving}>
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
