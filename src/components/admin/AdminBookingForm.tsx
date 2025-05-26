import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { LocationInput, Location } from '@/components/LocationInput';
import { DateTimePicker } from '@/components/DateTimePicker';
import { BookingRequest, Booking } from '@/types/api';
import { authAPI } from '@/services/api/authAPI';

interface AdminBookingFormProps {
  onBookingCreated?: (booking: Booking) => void;
}

export const AdminBookingForm: React.FC<AdminBookingFormProps> = ({
  onBookingCreated
}) => {
  const [formData, setFormData] = useState({
    pickupLocation: '',
    dropLocation: '',
    pickupDate: new Date(),
    returnDate: null as Date | null,
    cabType: '',
    tripType: 'one-way',
    tripMode: 'local',
    passengerName: '',
    passengerPhone: '',
    passengerEmail: '',
    totalAmount: 0,
    adminNotes: '',
    discountAmount: 0,
    discountType: null as string | null,
    discountValue: 0,
    isPaid: false,
    hourlyPackage: null as string | null,
  });

  const [pickupLocationObj, setPickupLocationObj] = useState<Location | null>(null);
  const [dropLocationObj, setDropLocationObj] = useState<Location | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cabTypes] = useState(['Sedan', 'SUV', 'Hatchback', 'Premium']);

  const handlePickupLocationChange = (location: Location) => {
    setPickupLocationObj(location);
    setFormData(prev => ({ ...prev, pickupLocation: location.address }));
  };

  const handleDropLocationChange = (location: Location) => {
    setDropLocationObj(location);
    setFormData(prev => ({ ...prev, dropLocation: location.address }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pickupLocation || !formData.passengerName || !formData.passengerPhone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingData: BookingRequest = {
        pickupLocation: formData.pickupLocation,
        dropLocation: formData.dropLocation,
        pickupDate: formData.pickupDate.toISOString(),
        returnDate: formData.returnDate?.toISOString() || null,
        cabType: formData.cabType,
        distance: 0,
        tripType: formData.tripType,
        tripMode: formData.tripMode,
        totalAmount: formData.totalAmount,
        passengerName: formData.passengerName,
        passengerPhone: formData.passengerPhone,
        passengerEmail: formData.passengerEmail,
        hourlyPackage: formData.hourlyPackage,
        adminNotes: formData.adminNotes,
        discountAmount: formData.discountAmount,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        isPaid: formData.isPaid,
        createdBy: 'admin'
      };

      const token = authAPI.getToken();
      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (result.status === 'success') {
        toast.success('Booking created successfully');
        onBookingCreated?.(result.data);
        
        // Reset form
        setFormData({
          pickupLocation: '',
          dropLocation: '',
          pickupDate: new Date(),
          returnDate: null,
          cabType: '',
          tripType: 'one-way',
          tripMode: 'local',
          passengerName: '',
          passengerPhone: '',
          passengerEmail: '',
          totalAmount: 0,
          adminNotes: '',
          discountAmount: 0,
          discountType: null,
          discountValue: 0,
          isPaid: false,
          hourlyPackage: null,
        });
      } else {
        throw new Error(result.message || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Booking</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pickup Location *</Label>
              <LocationInput
                value={pickupLocationObj?.address || ''}
                onChange={handlePickupLocationChange}
                placeholder="Enter pickup location"
              />
            </div>

            {formData.tripMode !== 'local' && (
              <div className="space-y-2">
                <Label>Drop Location</Label>
                <LocationInput
                  value={dropLocationObj?.address || ''}
                  onChange={handleDropLocationChange}
                  placeholder="Enter drop location"
                />
              </div>
            )}
          </div>

          {/* Date Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateTimePicker
              date={formData.pickupDate}
              onDateChange={(date) => setFormData(prev => ({ ...prev, pickupDate: date }))}
              minDate={new Date()}
            />

            {formData.tripType === 'round-trip' && (
              <DateTimePicker
                date={formData.returnDate || new Date()}
                onDateChange={(date) => setFormData(prev => ({ ...prev, returnDate: date }))}
                minDate={new Date()}
              />
            )}
          </div>

          {/* Passenger Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passengerName">Passenger Name *</Label>
              <Input
                id="passengerName"
                value={formData.passengerName}
                onChange={(e) => setFormData(prev => ({ ...prev, passengerName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passengerPhone">Phone Number *</Label>
              <Input
                id="passengerPhone"
                value={formData.passengerPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, passengerPhone: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="passengerEmail">Email</Label>
              <Input
                id="passengerEmail"
                type="email"
                value={formData.passengerEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, passengerEmail: e.target.value }))}
              />
            </div>
          </div>

          {/* Trip Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Trip Type</Label>
              <Select value={formData.tripType} onValueChange={(value) => setFormData(prev => ({ ...prev, tripType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-way">One Way</SelectItem>
                  <SelectItem value="round-trip">Round Trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trip Mode</Label>
              <Select value={formData.tripMode} onValueChange={(value) => setFormData(prev => ({ ...prev, tripMode: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="outstation">Outstation</SelectItem>
                  <SelectItem value="airport">Airport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Select value={formData.cabType} onValueChange={(value) => setFormData(prev => ({ ...prev, cabType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {cabTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Admin Controls */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium">Admin Controls</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount (₹)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountAmount">Discount Amount (₹)</Label>
                <Input
                  id="discountAmount"
                  type="number"
                  value={formData.discountAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                value={formData.adminNotes}
                onChange={(e) => setFormData(prev => ({ ...prev, adminNotes: e.target.value }))}
                placeholder="Add any special instructions or notes..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPaid"
                checked={formData.isPaid}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPaid: checked }))}
              />
              <Label htmlFor="isPaid">Mark as Paid</Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Booking...' : 'Create Booking'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
