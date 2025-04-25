
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Booking } from '@/types/api';

interface DriverAssignmentProps {
  booking: Booking;
  onAssign: (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export function DriverAssignment({ booking, onAssign, onClose, isSubmitting }: DriverAssignmentProps) {
  const [driverData, setDriverData] = useState({
    driverName: booking.driverName || '',
    driverPhone: booking.driverPhone || '',
    vehicleNumber: booking.vehicleNumber || ''
  });
  
  const [driverType, setDriverType] = useState<string>('new');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Mock drivers for dropdown - in a real app, this would come from the API
  const availableDrivers = [
    { id: 1, name: "Rajesh Kumar", phone: "9876543210", vehicleNumber: "AP 31 AB 1234" },
    { id: 2, name: "Suresh Singh", phone: "9876543211", vehicleNumber: "AP 31 CD 5678" },
    { id: 3, name: "Mahesh Reddy", phone: "9876543212", vehicleNumber: "AP 31 EF 9012" }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDriverData(prev => ({
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

  const selectExistingDriver = (driverId: string) => {
    const selectedDriver = availableDrivers.find(d => d.id === parseInt(driverId));
    if (selectedDriver) {
      setDriverData({
        driverName: selectedDriver.name,
        driverPhone: selectedDriver.phone,
        vehicleNumber: selectedDriver.vehicleNumber
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!driverData.driverName.trim()) {
      newErrors.driverName = 'Driver name is required';
    }
    
    if (!driverData.driverPhone.trim()) {
      newErrors.driverPhone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(driverData.driverPhone.replace(/\D/g, ''))) {
      newErrors.driverPhone = 'Invalid phone number format';
    }
    
    if (!driverData.vehicleNumber.trim()) {
      newErrors.vehicleNumber = 'Vehicle number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    await onAssign(driverData);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Assign Driver for Booking #{booking.bookingNumber}</h3>
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="font-medium">Trip:</span> {booking.tripType} ({booking.tripMode})
            </div>
            <div>
              <span className="font-medium">Vehicle:</span> {booking.cabType}
            </div>
            <div>
              <span className="font-medium">Date:</span> {new Date(booking.pickupDate).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Time:</span> {new Date(booking.pickupDate).toLocaleTimeString()}
            </div>
            <div className="col-span-2">
              <span className="font-medium">Pickup:</span> {booking.pickupLocation}
            </div>
            {booking.dropLocation && (
              <div className="col-span-2">
                <span className="font-medium">Drop:</span> {booking.dropLocation}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-4 pb-2">
        <Button 
          type="button" 
          variant={driverType === 'existing' ? "default" : "outline"} 
          onClick={() => setDriverType('existing')}
          className="flex-1"
        >
          Select Existing Driver
        </Button>
        <Button 
          type="button" 
          variant={driverType === 'new' ? "default" : "outline"} 
          onClick={() => setDriverType('new')}
          className="flex-1"
        >
          Add New Driver
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {driverType === 'existing' && (
          <div className="space-y-4">
            <Label htmlFor="driverId">Select Driver</Label>
            <Select onValueChange={selectExistingDriver}>
              <SelectTrigger>
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.map(driver => (
                  <SelectItem key={driver.id} value={driver.id.toString()}>
                    {driver.name} - {driver.vehicleNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="driverName">Driver Name</Label>
            <Input
              id="driverName"
              name="driverName"
              value={driverData.driverName}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
            {errors.driverName && (
              <p className="text-sm text-red-500">{errors.driverName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="driverPhone">Driver Phone</Label>
            <Input
              id="driverPhone"
              name="driverPhone"
              value={driverData.driverPhone}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
            {errors.driverPhone && (
              <p className="text-sm text-red-500">{errors.driverPhone}</p>
            )}
          </div>

          <div>
            <Label htmlFor="vehicleNumber">Vehicle Number</Label>
            <Input
              id="vehicleNumber"
              name="vehicleNumber"
              value={driverData.vehicleNumber}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
            {errors.vehicleNumber && (
              <p className="text-sm text-red-500">{errors.vehicleNumber}</p>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Assigning..." : "Assign Driver"}
          </Button>
        </div>
      </form>
    </div>
  );
}
