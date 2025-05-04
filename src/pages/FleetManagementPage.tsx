import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { AddVehicleDialog } from '@/components/admin/AddVehicleDialog';
import { fleetAPI } from '@/services/api/fleetAPI';
import { FleetVehicle } from '@/types/cab';
import { Car, Filter, FileText, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function FleetManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("fleet");
  const [fleetData, setFleetData] = useState<FleetVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast: uiToast } = useToast();
  
  useEffect(() => {
    fetchFleetData();
  }, []);

  const fetchFleetData = async () => {
    try {
      setIsLoading(true);
      
      // Try to get fleet vehicles
      try {
        const fleetResponse = await fleetAPI.getVehicles(true);
        
        if (fleetResponse.vehicles && fleetResponse.vehicles.length > 0) {
          console.log(`Loaded ${fleetResponse.vehicles.length} fleet vehicles:`, fleetResponse.vehicles);
          setFleetData(fleetResponse.vehicles);
          return;
        }
      } catch (fleetError) {
        console.error("Error fetching fleet vehicles:", fleetError);
      }
      
      // If we reach here, no vehicles were loaded - use fallback data
      console.log("No vehicles returned from API, using sample data");
      setFleetData([
        { 
          id: '1', 
          vehicleNumber: 'AP 31 AB 1234', 
          name: 'Toyota Innova #101',
          model: 'Innova', 
          make: 'Toyota',
          year: 2022, 
          status: 'Active', 
          lastService: '2025-04-15', 
          nextServiceDue: '2025-07-15',
          fuelType: 'Diesel',
          capacity: 7,
          luggageCapacity: 3,
          isActive: true
        },
        { 
          id: '2', 
          vehicleNumber: 'AP 31 CD 5678', 
          name: 'Maruti Swift #202',
          model: 'Swift', 
          make: 'Maruti',
          year: 2021, 
          status: 'Active', 
          lastService: '2025-04-10',
          nextServiceDue: '2025-07-10',
          fuelType: 'Petrol',
          capacity: 4,
          luggageCapacity: 2,
          isActive: true
        },
        { 
          id: '3', 
          vehicleNumber: 'AP 31 EF 9012', 
          name: 'Hyundai Creta #303',
          model: 'Creta', 
          make: 'Hyundai',
          year: 2023, 
          status: 'Maintenance', 
          lastService: '2025-04-20',
          nextServiceDue: '2025-07-20',
          fuelType: 'Petrol',
          capacity: 5,
          luggageCapacity: 2,
          isActive: false
        },
        { 
          id: '4', 
          vehicleNumber: 'AP 31 GH 3456', 
          name: 'Toyota Etios #404',
          model: 'Etios', 
          make: 'Toyota',
          year: 2020, 
          status: 'Active', 
          lastService: '2025-03-25',
          nextServiceDue: '2025-06-25',
          fuelType: 'Petrol',
          capacity: 4,
          luggageCapacity: 2,
          isActive: true
        },
        { 
          id: '5', 
          vehicleNumber: 'AP 31 IJ 7890', 
          name: 'Honda City #505',
          model: 'City', 
          make: 'Honda',
          year: 2022, 
          status: 'Inactive', 
          lastService: '2025-04-05',
          nextServiceDue: '2025-07-05',
          fuelType: 'Petrol',
          capacity: 4,
          luggageCapacity: 2,
          isActive: false
        },
      ]);
      
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
      // Fallback to sample data
      setFleetData([
        { 
          id: '1', 
          vehicleNumber: 'AP 31 AB 1234', 
          name: 'Toyota Innova #101',
          model: 'Innova', 
          make: 'Toyota',
          year: 2022, 
          status: 'Active', 
          lastService: '2025-04-15', 
          nextServiceDue: '2025-07-15',
          fuelType: 'Diesel',
          capacity: 7,
          luggageCapacity: 3,
          isActive: true
        },
        { 
          id: '2', 
          vehicleNumber: 'AP 31 CD 5678', 
          name: 'Maruti Swift #202',
          model: 'Swift', 
          make: 'Maruti',
          year: 2021, 
          status: 'Active', 
          lastService: '2025-04-10',
          nextServiceDue: '2025-07-10',
          fuelType: 'Petrol',
          capacity: 4,
          luggageCapacity: 2,
          isActive: true
        },
        { 
          id: '3', 
          vehicleNumber: 'AP 31 EF 9012', 
          name: 'Hyundai Creta #303',
          model: 'Creta', 
          make: 'Hyundai',
          year: 2023, 
          status: 'Maintenance', 
          lastService: '2025-04-20',
          nextServiceDue: '2025-07-20',
          fuelType: 'Petrol',
          capacity: 5,
          luggageCapacity: 2,
          isActive: false
        },
        { 
          id: '4', 
          vehicleNumber: 'AP 31 GH 3456', 
          name: 'Toyota Etios #404',
          model: 'Etios', 
          make: 'Toyota',
          year: 2020, 
          status: 'Active', 
          lastService: '2025-03-25',
          nextServiceDue: '2025-06-25',
          fuelType: 'Petrol',
          capacity: 4,
          luggageCapacity: 2,
          isActive: true
        },
        { 
          id: '5', 
          vehicleNumber: 'AP 31 IJ 7890', 
          name: 'Honda City #505',
          model: 'City', 
          make: 'Honda',
          year: 2022, 
          status: 'Inactive', 
          lastService: '2025-04-05',
          nextServiceDue: '2025-07-05',
          fuelType: 'Petrol',
          capacity: 4,
          luggageCapacity: 2,
          isActive: false
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
  const handleAddVehicle = (newVehicle: FleetVehicle) => {
    toast.success(`Vehicle ${newVehicle.vehicleNumber} has been added to the fleet.`);
    
    // Add the new vehicle to the fleet data
    setFleetData([...fleetData, newVehicle]);
    
    // Refresh data from API after a short delay
    setTimeout(() => {
      fetchFleetData();
    }, 1000);
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
              onClick={fetchFleetData}
              className="flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Fleet Vehicle
            </Button>
          </div>
        </div>

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
                      <TableHead>Name</TableHead>
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
                        <TableCell>{vehicle.name}</TableCell>
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
                            <Button variant="outline" size="sm">View</Button>
                            <Button variant="outline" size="sm">Edit</Button>
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
      <AddVehicleDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAddVehicle={handleAddVehicle}
      />
    </div>
  );
}
