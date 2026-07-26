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

  const mountedRef = useRef(true);
  const isRefreshingRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);
  const lastEventTimeRef = useRef(0);
  /** Skip self-emitted cache/refresh events while we are loading */
  const ignoreDataEventsRef = useRef(false);

  const resetError = () => setError(null);

  const canRefresh = () => Date.now() - lastRefreshTimeRef.current > 2000 || lastRefreshTimeRef.current === 0;

  const loadVehiclesFromLocalStorage = useCallback(() => {
    try {
      const cachedVehiclesString =
        localStorage.getItem('cachedVehicles') || localStorage.getItem('localVehicles');
      if (cachedVehiclesString) {
        const cachedVehicles = JSON.parse(cachedVehiclesString);
        if (Array.isArray(cachedVehicles) && cachedVehicles.length > 0) {
          setVehicles(cachedVehicles);
          setIsLoading(false);
          return true;
        }
      }
    } catch (cacheError) {
      console.error('Error recovering from cache:', cacheError);
    }
    return false;
  }, []);

  const handleRefreshData = useCallback(
    async (forceRefresh = false, clearCache = false) => {
      if (isRefreshingRef.current) return;
      if (!forceRefresh && !canRefresh()) return;

      isRefreshingRef.current = true;
      ignoreDataEventsRef.current = true;
      lastRefreshTimeRef.current = Date.now();
      setIsRefreshing(true);
      setIsLoading(true);

      try {
        resetError();
        if (clearCache) {
          clearVehicleDataCache();
        }

        const fetchedVehicles = await getVehicleData(true, true);
        if (!mountedRef.current) return;

        if (fetchedVehicles && fetchedVehicles.length > 0) {
          setVehicles(fetchedVehicles);
          setOfflineMode(false);
          return;
        }

        try {
          const response = await fetch(
            `${apiBaseUrl}/api/vehicles-data.php?_t=${Date.now()}&includeInactive=true`,
            {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Admin-Mode': 'true',
              },
            },
          );
          const data = await response.json();
          if (!mountedRef.current) return;
          if (data?.vehicles?.length > 0) {
            setVehicles(data.vehicles);
            setOfflineMode(false);
            return;
          }
        } catch (alternativeError) {
          console.error('Alternative vehicle load failed:', alternativeError);
        }

        if (!loadVehiclesFromLocalStorage()) {
          toast.error('Failed to load vehicles. Please try fixing the database.');
        }
      } catch (apiError) {
        console.error('Error loading vehicles:', apiError);
        if (!mountedRef.current) return;
        if (loadVehiclesFromLocalStorage()) {
          toast.warning('Working in offline mode. Changes will be saved locally.');
          setOfflineMode(true);
        } else {
          setError(apiError as Error);
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
        isRefreshingRef.current = false;
        // Allow external events again after a short settle window
        window.setTimeout(() => {
          ignoreDataEventsRef.current = false;
        }, 1500);
      }
    },
    [loadVehiclesFromLocalStorage],
  );

  const checkDatabaseConnection = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/check-connection.php?_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Admin-Mode': 'true',
        },
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      return data.connection === true;
    } catch (error) {
      console.error('Error checking database connection:', error);
      return false;
    }
  };

  const fixDatabase = async () => {
    if (isFixingDb) return;
    const now = Date.now();
    if (now - lastEventTimeRef.current < 5000) return;
    lastEventTimeRef.current = now;
    setIsFixingDb(true);
    resetError();

    try {
      const isConnected = await checkDatabaseConnection();
      if (!isConnected) {
        toast.error('Database connection is unavailable. Attempting to fix...');
      }

      const success = await import('@/utils/apiHelper').then(({ fixDatabaseTables }) =>
        fixDatabaseTables(),
      );

      if (success) {
        toast.success('Database tables fixed successfully');
        await handleRefreshData(true, true);
      } else {
        toast.error('Failed to fix database tables');
        try {
          const fixResponse = await fetch(
            `${apiBaseUrl}/api/admin/fix-vehicle-tables.php?_t=${Date.now()}`,
            {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Admin-Mode': 'true',
              },
            },
          );
          if (fixResponse.ok) {
            toast.success('Database tables fixed successfully with alternative method');
            await handleRefreshData(true, true);
          } else {
            throw new Error('Alternative fix method failed');
          }
        } catch (altFixError) {
          console.error('Error with alternative fix:', altFixError);
          toast.error('All database fix attempts failed. Using offline mode.');
          setOfflineMode(true);
        }
      }
    } catch (error) {
      console.error('Error fixing database:', error);
      toast.error('Failed to fix database tables. Using offline mode.');
      if (loadVehiclesFromLocalStorage()) {
        toast.info('Loaded vehicles from local cache');
        setOfflineMode(true);
      } else {
        setError(error as Error);
      }
    } finally {
      setIsFixingDb(false);
    }
  };

  // Mount once — do not depend on isRefreshing / loadVehicles (that caused a refresh loop)
  useEffect(() => {
    mountedRef.current = true;
    void handleRefreshData(true, false);

    const handleDataEvent = (event: Event) => {
      if (!mountedRef.current || ignoreDataEventsRef.current || isRefreshingRef.current) return;
      // Ignore events we trigger ourselves via clear/refresh
      if (event.type === 'vehicle-data-cache-cleared' || event.type === 'vehicle-data-refreshed') {
        return;
      }
      const now = Date.now();
      if (now - lastEventTimeRef.current < 8000) return;
      lastEventTimeRef.current = now;
      void handleRefreshData(false, false);
    };

    window.addEventListener('vehicle-data-changed', handleDataEvent);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('vehicle-data-changed', handleDataEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only load; handleRefreshData is stable
  }, []);

  const handleAddVehicle = (newVehicle: CabType) => {
    setVehicles((prev) => [...prev, newVehicle]);
    window.setTimeout(() => {
      if (mountedRef.current) void handleRefreshData(true, false);
    }, 800);
  };

  const handleEditVehicle = (editedVehicle: CabType) => {
    setVehicles((prev) =>
      prev.map((vehicle) => (vehicle.id === editedVehicle.id ? { ...editedVehicle } : vehicle)),
    );
    setSelectedVehicle(null);
    window.setTimeout(() => {
      if (mountedRef.current) void handleRefreshData(true, true);
    }, 800);
  };

  const handleDeleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== id));
    window.setTimeout(() => {
      if (mountedRef.current) void handleRefreshData(true, true);
    }, 800);
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
    void handleRefreshData(true, true);
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
          onRetry={() => void handleRefreshData(true, false)}
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
