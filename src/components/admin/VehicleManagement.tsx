import { useState, useEffect, useRef } from 'react';
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
  const [hasError, setHasError] = useState(false);
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const initialLoadCompletedRef = useRef<boolean>(false);

  useEffect(() => {
    const MIN_REFRESH_INTERVAL = 5000; // 5 seconds minimum between refreshes
    
    const handleCacheInvalidated = () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
      
      console.log(`Cache invalidation event received, time since last refresh: ${timeSinceLastRefresh}ms`);
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      if (timeSinceLastRefresh > MIN_REFRESH_INTERVAL) {
        if (isMountedRef.current) {
          setRetryCount(prev => prev + 1);
          lastRefreshTimeRef.current = now;
        }
      } else {
        console.log("Debouncing refresh request");
        refreshTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setRetryCount(prev => prev + 1);
            lastRefreshTimeRef.current = Date.now();
          }
        }, MIN_REFRESH_INTERVAL - timeSinceLastRefresh);
      }
    };
    
    window.addEventListener('vehicle-cache-invalidated', handleCacheInvalidated);
    window.addEventListener('vehicle-data-cache-cleared', handleCacheInvalidated);
    window.addEventListener('vehicle-data-updated', handleCacheInvalidated);
    window.addEventListener('vehicle-data-refreshed', handleCacheInvalidated);
    
    isMountedRef.current = true;
    
    if (!initialLoadCompletedRef.current) {
      loadVehicles();
      initialLoadCompletedRef.current = true;
    }
    
    return () => {
      isMountedRef.current = false;
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      window.removeEventListener('vehicle-cache-invalidated', handleCacheInvalidated);
      window.removeEventListener('vehicle-data-cache-cleared', handleCacheInvalidated);
      window.removeEventListener('vehicle-data-updated', handleCacheInvalidated);
      window.removeEventListener('vehicle-data-refreshed', handleCacheInvalidated);
    };
  }, []);

  useEffect(() => {
    if (isMountedRef.current && initialLoadCompletedRef.current) {
      loadVehicles();
    }
  }, [retryCount]);

  const loadVehicles = async () => {
    if (isLoading || isRefreshing) return;
    
    try {
      setIsLoading(true);
      setHasError(false);
      console.log("Admin: Fetching all vehicles...");
      
      const fetchedVehicles = await getVehicleData(false, true);
      console.log(`Loaded ${fetchedVehicles.length} vehicles for admin view:`, fetchedVehicles);
      
      if (fetchedVehicles && Array.isArray(fetchedVehicles) && fetchedVehicles.length > 0) {
        const uniqueVehiclesMap = new Map<string, CabType>();
        
        fetchedVehicles.forEach(vehicle => {
          if (!uniqueVehiclesMap.has(vehicle.id)) {
            uniqueVehiclesMap.set(vehicle.id, vehicle);
          }
        });
        
        const uniqueVehicles = Array.from(uniqueVehiclesMap.values());
        console.log(`Filtered to ${uniqueVehicles.length} unique vehicles`);
        
        const validVehicles = uniqueVehicles.filter(v => v && v.id && v.name);
        
        if (isMountedRef.current) {
          setVehicles(validVehicles);
          lastRefreshTimeRef.current = Date.now();
        }
      } else if (retryCount < 3) {
        console.log("No vehicles returned, clearing cache and retrying...");
        clearVehicleDataCache();
        if (isMountedRef.current) {
          setRetryCount(prev => prev + 1);
        }
      } else {
        toast.error("Failed to load vehicles. Please try refreshing the page.");
        setHasError(true);
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      toast.error("Failed to load vehicles. Please try refreshing the page.");
      setHasError(true);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleRefreshData = async () => {
    if (isRefreshing || Date.now() - lastRefreshTimeRef.current < 5000) {
      toast.info("Please wait a moment before refreshing again");
      return;
    }
    
    try {
      setIsRefreshing(true);
      setHasError(false);
      
      clearVehicleDataCache();
      
      try {
        await syncVehicleData();
      } catch (syncError) {
        console.warn("Could not sync vehicle data:", syncError);
      }
      
      await loadVehicles();
      toast.success("Vehicle data refreshed successfully");
      lastRefreshTimeRef.current = Date.now();
    } catch (error) {
      console.error("Error refreshing vehicle data:", error);
      toast.error("Failed to refresh vehicle data");
      setHasError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddVehicle = (newVehicle: CabType) => {
    setVehicles((prev) => [...prev, newVehicle]);
    toast.success(`Vehicle ${newVehicle.name} added successfully`);
    
    setTimeout(() => {
      handleRefreshData();
    }, 1000);
  };

  const handleEditVehicle = (updatedVehicle: CabType) => {
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle
      )
    );
    toast.success(`Vehicle ${updatedVehicle.name} updated successfully`);
    
    setTimeout(() => {
      handleRefreshData();
    }, 1000);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== vehicleId));
    toast.success("Vehicle deleted successfully");
    
    setTimeout(() => {
      handleRefreshData();
    }, 1000);
  };

  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      ) : hasError ? (
        <div className="text-center py-10 border rounded-lg">
          <p className="text-gray-500 mb-4">Failed to load vehicles. Please try refreshing the data.</p>
          <Button onClick={handleRefreshData} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing..." : "Retry Loading Vehicles"}
          </Button>
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
