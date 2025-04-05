
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchLocalFares, fetchAirportFares, updateLocalFares, updateAirportFares, syncLocalFares, syncAirportFares } from '@/services/fareManagementService';
import { toast } from 'sonner';
import { Loader2, RotateCw, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isPreviewMode } from '@/utils/apiHelper';

interface FareManagementProps {
  vehicleId: string;
  fareType: 'local' | 'airport';
}

// Default values based on vehicle type
const getDefaultLocalFares = (vehicleId: string) => {
  const vehicleType = vehicleId.toLowerCase();
  
  if (vehicleType.includes('sedan') || vehicleType.includes('dzire') || vehicleType.includes('etios')) {
    return {
      vehicleId,
      price4hrs40km: 2000,
      price8hrs80km: 3500,
      price10hrs100km: 4500,
      priceExtraKm: 12,
      priceExtraHour: 150
    };
  } else if (vehicleType.includes('ertiga')) {
    return {
      vehicleId,
      price4hrs40km: 2500,
      price8hrs80km: 4000,
      price10hrs100km: 5000,
      priceExtraKm: 15,
      priceExtraHour: 200
    };
  } else if (vehicleType.includes('innova') || vehicleType.includes('crysta')) {
    return {
      vehicleId,
      price4hrs40km: 3000,
      price8hrs80km: 4800,
      price10hrs100km: 6000,
      priceExtraKm: 17,
      priceExtraHour: 250
    };
  } else if (vehicleType.includes('tempo')) {
    return {
      vehicleId,
      price4hrs40km: 4000,
      price8hrs80km: 6000,
      price10hrs100km: 8000,
      priceExtraKm: 20,
      priceExtraHour: 300
    };
  } else if (vehicleType.includes('luxury')) {
    return {
      vehicleId,
      price4hrs40km: 3500,
      price8hrs80km: 5500,
      price10hrs100km: 7000,
      priceExtraKm: 18,
      priceExtraHour: 300
    };
  } else {
    // Default values for unknown vehicle types
    return {
      vehicleId,
      price4hrs40km: 2500,
      price8hrs80km: 4000,
      price10hrs100km: 5000,
      priceExtraKm: 15,
      priceExtraHour: 200
    };
  }
};

// Default values for airport fares based on vehicle type
const getDefaultAirportFares = (vehicleId: string) => {
  const vehicleType = vehicleId.toLowerCase();
  
  if (vehicleType.includes('sedan') || vehicleType.includes('dzire') || vehicleType.includes('etios')) {
    return {
      vehicleId,
      basePrice: 3000,
      pricePerKm: 12,
      pickupPrice: 800,
      dropPrice: 800,
      tier1Price: 600,
      tier2Price: 800,
      tier3Price: 1000,
      tier4Price: 1200,
      extraKmCharge: 12,
      nightCharges: 250,
      extraWaitingCharges: 150
    };
  } else if (vehicleType.includes('ertiga')) {
    return {
      vehicleId,
      basePrice: 3500,
      pricePerKm: 15,
      pickupPrice: 1000,
      dropPrice: 1000,
      tier1Price: 800,
      tier2Price: 1000,
      tier3Price: 1200,
      tier4Price: 1400,
      extraKmCharge: 15,
      nightCharges: 300,
      extraWaitingCharges: 200
    };
  } else if (vehicleType.includes('innova') || vehicleType.includes('crysta')) {
    return {
      vehicleId,
      basePrice: 4000,
      pricePerKm: 17,
      pickupPrice: 1200,
      dropPrice: 1200,
      tier1Price: 1000,
      tier2Price: 1200,
      tier3Price: 1400,
      tier4Price: 1600,
      extraKmCharge: 17,
      nightCharges: 350,
      extraWaitingCharges: 250
    };
  } else if (vehicleType.includes('tempo')) {
    return {
      vehicleId,
      basePrice: 6000,
      pricePerKm: 19,
      pickupPrice: 2000,
      dropPrice: 2000,
      tier1Price: 1600,
      tier2Price: 1800,
      tier3Price: 2000,
      tier4Price: 2500,
      extraKmCharge: 19,
      nightCharges: 400,
      extraWaitingCharges: 300
    };
  } else if (vehicleType.includes('luxury')) {
    return {
      vehicleId,
      basePrice: 7000,
      pricePerKm: 22,
      pickupPrice: 2500,
      dropPrice: 2500,
      tier1Price: 2000,
      tier2Price: 2200,
      tier3Price: 2500,
      tier4Price: 3000,
      extraKmCharge: 22,
      nightCharges: 450,
      extraWaitingCharges: 350
    };
  } else {
    // Default values for unknown vehicle types
    return {
      vehicleId,
      basePrice: 3500,
      pricePerKm: 15,
      pickupPrice: 1000,
      dropPrice: 1000,
      tier1Price: 800,
      tier2Price: 1000,
      tier3Price: 1200,
      tier4Price: 1400,
      extraKmCharge: 15,
      nightCharges: 300,
      extraWaitingCharges: 200
    };
  }
};

