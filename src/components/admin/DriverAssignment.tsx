
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Booking } from '@/types/api';
import { 
  generateDriverAssignmentMessage, 
  generateDriverNotificationMessage 
} from '@/services/whatsappService';

export interface DriverAssignmentProps {
  booking: Booking;
  onAssign: (driverData: { 
    driverName: string; 
    driverPhone: string; 
    vehicleNumber: string; 
  }) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export function DriverAssignment({ 
  booking, 
  onAssign, 
  onClose, 
  isSubmitting 
}: DriverAssignmentProps) {
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!driverName || !driverPhone || !vehicleNumber) {
      return;
    }

    await onAssign({
      driverName,
      driverPhone,
      vehicleNumber
    });
  };

  return (
    <Card>
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
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Assigning...' : 'Assign Driver'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
