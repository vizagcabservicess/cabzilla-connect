
import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Wrench, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { VehicleCard } from "./VehicleCard";
import { CabType } from "@/types/cab";
import { AddVehicleDialog } from "./AddVehicleDialog";
import { EditVehicleDialog } from "./EditVehicleDialog";
import { getVehicleData, clearVehicleDataCache } from "@/services/vehicleDataService";
import { Skeleton } from "@/components/ui/skeleton";
import { apiBaseUrl } from '@/config/api';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { fixDatabaseTables } from '@/utils/apiHelper';

export default function VehicleManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFixingDb, setIsFixingDb] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<CabType | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);

  // Reset error state when needed
  const resetError = () => setError(null);

  const fixDatabase = async () => {
    setIsFixingDb(true);
    resetError();
    
    try {
      // Use the helper function from apiHelper for more robust error handling
      const result = await fixDatabaseTables();
      
      if (result) {
        toast.success("Database tables fixed successfully");
        await handleRefreshData();
      } else {
        toast.error("Failed to fix database tables");
        
        // Try recovering from local storage
        if (loadVehiclesFromLocalStorage()) {
          toast.info("Loaded vehicles from local cache");
          setOfflineMode(true);
        }
      }
    } catch (error) {
      console.error("Error fixing database:", error);
      toast.error("Failed to fix database tables. Using offline mode.");
      
      // Attempt to load vehicles from cache even if DB fix failed
      try {
        loadVehiclesFromLocalStorage();
        toast.info("Loaded vehicles from local cache");
        setOfflineMode(true);
      } catch (cacheError) {
        setError(error as Error);
      }
    } finally {
      setIsFixingDb(false);
    }
  };

  const loadVehiclesFromLocalStorage = () => {
    try {
      const cachedVehiclesString = localStorage.getItem('cachedVehicles') || localStorage.getItem('localVehicles');
      if (cachedVehiclesString) {
        const cachedVehicles = JSON.parse(cachedVehiclesString);
        if (Array.isArray(cachedVehicles) && cachedVehicles.length > 0) {
          console.log("Recovered vehicles from localStorage cache");
          setVehicles(cachedVehicles);
          setIsLoading(false);
          return true;
        }
      }
    } catch (cacheError) {
      console.error("Error recovering from cache:", cacheError);
    }
    return false;
  };

  const loadVehicles = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTime < 1000 && lastRefreshTime !== 0) {
      console.log("Refresh throttled, skipping...");
      return;
    }

    try {
      setIsLoading(true);
      resetError();
      setLastRefreshTime(now);
      console.log("Admin: Fetching all vehicles...");
      
      // Always try online mode first
      try {
        // CRITICAL: Force fresh data by explicitly setting forceRefresh to true
        const fetchedVehicles = await getVehicleData(true, true);
        console.log(`Loaded ${fetchedVehicles.length} vehicles for admin view:`, fetchedVehicles);
        
        if (fetchedVehicles && fetchedVehicles.length > 0) {
          const deduplicatedVehicles: Record<string, CabType> = {};
          
          fetchedVehicles.forEach(vehicle => {
            const normalizedId = String(vehicle.id || vehicle.vehicleId || '').trim();
            if (!normalizedId) return;
            
            // Create normalized vehicle object with explicit numeric conversions
            const normalizedVehicle: CabType = {
              ...vehicle,
              id: normalizedId,
              vehicleId: normalizedId,
              description: vehicle.description || '',
              isActive: vehicle.isActive === false ? false : true,
              // CRITICAL FIX: Ensure capacity values are numbers
              capacity: Number(vehicle.capacity || 4),
              luggageCapacity: Number(vehicle.luggageCapacity || 2),
              price: Number(vehicle.price || vehicle.basePrice || 0), 
              pricePerKm: Number(vehicle.pricePerKm || 0),
              amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
              nightHaltCharge: Number(vehicle.nightHaltCharge || 700),
              driverAllowance: Number(vehicle.driverAllowance || 300)
            };
            
            // Handle duplicates by merging properties
            if (deduplicatedVehicles[normalizedId]) {
              const existing = deduplicatedVehicles[normalizedId];
              
              deduplicatedVehicles[normalizedId] = {
                ...existing,
                ...normalizedVehicle,
                description: normalizedVehicle.description || existing.description || '',
                name: normalizedVehicle.name || existing.name || '',
                // Preserve numeric values
                capacity: normalizedVehicle.capacity || existing.capacity || 4,
                luggageCapacity: normalizedVehicle.luggageCapacity || existing.luggageCapacity || 2,
                nightHaltCharge: normalizedVehicle.nightHaltCharge || existing.nightHaltCharge || 700,
                driverAllowance: normalizedVehicle.driverAllowance || existing.driverAllowance || 300
              };
            } else {
              deduplicatedVehicles[normalizedId] = normalizedVehicle;
            }
          });
          
          const uniqueVehicles = Object.values(deduplicatedVehicles);
          
          console.log(`Deduplicated to ${uniqueVehicles.length} unique vehicles`);
          setVehicles(uniqueVehicles);
          setOfflineMode(false);
          
          // Cache the results
          try {
            localStorage.setItem('cachedVehicles', JSON.stringify(uniqueVehicles));
            localStorage.setItem('localVehicles', JSON.stringify(uniqueVehicles));
          } catch (cacheError) {
            console.error("Error caching vehicles:", cacheError);
          }
        } else if (retryCount < 2) {
          console.log("No vehicles returned, clearing cache and retrying...");
          clearVehicleDataCache();
          setRetryCount(prev => prev + 1);
          setTimeout(() => loadVehicles(), 800);
        } else {
          console.log("Multiple retries failed, attempting to load from localStorage");
          if (!loadVehiclesFromLocalStorage()) {
            toast.error("Failed to load vehicles. Please try refreshing the page.");
            setOfflineMode(true);
          }
        }
      } catch (apiError) {
        console.error("API error:", apiError);
        
        // Try loading from localStorage as a fallback
        if (loadVehiclesFromLocalStorage()) {
          toast.warning("Working in offline mode. Changes will be saved locally.");
          setOfflineMode(true);
        } else {
          setError(apiError as Error);
        }
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      
      // Try loading from localStorage as a fallback
      if (loadVehiclesFromLocalStorage()) {
        toast.warning("Working in offline mode. Changes will be saved locally.");
        setOfflineMode(true);
      } else {
        setError(error as Error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [retryCount, lastRefreshTime]);

  useEffect(() => {
    loadVehicles();
    
    const handleVehicleDataUpdated = () => {
      console.log("Vehicle data updated event received");
      setTimeout(() => loadVehicles(), 500);
    };
    
    // Setup event listeners with correct names
    window.addEventListener('vehicle-data-updated', handleVehicleDataUpdated);
    window.addEventListener('vehicle-data-refreshed', handleVehicleDataUpdated);
    window.addEventListener('vehicle-data-changed', handleVehicleDataUpdated);
    window.addEventListener('vehicle-data-cache-cleared', handleVehicleDataUpdated);
    
    // Network status change handler
    const handleOnline = () => {
      console.log("Network back online, refreshing data");
      if (offlineMode) {
        toast.info("Network connection restored, refreshing data");
        handleRefreshData();
      }
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('vehicle-data-updated', handleVehicleDataUpdated);
      window.removeEventListener('vehicle-data-refreshed', handleVehicleDataUpdated);
      window.removeEventListener('vehicle-data-changed', handleVehicleDataUpdated);
      window.removeEventListener('vehicle-data-cache-cleared', handleVehicleDataUpdated);
      window.removeEventListener('online', handleOnline);
    };
  }, [loadVehicles, offlineMode]);

  const handleRefreshData = async () => {
    try {
      setIsRefreshing(true);
      resetError();
      
      // CRITICAL FIX: Force a hard cache clear
      localStorage.removeItem('cachedVehicles');
      localStorage.removeItem('localVehicles');
      clearVehicleDataCache();
      
      await loadVehicles();
      toast.success("Vehicle data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing vehicle data:", error);
      toast.error("Failed to refresh vehicle data. Trying offline mode.");
      
      // Try loading from localStorage as a fallback
      if (loadVehiclesFromLocalStorage()) {
        setOfflineMode(true);
      } else {
        setError(error as Error);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddVehicle = (newVehicle: CabType) => {
    if (!vehicles.some(v => v.id === newVehicle.id)) {
      setVehicles((prev) => [...prev, newVehicle]);
    }
    toast.success(`Vehicle ${newVehicle.name} added successfully`);
    
    // Force a complete refresh to ensure data consistency
    setTimeout(() => {
      clearVehicleDataCache();
      loadVehicles();
    }, 1000);
  };

  const handleEditVehicle = (updatedVehicle: CabType) => {
    console.log("Handling edit vehicle callback with data:", updatedVehicle);
    
    // Explicitly ensure numeric values
    const parsedCapacity = parseInt(String(updatedVehicle.capacity), 10);
    const parsedLuggageCapacity = parseInt(String(updatedVehicle.luggageCapacity), 10);
    
    const normalizedVehicle = {
      ...updatedVehicle,
      capacity: isNaN(parsedCapacity) ? 4 : parsedCapacity,
      luggageCapacity: isNaN(parsedLuggageCapacity) ? 2 : parsedLuggageCapacity
    };
    
    // Update local state immediately for UI responsiveness
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === normalizedVehicle.id ? normalizedVehicle : vehicle
      )
    );
    
    toast.success(`Vehicle ${updatedVehicle.name} updated successfully`);
    
    setSelectedVehicle(null);
    
    // Force a complete refresh after update
    setTimeout(() => {
      clearVehicleDataCache();
      loadVehicles();
    }, 1000);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== vehicleId));
    toast.success("Vehicle deleted successfully");
    
    // Force a complete refresh after delete
    setTimeout(() => {
      clearVehicleDataCache();
      loadVehicles();
    }, 1000);
  };

  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (vehicle.description && vehicle.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // If there's an error, show the error fallback
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Vehicle Management</h2>
          <Button 
            variant="default" 
            onClick={resetError}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
        
        <ApiErrorFallback 
          error={error} 
          resetErrorBoundary={resetError}
          onRetry={handleRefreshData}
          title="Vehicle Data Error"
          description="Could not connect to the vehicle data API. Working in offline mode."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          Vehicle Management
          {offlineMode && <span className="ml-2 text-sm bg-amber-100 text-amber-800 rounded px-2 py-1">Offline Mode</span>}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fixDatabase}
            disabled={isFixingDb}
            className="flex items-center gap-2"
          >
            {isFixingDb ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Fixing Database...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4" />
                Fix Database
              </>
            )}
          </Button>
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
                console.log("Selected vehicle for editing:", vehicle);
                setSelectedVehicle({...vehicle});
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