export const FareManagement: React.FC<FareManagementProps> = ({ vehicleId, fareType }) => {
  const initialFormRef = useRef<Record<string, any> | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>(
    fareType === 'local' ? getDefaultLocalFares(vehicleId) : getDefaultAirportFares(vehicleId)
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);

  // Fetch fare data
  useEffect(() => {
    const fetchData = async () => {
      if (!vehicleId) {
        setError('No vehicle ID provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        let fetchedData: any = null;
        
        if (fareType === 'local') {
          try {
            const data = await fetchLocalFares(vehicleId);
            if (data && data.length > 0) {
              fetchedData = data[0];
              setIsMockData(false);
            }
          } catch (fetchError) {
            console.error('Error fetching local fares:', fetchError);
          }
          
          // If no data returned or error occurred, use default values
          if (!fetchedData) {
            console.log('Using default local fares for', vehicleId);
            fetchedData = getDefaultLocalFares(vehicleId);
            setIsMockData(true);
          }
        } else {
          try {
            const data = await fetchAirportFares(vehicleId);
            if (data && data.length > 0) {
              fetchedData = data[0];
              setIsMockData(false);
            }
          } catch (fetchError) {
            console.error('Error fetching airport fares:', fetchError);
          }
          
          // If no data returned or error occurred, use default values
          if (!fetchedData) {
            console.log('Using default airport fares for', vehicleId);
            fetchedData = getDefaultAirportFares(vehicleId);
            setIsMockData(true);
          }
        }
        
        // Ensure vehicleId is set
        fetchedData.vehicleId = vehicleId;
        
        // Update form values and initial form reference
        setFormValues(fetchedData);
        initialFormRef.current = { ...fetchedData };
        
        // Special handling for preview mode
        if (isPreviewMode()) {
          console.log('In preview mode, using default fare settings');
          if (!fetchedData.vehicle_id) {
            fetchedData.vehicle_id = vehicleId; // Ensure both ID formats exist
          }
        }
      } catch (err) {
        console.error(`Error fetching ${fareType} fares:`, err);
        setError(`Failed to fetch ${fareType} fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
        
        // Set default values as a fallback
        const defaultValues = fareType === 'local' 
          ? getDefaultLocalFares(vehicleId) 
          : getDefaultAirportFares(vehicleId);
        
        setFormValues(defaultValues);
        initialFormRef.current = { ...defaultValues };
        setIsMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vehicleId, fareType]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value);
    
    setFormValues(prev => ({
      ...prev,
      [name]: !isNaN(numValue) ? numValue : value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicleId) {
      toast.error('Vehicle ID is required');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      // Ensure form values have the vehicleId
      const submitData = {
        ...formValues,
        vehicleId
      };
      
      if (fareType === 'local') {
        await updateLocalFares(submitData);
        toast.success('Local fares updated successfully');
      } else {
        await updateAirportFares(submitData);
        toast.success('Airport fares updated successfully');
      }
      
      // Update initial form values reference to detect changes
      initialFormRef.current = { ...submitData };
    } catch (err) {
      console.error(`Error updating ${fareType} fares:`, err);
      setError(`Failed to update ${fareType} fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error(`Failed to update ${fareType} fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Handle sync tables
  const handleSyncTables = async () => {
    try {
      setSyncing(true);
      setError(null);
      
      if (fareType === 'local') {
        await syncLocalFares();
        toast.success('Local fares tables synced successfully');
      } else {
        await syncAirportFares();
        toast.success('Airport fares tables synced successfully');
      }
      
      // Refresh data after sync
      if (fareType === 'local') {
        const data = await fetchLocalFares(vehicleId);
        if (data && data.length > 0) {
          setFormValues(data[0]);
          initialFormRef.current = { ...data[0] };
          setIsMockData(false);
        }
      } else {
        const data = await fetchAirportFares(vehicleId);
        if (data && data.length > 0) {
          setFormValues(data[0]);
          initialFormRef.current = { ...data[0] };
          setIsMockData(false);
        }
      }
    } catch (err) {
      console.error(`Error syncing ${fareType} fares tables:`, err);
      setError(`Failed to sync ${fareType} fares tables: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error(`Failed to sync ${fareType} fares tables`);
    } finally {
      setSyncing(false);
    }
  };

  // Detect form has unsaved changes
  const hasChanges = () => {
    if (!initialFormRef.current) return false;
    
    for (const key in formValues) {
      if (
        formValues[key] !== initialFormRef.current[key] && 
        key !== 'updatedAt' && 
        key !== 'createdAt'
      ) {
        return true;
      }
    }
    
    return false;
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 pt-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {isMockData && (
            <Alert variant="warning" className="mb-4 bg-yellow-50 border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700">
                Using default values. Data hasn't been saved to the database yet.
              </AlertDescription>
            </Alert>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading fare data...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {fareType === 'local' ? (
                // Local fare fields
                <>
                  <div>
                    <Label htmlFor="price4hrs40km">4 Hours, 40 KM Package (₹)</Label>
                    <Input
                      id="price4hrs40km"
                      name="price4hrs40km"
                      type="number"
                      value={formValues.price4hrs40km || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price8hrs80km">8 Hours, 80 KM Package (₹)</Label>
                    <Input
                      id="price8hrs80km"
                      name="price8hrs80km"
                      type="number"
                      value={formValues.price8hrs80km || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price10hrs100km">10 Hours, 100 KM Package (₹)</Label>
                    <Input
                      id="price10hrs100km"
                      name="price10hrs100km"
                      type="number"
                      value={formValues.price10hrs100km || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceExtraKm">Extra KM Charge (₹)</Label>
                    <Input
                      id="priceExtraKm"
                      name="priceExtraKm"
                      type="number"
                      value={formValues.priceExtraKm || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceExtraHour">Extra Hour Charge (₹)</Label>
                    <Input
                      id="priceExtraHour"
                      name="priceExtraHour"
                      type="number"
                      value={formValues.priceExtraHour || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                // Airport fare fields
                <>
                  <div>
                    <Label htmlFor="basePrice">Base Price (₹)</Label>
                    <Input
                      id="basePrice"
                      name="basePrice"
                      type="number"
                      value={formValues.basePrice || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pricePerKm">Price per KM (₹)</Label>
                    <Input
                      id="pricePerKm"
                      name="pricePerKm"
                      type="number"
                      value={formValues.pricePerKm || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pickupPrice">Pickup Price (₹)</Label>
                    <Input
                      id="pickupPrice"
                      name="pickupPrice"
                      type="number"
                      value={formValues.pickupPrice || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dropPrice">Drop Price (₹)</Label>
                    <Input
                      id="dropPrice"
                      name="dropPrice"
                      type="number"
                      value={formValues.dropPrice || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tier1Price">Tier 1 Price (₹)</Label>
                    <Input
                      id="tier1Price"
                      name="tier1Price"
                      type="number"
                      value={formValues.tier1Price || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tier2Price">Tier 2 Price (₹)</Label>
                    <Input
                      id="tier2Price"
                      name="tier2Price"
                      type="number"
                      value={formValues.tier2Price || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tier3Price">Tier 3 Price (₹)</Label>
                    <Input
                      id="tier3Price"
                      name="tier3Price"
                      type="number"
                      value={formValues.tier3Price || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tier4Price">Tier 4 Price (₹)</Label>
                    <Input
                      id="tier4Price"
                      name="tier4Price"
                      type="number"
                      value={formValues.tier4Price || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="extraKmCharge">Extra KM Charge (₹)</Label>
                    <Input
                      id="extraKmCharge"
                      name="extraKmCharge"
                      type="number"
                      value={formValues.extraKmCharge || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nightCharges">Night Charges (₹)</Label>
                    <Input
                      id="nightCharges"
                      name="nightCharges"
                      type="number"
                      value={formValues.nightCharges || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="extraWaitingCharges">Extra Waiting Charges (₹)</Label>
                    <Input
                      id="extraWaitingCharges"
                      name="extraWaitingCharges"
                      type="number"
                      value={formValues.extraWaitingCharges || ''}
                      onChange={handleInputChange}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleSyncTables}
            disabled={syncing || loading || saving}
          >
            {syncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RotateCw className="h-4 w-4 mr-2" />
                Sync Tables
              </>
            )}
          </Button>
          <Button 
            type="submit" 
            disabled={saving || loading || syncing || !hasChanges()}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
