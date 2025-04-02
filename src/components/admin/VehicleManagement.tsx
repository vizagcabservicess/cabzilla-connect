
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

export default function VehicleManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFixingDb, setIsFixingDb] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<CabType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  // Reset error state when needed
  const resetError = () => setError(null);

  // Throttle refreshes to prevent rapid reloads
  const canRefresh = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;
    return timeSinceLastRefresh > 2000 || lastRefreshTime === 0;
  }, [lastRefreshTime]);

  const fixDatabase = async () => {
    if (isFixingDb) return; // Prevent duplicate calls
    
    setIsFixingDb(true);
    resetError();
    
    try {
      // Try direct API call without CORS proxy
      const response = await fetch(`${apiBaseUrl}/api/admin/fix-vehicle-tables.php`, {
        method: 'GET',
        credentials: 'omit',
        mode: 'cors',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Database fix failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        toast.success("Database tables fixed successfully");
        await handleRefreshData();
      } else {
        toast.error("Failed to fix database tables: " + (data.message || "Unknown error"));
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

  const loadVehicles = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && !canRefresh()) {
      console.log("Refresh throttled, skipping...");
      return;
    }

    try {
      setIsLoading(true);
      resetError();
      setLastRefreshTime(Date.now());
      console.log("Admin: Fetching all vehicles...");
      
      // Always try online mode first
      try {
        console.log("Requesting vehicles with forceRefresh=", forceRefresh);
        const fetchedVehicles = await getVehicleData(forceRefresh, true);
        console.log(`Loaded ${fetchedVehicles.length} vehicles for admin view:`, fetchedVehicles);
        
        if (fetchedVehicles && fetchedVehicles.length > 0) {
          const deduplicatedVehicles: Record<string, CabType> = {};
          
          fetchedVehicles.forEach(vehicle => {
            const normalizedId = String(vehicle.id || vehicle.vehicleId || '').trim();
            if (!normalizedId) return;
            
            // Create normalized vehicle object
            const normalizedVehicle: CabType = {
              ...vehicle,
              id: normalizedId,
              vehicleId: normalizedId,
              description: vehicle.description || '',
              isActive: vehicle.isActive === false ? false : true,
              capacity: Number(vehicle.capacity || 4),
              luggageCapacity: Number(vehicle.luggageCapacity || 2),
              price: Number(vehicle.price || vehicle.basePrice || 0), 
              basePrice: Number(vehicle.basePrice || vehicle.price || 0),
              pricePerKm: Number(vehicle.pricePerKm || 0),
              amenities: Array.isArray(vehicle.amenities) 
                ? vehicle.amenities 
                : (typeof vehicle.amenities === 'string' && vehicle.amenities 
                  ? vehicle.amenities.split(',').map(a => a.trim()) 
                  : ['AC']),
              nightHaltCharge: Number(vehicle.nightHaltCharge || 700),
              driverAllowance: Number(vehicle.driverAllowance || 300)
            };
            
            // Log numeric values to help debug
            console.log(`Vehicle ${normalizedId} numeric fields:`, {
              capacity: normalizedVehicle.capacity,
              luggageCapacity: normalizedVehicle.luggageCapacity,
              basePrice: normalizedVehicle.basePrice,
              pricePerKm: normalizedVehicle.pricePerKm
            });
            
            // Handle duplicates by merging properties
            if (deduplicatedVehicles[normalizedId]) {
              const existing = deduplicatedVehicles[normalizedId];
              
              deduplicatedVehicles[normalizedId] = {
                ...existing,
                ...normalizedVehicle,
                description: normalizedVehicle.description || existing.description || '',
                name: normalizedVehicle.name || existing.name || '',
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
        } else {
          // No vehicles returned, try loading from localStorage
          console.log("No vehicles returned from API, trying localStorage");
          if (!loadVehiclesFromLocalStorage()) {
            toast.error("Failed to load vehicles. Please try refreshing the page.");
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
  }, [canRefresh]);

  useEffect(() => {
    loadVehicles(false);
    
    const handleVehicleDataUpdated = () => {
      console.log("Vehicle data updated event received");
      // Use a timeout to prevent multiple refreshes at once
      setTimeout(() => loadVehicles(true), 500);
    };
    
    // Setup event listeners
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
    if (isRefreshing || !canRefresh()) return;
    
    try {
      setIsRefreshing(true);
      resetError();
      clearVehicleDataCache();
      await loadVehicles(true);
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
    // Update local state immediately
    if (!vehicles.some(v => v.id === newVehicle.id)) {
      setVehicles((prev) => [...prev, newVehicle]);
    }
    toast.success(`Vehicle ${newVehicle.name} added successfully`);
    
    // Refresh data after a delay to fetch the latest data from server
    setTimeout(() => {
      clearVehicleDataCache();
      loadVehicles(true);
    }, 1000);
  };

  const handleEditVehicle = (updatedVehicle: CabType) => {
    console.log("Handling edit vehicle callback with data:", updatedVehicle);
    
    // Update local state immediately
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === updatedVehicle.id ? {
          ...updatedVehicle,
          // Ensure numeric fields are preserved
          capacity: Number(updatedVehicle.capacity || 4),
          luggageCapacity: Number(updatedVehicle.luggageCapacity || 2),
          basePrice: Number(updatedVehicle.basePrice || updatedVehicle.price || 0),
          price: Number(updatedVehicle.price || updatedVehicle.basePrice || 0),
          pricePerKm: Number(updatedVehicle.pricePerKm || 0)
        } : vehicle
      )
    );
    
    toast.success(`Vehicle ${updatedVehicle.name} updated successfully`);
    setSelectedVehicle(null);
    
    // Refresh data after a delay to fetch the latest data from server
    setTimeout(() => {
      clearVehicleDataCache();
      loadVehicles(true);
    }, 1500);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    // Update local state immediately
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== vehicleId));
    toast.success("Vehicle deleted successfully");
    
    // Refresh data after a delay to fetch the latest data from server
    setTimeout(() => {
      clearVehicleDataCache();
      loadVehicles(true);
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
            disabled={isRefreshing || !canRefresh()}
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
                // Create a deep copy to prevent direct state mutation
                setSelectedVehicle(JSON.parse(JSON.stringify(vehicle)));
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
