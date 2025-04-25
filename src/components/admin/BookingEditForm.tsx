
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Booking, BookingStatus } from '@/types/api';
import { isBookingEditable } from '@/utils/bookingUtils';

interface BookingEditFormProps {
  booking: Booking;
  onSave: (updatedData: Partial<Booking>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function BookingEditForm({ booking, onSave, onCancel, isSubmitting }: BookingEditFormProps) {
  const [formData, setFormData] = useState({
    passengerName: booking.passengerName || '',
    passengerPhone: booking.passengerPhone || '',
    passengerEmail: booking.passengerEmail || '',
    pickupLocation: booking.pickupLocation || '',
    dropLocation: booking.dropLocation || '',
    pickupDate: booking.pickupDate ? new Date(booking.pickupDate) : new Date(),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const updatedData = {
      passengerName: formData.passengerName,
      passengerPhone: formData.passengerPhone,
      passengerEmail: formData.passengerEmail,
      pickupLocation: formData.pickupLocation,
      dropLocation: formData.dropLocation,
      pickupDate: formData.pickupDate.toISOString()
    };
    
    await onSave(updatedData);
  };

  const isEditable = isBookingEditable(booking.status);

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
