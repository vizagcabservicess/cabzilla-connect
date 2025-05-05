
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
        // Try to get cached data first if not refreshing
        if (refreshTrigger === 0) {
          const cachedData = localStorage.getItem(FLEET_CACHE_KEY);
          const cachedTimestamp = localStorage.getItem(FLEET_CACHE_TIMESTAMP_KEY);
          
          if (cachedData && cachedTimestamp) {
            // Only use cache if it's less than 5 minutes old
            const now = Date.now();
            const timestamp = parseInt(cachedTimestamp);
            if (now - timestamp < 5 * 60 * 1000) {
              const parsedData = JSON.parse(cachedData);
              if (Array.isArray(parsedData)) {
                console.log('Using cached fleet vehicles:', parsedData.length);
                setVehicles(parsedData);
                applyFilters(parsedData, searchTerm, statusFilter);
                updateStats(parsedData);
                setIsLoading(false);
                setIsRefreshing(false);
                return;
              }
            }
          }
        }
        
        // Simulation of API call - in real app, would fetch from backend
        console.log('Fetching fleet vehicles from API...');
        const timestamp = new Date().getTime();
        
        // Try to fetch from API (commented out for simulation)
        /* const response = await fetch(`/api/admin/fleet_vehicles.php?_t=${timestamp}`);
        if (!response.ok) {
          throw new Error('Failed to fetch vehicles');
        }
        const data = await response.json(); */
        
        // For demo, use sample data
        const demoVehicles: FleetVehicle[] = [
          {
            id: "1",
            vehicleNumber: "AP39TV1245",
            name: "Honda Amaze",
            model: "Amaze",
            make: "Honda",
            year: 2021,
            status: "Active",
            lastService: "2025-05-05",
            nextServiceDue: "2025-08-05",
            lastServiceOdometer: 25000,
            nextServiceOdometer: 30000,
            currentOdometer: 27500,
            fuelType: "Petrol",
            vehicleType: "sedan",
            cabTypeId: "sedan",
            capacity: 4,
            luggageCapacity: 2,
            isActive: true,
            assignedDriverId: "driver1",
            createdAt: "2023-01-01",
            updatedAt: "2023-04-01"
          },
          {
            id: "2",
            vehicleNumber: "AP39WD9777",
            name: "Maruti Suzuki Dzire",
            model: "Dzire",
            make: "Maruti Suzuki",
            year: 2022,
            status: "Active",
            lastService: "2025-04-15",
            nextServiceDue: "2025-07-15",
            lastServiceOdometer: 15000,
            nextServiceOdometer: 20000,
            currentOdometer: 17300,
            fuelType: "CNG",
            vehicleType: "sedan",
            cabTypeId: "sedan",
            capacity: 4,
            luggageCapacity: 2,
            isActive: true,
            assignedDriverId: "driver2",
            createdAt: "2023-02-15",
            updatedAt: "2023-04-15"
          },
          {
            id: "3",
            vehicleNumber: "AP 31 EF 9012",
            name: "Honda City",
            model: "City",
            make: "Honda",
            year: 2021,
            status: "Active",
            lastService: "2025-03-10",
            nextServiceDue: "2025-06-10",
            lastServiceOdometer: 22000,
            nextServiceOdometer: 27000,
            currentOdometer: 24800,
            fuelType: "Petrol",
            vehicleType: "sedan",
            cabTypeId: "sedan",
            capacity: 4,
            luggageCapacity: 2,
            isActive: true,
            createdAt: "2022-12-01",
            updatedAt: "2023-03-10"
          },
          {
            id: "4",
            vehicleNumber: "AP 31 GH 3456",
            name: "Toyota Innova",
            model: "Innova Crysta",
            make: "Toyota",
            year: 2023,
            status: "Maintenance",
            lastService: "2025-04-20",
            nextServiceDue: "2025-07-20",
            lastServiceOdometer: 18000,
            nextServiceOdometer: 23000,
            fuelType: "Diesel",
            vehicleType: "suv",
            cabTypeId: "innova_crysta",
            capacity: 7,
            luggageCapacity: 4,
            isActive: true,
            createdAt: "2023-01-10",
            updatedAt: "2023-04-20"
          }
        ];
        
        // Store in cache
        localStorage.setItem(FLEET_CACHE_KEY, JSON.stringify(demoVehicles));
        localStorage.setItem(FLEET_CACHE_TIMESTAMP_KEY, Date.now().toString());
        
        setVehicles(demoVehicles);
        applyFilters(demoVehicles, searchTerm, statusFilter);
        updateStats(demoVehicles);
        
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
  const handleAddVehicle = (vehicle: FleetVehicle) => {
    const newVehicle = {
      ...vehicle,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to state but don't refresh to prevent duplication
    const updatedVehicles = [...vehicles, newVehicle];
    setVehicles(updatedVehicles);
    applyFilters(updatedVehicles, searchTerm, statusFilter);
    updateStats(updatedVehicles);
    
    // Update the cache to include the new vehicle
    localStorage.setItem(FLEET_CACHE_KEY, JSON.stringify(updatedVehicles));
    localStorage.setItem(FLEET_CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    setIsAddDialogOpen(false);
    toast.success("Vehicle added successfully");
  };

  // Handle editing a vehicle
  const handleEditVehicle = (vehicle: FleetVehicle) => {
    const updatedVehicles = vehicles.map(v => v.id === vehicle.id ? {
      ...vehicle,
      updatedAt: new Date().toISOString()
    } : v);
    
    setVehicles(updatedVehicles);
    applyFilters(updatedVehicles, searchTerm, statusFilter);
    updateStats(updatedVehicles);
    
    // Update the cache
    localStorage.setItem(FLEET_CACHE_KEY, JSON.stringify(updatedVehicles));
    localStorage.setItem(FLEET_CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    setIsEditDialogOpen(false);
    setSelectedVehicle(null);
    toast.success("Vehicle updated successfully");
  };

  // Handle deleting a vehicle
  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicleToDelete(vehicleId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteVehicle = () => {
    if (!vehicleToDelete) return;
    
    const updatedVehicles = vehicles.filter(v => v.id !== vehicleToDelete);
    setVehicles(updatedVehicles);
    applyFilters(updatedVehicles, searchTerm, statusFilter);
    updateStats(updatedVehicles);
    
    // Update the cache
    localStorage.setItem(FLEET_CACHE_KEY, JSON.stringify(updatedVehicles));
    localStorage.setItem(FLEET_CACHE_TIMESTAMP_KEY, Date.now().toString());
    
    setVehicleToDelete(null);
    setIsDeleteDialogOpen(false);
    setIsEditDialogOpen(false);
    setIsViewDialogOpen(false);
    setSelectedVehicle(null);
    toast.success("Vehicle deleted successfully");
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
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAddVehicle}
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
          onEdit={() => {
            setIsViewDialogOpen(false);
            setIsEditDialogOpen(true);
          }}
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
  );
}

export default FleetManagementPage;
