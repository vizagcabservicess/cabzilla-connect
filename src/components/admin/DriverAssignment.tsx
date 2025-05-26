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
import { commissionAPI } from '@/services/api/commissionAPI';
import { fleetAPI } from '@/services/api/fleetAPI';

interface DriverAssignmentProps {
  booking: Booking;
  onAssign: (driverData: { bookingId: string; driverId: string; driverName: string; driverPhone: string; vehicleNumber: string }) => Promise<void>;
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
  const [commissionData, setCommissionData] = useState<{
    percentage: number;
    amount: number;
  } | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const { toast } = useToast();

  // Fetch available drivers
  useEffect(() => {
    const fetchDrivers = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/admin/get-drivers.php');
        const result = await response.json();
        
        if (response.ok && result.status === 'success' && Array.isArray(result.data)) {
          setDrivers(result.data);
        } else {
          console.error("Invalid API response:", result);
          toast({
            variant: "destructive",
            title: "Error Loading Drivers",
            description: result.message || "Failed to load drivers. Please try again."
          });
          setDrivers([]);
        }
      } catch (error) {
        console.error("Error fetching drivers:", error);
        toast({
          variant: "destructive",
          title: "Error Loading Drivers",
          description: "Failed to connect to the server. Please try again."
        });
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
    // Fetch fleet vehicles from the same endpoint as FleetVehicleAssignment
    const fetchFleetVehicles = async () => {
      try {
        const apiUrl = '/api/admin/fleet_vehicles.php/vehicles';
        const response = await fetch(apiUrl).then(res => res.json());
        const vehicles = response.vehicles || [];
        // Filter to only show true fleet vehicles (with vehicleNumber, name, and year)
        const filteredFleetVehicles = vehicles.filter((v) =>
          typeof v.vehicleNumber === 'string' && v.vehicleNumber.trim() !== '' &&
          typeof v.name === 'string' && v.name.trim() !== '' &&
          typeof v.year === 'number' && v.year > 1900
        );
        setVehicles(filteredFleetVehicles);
      } catch (error) {
        setVehicles([]);
      }
    };
    fetchFleetVehicles();
  }, [toast, booking.vehicleNumber]);

  // Calculate commission when vehicle number changes
  useEffect(() => {
    const calculateCommission = async () => {
      if (!vehicleNumber || !booking.id) return;
      
      try {
        // First try to calculate commission based on the booking
        const commission = await commissionAPI.calculateCommission(booking.id.toString());
        
        if (commission) {
          setCommissionData({
            percentage: commission.commission_percentage,
            amount: commission.commission_amount
          });
        } else {
          // Fallback to default 10% if calculation fails
          const amount = booking.totalAmount * 0.1;
          setCommissionData({
            percentage: 10,
            amount: amount
          });
        }
      } catch (error) {
        console.error("Error calculating commission:", error);
        // Fallback to default 10%
        const amount = booking.totalAmount * 0.1;
        setCommissionData({
          percentage: 10,
          amount: amount
        });
      }
    };

    calculateCommission();
  }, [vehicleNumber, booking.id, booking.totalAmount]);

  // Reactively update selected vehicle if booking.vehicleNumber or vehicles change
  useEffect(() => {
    if (
      Array.isArray(vehicles) &&
      vehicles.length > 0 &&
      (booking.vehicleId || booking.vehicleNumber)
    ) {
      let found;
      if (booking.vehicleId) {
        found = vehicles.find(v => v.id?.toString() === booking.vehicleId?.toString());
      }
      if (!found && booking.vehicleNumber) {
        found = vehicles.find(
          v =>
            v.vehicleNumber === booking.vehicleNumber ||
            v.vehicle_number === booking.vehicleNumber
        );
      }
      if (found && selectedVehicleId !== found.id.toString()) {
        setSelectedVehicleId(found.id.toString());
        setVehicleNumber(found.vehicleNumber || found.vehicle_number);
      }
    }
  }, [booking.vehicleId, booking.vehicleNumber, vehicles, selectedVehicleId]);

  const handleDriverSelect = (value: string) => {
    setSelectedDriver(value);
    const selected = drivers.find(driver => driver.id.toString() === value);
    
    if (selected) {
      setDriverName(selected.name);
      setDriverPhone(selected.phone);
      // Note: vehicleNumber might need to be fetched from a separate vehicle API
    }
  };

  const handleVehicleSelect = (val: string) => {
    setSelectedVehicleId(val);
    const found = vehicles.find(v => v.id.toString() === val);
    if (found) {
      setVehicleNumber(found.vehicleNumber || found.vehicle_number);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverName || !driverPhone || !vehicleNumber || !selectedVehicleId) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all driver details and select a valid vehicle."
      });
      return;
    }
    try {
      await onAssign({
        bookingId: booking.id.toString(), // Convert to string
        driverId: selectedDriver,
        driverName,
        driverPhone,
        vehicleNumber
      });
      // Also record the commission payment if commission data is available
      if (commissionData && booking.id) {
        const vehicle = vehicles.find(v => v.id.toString() === selectedVehicleId);
        if (!vehicle) {
          toast({
            variant: "destructive",
            title: "Vehicle Not Found",
            description: `Could not find a vehicle with the selected ID. Please select a valid vehicle.`
          });
          return;
        }
        try {
          await commissionAPI.createCommissionPayment({
            bookingId: booking.id.toString(),
            vehicleId: vehicle.id, // Use the correct database ID
            driverId: selectedDriver,
            amount: booking.totalAmount,
            commissionAmount: commissionData.amount,
            commissionPercentage: commissionData.percentage,
            status: 'pending',
            notes: `Commission for booking #${booking.bookingNumber}`
          });
          toast({
            title: "Commission Recorded",
            description: `Commission of ₹${commissionData.amount.toFixed(2)} (${commissionData.percentage}%) has been recorded.`
          });
        } catch (commissionError) {
          console.error("Error recording commission:", commissionError);
          toast({
            variant: "destructive", // Change from "warning" to valid variant
            title: "Commission Recording Failed",
            description: "Driver assigned successfully, but commission recording failed."
          });
        }
      }
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
              <Label htmlFor="vehicle-select">Select Fleet Vehicle</Label>
              <Select
                value={selectedVehicleId}
                onValueChange={handleVehicleSelect}
                disabled={isSubmitting || vehicles.length === 0}
              >
                <SelectTrigger id="vehicle-select">
                  <SelectValue placeholder="Select a fleet vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.vehicleNumber || v.vehicle_number} - {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {commissionData && (
              <div className="rounded-md bg-muted p-3">
                <h4 className="text-sm font-medium mb-1">Commission Information</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span className="font-medium">{commissionData.percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-medium">₹{commissionData.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-medium">Pending</span>
                  </div>
                </div>
              </div>
            )}

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
