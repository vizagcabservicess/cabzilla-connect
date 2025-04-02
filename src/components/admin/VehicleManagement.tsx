import { useState, useEffect, useCallback, useRef } from 'react';
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
import { parseAmenities } from '@/utils/safeStringUtils';

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
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef<boolean>(true);
  const refreshCountRef = useRef<number>(0);
  const lastEventTimeRef = useRef<number>(0);
  const isDebouncingRef = useRef<boolean>(false);

  const resetError = () => setError(null);

  const canRefresh = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;
    return timeSinceLastRefresh > 5000 || lastRefreshTime === 0;
  }, [lastRefreshTime]);

  const debounce = useCallback((fn: Function, delay: number) => {
    if (isDebouncingRef.current) {
      return false;
    }
    
    isDebouncingRef.current = true;
    setTimeout(() => {
      if (mountedRef.current) {
        fn();
      }
      isDebouncingRef.current = false;
    }, delay);
    
    return true;
  }, []);

  const fixDatabase = async () => {
    if (isFixingDb) return; // Prevent duplicate calls
    
    const now = Date.now();
    if (now - lastEventTimeRef.current < 10000) {
      console.log('Fix database throttled');
      return;
    }
    
    lastEventTimeRef.current = now;
    setIsFixingDb(true);
    resetError();
    
    try {
      // Use the utility from apiHelper to ensure proper synchronization
      const success = await import('@/utils/apiHelper').then(({ fixDatabaseTables }) => 
        fixDatabaseTables()
      );
      
      if (success) {
        toast.success("Database tables fixed successfully");
        await handleRefreshData(true);
      } else {
        toast.error("Failed to fix database tables");
      }
    } catch (error) {
      console.error("Error fixing database:", error);
      toast.error("Failed to fix database tables. Using offline mode.");
      
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

  const handleRefreshData = useCallback(async (forceRefresh = false) => {
    if (isRefreshing || (!forceRefresh && !canRefresh())) {
      console.log("Refresh throttled, skipping...");
      return;
    }
    
    refreshCountRef.current += 1;
    if (refreshCountRef.current > 3 && !forceRefresh) {
      console.log(`Too many refreshes (${refreshCountRef.current}), cooling down...`);
      
      if (!refreshTimeoutRef.current) {
        refreshTimeoutRef.current = setTimeout(() => {
          refreshCountRef.current = 0;
          refreshTimeoutRef.current = null;
        }, 30000);
      }
      
      return;
    }
    
    setIsRefreshing(true);
    setLastRefreshTime(Date.now());
    
    try {
      resetError();
      console.log("Admin: Fetching all vehicles (forceRefresh=", forceRefresh, ")");
      
      try {
        // Use the utility from apiHelper for better refresh behavior
        const fetchedVehicles = await import('@/utils/apiHelper').then(({ forceVehicleDataRefresh }) => 
          forceVehicleDataRefresh()
        );
            
        if (fetchedVehicles && fetchedVehicles.length > 0) {
          console.log(`Loaded ${fetchedVehicles.length} vehicles for admin view:`, fetchedVehicles);
          setVehicles(fetchedVehicles);
          setOfflineMode(false);
        } else {
          console.log("No vehicles returned from API, trying localStorage");
          if (!loadVehiclesFromLocalStorage()) {
            toast.error("Failed to load vehicles. Please try refreshing the page.");
          }
        }
      } catch (apiError) {
        console.error("API error:", apiError);
        
        if (loadVehiclesFromLocalStorage()) {
          toast.warning("Working in offline mode. Changes will be saved locally.");
          setOfflineMode(true);
        } else {
          setError(apiError as Error);
        }
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      
      if (loadVehiclesFromLocalStorage()) {
        toast.warning("Working in offline mode. Changes will be saved locally.");
        setOfflineMode(true);
      } else {
        setError(error as Error);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [canRefresh]);

  const loadVehicles = useCallback((force = false) => {
    if (debounce(() => handleRefreshData(force), 300)) {
      console.log("Debounced vehicle data refresh");
    }
  }, [handleRefreshData, debounce]);

  useEffect(() => {
    mountedRef.current = true;
    const initialLoad = localStorage.getItem('initialVehicleLoad');
    
    if (!initialLoad) {
      loadVehicles(false);
      localStorage.setItem('initialVehicleLoad', 'true');
    } else {
      if (!loadVehiclesFromLocalStorage()) {
        loadVehicles(false);
      }
    }
    
    const handleDataEvent = (event: Event) => {
      const now = Date.now();
      const eventType = event.type;
      
      if (now - lastEventTimeRef.current < 10000) {
        console.log(`Event ${eventType} throttled (last event was ${(now - lastEventTimeRef.current) / 1000}s ago)`);
        return;
      }
      
      console.log(`Received ${eventType} event`);
      lastEventTimeRef.current = now;
      
      if (!isRefreshing && mountedRef.current) {
        debounce(() => loadVehicles(true), 500);
      }
    };
    
    const eventTypes = [
      'vehicle-data-changed',
      'vehicle-data-refreshed',
      'vehicle-data-cache-cleared'
    ];
    
    eventTypes.forEach(type => {
      window.addEventListener(type, handleDataEvent);
    });
    
    return () => {
      mountedRef.current = false;
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      eventTypes.forEach(type => {
        window.removeEventListener(type, handleDataEvent);
      });
    };
  }, [loadVehicles, debounce]);

  const handleAddVehicle = (newVehicle: CabType) => {
    setVehicles(prevVehicles => [...prevVehicles, newVehicle]);
  };

  const handleEditVehicle = (editedVehicle: CabType) => {
    setVehicles(prevVehicles =>
      prevVehicles.map(vehicle =>
        vehicle.id === editedVehicle.id ? { ...editedVehicle } : vehicle
      )
    );
    setSelectedVehicle(null);
  };

  const handleDeleteVehicle = (id: string) => {
    setVehicles(prevVehicles => prevVehicles.filter(vehicle => vehicle.id !== id));
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    if (!searchQuery.trim()) return true;
    
    const searchTerms = searchQuery.toLowerCase().split(' ').filter(Boolean);
    if (!searchTerms.length) return true;
    
    const vehicleText = [
      vehicle.id,
      vehicle.name,
      vehicle.description
    ].filter(Boolean).join(' ').toLowerCase();
    
    return searchTerms.every(term => vehicleText.includes(term));
  });

  const handleRefreshButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    handleRefreshData(true);
  };

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
            onClick={handleRefreshButtonClick}
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
