
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Booking } from '@/types/api';
import { Driver } from '@/types/api';
import { WhatsAppButton } from '@/components/ui/whatsapp-button';
import { 
  generateDriverAssignmentMessage, 
  generateDriverNotificationMessage 
} from '@/services/whatsappService';
import { MessageCircle } from "lucide-react";

interface DriverAssignmentProps {
  booking: Booking;
  onAssign: (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => Promise<void>;
  onCancel: () => void;
  onClose: () => void;
  isSubmitting: boolean;
}

export function DriverAssignment({
  booking,
  onAssign,
  onCancel,
  onClose,
  isSubmitting
}: DriverAssignmentProps) {
  const [driverName, setDriverName] = useState(booking.driverName || '');
  const [driverPhone, setDriverPhone] = useState(booking.driverPhone || '');
  const [vehicleNumber, setVehicleNumber] = useState(booking.vehicleNumber || '');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch available drivers
  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);
      try {
        // Example: This would be replaced with an actual API call to get drivers
        const response = await fetch('/api/admin/get-drivers.php');
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setDrivers(data);
          } else {
            // Fallback to a default driver for testing
            setDrivers([
              { id: 1, name: 'John Driver', phone: '9876543210', license_no: 'DL12345', status: 'available', location: 'City Center', vehicle: 'Sedan', email: 'john@example.com' }
            ]);
          }
        } else {
          // Fallback to a default driver for testing
          setDrivers([
            { id: 1, name: 'John Driver', phone: '9876543210', license_no: 'DL12345', status: 'available', location: 'City Center', vehicle: 'Sedan', email: 'john@example.com' }
          ]);
        }
      } catch (error) {
        console.error("Error fetching drivers:", error);
        // Fallback to a default driver for testing
        setDrivers([
          { id: 1, name: 'John Driver', phone: '9876543210', license_no: 'DL12345', status: 'available', location: 'City Center', vehicle: 'Sedan', email: 'john@example.com' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  const handleDriverSelect = (value: string) => {
    setSelectedDriver(value);
    const selected = drivers.find(driver => driver.id.toString() === value);
    
    if (selected) {
      setDriverName(selected.name);
      setDriverPhone(selected.phone);
      // Note: vehicleNumber might need to be fetched from a separate vehicle API
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!driverName || !driverPhone || !vehicleNumber) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all driver details."
      });
      return;
    }
    
    try {
      await onAssign({
        driverName,
        driverPhone,
        vehicleNumber
      });
      
      toast({
        title: "Driver Assigned",
        description: "Driver has been successfully assigned to the booking."
      });
    } catch (error) {
      console.error("Error assigning driver:", error);
      toast({
        variant: "destructive",
        title: "Assignment Failed",
        description: "Failed to assign driver. Please try again."
      });
    }
  };

  // Generate the messages for WhatsApp
  const driverAssignmentMsg = booking.driverName ? generateDriverAssignmentMessage({
    ...booking,
    driverName,
    driverPhone,
    vehicleNumber
  }) : '';

  const driverNotificationMsg = driverPhone ? generateDriverNotificationMessage({
    ...booking,
    driverName,
    driverPhone,
    vehicleNumber
  }) : '';

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="driver-select">Select Driver</Label>
              <Select
                value={selectedDriver}
                onValueChange={handleDriverSelect}
                disabled={isSubmitting || loading}
              >
                <SelectTrigger id="driver-select">
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id.toString()}>
                      {driver.name} - {driver.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="driver-name">Driver Name</Label>
              <Input
                id="driver-name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="driver-phone">Driver Phone</Label>
              <Input
                id="driver-phone"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="vehicle-number">Vehicle Number</Label>
              <Input
                id="vehicle-number"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {driverName && driverPhone && vehicleNumber && (
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-2">WhatsApp Notifications</h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  <WhatsAppButton
                    phone={booking.passengerPhone}
                    message={driverAssignmentMsg}
                    disabled={!driverName || !driverPhone || !vehicleNumber}
                    variant="outline"
                  >
                    Notify Customer
                  </WhatsAppButton>
                  
                  <WhatsAppButton
                    phone={driverPhone}
                    message={driverNotificationMsg}
                    disabled={!driverPhone}
                    variant="outline"
                  >
                    Notify Driver
                  </WhatsAppButton>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting || !driverName || !driverPhone || !vehicleNumber}
              >
                {isSubmitting ? 'Assigning...' : 'Assign Driver'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
