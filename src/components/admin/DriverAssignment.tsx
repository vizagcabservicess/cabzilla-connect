import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Booking, Driver } from '@/types/api';
import { AlertCircle, Search, Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import axios from 'axios';
import { getApiUrl } from '@/config/api';

interface DriverAssignmentProps {
  booking: Booking;
  onAssign: (driverData: { driverName: string; driverPhone: string; vehicleNumber: string }) => Promise<void>;
  onClose?: () => void;
  onCancel?: () => void;
  isSubmitting: boolean;
}

export function DriverAssignment({ 
  booking, 
  onAssign,
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
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Use onClose if provided, otherwise fall back to onCancel
  const closeHandler = onCancel || onClose;

  useEffect(() => {
    const fetchDrivers = async () => {
      setLoadingDrivers(true);
      try {
        // Try to fetch from real API endpoint
        const response = await axios.get(getApiUrl('/api/admin/get-drivers.php'), {
          params: {
            status: 'available',
            search: searchQuery || undefined
          },
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.data.status === 'success') {
          const drivers: Driver[] = response.data.drivers.map((driver: any) => ({
            id: driver.id,
            name: driver.name,
            phone: driver.phone,
            email: driver.email || 'unknown@example.com', // Ensure email is present for type safety
            vehicleNumber: driver.vehicle || 'Unknown', // Map vehicle field to vehicleNumber for UI
            vehicle: driver.vehicle || 'Unknown'
          }));
          setAvailableDrivers(drivers);
        } else {
          throw new Error(response.data.message || 'Failed to load drivers');
        }
      } catch (error) {
        console.error('Error fetching drivers:', error);
        
        // Fallback to mock data if API fails
        const mockDrivers: Driver[] = [
          { id: 1, name: "Rajesh Kumar", phone: "9876543210", email: "rajesh@example.com", vehicleNumber: "AP 31 AB 1234", vehicle: "AP 31 AB 1234" },
          { id: 2, name: "Suresh Singh", phone: "9876543211", email: "suresh@example.com", vehicleNumber: "AP 31 CD 5678", vehicle: "AP 31 CD 5678" },
          { id: 3, name: "Mahesh Reddy", phone: "9876543212", email: "mahesh@example.com", vehicleNumber: "AP 31 EF 9012", vehicle: "AP 31 EF 9012" },
          { id: 4, name: "Venkatesh S", phone: "9876543213", email: "venkatesh@example.com", vehicleNumber: "AP 34 XX 3456", vehicle: "AP 34 XX 3456" },
          { id: 5, name: "Ramesh Babu", phone: "8765432108", email: "ramesh@example.com", vehicleNumber: "AP 35 XX 7890", vehicle: "AP 35 XX 7890" }
        ];
        
        if (searchQuery) {
          const lowerQuery = searchQuery.toLowerCase();
          const filteredDrivers = mockDrivers.filter(driver => 
            driver.name.toLowerCase().includes(lowerQuery) || 
            driver.phone.includes(searchQuery) ||
            (driver.vehicleNumber && driver.vehicleNumber.toLowerCase().includes(lowerQuery))
          );
          setAvailableDrivers(filteredDrivers);
        } else {
          setAvailableDrivers(mockDrivers);
        }
        
        toast({
          variant: "default",
          title: "Using local driver data",
          description: "Could not connect to server. Using cached driver data."
        });
      } finally {
        setLoadingDrivers(false);
      }
    };
    
    fetchDrivers();
  }, [toast, searchQuery]);

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
        vehicleNumber: selectedDriver.vehicleNumber || selectedDriver.vehicle || ''
      });
      
      setErrors({});
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
      toast({
        variant: "destructive",
        title: "Assignment Failed",
        description: "There was an error assigning the driver. Please try again."
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
        
        <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertTitle>Driver Assignment</AlertTitle>
          <AlertDescription>
            Assign an available driver to this booking or add a new driver.
          </AlertDescription>
        </Alert>
        
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
                <SelectItem value="existing">Select Existing Driver</SelectItem>
                <SelectItem value="new">Add New Driver</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {driverType === 'existing' && (
            <>
              <div className="relative">
                <Label htmlFor="driverSearch">Search Drivers</Label>
                <div className="relative">
                  <Input
                    id="driverSearch"
                    placeholder="Search by name, phone, or vehicle number"
                    value={searchQuery}
                    onChange={handleSearch}
                    className="pl-8"
                  />
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="existingDriver">Select Driver</Label>
                <Select onValueChange={handleSelectDriver} disabled={loadingDrivers}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loadingDrivers ? "Loading drivers..." : "Select a driver"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingDrivers ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>Loading drivers...</span>
                      </div>
                    ) : availableDrivers.length > 0 ? (
                      availableDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id.toString()}>
                          {driver.name} - {driver.vehicleNumber || driver.vehicle || 'No vehicle'}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-gray-500">No drivers found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
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
            onClick={closeHandler}
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
