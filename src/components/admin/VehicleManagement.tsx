
import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Plus, RefreshCw, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { VehicleCard } from "./VehicleCard";
import { CabType } from "@/types/cab";
import { AddVehicleDialog } from "./AddVehicleDialog";
import { EditVehicleDialog } from "./EditVehicleDialog";
import { getVehicleData, clearVehicleDataCache } from "@/services/vehicleDataService";
import { Skeleton } from "@/components/ui/skeleton";
import { apiBaseUrl, getApiUrl } from '@/config/api';

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

  const fixDatabase = async () => {
    setIsFixingDb(true);
    
    try {
      const response = await fetch(getApiUrl('/api/admin/fix-vehicle-tables.php'));
      const data = await response.json();
      
      if (data.status === 'success') {
        toast.success("Database tables fixed successfully");
        await handleRefreshData();
      } else {
        toast.error("Failed to fix database tables: " + (data.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error fixing database:", error);
      toast.error("Failed to fix database tables. Please check server logs.");
    } finally {
      setIsFixingDb(false);
    }
  };

  const loadVehicles = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshTime < 1000 && lastRefreshTime !== 0) {
      console.log("Refresh throttled, skipping...");
      return;
    }

    try {
      setIsLoading(true);
      setLastRefreshTime(now);
      console.log("Admin: Fetching all vehicles...");
      
      const fetchedVehicles = await getVehicleData(true, true);
      console.log(`Loaded ${fetchedVehicles.length} vehicles for admin view:`, fetchedVehicles);
      
      if (fetchedVehicles && fetchedVehicles.length > 0) {
        const deduplicatedVehicles: Record<string, CabType> = {};
        
        fetchedVehicles.forEach(vehicle => {
          const normalizedId = String(vehicle.id || vehicle.vehicleId || '').trim();
          if (!normalizedId) return;
          
          const normalizedVehicle: CabType = {
            ...vehicle,
            id: normalizedId,
            vehicleId: normalizedId,
            description: vehicle.description || '',
            isActive: vehicle.isActive === false ? false : true,
            capacity: Number(vehicle.capacity || 4),
            luggageCapacity: Number(vehicle.luggageCapacity || 2),
            price: Number(vehicle.price || vehicle.basePrice || 0), 
            pricePerKm: Number(vehicle.pricePerKm || 0),
            amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : ['AC'],
            nightHaltCharge: Number(vehicle.nightHaltCharge || 700),
            driverAllowance: Number(vehicle.driverAllowance || 300)
          };
          
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
      } else if (retryCount < 3) {
        console.log("No vehicles returned, clearing cache and retrying...");
        clearVehicleDataCache();
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadVehicles(), 800);
      } else {
        toast.error("Failed to load vehicles. Please try refreshing the page.");
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
      toast.error("Failed to load vehicles. Please try refreshing the page.");
      
      try {
        const cachedVehiclesString = localStorage.getItem('cachedVehicles');
        if (cachedVehiclesString) {
          const cachedVehicles = JSON.parse(cachedVehiclesString);
          if (Array.isArray(cachedVehicles) && cachedVehicles.length > 0) {
            console.log("Recovered vehicles from localStorage cache");
            setVehicles(cachedVehicles);
          }
        }
      } catch (cacheError) {
        console.error("Error recovering from cache:", cacheError);
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
    if (!vehicles.some(v => v.id === newVehicle.id)) {
      setVehicles((prev) => [...prev, newVehicle]);
    }
    toast.success(`Vehicle ${newVehicle.name} added successfully`);
    
    setTimeout(() => {
      clearVehicleDataCache();
      loadVehicles();
    }, 1000);
  };

  const handleEditVehicle = (updatedVehicle: CabType) => {
    console.log("Handling edit vehicle callback with data:", updatedVehicle);
    
    setVehicles((prev) =>
      prev.map((vehicle) =>
        vehicle.id === updatedVehicle.id ? {
          ...vehicle,
          ...updatedVehicle,
          description: updatedVehicle.description 
        } : vehicle
      )
    );
    
    toast.success(`Vehicle ${updatedVehicle.name} updated successfully`);
    
    setSelectedVehicle(null);
    
    setTimeout(() => {
      clearVehicleDataCache();
      loadVehicles();
    }, 1500);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    setVehicles((prev) => prev.filter((vehicle) => vehicle.id !== vehicleId));
    toast.success("Vehicle deleted successfully");
    
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

  // The duplicate fixDatabase function was removed here

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Vehicle Management</h2>
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
