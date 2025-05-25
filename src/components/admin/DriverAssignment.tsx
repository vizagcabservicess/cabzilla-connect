
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Booking } from '@/types/api';
import { WhatsAppButton } from '@/components/ui/whatsapp-button';
import { generateDriverAssignmentMessage, generateDriverNotificationMessage } from '@/services/whatsappService';

interface DriverAssignmentProps {
  booking: Booking;
  onAssign: (driverData: any) => void;
  onClose: () => void;
}

export function DriverAssignment({ booking, onAssign, onClose }: DriverAssignmentProps) {
  const [driverName, setDriverName] = useState(booking.driverName || '');
  const [driverPhone, setDriverPhone] = useState(booking.driverPhone || '');
  const [vehicleNumber, setVehicleNumber] = useState(booking.vehicleNumber || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssign({
      driverName,
      driverPhone,
      vehicleNumber
    });
  };

  const driverAssignmentMessage = generateDriverAssignmentMessage({
    ...booking,
    driverName,
    driverPhone,
    vehicleNumber
  });

  const driverNotificationMessage = generateDriverNotificationMessage({
    ...booking,
    driverName,
    driverPhone,
    vehicleNumber
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Assign Driver</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="driverName">Driver Name</Label>
            <Input
              id="driverName"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="driverPhone">Driver Phone</Label>
            <Input
              id="driverPhone"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="vehicleNumber">Vehicle Number</Label>
            <Input
              id="vehicleNumber"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              required
            />
          </div>
          
          <div className="flex space-x-2">
            <Button type="submit" className="flex-1">
              Assign Driver
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
          
          {driverPhone && (
            <div className="mt-4 space-y-2">
              <WhatsAppButton
                phone={booking.passengerPhone}
                message={driverAssignmentMessage}
                variant="outline"
                fullWidth
              >
                Notify Customer
              </WhatsAppButton>
              
              <WhatsAppButton
                phone={driverPhone}
                message={driverNotificationMessage}
                variant="outline"
                fullWidth
              >
                Notify Driver
              </WhatsAppButton>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
