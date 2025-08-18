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
import { Driver } from '@/types/api';
import { FixDatabaseButton } from './FixDatabaseButton';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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
    
    return 'https://vizagtaxihub.com';
  };

  const fetchDrivers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/admin/drivers.php`, {
        headers: {
          'X-Force-Refresh': 'true',
          'X-Debug': 'true'
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}: ${data?.message || 'Unknown error'}`);
      }
      if (data?.status === 'success' && Array.isArray(data?.drivers)) {
        setDrivers(data.drivers);
      } else if (data?.status === 'success' && Array.isArray(data?.data)) {
        setDrivers(data.data);
      } else {
        setDrivers([]);
      }
    } catch (error) {
      setError('Failed to load drivers.');
      setDrivers([]);
    } finally {
      setIsLoading(false);
    }
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
      const payload = {
        id: currentDriver.id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        license_no: formData.license_no,
        vehicle: formData.vehicle,
        vehicle_id: formData.vehicle_id,
        status: formData.status,
        location: formData.location
      };
      
      console.log("API payload:", payload);
      
      const response = await fetch(`${apiBaseUrl}/api/admin/driver.php?id=${currentDriver.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Force-Refresh': 'true'
        },
        body: JSON.stringify(payload)
      });
      
      console.log("API response status:", response.status);
      const data = await response.json();
      console.log("API response data:", data);
      
      if (!response.ok || data.status !== 'success') {
        if (data.errors && Array.isArray(data.errors)) {
          throw new Error(`Validation failed: ${data.errors.join(', ')}`);
        }
        throw new Error(data.message || 'Failed to update driver');
      }
      
      toast.success("Driver has been updated successfully");
      
      setDrivers(drivers.map(d => 
        d.id === currentDriver.id ? { ...d, ...payload } : d
      ));
      
      setIsEditDriverDialogOpen(false);
      setCurrentDriver(null);
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
      
      setDrivers(drivers.filter(d => d.id !== currentDriver.id));
      
      setIsDeleteDialogOpen(false);
      setCurrentDriver(null);
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error(error instanceof Error ? error.message : "Failed to delete driver");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 overflow-x-hidden px-2 md:px-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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
              <FixDatabaseButton />
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
            <div className="relative">
              <ScrollArea className="h-[calc(70vh-20px)] w-full rounded-md border">
                <div className="w-full overflow-x-auto">
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
                <ScrollBar orientation="horizontal" className="h-3 bg-gray-100" />
              </ScrollArea>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No drivers found matching your search criteria.
            </div>
          )}
        </CardContent>
      </Card>

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
          onClose={() => {
            setIsEditDriverDialogOpen(false);
            setCurrentDriver(null);
          }}
          onSubmit={handleEditDriver}
          driver={currentDriver}
          isSubmitting={isSubmitting}
        />
      )}
      
      {isDeleteDialogOpen && currentDriver && (
        <DeleteDriverDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setCurrentDriver(null);
          }}
          onConfirm={handleDeleteDriver}
          driver={currentDriver}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
