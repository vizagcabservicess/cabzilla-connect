
import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { VehicleCard } from "./VehicleCard";
import { CabType } from "@/types/cab";
import { AddVehicleDialog } from "./AddVehicleDialog";
import { EditVehicleDialog } from "./EditVehicleDialog";
import { getVehicleData, clearVehicleDataCache } from "@/services/vehicleDataService";
import { Skeleton } from "@/components/ui/skeleton";

export default function VehicleManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<CabType | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  // Debounced loadVehicles function to prevent excessive API calls
  const loadVehicles = useCallback(async () => {
    // Debounce: Only allow refresh every 5 seconds
    const now = Date.now();
    if (now - lastRefreshTime < 5000 && lastRefreshTime !== 0) {
      console.log("Refresh throttled, skipping...");
      return;
    }

    try {
      setIsLoading(true);
      setLastRefreshTime(now);
      console.log("Admin: Fetching all vehicles...");
      
      // Always include inactive vehicles for admin view
      const fetchedVehicles = await getVehicleData(true, true);
      console.log(`Loaded ${fetchedVehicles.length} vehicles for admin view:`, fetchedVehicles);
      
      if (fetchedVehicles && fetchedVehicles.length > 0) {
        // Fix for duplicate vehicles - deduplicate by id
        const uniqueVehiclesMap = new Map<string, CabType>();
        
        fetchedVehicles.forEach(vehicle => {
          // Ensure vehicle has an id
          if (!vehicle.id) {
            vehicle.id = vehicle.vehicleId || `vehicle_${Math.random().toString(36).substring(2, 9)}`;
          }
          
          // Only add or replace if this vehicle has more complete data
          if (!uniqueVehiclesMap.has(vehicle.id) || 
              (uniqueVehiclesMap.get(vehicle.id)?.description === '' && vehicle.description)) {
            uniqueVehiclesMap.set(vehicle.id, vehicle);
          }
        });
        
        const uniqueVehicles = Array.from(uniqueVehiclesMap.values());
        setVehicles(uniqueVehicles);
      } else if (retryCount < 3) {
        console.log("No vehicles returned, clearing cache and retrying...");
        clearVehicleDataCache();
        setRetryCount(prev => prev + 1);
      } else {
        toast.error("Failed to load vehicles. Please try refreshing the page.");
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      toast.error("Failed to load vehicles. Please try refreshing the page.");
    } finally {
      setIsLoading(false);
    }
  }, [retryCount, lastRefreshTime]);

  useEffect(() => {
    loadVehicles();
    
    // Add event listener for vehicle data updates
    const handleVehicleDataUpdated = () => {
      console.log("Vehicle data updated event received");
      loadVehicles();
    };
    
    window.addEventListener('vehicle-data-updated', handleVehicleDataUpdated);
    window.addEventListener('vehicle-data-refreshed', handleVehicleDataUpdated);
    window.addEventListener('vehicle-data-cache-cleared', handleVehicleDataUpdated);
    
    return () => {
      window.removeEventListener('vehicle-data-updated', handleVehicleDataUpdated);
      window.removeEventListener('vehicle-data-refreshed', handleVehicleDataUpdated);
      window.removeEventListener('vehicle-data-cache-cleared', handleVehicleDataUpdated);
    };
  }, [loadVehicles, retryCount]);

  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true);
      clearVehicleDataCache();
      await loadVehicles();
      toast.success("Vehicle data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing vehicle data:", error);
      toast.error("Failed to refresh vehicle data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddVehicle = (newVehicle: CabType) => {
    // Ensure the new vehicle doesn't already exist
    if (!vehicles.some(v => v.id === newVehicle.id)) {
      setVehicles((prev) => [...prev, newVehicle]);
    }
    toast.success(`Vehicle ${newVehicle.name} added successfully`);
    
    // Refresh data to ensure consistency
    setTimeout(() => {
      clearVehicleDataCache();
      loadVehicles();
    }, 1000);
  };

  const handleEditVehicle = (updatedVehicle: CabType) => {
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === updatedVehicle.id ? {
          ...updatedVehicle,
          // Ensure description is properly updated
          description: updatedVehicle.description || vehicle.description || ''
        } : vehicle
      )
    );
    toast.success(`Vehicle ${updatedVehicle.name} updated successfully`);
    
    // Clear the selected vehicle
    setSelectedVehicle(null);
    
    // Refresh data to ensure consistency
    setTimeout(() => {
      clearVehicleDataCache();
      loadVehicles();
    }, 1000);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== vehicleId));
    toast.success("Vehicle deleted successfully");
    
    // Refresh data to ensure consistency
    setTimeout(() => {
      clearVehicleDataCache();
      loadVehicles();
    }, 1000);
  };

  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (vehicle.description && vehicle.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Vehicle Management</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </>
            )}
          </Button>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Vehicle
          </Button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          type="search"
          placeholder="Search vehicles by name or ID..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onEdit={() => {
                // Make sure to select the complete vehicle object
                setSelectedVehicle(vehicle);
                setIsEditDialogOpen(true);
              }}
              onDelete={handleDeleteVehicle}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border rounded-lg">
          <p className="text-gray-500">No vehicles found. Add a new vehicle to get started.</p>
        </div>
      )}

      <AddVehicleDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAddVehicle={handleAddVehicle}
      />

      {selectedVehicle && (
        <EditVehicleDialog
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedVehicle(null);
          }}
          onEditVehicle={handleEditVehicle}
          vehicle={selectedVehicle}
        />
      )}
    </div>
  );
}
