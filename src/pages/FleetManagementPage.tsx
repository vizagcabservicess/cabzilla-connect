import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Car, Filter, RefreshCw, Plus, Table as TableIcon } from "lucide-react";
import { FleetVehicle } from '@/types/cab';
import { AddFleetVehicleDialog } from '@/components/admin/AddFleetVehicleDialog';
import { EditFleetVehicleDialog } from '@/components/admin/EditFleetVehicleDialog';
import { ViewFleetVehicleDialog } from '@/components/admin/ViewFleetVehicleDialog';
import { FleetVehicleCard } from '@/components/admin/FleetVehicleCard';
import { generateUUID } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialogHeader, AlertDialogFooter, AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import AdminLayout from "@/components/admin/AdminLayout";

function FleetManagementPage() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<FleetVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState('fleet');

  // Stats
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [activeVehicles, setActiveVehicles] = useState(0);
  const [inMaintenanceVehicles, setInMaintenanceVehicles] = useState(0);
  const [inactiveVehicles, setInactiveVehicles] = useState(0);
  
  // Cache busting for API calls
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Deletion confirmation
  const [vehicleToDelete, setVehicleToDelete] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Add localStorage-based cache key to prevent duplicates from appearing
  const FLEET_CACHE_KEY = 'fleet_vehicles_cache';
  const FLEET_CACHE_TIMESTAMP_KEY = 'fleet_vehicles_timestamp';

  // Fetch vehicles from API or use demo data
  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoading(true);
      setIsRefreshing(true);
      try {
        // Fetch from backend API
        const apiUrl = '/api/admin/fleet_vehicles.php/vehicles';
        const response = await fetch(apiUrl).then(res => res.json());
        const vehicles = response.vehicles || [];
        setVehicles(vehicles);
        applyFilters(vehicles, searchTerm, statusFilter);
        updateStats(vehicles);
      } catch (error) {
        console.error('Error fetching fleet vehicles:', error);
        toast.error("Failed to load vehicles");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };
    fetchVehicles();
  }, [refreshTrigger]);

  // Apply filters when searchTerm or statusFilter changes
  useEffect(() => {
    applyFilters(vehicles, searchTerm, statusFilter);
  }, [searchTerm, statusFilter, vehicles]);

  // Apply filters to vehicles
  const applyFilters = (vehicles: FleetVehicle[], search: string, status: string) => {
    let filtered = [...vehicles];
    
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(vehicle => 
        vehicle.vehicleNumber.toLowerCase().includes(term) ||
        vehicle.name.toLowerCase().includes(term) ||
        vehicle.make.toLowerCase().includes(term) ||
        vehicle.model.toLowerCase().includes(term)
      );
    }
    
    if (status !== 'all') {
      filtered = filtered.filter(vehicle => vehicle.status === status);
    }
    
    setFilteredVehicles(filtered);
  };

  // Update statistics
  const updateStats = (vehicles: FleetVehicle[]) => {
    setTotalVehicles(vehicles.length);
    setActiveVehicles(vehicles.filter(v => v.status === 'Active').length);
    setInMaintenanceVehicles(vehicles.filter(v => v.status === 'Maintenance').length);
    setInactiveVehicles(vehicles.filter(v => v.status === 'Inactive').length);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle adding a new vehicle
  const handleAddVehicle = async (vehicle: FleetVehicle) => {
    try {
      // Call backend API to add vehicle
      const apiUrl = '/api/admin/fleet_vehicles.php/vehicles';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle)
      });
      if (!response.ok) throw new Error('Failed to add vehicle');
      toast.success('Vehicle added successfully');
      setIsAddDialogOpen(false);
      setRefreshTrigger(prev => prev + 1); // Refresh list
    } catch (error) {
      toast.error('Failed to add vehicle');
    }
  };

  // Handle editing a vehicle
  const handleEditVehicle = async (vehicle: FleetVehicle) => {
    try {
      const apiUrl = `/api/admin/fleet_vehicles.php/vehicles/${vehicle.id}`;
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicle)
      });
      if (!response.ok) throw new Error('Failed to update vehicle');
      toast.success('Vehicle updated successfully');
      setIsEditDialogOpen(false);
      setSelectedVehicle(null);
      setRefreshTrigger(prev => prev + 1); // Refresh list
    } catch (error) {
      toast.error('Failed to update vehicle');
    }
  };

  // Handle deleting a vehicle
  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicleToDelete(vehicleId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    try {
      const apiUrl = `/api/admin/fleet_vehicles.php/vehicles/${vehicleToDelete}`;
      const response = await fetch(apiUrl, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete vehicle');
      toast.success('Vehicle deleted successfully');
      setVehicleToDelete(null);
      setIsDeleteDialogOpen(false);
      setIsEditDialogOpen(false);
      setIsViewDialogOpen(false);
      setSelectedVehicle(null);
      setRefreshTrigger(prev => prev + 1); // Refresh list
    } catch (error) {
      toast.error('Failed to delete vehicle');
    }
  };

  // View a vehicle
  const handleViewVehicle = (vehicle: FleetVehicle) => {
    setSelectedVehicle(vehicle);
    setIsViewDialogOpen(true);
  };

  // Edit a vehicle
  const handleEditClick = (vehicle: FleetVehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditDialogOpen(true);
  };

  return (
    <AdminLayout activeTab="fleet">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Fleet Management</h1>
              <p className="text-gray-500">Manage and monitor your vehicle fleet</p>
            </div>
            <div className="flex gap-2 mt-4 md:mt-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add New Vehicle
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">Total Vehicles</p>
                  <h2 className="text-3xl font-bold">{totalVehicles}</h2>
                </div>
                <Car className="h-10 w-10 text-gray-300" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">Active Vehicles</p>
                  <h2 className="text-3xl font-bold">{activeVehicles}</h2>
                </div>
                <div className="h-10 w-10 flex items-center justify-center bg-green-100 text-green-600 rounded-full">A</div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">In Maintenance</p>
                  <h2 className="text-3xl font-bold">{inMaintenanceVehicles}</h2>
                </div>
                <div className="h-10 w-10 flex items-center justify-center bg-yellow-100 text-yellow-600 rounded-full">M</div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500">Inactive Vehicles</p>
                  <h2 className="text-3xl font-bold">{inactiveVehicles}</h2>
                </div>
                <div className="h-10 w-10 flex items-center justify-center bg-gray-100 text-gray-600 rounded-full">I</div>
              </div>
            </div>
          </div>

          {/* Fleet Inventory Section */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h2 className="text-xl font-bold">Fleet Inventory</h2>
              <div className="flex gap-2 mt-4 md:mt-0">
                <Button 
                  variant={viewMode === 'grid' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setViewMode('grid')}
                >
                  <Car className="h-4 w-4 mr-1" />
                  Grid
                </Button>
                <Button 
                  variant={viewMode === 'table' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon className="h-4 w-4 mr-1" />
                  Table
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="w-full md:w-1/3">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by vehicle number, make, model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div className="w-full md:w-1/3">
                <Label htmlFor="statusFilter">Filter by Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger id="statusFilter" className="mt-1">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Maintenance">In Maintenance</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredVehicles.length === 0 ? (
              <div className="text-center py-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Car className="h-8 w-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Vehicles Found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'Add a new vehicle to your fleet by clicking the "Add New Vehicle" button.'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map((vehicle) => (
                  <FleetVehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onEdit={handleEditClick}
                    onView={handleViewVehicle}
                  />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Number</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Make/Model</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service Odometer</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVehicles.map((vehicle) => (
                      <tr key={vehicle.id}>
                        <td className="px-6 py-4 whitespace-nowrap">{vehicle.vehicleNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{vehicle.make} {vehicle.model}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{vehicle.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${vehicle.status === 'Active' ? 'bg-green-100 text-green-800' : 
                              vehicle.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-gray-100 text-gray-800'}`
                          }>
                            {vehicle.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(vehicle.lastService).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(vehicle.nextServiceDue).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {vehicle.nextServiceOdometer ? `${vehicle.nextServiceOdometer} km` : 'Not set'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleViewVehicle(vehicle)}>View</Button>
                            <Button size="sm" onClick={() => handleEditClick(vehicle)}>Edit</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add Vehicle Dialog */}
          <AddFleetVehicleDialog
            open={isAddDialogOpen}
            onClose={() => setIsAddDialogOpen(false)}
            onAddVehicle={handleAddVehicle}
          />

          {/* Edit Vehicle Dialog */}
          {selectedVehicle && (
            <EditFleetVehicleDialog
              open={isEditDialogOpen}
              onClose={() => setIsEditDialogOpen(false)}
              vehicle={selectedVehicle}
              onSave={handleEditVehicle}
              onDelete={handleDeleteVehicle}
            />
          )}

          {/* View Vehicle Dialog */}
          {selectedVehicle && (
            <ViewFleetVehicleDialog
              open={isViewDialogOpen}
              onClose={() => setIsViewDialogOpen(false)}
              vehicle={selectedVehicle}
            />
          )}

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this vehicle?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the vehicle
                  from your fleet database.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDeleteVehicle} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AdminLayout>
  );
}

export default FleetManagementPage;
