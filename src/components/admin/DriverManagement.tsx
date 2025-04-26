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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AddDriverDialog } from './AddDriverDialog';
import { EditDriverDialog } from './EditDriverDialog';
import { DeleteDriverDialog } from './DeleteDriverDialog';

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
}

interface DriverFormData {
  name: string;
  phone: string;
  email: string;
  license_no: string;
  status: string;
  location: string;
  vehicle: string;
}

export function DriverManagement() {
  const { toast } = useToast();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [retryCount, setRetryCount] = useState(0);
  
  // Dialog state
  const [isAddDriverDialogOpen, setIsAddDriverDialogOpen] = useState(false);
  const [isEditDriverDialogOpen, setIsEditDriverDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [driverForm, setDriverForm] = useState<DriverFormData>({
    name: '',
    phone: '',
    email: '',
    license_no: '',
    status: 'available',
    location: 'Visakhapatnam',
    vehicle: '',
  });

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
        vehicle: 'Sedan - AP 31 XX 1234'
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
        vehicle: 'SUV - AP 32 XX 5678'
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
        vehicle: 'Sedan - AP 33 XX 9012'
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
        vehicle: 'Hatchback - AP 34 XX 3456'
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
        vehicle: 'Tempo - AP 35 XX 7890'
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
      
      toast({
        title: "Status Updated",
        description: `Driver status has been updated to ${newStatus}`,
      });
      
      setDrivers(drivers.map(d => {
        if (d.id === driver.id) {
          return { ...d, status: newStatus as 'available' | 'busy' | 'offline' };
        }
        return d;
      }));
    } catch (error) {
      console.error('Error updating driver status:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update driver status",
        variant: "destructive"
      });
    }
  };

  const retryFetchDrivers = () => {
    setRetryCount(prev => prev + 1);
  };

  const resetDriverForm = () => {
    setDriverForm({
      name: '',
      phone: '',
      email: '',
      license_no: '',
      status: 'available',
      location: 'Visakhapatnam',
      vehicle: '',
    });
    setFormErrors({});
  };

  const openAddDriverDialog = () => {
    resetDriverForm();
    setIsAddDriverDialogOpen(true);
  };

  const openEditDriverDialog = (driver: Driver) => {
    setCurrentDriver(driver);
    setDriverForm({
      name: driver.name,
      phone: driver.phone,
      email: driver.email || '',
      license_no: driver.license_no || '',
      status: driver.status,
      location: driver.location,
      vehicle: driver.vehicle || '',
    });
    setIsEditDriverDialogOpen(true);
  };

  const openDeleteDriverDialog = (driver: Driver) => {
    setCurrentDriver(driver);
    setIsDeleteDialogOpen(true);
  };

  const handleDriverFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDriverForm(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleStatusChange = (value: string) => {
    setDriverForm(prev => ({ ...prev, status: value }));
  };

  const validateDriverForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!driverForm.name.trim()) {
      errors.name = "Name is required";
    }
    
    if (!driverForm.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(driverForm.phone.replace(/\D/g, ''))) {
      errors.phone = "Please enter a valid 10-digit phone number";
    }
    
    if (driverForm.email && !/^\S+@\S+\.\S+$/.test(driverForm.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    if (!driverForm.vehicle.trim()) {
      errors.vehicle = "Vehicle information is required";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddDriver = async (formData: any) => {
    setFormSubmitting(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const payload = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        license_no: formData.license_number,
        vehicle_number: formData.vehicle_number,
        vehicle_type: formData.vehicle_type,
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
      toast({
        description: "New driver has been added successfully",
      });
      if (data.driver) {
        setDrivers([...drivers, data.driver]);
      } else {
        fetchDrivers();
      }
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error adding driver:', error);
      toast({
        title: "Failed to Add Driver",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditDriver = async () => {
    if (!currentDriver || !validateDriverForm()) {
      return;
    }
    
    setFormSubmitting(true);
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/admin/driver.php?id=${currentDriver.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true'
        },
        body: JSON.stringify({
          name: driverForm.name,
          phone: driverForm.phone,
          email: driverForm.email,
          license_no: driverForm.license_no,
          status: driverForm.status,
          location: driverForm.location,
          vehicle: driverForm.vehicle
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to update driver');
      }
      
      toast({
        title: "Driver Updated",
        description: "Driver information has been updated successfully",
      });
      
      // Update driver in list
      setDrivers(drivers.map(d => {
        if (d.id === currentDriver.id) {
          return {
            ...d,
            name: driverForm.name,
            phone: driverForm.phone,
            email: driverForm.email,
            license_no: driverForm.license_no,
            status: driverForm.status as 'available' | 'busy' | 'offline',
            location: driverForm.location,
            vehicle: driverForm.vehicle
          };
        }
        return d;
      }));
      
      setIsEditDriverDialogOpen(false);
    } catch (error) {
      console.error('Error updating driver:', error);
      toast({
        title: "Failed to Update Driver",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteDriver = async () => {
    if (!currentDriver) {
      return;
    }
    
    setFormSubmitting(true);
    
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
      
      toast({
        title: "Driver Deleted",
        description: "Driver has been deleted successfully",
      });
      
      // Remove driver from list
      setDrivers(drivers.filter(d => d.id !== currentDriver.id));
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast({
        title: "Failed to Delete Driver",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const totalDrivers = drivers.length;
  const availableDrivers = drivers.filter(d => d.status === 'available').length;
  const busyDrivers = drivers.filter(d => d.status === 'busy').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Drivers</h2>
          <p className="text-muted-foreground">
            Manage your drivers and their assignments
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsRefreshing(true)}
            disabled={isLoading || isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            Add Driver
          </Button>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search drivers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="busy">Busy</option>
          <option value="offline">Offline</option>
        </select>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={retryFetchDrivers}>
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="rounded-md border">
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading drivers...
                </TableCell>
              </TableRow>
            ) : filteredDrivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No drivers found
                </TableCell>
              </TableRow>
            ) : (
              filteredDrivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{driver.name}</p>
                      <p className="text-sm text-muted-foreground">
                        License: {driver.license_no}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-1" />
                        <span>{driver.phone}</span>
                      </div>
                      {driver.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          <span>{driver.email}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4" />
                      <span>{driver.vehicle}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(driver.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{driver.location}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedDriver(driver);
                            setShowEditDialog(true);
                          }}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedDriver(driver);
                            setShowDeleteDialog(true);
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {showAddDialog && (
        <AddDriverDialog
          isOpen={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onSubmit={handleAddDriver}
          isSubmitting={formSubmitting}
        />
      )}
      
      {showEditDialog && selectedDriver && (
        <EditDriverDialog
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSubmit={handleEditDriver}
          driver={selectedDriver}
          isSubmitting={formSubmitting}
        />
      )}
      
      {showDeleteDialog && selectedDriver && (
        <DeleteDriverDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteDriver}
          driver={selectedDriver}
          isSubmitting={formSubmitting}
        />
      )}
    </div>
  );
}
