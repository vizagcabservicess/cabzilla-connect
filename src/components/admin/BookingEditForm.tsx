
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { Booking, BookingStatus } from '@/types/api';
import { isBookingEditable } from '@/utils/bookingUtils';
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

interface ExtraCharge {
  id?: number;
  description: string;
  amount: number;
}

interface BookingEditFormProps {
  booking: Booking;
  onSave: (updatedData: Partial<Booking> & { extraCharges?: ExtraCharge[] }) => Promise<void>;
  onSubmit?: (updatedData: Partial<Booking> & { extraCharges?: ExtraCharge[] }) => Promise<void>; // For backward compatibility
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
    billingAddress: booking.billingAddress || '',
    pickupDate: booking.pickupDate ? new Date(booking.pickupDate) : new Date(),
  });

  const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>(
    Array.isArray(booking.extraCharges) ? booking.extraCharges : []
  );
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const addExtraCharge = () => {
    setExtraCharges([
      ...extraCharges,
      { description: '', amount: 0 }
    ]);
  };

  const removeExtraCharge = (index: number) => {
    setExtraCharges(extraCharges.filter((_, i) => i !== index));
  };

  const handleExtraChargeChange = (index: number, field: 'description' | 'amount', value: string) => {
    const updatedCharges = [...extraCharges];
    if (field === 'amount') {
      updatedCharges[index][field] = parseFloat(value) || 0;
    } else {
      updatedCharges[index][field] = value;
    }
    setExtraCharges(updatedCharges);
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
    
    // Validate extra charges
    const validExtraCharges = extraCharges.filter(
      charge => charge.description.trim() !== '' && charge.amount > 0
    );
    
    if (extraCharges.length > validExtraCharges.length) {
      newErrors.extraCharges = 'All extra charges must have a description and amount greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const validExtraCharges = extraCharges.filter(
      charge => charge.description.trim() !== '' && charge.amount > 0
    );
    
    const updatedData = {
      passengerName: formData.passengerName,
      passengerPhone: formData.passengerPhone,
      passengerEmail: formData.passengerEmail,
      pickupLocation: formData.pickupLocation,
      dropLocation: formData.dropLocation,
      billingAddress: formData.billingAddress,
      pickupDate: formData.pickupDate.toISOString(),
      extraCharges: validExtraCharges
    };
    
    // Use onSubmit if provided (for backward compatibility), otherwise use onSave
    const submitHandler = onSubmit || onSave;
    await submitHandler(updatedData);
  };

  const isEditable = isBookingEditable(booking.status);

  const calculateTotalExtras = (): number => {
    return extraCharges.reduce((sum, charge) => sum + (Number(charge.amount) || 0), 0);
  };

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
        <Textarea
          id="billingAddress"
          name="billingAddress"
          placeholder="Enter billing address for invoice"
          value={formData.billingAddress}
          onChange={handleInputChange}
          rows={3}
          disabled={!isEditable || isSubmitting}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Extra Charges</h3>
            <Button 
              type="button" 
              size="sm" 
              onClick={addExtraCharge} 
              disabled={!isEditable || isSubmitting}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Charge
            </Button>
          </div>

          {extraCharges.length > 0 ? (
            <div className="space-y-4">
              {extraCharges.map((charge, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="flex-grow">
                    <Label htmlFor={`charge-desc-${index}`}>Description</Label>
                    <Input
                      id={`charge-desc-${index}`}
                      value={charge.description}
                      onChange={(e) => handleExtraChargeChange(index, 'description', e.target.value)}
                      placeholder="e.g., Extra mileage"
                      disabled={!isEditable || isSubmitting}
                    />
                  </div>
                  <div className="w-24">
                    <Label htmlFor={`charge-amount-${index}`}>Amount (₹)</Label>
                    <Input
                      id={`charge-amount-${index}`}
                      type="number"
                      value={charge.amount}
                      onChange={(e) => handleExtraChargeChange(index, 'amount', e.target.value)}
                      min={0}
                      step={0.01}
                      disabled={!isEditable || isSubmitting}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeExtraCharge(index)}
                    disabled={!isEditable || isSubmitting}
                    className="mb-0.5"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              
              {errors.extraCharges && (
                <p className="text-sm text-red-500">{errors.extraCharges}</p>
              )}

              <div className="pt-2 border-t mt-4">
                <div className="flex justify-between">
                  <span className="font-medium">Total Extra Charges:</span>
                  <span className="font-medium">₹{calculateTotalExtras().toFixed(2)}</span>
                </div>
                {booking.totalAmount && (
                  <div className="flex justify-between mt-2">
                    <span className="font-medium">Total with Extras:</span>
                    <span className="font-medium">
                      ₹{(Number(booking.totalAmount) + calculateTotalExtras()).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No extra charges added.</p>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isEditable || isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
