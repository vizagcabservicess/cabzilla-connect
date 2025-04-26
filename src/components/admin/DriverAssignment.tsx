
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Booking, Driver } from '@/types/api';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";

interface DriverAssignmentProps {
  booking: Booking;
  onAssign: (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => Promise<void>;
  onSubmit?: (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => Promise<void>;
  onClose: () => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

export function DriverAssignment({ 
  booking, 
  onAssign, 
  onSubmit, 
  onClose, 
  onCancel, 
  isSubmitting 
}: DriverAssignmentProps) {
  const { toast } = useToast();
  const [driverData, setDriverData] = useState({
    driverName: booking.driverName || '',
    driverPhone: booking.driverPhone || '',
    vehicleNumber: booking.vehicleNumber || ''
  });
  
  const [driverType, setDriverType] = useState<string>('new');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const closeHandler = onCancel || onClose;
  const submitHandler = onSubmit || onAssign;

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoadingDrivers(true);
      setFetchError(null);
      try {
        // Fetch drivers from the backend
        const response = await fetch('/api/admin/drivers.php');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch drivers: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'error') {
          throw new Error(data.message || 'Failed to fetch drivers');
        }
        
        if (Array.isArray(data.data)) {
          // Add vehicleNumber to each driver if missing
          const driversWithVehicle = data.data.map((driver: Driver) => ({
            ...driver,
            vehicleNumber: driver.vehicle_id || 'Not assigned'
          }));
          setAvailableDrivers(driversWithVehicle);
        } else {
          setAvailableDrivers([]);
          console.warn('Drivers data is not an array', data);
        }
      } catch (error) {
        console.error('Error fetching drivers:', error);
        setFetchError(error instanceof Error ? error.message : 'Failed to load drivers');
        toast({
          variant: "destructive",
          title: "Failed to load drivers",
          description: "Please try again or add a driver manually."
        });
        
        // Use mock drivers as fallback
        const mockDrivers = [
          { id: 1, name: "Rajesh Kumar", phone: "9876543210", vehicleNumber: "AP 31 AB 1234" },
          { id: 2, name: "Suresh Singh", phone: "9876543211", vehicleNumber: "AP 31 CD 5678" },
          { id: 3, name: "Mahesh Reddy", phone: "9876543212", vehicleNumber: "AP 31 EF 9012" },
          { id: 4, name: "Venkatesh S", phone: "9876543211", vehicleNumber: "AP 34 XX 3456" },
          { id: 5, name: "Ramesh Babu", phone: "8765432108", vehicleNumber: "AP 35 XX 7890" }
        ];
        setAvailableDrivers(mockDrivers);
      } finally {
        setLoadingDrivers(false);
      }
    };
    
    fetchDrivers();
  }, [toast]);

  const handleDriverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDriverData({ ...driverData, [name]: value });
    
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
        vehicleNumber: selectedDriver.vehicleNumber || ''
      });
      
      setErrors({});
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
      await submitHandler(driverData);
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast({
        variant: "destructive",
        title: "Failed to assign driver",
        description: error instanceof Error ? error.message : "An error occurred while assigning the driver."
      });
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
        
        {fetchError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="driverType">Driver Selection</Label>
            <Select 
              value={driverType} 
              onValueChange={setDriverType}
              disabled={isSubmitting}
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
              <Select onValueChange={handleSelectDriver} disabled={loadingDrivers || isSubmitting}>
                <SelectTrigger className="w-full">
                  {loadingDrivers ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span>Loading drivers...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder={availableDrivers.length > 0 ? "Select a driver" : "No drivers available"} />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.length > 0 ? (
                    availableDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        {driver.name} - {driver.vehicleNumber || 'No vehicle'}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>No drivers available</SelectItem>
                  )}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
            onClick={closeHandler}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Assigning...
              </>
            ) : "Assign Driver"}
          </Button>
        </div>
      </div>
    </form>
  );
}
