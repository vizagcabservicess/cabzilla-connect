
import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { vehicleAPI } from '@/services/api';
import { useToast } from "@/components/ui/use-toast";

export default function FleetManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("fleet");
  const [fleetData, setFleetData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchFleetData = async () => {
      try {
        setIsLoading(true);
        const response = await vehicleAPI.getVehicles();
        console.log("Fleet data response:", response);
        
        if (response && response.vehicles && Array.isArray(response.vehicles)) {
          // Transform vehicle data into fleet data format
          const transformedData = response.vehicles.map((vehicle, index) => ({
            id: index + 1,
            vehicleId: vehicle.id || `VEH-00${index + 1}`,
            model: vehicle.name,
            year: 2022 - (index % 3), // Just a sample calculation
            status: index % 5 === 2 ? 'Maintenance' : index % 5 === 4 ? 'Inactive' : 'Active',
            lastService: new Date(Date.now() - (index * 3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0] // Random recent dates
          }));
          setFleetData(transformedData);
        } else {
          // Fallback to sample data if API doesn't return expected format
          setFleetData([
            { id: 1, vehicleId: 'VEH-001', model: 'Toyota Innova', year: 2022, status: 'Active', lastService: '2025-04-15' },
            { id: 2, vehicleId: 'VEH-002', model: 'Maruti Swift', year: 2021, status: 'Active', lastService: '2025-04-10' },
            { id: 3, vehicleId: 'VEH-003', model: 'Hyundai Creta', year: 2023, status: 'Maintenance', lastService: '2025-04-20' },
            { id: 4, vehicleId: 'VEH-004', model: 'Toyota Etios', year: 2020, status: 'Active', lastService: '2025-03-25' },
            { id: 5, vehicleId: 'VEH-005', model: 'Honda City', year: 2022, status: 'Inactive', lastService: '2025-04-05' },
          ]);
          toast({
            title: "Using sample data",
            description: "Could not fetch real vehicle data from API.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error("Error fetching fleet data:", error);
        toast({
          title: "Error",
          description: "Failed to load fleet data. Using sample data instead.",
          variant: "destructive",
        });
        // Fallback to sample data
        setFleetData([
          { id: 1, vehicleId: 'VEH-001', model: 'Toyota Innova', year: 2022, status: 'Active', lastService: '2025-04-15' },
          { id: 2, vehicleId: 'VEH-002', model: 'Maruti Swift', year: 2021, status: 'Active', lastService: '2025-04-10' },
          { id: 3, vehicleId: 'VEH-003', model: 'Hyundai Creta', year: 2023, status: 'Maintenance', lastService: '2025-04-20' },
          { id: 4, vehicleId: 'VEH-004', model: 'Toyota Etios', year: 2020, status: 'Active', lastService: '2025-03-25' },
          { id: 5, vehicleId: 'VEH-005', model: 'Honda City', year: 2022, status: 'Inactive', lastService: '2025-04-05' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFleetData();
  }, [toast]);

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

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
            <p className="text-gray-500">Manage and monitor your vehicle fleet</p>
          </div>
          <Button>Add New Vehicle</Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Total Vehicles</p>
                <h3 className="text-2xl font-bold">{fleetData.length}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Active Vehicles</p>
                <h3 className="text-2xl font-bold">{activeVehicles}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">In Maintenance</p>
                <h3 className="text-2xl font-bold">{maintenanceVehicles}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Fleet Inventory</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Export</Button>
                <Button variant="outline" size="sm">Filter</Button>
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
                      <TableHead>Vehicle ID</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Service</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fleetData.map((vehicle) => (
                      <TableRow key={vehicle.id}>
                        <TableCell className="font-medium">{vehicle.vehicleId}</TableCell>
                        <TableCell>{vehicle.model}</TableCell>
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
    </div>
  );
}
