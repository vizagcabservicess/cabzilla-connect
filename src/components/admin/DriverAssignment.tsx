
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

  const handleDriverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDriverData({ ...driverData, [name]: value });
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSelectDriver = (driverId: string) => {
    const selectedDriver = availableDrivers.find(d => d.id.toString() === driverId);
    if (selectedDriver) {
      setDriverData({
        driverName: selectedDriver.name,
        driverPhone: selectedDriver.phone,
        vehicleNumber: selectedDriver.vehicleNumber
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!driverData.driverName) {
      newErrors.driverName = 'Driver name is required';
    }
    
    if (!driverData.driverPhone) {
      newErrors.driverPhone = 'Driver phone is required';
    } else if (!/^\d{10}$/.test(driverData.driverPhone.replace(/\s+/g, ''))) {
      newErrors.driverPhone = 'Enter a valid 10-digit phone number';
    }
    
    if (!driverData.vehicleNumber) {
      newErrors.vehicleNumber = 'Vehicle number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    try {
      await onAssign(driverData);
    } catch (error) {
      console.error('Error assigning driver:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Driver Assignment</h3>
          <p className="text-sm text-gray-500">
            Assign a driver to booking #{booking.bookingNumber}
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="driverType">Driver Selection</Label>
            <Select 
              value={driverType} 
              onValueChange={setDriverType}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select driver type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Add New Driver</SelectItem>
                <SelectItem value="existing">Select Existing Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {driverType === 'existing' && (
            <div>
              <Label htmlFor="existingDriver">Select Driver</Label>
              <Select onValueChange={handleSelectDriver}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id.toString()}>
                      {driver.name} - {driver.vehicleNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <Label htmlFor="driverName">
              Driver Name
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="driverName"
              name="driverName"
              placeholder="Enter driver's name"
              value={driverData.driverName}
              onChange={handleDriverChange}
              className={errors.driverName ? "border-red-500" : ""}
            />
            {errors.driverName && (
              <p className="text-red-500 text-xs mt-1">{errors.driverName}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="driverPhone">
              Driver Phone
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="driverPhone"
              name="driverPhone"
              placeholder="Enter driver's phone"
              value={driverData.driverPhone}
              onChange={handleDriverChange}
              className={errors.driverPhone ? "border-red-500" : ""}
            />
            {errors.driverPhone && (
              <p className="text-red-500 text-xs mt-1">{errors.driverPhone}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="vehicleNumber">
              Vehicle Number
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vehicleNumber"
              name="vehicleNumber"
              placeholder="Enter vehicle number"
              value={driverData.vehicleNumber}
              onChange={handleDriverChange}
              className={errors.vehicleNumber ? "border-red-500" : ""}
            />
            {errors.vehicleNumber && (
              <p className="text-red-500 text-xs mt-1">{errors.vehicleNumber}</p>
            )}
          </div>
        </div>
        
        <Separator />
        
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Assigning..." : "Assign Driver"}
          </Button>
        </div>
      </div>
    </form>
  );
}
