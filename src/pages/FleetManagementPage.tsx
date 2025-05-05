import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { AddFleetVehicleDialog } from '@/components/admin/AddFleetVehicleDialog';
import { FleetVehicleAssignmentDialog } from '@/components/admin/FleetVehicleAssignmentDialog';
import { EditFleetVehicleDialog } from '@/components/admin/EditFleetVehicleDialog';
import { ViewFleetVehicleDialog } from '@/components/admin/ViewFleetVehicleDialog';
import { vehicleAPI } from '@/services/api/vehicleAPI';
import { fleetAPI } from '@/services/api/fleetAPI';
import { FleetVehicle } from '@/types/cab';
import { Car, Filter, FileText, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Booking } from '@/types/api';

export default function FleetManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("fleet");
  const [fleetData, setFleetData] = useState<FleetVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [dataSource, setDataSource] = useState<'fleet' | 'regular'>('fleet');
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const { toast: uiToast } = useToast();
  
  useEffect(() => {
    fetchFleetData();
    fetchPendingBookings();
  }, []);

  const fetchPendingBookings = async () => {
    setIsLoadingBookings(true);
    try {
      console.log("Fetching pending bookings...");
      const bookings = await fleetAPI.getPendingBookings();
      console.log("Fetched pending bookings:", bookings);
      
      if (Array.isArray(bookings)) {
        setPendingBookings(bookings);
      } else {
        console.error("Invalid response format for pending bookings:", bookings);
        setPendingBookings([]);
      }
    } catch (error) {
      console.error("Error fetching pending bookings:", error);
      toast.error("Failed to load pending bookings");
      setPendingBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const fetchFleetData = async () => {
    try {
      setIsLoading(true);
      
      // Try to get fleet vehicles first
      try {
        const fleetResponse = await fleetAPI.getVehicles(true);
        
        if (fleetResponse.vehicles && fleetResponse.vehicles.length > 0) {
          console.log(`Loaded ${fleetResponse.vehicles.length} fleet vehicles:`, fleetResponse.vehicles);
          
          // Ensure all vehicles have valid status values
          const validatedFleetVehicles = fleetResponse.vehicles.map(vehicle => ({
            ...vehicle,
            // Ensure status is one of the valid enum values
            status: validateStatus(vehicle.status)
          }));
          
          setFleetData(validatedFleetVehicles);
          setDataSource('fleet');
          return;
        }
      } catch (fleetError) {
        console.error("Error fetching fleet vehicles:", fleetError);
        // Continue to try regular vehicles
      }
      
      // If fleet vehicles not available, try regular vehicles
      try {
        const response = await vehicleAPI.getVehicles(true);
        
        if (response.vehicles && response.vehicles.length > 0) {
          console.log(`Loaded ${response.vehicles.length} regular vehicles:`, response.vehicles);
          
          // Transform vehicle data into fleet data format - ensuring status is always a valid enum value
          const transformedData: FleetVehicle[] = response.vehicles.map(vehicle => ({
            id: vehicle.id || '',
            vehicleNumber: vehicle.vehicleNumber || `VN-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            name: vehicle.name,
            model: vehicle.name,
            make: vehicle.make || 'Unknown',
            year: vehicle.year !== undefined ? vehicle.year : new Date().getFullYear(),
            status: validateStatus(vehicle.isActive ? 'Active' : 'Inactive'),
            lastService: vehicle.lastService || new Date().toISOString().split('T')[0],
            nextServiceDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            fuelType: 'Petrol', // Default value
            vehicleType: vehicle.vehicleType || 'sedan',
            cabTypeId: vehicle.id || '',
            capacity: vehicle.capacity || 4,
            luggageCapacity: vehicle.luggageCapacity || 2,
            isActive: vehicle.isActive !== undefined ? vehicle.isActive : true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
          
          setFleetData(transformedData);
          setDataSource('regular');
          return;
        }
      } catch (vehicleError) {
        console.error("Error fetching regular vehicles:", vehicleError);
      }
      
      // If we reach here, neither fleet nor regular vehicles were loaded
      // Use fallback data
      console.log("No vehicles returned from API, using sample data");
      
      // Create sample data with all required FleetVehicle properties
      const sampleData: FleetVehicle[] = [
        {
          id: 'sample-1',
          vehicleNumber: 'AP 31 AB 1234',
          name: 'Toyota Innova',
          model: 'Innova Crysta',
          make: 'Toyota',
          year: 2022,
          status: 'Active',
          lastService: '2025-04-15',
          nextServiceDue: '2025-07-15',
          fuelType: 'Diesel',
          vehicleType: 'suv',
          cabTypeId: 'cab-001',
          capacity: 7,
          luggageCapacity: 3,
          isActive: true,
          createdAt: '2025-01-15T10:30:00Z',
          updatedAt: '2025-04-15T14:20:00Z'
        },
        {
          id: 'sample-2',
          vehicleNumber: 'AP 31 CD 5678',
          name: 'Maruti Swift',
          model: 'Swift Dzire',
          make: 'Maruti',
          year: 2021,
          status: 'Active',
          lastService: '2025-04-10',
          nextServiceDue: '2025-07-10',
          fuelType: 'Petrol',
          vehicleType: 'sedan',
          cabTypeId: 'cab-002',
          capacity: 4,
          luggageCapacity: 2,
          isActive: true,
          createdAt: '2025-02-10T11:45:00Z',
          updatedAt: '2025-04-10T09:30:00Z'
        },
        {
          id: 'sample-3',
          vehicleNumber: 'AP 31 EF 9012',
          name: 'Hyundai Creta',
          model: 'Creta SX',
          make: 'Hyundai',
          year: 2023,
          status: 'Maintenance',
          lastService: '2025-04-20',
          nextServiceDue: '2025-07-20',
          fuelType: 'Diesel',
          vehicleType: 'suv',
          cabTypeId: 'cab-003',
          capacity: 5,
          luggageCapacity: 2,
          isActive: false,
          createdAt: '2025-03-05T16:30:00Z',
          updatedAt: '2025-04-20T10:15:00Z'
        },
        {
          id: 'sample-4',
          vehicleNumber: 'AP 31 GH 3456',
          name: 'Toyota Etios',
          model: 'Etios VX',
          make: 'Toyota',
          year: 2020,
          status: 'Active',
          lastService: '2025-03-25',
          nextServiceDue: '2025-06-25',
          fuelType: 'Petrol',
          vehicleType: 'sedan',
          cabTypeId: 'cab-004',
          capacity: 4,
          luggageCapacity: 2,
          isActive: true,
          createdAt: '2025-01-25T12:00:00Z',
          updatedAt: '2025-03-25T13:10:00Z'
        },
        {
          id: 'sample-5',
          vehicleNumber: 'AP 31 IJ 7890',
          name: 'Honda City',
          model: 'City ZX',
          make: 'Honda',
          year: 2022,
          status: 'Inactive',
          lastService: '2025-04-05',
          nextServiceDue: '2025-07-05',
          fuelType: 'Petrol',
          vehicleType: 'sedan',
          cabTypeId: 'cab-005',
          capacity: 5,
          luggageCapacity: 2,
          isActive: false,
          createdAt: '2025-02-15T09:20:00Z',
          updatedAt: '2025-04-05T15:45:00Z'
        },
      ];
      
      setFleetData(sampleData);
      setDataSource('regular');
      
      uiToast({
        title: "Using sample data",
        description: "Could not fetch real vehicle data from API.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error fetching fleet data:", error);
      uiToast({
        title: "Error",
        description: "Failed to load fleet data. Using sample data instead.",
        variant: "destructive",
      });
      
      // Fallback to sample data with all required FleetVehicle properties
      const sampleData: FleetVehicle[] = [
        {
          id: 'sample-1',
          vehicleNumber: 'AP 31 AB 1234',
          name: 'Toyota Innova',
          model: 'Innova Crysta',
          make: 'Toyota',
          year: 2022,
          status: 'Active',
          lastService: '2025-04-15',
          nextServiceDue: '2025-07-15',
          fuelType: 'Diesel',
          vehicleType: 'suv',
          cabTypeId: 'cab-001',
          capacity: 7,
          luggageCapacity: 3,
          isActive: true,
          createdAt: '2025-01-15T10:30:00Z',
          updatedAt: '2025-04-15T14:20:00Z'
        },
        {
          id: 'sample-2',
          vehicleNumber: 'AP 31 CD 5678',
          name: 'Maruti Swift',
          model: 'Swift Dzire',
          make: 'Maruti',
          year: 2021,
          status: 'Active',
          lastService: '2025-04-10',
          nextServiceDue: '2025-07-10',
          fuelType: 'Petrol',
          vehicleType: 'sedan',
          cabTypeId: 'cab-002',
          capacity: 4,
          luggageCapacity: 2,
          isActive: true,
          createdAt: '2025-02-10T11:45:00Z',
          updatedAt: '2025-04-10T09:30:00Z'
        },
        {
          id: 'sample-3',
          vehicleNumber: 'AP 31 EF 9012',
          name: 'Hyundai Creta',
          model: 'Creta SX',
          make: 'Hyundai',
          year: 2023,
          status: 'Maintenance',
          lastService: '2025-04-20',
          nextServiceDue: '2025-07-20',
          fuelType: 'Diesel',
          vehicleType: 'suv',
          cabTypeId: 'cab-003',
          capacity: 5,
          luggageCapacity: 2,
          isActive: false,
          createdAt: '2025-03-05T16:30:00Z',
          updatedAt: '2025-04-20T10:15:00Z'
        },
        {
          id: 'sample-4',
          vehicleNumber: 'AP 31 GH 3456',
          name: 'Toyota Etios',
          model: 'Etios VX',
          make: 'Toyota',
          year: 2020,
          status: 'Active',
          lastService: '2025-03-25',
          nextServiceDue: '2025-06-25',
          fuelType: 'Petrol',
          vehicleType: 'sedan',
          cabTypeId: 'cab-004',
          capacity: 4,
          luggageCapacity: 2,
          isActive: true,
          createdAt: '2025-01-25T12:00:00Z',
          updatedAt: '2025-03-25T13:10:00Z'
        },
        {
          id: 'sample-5',
          vehicleNumber: 'AP 31 IJ 7890',
          name: 'Honda City',
          model: 'City ZX',
          make: 'Honda',
          year: 2022,
          status: 'Inactive',
          lastService: '2025-04-05',
          nextServiceDue: '2025-07-05',
          fuelType: 'Petrol',
          vehicleType: 'sedan',
          cabTypeId: 'cab-005',
          capacity: 5,
          luggageCapacity: 2,
          isActive: false,
          createdAt: '2025-02-15T09:20:00Z',
          updatedAt: '2025-04-05T15:45:00Z'
        },
      ];
      
      setFleetData(sampleData);
      setDataSource('regular');
    } finally {
      setIsLoading(false);
    }
  };

  // Validate and ensure status is one of the allowed enum values
  const validateStatus = (status?: string): 'Active' | 'Maintenance' | 'Inactive' => {
    if (!status) return 'Inactive';
    
    const normalizedStatus = status.toLowerCase();
    
    if (normalizedStatus === 'active') return 'Active';
    if (normalizedStatus === 'maintenance') return 'Maintenance';
    if (normalizedStatus === 'inactive') return 'Inactive';
    
    // Default to Active for any other value
    return 'Active';
  };

  // Function to get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Maintenance': return 'bg-amber-100 text-amber-800';
      case 'Inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate summary data
  const activeVehicles = fleetData.filter(v => v.status === 'Active').length;
  const maintenanceVehicles = fleetData.filter(v => v.status === 'Maintenance').length;
  const inactiveVehicles = fleetData.filter(v => v.status === 'Inactive').length;

  // Handle adding a new vehicle
  const handleAddVehicle = async (newVehicle: FleetVehicle) => {
    try {
      console.log("Adding new vehicle:", newVehicle);
      
      // Check if vehicle with same number already exists before adding
      const vehicleExists = fleetData.some(v => 
        v.vehicleNumber === newVehicle.vehicleNumber
      );
      
      if (vehicleExists) {
        toast.error(`Vehicle with number ${newVehicle.vehicleNumber} already exists.`);
        return;
      }
      
      // Try to use fleetAPI to add the vehicle
      const response = await fleetAPI.addVehicle(newVehicle);
      console.log("Vehicle added response:", response);
      
      toast.success(`Vehicle ${newVehicle.vehicleNumber} has been added to the fleet.`);
      
      // Add the new vehicle to the fleet data without refreshing everything
      setFleetData(prev => [response, ...prev]);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error(`Failed to add vehicle ${newVehicle.vehicleNumber}. Please try again.`);
    }
    
    // Close dialog
    setIsAddDialogOpen(false);
  };

  // Handle view vehicle details
  const handleViewVehicle = (vehicle: FleetVehicle) => {
    setSelectedVehicle(vehicle);
    setIsViewDialogOpen(true);
  };

  // Handle edit vehicle
  const handleEditVehicle = (vehicle: FleetVehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditDialogOpen(true);
  };

  // Handle vehicle update after edit
  const handleVehicleUpdate = async (updatedVehicle: FleetVehicle) => {
    try {
      // Update the vehicle in the API
      const response = await fleetAPI.updateVehicle(updatedVehicle.id, updatedVehicle);
      
      // Update the local state
      setFleetData(prev => 
        prev.map(vehicle => vehicle.id === updatedVehicle.id ? response : vehicle)
      );
      
      toast.success(`Vehicle ${updatedVehicle.vehicleNumber} has been updated.`);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast.error(`Failed to update vehicle. Please try again.`);
    }
    
    // Close dialog
    setIsEditDialogOpen(false);
  };

  // Handle vehicle deletion
  const handleVehicleDelete = async (vehicleId: string) => {
    try {
      // Delete the vehicle using the API
      await fleetAPI.deleteVehicle(vehicleId);
      
      // Remove the vehicle from local state
      setFleetData(prev => prev.filter(vehicle => vehicle.id !== vehicleId));
      
      toast.success("Vehicle has been deleted from the fleet.");
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error("Failed to delete vehicle. Please try again.");
    }
    
    // Close the edit dialog
    setIsEditDialogOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
            <p className="text-gray-500">Manage and monitor your vehicle fleet</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                fetchFleetData();
                fetchPendingBookings();
              }}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add New Vehicle
            </Button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="flex items-center">
                  <Car className="h-10 w-10 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500">Total Vehicles</p>
                    <h3 className="text-2xl font-bold">{fleetData.length}</h3>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="flex items-center">
                  <Badge className="h-10 w-10 flex items-center justify-center text-lg bg-green-100 text-green-800 rounded-full mr-3">
                    A
                  </Badge>
                  <div>
                    <p className="text-sm text-gray-500">Active Vehicles</p>
                    <h3 className="text-2xl font-bold">{activeVehicles}</h3>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="flex items-center">
                  <Badge className="h-10 w-10 flex items-center justify-center text-lg bg-amber-100 text-amber-800 rounded-full mr-3">
                    M
                  </Badge>
                  <div>
                    <p className="text-sm text-gray-500">In Maintenance</p>
                    <h3 className="text-2xl font-bold">{maintenanceVehicles}</h3>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <div className="flex items-center">
                  <Badge className="h-10 w-10 flex items-center justify-center text-lg bg-red-100 text-red-800 rounded-full mr-3">
                    I
                  </Badge>
                  <div>
                    <p className="text-sm text-gray-500">Inactive Vehicles</p>
                    <h3 className="text-2xl font-bold">{inactiveVehicles}</h3>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Fleet Inventory</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" /> Export
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle Number</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Make</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Service</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fleetData.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                        <TableCell>{vehicle.model}</TableCell>
                        <TableCell>{vehicle.make}</TableCell>
                        <TableCell>{vehicle.year}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(vehicle.status)}`}>
                            {vehicle.status}
                          </span>
                        </TableCell>
                        <TableCell>{vehicle.lastService}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewVehicle(vehicle)}
                            >
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditVehicle(vehicle)}
                            >
                              Edit
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      
      {/* Add Vehicle Dialog */}
      <AddFleetVehicleDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAddVehicle={handleAddVehicle}
      />

      {/* View Vehicle Dialog */}
      {selectedVehicle && (
        <ViewFleetVehicleDialog
          open={isViewDialogOpen}
          onClose={() => setIsViewDialogOpen(false)}
          vehicle={selectedVehicle}
        />
      )}

      {/* Edit Vehicle Dialog */}
      {selectedVehicle && (
        <EditFleetVehicleDialog
          open={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          vehicle={selectedVehicle}
          onSave={handleVehicleUpdate}
          onDelete={handleVehicleDelete}
        />
      )}
    </div>
  );
}
