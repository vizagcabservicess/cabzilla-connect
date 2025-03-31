import { useState, useEffect } from 'react';
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
import { syncVehicleData } from "@/services/directVehicleService";

export default function VehicleManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<CabType | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Setup listener for cache invalidation events
  useEffect(() => {
    const handleCacheInvalidated = () => {
      console.log("Vehicle cache invalidated, reloading vehicles");
      setRetryCount(prev => prev + 1);
    };
    
    window.addEventListener('vehicle-cache-invalidated', handleCacheInvalidated);
    window.addEventListener('vehicle-data-cache-cleared', handleCacheInvalidated);
    window.addEventListener('vehicle-data-updated', handleCacheInvalidated);
    window.addEventListener('vehicle-data-refreshed', handleCacheInvalidated);
    
    return () => {
      window.removeEventListener('vehicle-cache-invalidated', handleCacheInvalidated);
      window.removeEventListener('vehicle-data-cache-cleared', handleCacheInvalidated);
      window.removeEventListener('vehicle-data-updated', handleCacheInvalidated);
      window.removeEventListener('vehicle-data-refreshed', handleCacheInvalidated);
    };
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [retryCount]);

  const loadVehicles = async () => {
    try {
      setIsLoading(true);
      console.log("Admin: Fetching all vehicles...");
      
      // Always clear cache first to ensure fresh data
      clearVehicleDataCache();
      
      // Always include inactive vehicles for admin view
      const fetchedVehicles = await getVehicleData(true, true);
      console.log(`Loaded ${fetchedVehicles.length} vehicles for admin view:`, fetchedVehicles);
      
      if (fetchedVehicles && fetchedVehicles.length > 0) {
        // Remove duplicate vehicles by ID - keep only the first occurrence of each vehicle ID
        const uniqueVehiclesMap = new Map<string, CabType>();
        
        fetchedVehicles.forEach(vehicle => {
          if (!uniqueVehiclesMap.has(vehicle.id)) {
            uniqueVehiclesMap.set(vehicle.id, vehicle);
          }
        });
        
        const uniqueVehicles = Array.from(uniqueVehiclesMap.values());
        console.log(`Filtered to ${uniqueVehicles.length} unique vehicles`);
        
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
  };

  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true);
      
      // Clear all caches
      clearVehicleDataCache();
      
      // Also try to sync data on the server
      try {
        await syncVehicleData();
      } catch (syncError) {
        console.warn("Could not sync vehicle data:", syncError);
      }
      
      // Reload vehicles with fresh data
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
    // Add the new vehicle to the list
    setVehicles((prev) => [...prev, newVehicle]);
    toast.success(`Vehicle ${newVehicle.name} added successfully`);
    
    // Also refresh all data to ensure consistency
    setTimeout(() => {
      handleRefreshData();
    }, 1000);
  };

  const handleEditVehicle = (updatedVehicle: CabType) => {
    // Update the vehicle in the list
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle
      )
    );
    toast.success(`Vehicle ${updatedVehicle.name} updated successfully`);
    
    // Also refresh all data to ensure consistency
    setTimeout(() => {
      handleRefreshData();
    }, 1000);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    // Remove the vehicle from the list
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== vehicleId));
    toast.success("Vehicle deleted successfully");
    
    // Also refresh all data to ensure consistency
    setTimeout(() => {
      handleRefreshData();
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
