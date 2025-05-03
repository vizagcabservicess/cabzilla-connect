
import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

export default function FuelManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("fuel");
  const [fuelData, setFuelData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    // In a real application, this would be an API call to fetch fuel data
    const fetchFuelData = async () => {
      try {
        setIsLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Sample fuel data - in a real app this would come from an API
        const sampleFuelData = [
          { id: 1, vehicleId: 'VEH-001', date: '2025-05-01', liters: 45.2, pricePerLiter: 107.5, totalCost: 4859, odometer: 15420, station: 'HPCL, Gajuwaka' },
          { id: 2, vehicleId: 'VEH-002', date: '2025-04-30', liters: 35.8, pricePerLiter: 107.2, totalCost: 3837.76, odometer: 12540, station: 'Indian Oil, Siripuram' },
          { id: 3, vehicleId: 'VEH-003', date: '2025-04-29', liters: 42.5, pricePerLiter: 107.5, totalCost: 4568.75, odometer: 14250, station: 'HPCL, Dwaraka Nagar' },
          { id: 4, vehicleId: 'VEH-004', date: '2025-04-28', liters: 38.6, pricePerLiter: 107.3, totalCost: 4141.78, odometer: 13680, station: 'BP, Maddilapalem' },
          { id: 5, vehicleId: 'VEH-001', date: '2025-04-27', liters: 43.8, pricePerLiter: 106.9, totalCost: 4682.22, odometer: 14980, station: 'HPCL, Gajuwaka' },
        ];
        
        setFuelData(sampleFuelData);
        
        console.log("Fuel data loaded:", sampleFuelData);
      } catch (error) {
        console.error("Error fetching fuel data:", error);
        toast({
          title: "Error",
          description: "Failed to load fuel data. Using sample data instead.",
          variant: "destructive",
        });
        
        // Fallback to empty dataset
        setFuelData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFuelData();
  }, [toast]);

  // Calculate total fuel costs
  const totalFuelCost = fuelData.reduce((sum, record) => sum + record.totalCost, 0);
  const totalLiters = fuelData.reduce((sum, record) => sum + record.liters, 0);
  const averageCostPerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0;

  const handleAddFuelRecord = () => {
    toast({
      title: "Feature Coming Soon",
      description: "The ability to add fuel records will be available in the next update.",
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fuel Management</h1>
            <p className="text-gray-500">Track and manage fuel consumption and expenses</p>
          </div>
          <Button onClick={handleAddFuelRecord}>Add Fuel Record</Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Total Fuel Cost (This Month)</p>
                <h3 className="text-2xl font-bold">₹{totalFuelCost.toFixed(2)}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Total Liters</p>
                <h3 className="text-2xl font-bold">{totalLiters.toFixed(1)} L</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Average Price Per Liter</p>
                <h3 className="text-2xl font-bold">₹{averageCostPerLiter.toFixed(2)}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Fuel Records</h3>
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
                      <TableHead>Date</TableHead>
                      <TableHead>Liters</TableHead>
                      <TableHead>Price/L (₹)</TableHead>
                      <TableHead>Total Cost (₹)</TableHead>
                      <TableHead>Odometer</TableHead>
                      <TableHead>Fuel Station</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fuelData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.vehicleId}</TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.liters.toFixed(1)}</TableCell>
                        <TableCell>{record.pricePerLiter.toFixed(2)}</TableCell>
                        <TableCell>{record.totalCost.toFixed(2)}</TableCell>
                        <TableCell>{record.odometer}</TableCell>
                        <TableCell>{record.station}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm">Edit</Button>
                            <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700">Delete</Button>
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
