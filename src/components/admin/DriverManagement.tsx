import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCaption, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { 
  MapPin, Phone, Mail, CheckCircle, XCircle, 
  Plus, Edit, AlertCircle, Search, Star, 
  MoreHorizontal, ToggleLeft, Car, Settings, Loader2, RefreshCw
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EditDriverDialog } from './EditDriverDialog';
import { DeleteDriverDialog } from './DeleteDriverDialog';
import { AddDriverDialog } from './AddDriverDialog';
import { toast } from "sonner";

interface Driver {
  id: number;
  name: string;
  phone: string;
  email: string;
  license_no?: string;
  status: 'available' | 'busy' | 'offline';
  total_rides: number;
  earnings: number;
  rating: number;
  location: string;
  vehicle: string;
  vehicle_id: string;
}

export function DriverManagement() {
  const { toast: uiToast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isAddDriverDialogOpen, setIsAddDriverDialogOpen] = useState(false);
  const [isEditDriverDialogOpen, setIsEditDriverDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchDrivers();
  }, [retryCount]);

  const getApiBaseUrl = () => {
    const currentDomain = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1')) {
      return `${protocol}//${currentDomain}${window.location.port ? `:${window.location.port}` : ''}`;
    }
    
    return 'https://vizagup.com';
  };

  const fetchDrivers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      console.log(`Fetching drivers from ${apiBaseUrl}/api/admin/drivers.php`);
      
      const response = await fetch(`${apiBaseUrl}/api/admin/drivers.php`, {
        headers: {
          'X-Force-Refresh': 'true',
          'X-Debug': 'true'
        }
      });
      
      const data = await response.json();
      console.log('Drivers API response:', data);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}: ${data?.message || 'Unknown error'}`);
      }
      
      if (data?.status === 'success' && Array.isArray(data?.drivers) && data.drivers.length > 0) {
        setDrivers(data.drivers);
      } else {
        console.warn('API returned empty or invalid drivers list, using mock data');
        setDrivers(getMockDrivers());
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setError('Failed to load drivers. Using sample data instead.');
      setDrivers(getMockDrivers());
    } finally {
      setIsLoading(false);
    }
  };

  const getMockDrivers = (): Driver[] => {
    return [
      { 
        id: 1, 
        name: 'Rajesh Kumar', 
        phone: '9876543210', 
        email: 'rajesh@example.com',
        license_no: 'DL-1234567890',
        status: 'available', 
        total_rides: 352, 
        earnings: 120000, 
        rating: 4.8,
        location: 'Hyderabad Central',
        vehicle: 'Sedan - AP 31 XX 1234',
        vehicle_id: 'AP 31 XX 1234'
      },
      { 
        id: 2, 
        name: 'Pavan Reddy', 
        phone: '8765432109', 
        email: 'pavan@example.com',
        license_no: 'DL-0987654321',
        status: 'busy', 
        total_rides: 215, 
        earnings: 85500, 
        rating: 4.6,
        location: 'Gachibowli',
        vehicle: 'SUV - AP 32 XX 5678',
        vehicle_id: 'AP 32 XX 5678'
      },
      { 
        id: 3, 
        name: 'Suresh Verma', 
        phone: '7654321098', 
        email: 'suresh@example.com',
        license_no: 'DL-5678901234',
        status: 'offline', 
        total_rides: 180, 
        earnings: 72000, 
        rating: 4.5,
        location: 'Offline',
        vehicle: 'Sedan - AP 33 XX 9012',
        vehicle_id: 'AP 33 XX 9012'
      },
      { 
        id: 4, 
        name: 'Venkatesh S', 
        phone: '9876543211', 
        email: 'venkat@example.com',
        license_no: 'DL-4321098765',
        status: 'available', 
        total_rides: 298, 
        earnings: 110000, 
        rating: 4.7,
        location: 'Kukatpally',
        vehicle: 'Hatchback - AP 34 XX 3456',
        vehicle_id: 'AP 34 XX 3456'
      },
      { 
        id: 5, 
        name: 'Ramesh Babu', 
        phone: '8765432108', 
        email: 'ramesh@example.com',
        license_no: 'DL-2345678901',
        status: 'busy', 
        total_rides: 175, 
        earnings: 65000, 
        rating: 4.4,
        location: 'Ameerpet',
        vehicle: 'Tempo - AP 35 XX 7890',
        vehicle_id: 'AP 35 XX 7890'
      }
    ];
  };

  const filteredDrivers = drivers.filter(driver => 
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.phone.includes(searchTerm) ||
    driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="default">Available</Badge>;
      case 'busy':
        return <Badge variant="destructive">Busy</Badge>;
      case 'offline':
        return <Badge variant="secondary">Offline</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const toggleDriverStatus = async (driver: Driver) => {
    try {
      const newStatus = driver.status === 'available' ? 'offline' : 'available';
      
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/admin/driver.php?id=${driver.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to update driver status');
      }
      
      toast.success(`Driver status has been updated to ${newStatus}`);
      
      setDrivers(drivers.map(d => {
        if (d.id === driver.id) {
          return { ...d, status: newStatus as 'available' | 'busy' | 'offline' };
        }
        return d;
      }));
    } catch (error) {
      console.error('Error updating driver status:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update driver status");
    }
  };

  const retryFetchDrivers = () => {
    setRetryCount(prev => prev + 1);
  };

  const openAddDriverDialog = () => {
    setIsAddDriverDialogOpen(true);
  };

  const openEditDriverDialog = (driver: Driver) => {
    console.log("Opening edit dialog for driver:", driver);
    setCurrentDriver(driver);
    setIsEditDriverDialogOpen(true);
  };

  const openDeleteDriverDialog = (driver: Driver) => {
    setCurrentDriver(driver);
    setIsDeleteDialogOpen(true);
  };

  const handleAddDriver = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        license_no: formData.license_number || formData.license_no,
        vehicle: formData.vehicle_type || formData.vehicle,
        vehicle_id: formData.vehicle_number || formData.vehicle_id,
        status: formData.status,
        location: formData.location
      };
      console.log('Submitting driver:', payload);
      const response = await fetch(`${apiBaseUrl}/api/admin/drivers.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to add driver');
      }
      toast.success("New driver has been added successfully");
      if (data.driver) {
        setDrivers([...drivers, data.driver]);
      } else {
        fetchDrivers();
      }
      setIsAddDriverDialogOpen(false);
    } catch (error) {
      console.error('Error adding driver:', error);
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDriver = async (formData: any) => {
    if (!currentDriver) return;
    
    setIsSubmitting(true);
    console.log("Updating driver with data:", formData);
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/admin/driver.php?id=${currentDriver.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true'
        },
        body: JSON.stringify(formData)
      });
      
      console.log("API response status:", response.status);
      const data = await response.json();
      console.log("API response data:", data);
      
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to update driver');
      }
      
      toast.success("Driver has been updated successfully");
      
      // Update the driver in the local state
      setDrivers(drivers.map(d => 
        d.id === currentDriver.id ? { ...d, ...formData } : d
      ));
      
      setIsEditDriverDialogOpen(false);
    } catch (error) {
      console.error('Error updating driver:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update driver");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDriver = async () => {
    if (!currentDriver) return;
    
    setIsSubmitting(true);
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/admin/driver.php?id=${currentDriver.id}`, {
        method: 'DELETE',
        headers: {
          'X-Force-Refresh': 'true'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to delete driver');
      }
      
      toast.success("Driver has been deleted successfully");
      
      // Remove the driver from the local state
      setDrivers(drivers.filter(d => d.id !== currentDriver.id));
      
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error(error instanceof Error ? error.message : "Failed to delete driver");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" /> Driver Management
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={retryFetchDrivers}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={openAddDriverDialog}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Driver
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filteredDrivers.length > 0 ? (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{driver.name}</div>
                        <div className="text-sm text-gray-500">License: {driver.license_no || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" /> {driver.phone}
                        </div>
                        {driver.email && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" /> {driver.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {driver.vehicle ? (
                        <div className="flex items-center">
                          <Car className="h-4 w-4 mr-1 text-gray-500" />
                          <span>{driver.vehicle}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">No vehicle</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(driver.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                        <span>{driver.location || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleDriverStatus(driver)}
                        >
                          {driver.status === 'available' ? (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Set Offline
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Set Available
                            </>
                          )}
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openEditDriverDialog(driver)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => openDeleteDriverDialog(driver)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No drivers found matching your search criteria.
          </div>
        )}
      </CardContent>

      {/* Driver Dialogs */}
      {isAddDriverDialogOpen && (
        <AddDriverDialog 
          isOpen={isAddDriverDialogOpen}
          onClose={() => setIsAddDriverDialogOpen(false)}
          onSubmit={handleAddDriver}
          isSubmitting={isSubmitting}
        />
      )}
      
      {isEditDriverDialogOpen && currentDriver && (
        <EditDriverDialog
          isOpen={isEditDriverDialogOpen}
          onClose={() => setIsEditDriverDialogOpen(false)}
          onSubmit={handleEditDriver}
          driver={currentDriver}
          isSubmitting={isSubmitting}
        />
      )}
      
      {isDeleteDialogOpen && currentDriver && (
        <DeleteDriverDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteDriver}
          driver={currentDriver}
          isDeleting={isSubmitting}
        />
      )}
    </Card>
  );
}
