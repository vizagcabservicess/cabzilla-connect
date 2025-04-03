
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getApiUrl } from '@/config/api';
import { formatDataForMultipart, directVehicleOperation, isPreviewMode } from '@/utils/apiHelper';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FareManagementProps {
  vehicleId: string;
  fareType: 'local' | 'airport';
}

interface LocalFare {
  vehicleId: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
}

interface AirportFare {
  vehicleId: string;
  priceOneWay: number;
  priceRoundTrip: number;
  nightCharges: number;
  extraWaitingCharges: number;
}

type Fare = LocalFare | AirportFare;

export const FareManagement: React.FC<FareManagementProps> = ({ vehicleId, fareType }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [fare, setFare] = useState<Fare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadFareData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Use directVehicleOperation for consistent error handling
        const endpoint = fareType === 'local' 
          ? `api/admin/direct-local-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}` 
          : `api/admin/direct-airport-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`;
        
        try {
          const data = await directVehicleOperation(endpoint, 'GET');
          
          if (data.status === 'success' && data.fares && data.fares.length > 0) {
            setFare(data.fares[0]);
            console.log(`Loaded ${fareType} fare data:`, data.fares[0]);
            
            // Also save to localStorage for persistence
            try {
              const storageKey = `${fareType}_fares_${vehicleId}`;
              localStorage.setItem(storageKey, JSON.stringify(data.fares[0]));
            } catch (storageError) {
              console.error('Error saving fare data to localStorage:', storageError);
            }
          } else if (data.status === 'success' && (!data.fares || data.fares.length === 0)) {
            // Create default fare structure if none exists
            const defaultFare = createDefaultFare(vehicleId, fareType);
            setFare(defaultFare);
            console.log(`No ${fareType} fare found, using default:`, defaultFare);
          } else {
            throw new Error(data.message || `Failed to load ${fareType} fare data`);
          }
        } catch (err) {
          console.error(`Error loading ${fareType} fares with directVehicleOperation:`, err);
          
          // Try to load from localStorage
          const storageKey = `${fareType}_fares_${vehicleId}`;
          const storedFares = localStorage.getItem(storageKey);
          
          if (storedFares) {
            try {
              const parsedFares = JSON.parse(storedFares);
              console.log(`Using stored ${fareType} fares from localStorage:`, parsedFares);
              setFare(parsedFares);
            } catch (parseError) {
              console.error('Error parsing stored fares:', parseError);
              throw err; // Re-throw if parse fails
            }
          } else {
            // If in preview mode, use default fare structure
            if (isPreviewMode()) {
              console.log(`Using default ${fareType} fares in preview mode`);
              const defaultFare = createDefaultFare(vehicleId, fareType);
              setFare(defaultFare);
            } else {
              throw err; // Re-throw for non-preview environments
            }
          }
        }
        
      } catch (err) {
        console.error(`Error loading ${fareType} fares:`, err);
        setError(`Error loading ${fareType} fare data. Please try again.`);
        // Create default fare structure on error
        const defaultFare = createDefaultFare(vehicleId, fareType);
        setFare(defaultFare);
      } finally {
        setIsLoading(false);
      }
    };

    if (vehicleId) {
      loadFareData();
    }
  }, [vehicleId, fareType, retryCount]);

  const createDefaultFare = (vehicleId: string, type: 'local' | 'airport'): Fare => {
    // First check if we have values in localStorage
    const storageKey = `${type}_fares_${vehicleId}`;
    try {
      const storedFare = localStorage.getItem(storageKey);
      if (storedFare) {
        const parsedFare = JSON.parse(storedFare);
        if (parsedFare && typeof parsedFare === 'object') {
          return parsedFare;
        }
      }
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }
    
    // Default values based on vehicle type
    let baseValue = 0;
    
    switch (vehicleId) {
      case 'sedan':
        baseValue = 1500;
        break;
      case 'ertiga':
        baseValue = 1800;
        break;
      case 'innova_crysta':
        baseValue = 2200;
        break;
      case 'luxury':
        baseValue = 2600;
        break;
      case 'tempo_traveller':
      case 'tempo':
        baseValue = 3500;
        break;
      default:
        baseValue = 1500;
    }
    
    if (type === 'local') {
      return {
        vehicleId,
        price4hrs40km: Math.round(baseValue * 0.6),
        price8hrs80km: Math.round(baseValue),
        price10hrs100km: Math.round(baseValue * 1.2),
        priceExtraKm: Math.round(baseValue * 0.008),
        priceExtraHour: Math.round(baseValue * 0.1)
      } as LocalFare;
    } else {
      return {
        vehicleId,
        priceOneWay: baseValue,
        priceRoundTrip: Math.round(baseValue * 1.8),
        nightCharges: Math.round(baseValue * 0.2),
        extraWaitingCharges: Math.round(baseValue * 0.1)
      } as AirportFare;
    }
  };

  const handleChange = (field: string, value: string) => {
    if (!fare) return;
    
    const numericValue = parseFloat(value) || 0;
    
    setFare({
      ...fare,
      [field]: numericValue
    });
  };

  const handleSave = async () => {
    if (!fare || !vehicleId) return;
    
    try {
      setIsSaving(true);
      setError(null);

      // Use directVehicleOperation for consistent error handling
      const endpoint = fareType === 'local' 
        ? 'api/admin/local-fares-update.php'
        : 'api/admin/airport-fares-update.php';

      // Prepare data with all variant keys to ensure API compatibility
      const updateData = {
        ...fare,
        vehicleId: vehicleId,
        vehicle_id: vehicleId,
        // Add both camelCase and snake_case versions for all fields
        ...(fareType === 'local' ? {
          price_4hrs_40km: (fare as LocalFare).price4hrs40km,
          price_8hrs_80km: (fare as LocalFare).price8hrs80km,
          price_10hrs_100km: (fare as LocalFare).price10hrs100km,
          price_extra_km: (fare as LocalFare).priceExtraKm,
          price_extra_hour: (fare as LocalFare).priceExtraHour
        } : {
          price_one_way: (fare as AirportFare).priceOneWay,
          price_round_trip: (fare as AirportFare).priceRoundTrip,
          night_charges: (fare as AirportFare).nightCharges,
          extra_waiting_charges: (fare as AirportFare).extraWaitingCharges
        })
      };

      try {
        // Save in localStorage first for persistence
        const storageKey = `${fareType}_fares_${vehicleId}`;
        localStorage.setItem(storageKey, JSON.stringify(fare));
        
        // Try with directVehicleOperation for consistent error handling
        const result = await directVehicleOperation(endpoint, 'POST', updateData);
        
        if (result.status === 'success') {
          toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fare updated successfully`);
        } else {
          throw new Error(result.message || `Failed to save ${fareType} fare data`);
        }
      } catch (apiErr) {
        console.error(`Error with directVehicleOperation for ${fareType} fare:`, apiErr);
        
        // If in preview mode, simulate success
        if (isPreviewMode()) {
          console.log(`Simulating successful ${fareType} fare update in preview mode`);
          toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fare updated successfully (preview mode)`);
        } else {
          // For production, try the traditional approach as fallback
          const formData = formatDataForMultipart(updateData);
          
          const response = await fetch(getApiUrl(endpoint), {
            method: 'POST',
            body: formData,
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
              'X-Force-Refresh': 'true'
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to save ${fareType} fare data`);
          }

          const fallbackResult = await response.json();

          if (fallbackResult.status === 'success') {
            toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fare updated successfully`);
          } else {
            throw new Error(fallbackResult.message || `Failed to save ${fareType} fare data`);
          }
        }
      }
    } catch (err: any) {
      console.error(`Error saving ${fareType} fare:`, err);
      setError(`Error saving ${fareType} fare data: ${err.message}`);
      toast.error(`Failed to save ${fareType} fare data`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      setError(null);
      
      const endpoint = fareType === 'local' 
        ? 'api/admin/sync-local-fares.php' 
        : 'api/admin/sync-airport-fares.php';
      
      const result = await directVehicleOperation(endpoint, 'GET');
      
      if (result.status === 'success') {
        toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares synced successfully`);
        // Refresh the fare data after syncing
        setRetryCount(prev => prev + 1);
      } else {
        throw new Error(result.message || `Failed to sync ${fareType} fares`);
      }
    } catch (err: any) {
      console.error(`Error syncing ${fareType} fares:`, err);
      setError(`Error syncing ${fareType} fares: ${err.message}`);
      toast.error(`Failed to sync ${fareType} fares`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading {fareType} fare data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row justify-between items-center pb-2">
        <CardTitle>
          {fareType === 'local' ? 'Local Package Fares' : 'Airport Transfer Fares'}
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Syncing...
            </>
          ) : (
            'Sync Fares'
          )}
        </Button>
      </CardHeader>
      <CardContent className="p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex justify-between items-center">
              <div>{error}</div>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!vehicleId && (
          <Alert variant="warning" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a vehicle to manage its fares.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          {fareType === 'local' && fare && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price4hrs40km">4 Hours / 40 KM (₹)</Label>
                  <Input
                    id="price4hrs40km"
                    type="number"
                    value={(fare as LocalFare).price4hrs40km}
                    onChange={(e) => handleChange('price4hrs40km', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price8hrs80km">8 Hours / 80 KM (₹)</Label>
                  <Input
                    id="price8hrs80km"
                    type="number"
                    value={(fare as LocalFare).price8hrs80km}
                    onChange={(e) => handleChange('price8hrs80km', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price10hrs100km">10 Hours / 100 KM (₹)</Label>
                  <Input
                    id="price10hrs100km"
                    type="number"
                    value={(fare as LocalFare).price10hrs100km}
                    onChange={(e) => handleChange('price10hrs100km', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceExtraKm">Extra KM (₹)</Label>
                  <Input
                    id="priceExtraKm"
                    type="number"
                    value={(fare as LocalFare).priceExtraKm}
                    onChange={(e) => handleChange('priceExtraKm', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceExtraHour">Extra Hour (₹)</Label>
                  <Input
                    id="priceExtraHour"
                    type="number"
                    value={(fare as LocalFare).priceExtraHour}
                    onChange={(e) => handleChange('priceExtraHour', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </>
          )}

          {fareType === 'airport' && fare && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceOneWay">One Way (₹)</Label>
                  <Input
                    id="priceOneWay"
                    type="number"
                    value={(fare as AirportFare).priceOneWay}
                    onChange={(e) => handleChange('priceOneWay', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceRoundTrip">Round Trip (₹)</Label>
                  <Input
                    id="priceRoundTrip"
                    type="number"
                    value={(fare as AirportFare).priceRoundTrip}
                    onChange={(e) => handleChange('priceRoundTrip', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nightCharges">Night Charges (₹)</Label>
                  <Input
                    id="nightCharges"
                    type="number"
                    value={(fare as AirportFare).nightCharges}
                    onChange={(e) => handleChange('nightCharges', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extraWaitingCharges">Extra Waiting Charges (₹/hr)</Label>
                  <Input
                    id="extraWaitingCharges"
                    type="number"
                    value={(fare as AirportFare).extraWaitingCharges}
                    onChange={(e) => handleChange('extraWaitingCharges', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end mt-6">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Fare Details'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
