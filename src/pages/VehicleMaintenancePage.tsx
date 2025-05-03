
import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

export default function VehicleMaintenancePage() {
  const [activeTab, setActiveTab] = useState<string>("maintenance");
  const [maintenanceData, setMaintenanceData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    // In a real application, this would be an API call to fetch maintenance data
    const fetchMaintenanceData = async () => {
      try {
        setIsLoading(true);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Sample maintenance data - in a real app this would come from an API
        const sampleMaintenanceData = [
          { id: 1, vehicleId: 'VEH-001', date: '2025-04-15', serviceType: 'Oil Change', description: 'Regular oil change and filter replacement', cost: 3500, vendor: 'AutoService Center', nextServiceDate: '2025-07-15' },
          { id: 2, vehicleId: 'VEH-002', date: '2025-04-10', serviceType: 'Tire Replacement', description: 'Replaced all four tires', cost: 24000, vendor: 'Tire World', nextServiceDate: '2026-04-10' },
          { id: 3, vehicleId: 'VEH-003', date: '2025-04-20', serviceType: 'Major Service', description: 'Full maintenance service including brakes and suspension check', cost: 12500, vendor: 'Hyundai Service Center', nextServiceDate: '2025-10-20' },
          { id: 4, vehicleId: 'VEH-004', date: '2025-03-25', serviceType: 'AC Repair', description: 'Fixed AC compressor and refilled refrigerant', cost: 8000, vendor: 'Cool Fix Auto', nextServiceDate: '2025-09-25' },
          { id: 5, vehicleId: 'VEH-005', date: '2025-04-05', serviceType: 'Battery Replacement', description: 'Replaced battery with new one', cost: 6500, vendor: 'Battery Express', nextServiceDate: '2027-04-05' },
        ];
        
        setMaintenanceData(sampleMaintenanceData);
        
        console.log("Maintenance data loaded:", sampleMaintenanceData);
      } catch (error) {
        console.error("Error fetching maintenance data:", error);
        toast({
          title: "Error",
          description: "Failed to load maintenance data. Using sample data instead.",
          variant: "destructive",
        });
        
        // Fallback to empty dataset
        setMaintenanceData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaintenanceData();
  }, [toast]);
  
  // Calculate total maintenance costs and upcoming services
  const totalMaintenanceCost = maintenanceData.reduce((sum, record) => sum + record.cost, 0);
  const currentDate = new Date();
  const upcomingServices = maintenanceData.filter(record => {
    const nextDate = new Date(record.nextServiceDate);
    const daysDifference = Math.ceil((nextDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
    return daysDifference > 0 && daysDifference <= 30;
  }).length;

  const handleAddMaintenanceRecord = () => {
    toast({
      title: "Feature Coming Soon",
      description: "The ability to add maintenance records will be available in the next update.",
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vehicle Maintenance</h1>
            <p className="text-gray-500">Track vehicle maintenance history and schedule</p>
          </div>
          <Button onClick={handleAddMaintenanceRecord}>Add Maintenance Record</Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Total Maintenance Cost</p>
                <h3 className="text-2xl font-bold">₹{totalMaintenanceCost.toFixed(2)}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Maintenance Records</p>
                <h3 className="text-2xl font-bold">{maintenanceData.length}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Upcoming Services (30 days)</p>
                <h3 className="text-2xl font-bold">{upcomingServices}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Maintenance Records</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Schedule Service</Button>
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
                      <TableHead>Service Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Cost (₹)</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Next Service</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenanceData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.vehicleId}</TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.serviceType}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{record.description}</TableCell>
                        <TableCell>{record.cost.toFixed(2)}</TableCell>
                        <TableCell>{record.vendor}</TableCell>
                        <TableCell>{record.nextServiceDate}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm">Details</Button>
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
