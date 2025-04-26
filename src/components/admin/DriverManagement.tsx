
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
  MoreHorizontal, ToggleLeft, Car, Settings, Loader2
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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
    setLoading(true);
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
      setLoading(false);
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
        return <Badge className="bg-green-100 text-green-800">Available</Badge>;
      case 'busy':
        return <Badge className="bg-red-100 text-red-800">Busy</Badge>;
      case 'offline':
        return <Badge className="bg-gray-100 text-gray-800">Offline</Badge>;
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
      vehicle: driver.vehicle,
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

  const handleAddDriver = async () => {
    if (!validateDriverForm()) {
      return;
    }
    
    setFormSubmitting(true);
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/admin/drivers.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true'
        },
        body: JSON.stringify({
          name: driverForm.name,
          phone: driverForm.phone,
          email: driverForm.email,
          licenseNo: driverForm.license_no,
          status: driverForm.status,
          location: driverForm.location,
          vehicle: driverForm.vehicle
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Failed to add driver');
      }
      
      toast({
        title: "Driver Added",
        description: "New driver has been added successfully",
      });
      
      // Add new driver to list
      if (data.driver) {
        setDrivers([...drivers, data.driver]);
      } else {
        // Refresh list if driver object not returned
        fetchDrivers();
      }
      
      setIsAddDriverDialogOpen(false);
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
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Driver Management</h2>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button className="flex items-center gap-2" onClick={openAddDriverDialog}>
            <Plus className="h-4 w-4" /> Add Driver
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableDrivers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Busy Drivers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{busyDrivers}</div>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span>Loading drivers...</span>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={retryFetchDrivers}
              >
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>List of all registered drivers</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rides</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.length > 0 ? (
                  filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {driver.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {driver.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(driver.status)}</TableCell>
                      <TableCell>{driver.total_rides}</TableCell>
                      <TableCell>₹{driver.earnings.toLocaleString('en-IN')}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="font-bold mr-1">{driver.rating}</span>
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Car className="h-3 w-3" /> {driver.vehicle}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {driver.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditDriverDialog(driver)}>
                              <Edit className="h-3.5 w-3.5 mr-2" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MapPin className="h-3.5 w-3.5 mr-2" /> Track Location
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleDriverStatus(driver)}>
                              <ToggleLeft className="h-3.5 w-3.5 mr-2" /> 
                              {driver.status === 'available' ? 'Set as Offline' : 'Set as Available'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDeleteDriverDialog(driver)} className="text-red-600">
                              <XCircle className="h-3.5 w-3.5 mr-2" /> Delete Driver
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      {searchTerm ? (
                        <div>
                          <Search className="h-6 w-6 mx-auto mb-2" />
                          <p>No drivers found matching "{searchTerm}"</p>
                          <Button 
                            variant="link" 
                            onClick={() => setSearchTerm('')}
                            className="mt-2"
                          >
                            Clear search
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                          <p>No drivers found</p>
                          <Button 
                            variant="link" 
                            onClick={openAddDriverDialog}
                            className="mt-2"
                          >
                            Add your first driver
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add Driver Dialog */}
      <Dialog open={isAddDriverDialogOpen} onOpenChange={setIsAddDriverDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
            <DialogDescription>
              Enter the driver's information below to add them to your fleet.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Driver Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={driverForm.name}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={driverForm.phone}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                  className={formErrors.phone ? "border-red-500" : ""}
                />
                {formErrors.phone && <p className="text-xs text-red-500">{formErrors.phone}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={driverForm.email}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                  className={formErrors.email ? "border-red-500" : ""}
                />
                {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="license_no">License Number</Label>
                <Input
                  id="license_no"
                  name="license_no"
                  value={driverForm.license_no}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={driverForm.status}
                  onValueChange={handleStatusChange}
                  disabled={formSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={driverForm.location}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vehicle">Vehicle Details</Label>
                <Input
                  id="vehicle"
                  name="vehicle"
                  placeholder="e.g. Sedan - AP 31 XX 1234"
                  value={driverForm.vehicle}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                  className={formErrors.vehicle ? "border-red-500" : ""}
                />
                {formErrors.vehicle && <p className="text-xs text-red-500">{formErrors.vehicle}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDriverDialogOpen(false)} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddDriver} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={isEditDriverDialogOpen} onOpenChange={setIsEditDriverDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>
              Update the driver's information below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Driver Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={driverForm.name}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  value={driverForm.phone}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                  className={formErrors.phone ? "border-red-500" : ""}
                />
                {formErrors.phone && <p className="text-xs text-red-500">{formErrors.phone}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={driverForm.email}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                  className={formErrors.email ? "border-red-500" : ""}
                />
                {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-license_no">License Number</Label>
                <Input
                  id="edit-license_no"
                  name="license_no"
                  value={driverForm.license_no}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={driverForm.status}
                  onValueChange={handleStatusChange}
                  disabled={formSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  name="location"
                  value={driverForm.location}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-vehicle">Vehicle Details</Label>
                <Input
                  id="edit-vehicle"
                  name="vehicle"
                  value={driverForm.vehicle}
                  onChange={handleDriverFormChange}
                  disabled={formSubmitting}
                  className={formErrors.vehicle ? "border-red-500" : ""}
                />
                {formErrors.vehicle && <p className="text-xs text-red-500">{formErrors.vehicle}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDriverDialogOpen(false)} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditDriver} disabled={formSubmitting}>
              {formSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Driver Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {currentDriver?.name}'s driver profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={formSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDriver} disabled={formSubmitting} className="bg-red-600 hover:bg-red-700">
              {formSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
