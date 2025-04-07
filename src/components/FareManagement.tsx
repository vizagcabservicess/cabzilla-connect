
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Save, RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';
import { DatabaseConnectionError } from './DatabaseConnectionError';
import { updateOutstationFares, updateLocalFares, updateAirportFares, syncAirportFares } from '@/services/fareUpdateService';
import { directVehicleOperation } from '@/utils/apiHelper';

interface FareManagementProps {
  vehicleId: string;
  fareType: 'local' | 'outstation' | 'airport';
}

export const FareManagement: React.FC<FareManagementProps> = ({ vehicleId, fareType }) => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [formState, setFormState] = useState<Record<string, any>>({});
  
  const fetchFareData = useCallback(async () => {
    if (!vehicleId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '';
      
      switch (fareType) {
        case 'local':
          endpoint = `/api/admin/direct-local-fares.php?id=${vehicleId}&_t=${Date.now()}`;
          break;
        case 'outstation':
          endpoint = `/api/admin/direct-outstation-fares.php?id=${vehicleId}&_t=${Date.now()}`;
          break;
        case 'airport':
          endpoint = `/api/admin/direct-airport-fares.php?id=${vehicleId}&_t=${Date.now()}`;
          break;
      }
      
      console.log(`Fetching ${fareType} fares for vehicle ${vehicleId} from ${endpoint}`);
      
      const response = await directVehicleOperation(endpoint, 'GET', {
        headers: {
          'X-Admin-Mode': 'true',
          'X-Debug': 'true',
          'X-Force-Creation': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      console.log(`${fareType} fare data:`, response);
      
      if (response && (response.fare || response.fares)) {
        const fareData = response.fare || (Array.isArray(response.fares) ? response.fares.find((f: any) => f.vehicleId === vehicleId || f.vehicle_id === vehicleId) : null);
        
        if (fareData) {
          setFormState(fareData);
        } else if (fareType === 'airport') {
          // If no airport fare data, try to sync and then fetch again
          await handleSyncAirportFares();
        }
      } else if (fareType === 'airport') {
        // If response is empty for airport fares, try to sync
        await handleSyncAirportFares();
      }
    } catch (err: any) {
      console.error(`Error fetching ${fareType} fares:`, err);
      setError(err instanceof Error ? err : new Error(err.message || 'Unknown error'));
      
      if (fareType === 'airport') {
        // If error fetching airport fares, try to sync
        await handleSyncAirportFares();
      }
    } finally {
      setLoading(false);
    }
  }, [vehicleId, fareType]);
  
  useEffect(() => {
    if (vehicleId) {
      fetchFareData();
    }
  }, [vehicleId, fetchFareData]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value === '' ? '' : Number(value)
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicleId) {
      toast.error('Vehicle ID is required');
      return;
    }
    
    setLoading(true);
    
    try {
      switch (fareType) {
        case 'local': {
          // Handle local fare update
          const extraKmRate = Number(formState.extraKmRate || formState.price_extra_km || 0);
          const extraHourRate = Number(formState.extraHourRate || formState.price_extra_hour || 0);
          
          const packages = [
            {
              hours: 4,
              km: 40,
              price: Number(formState.package4hrs40km || formState.price_4hrs_40km || 0)
            },
            {
              hours: 8,
              km: 80,
              price: Number(formState.package8hrs80km || formState.price_8hrs_80km || 0)
            },
            {
              hours: 10,
              km: 100,
              price: Number(formState.package10hrs100km || formState.price_10hrs_100km || 0)
            }
          ];
          
          await updateLocalFares(vehicleId, extraKmRate, extraHourRate, packages);
          break;
        }
        
        case 'outstation': {
          // Handle outstation fare update
          const basePrice = Number(formState.basePrice || formState.base_price || 0);
          const pricePerKm = Number(formState.pricePerKm || formState.price_per_km || 0);
          const roundTripBasePrice = Number(formState.roundTripBasePrice || formState.round_trip_base_price || basePrice);
          const roundTripPricePerKm = Number(formState.roundTripPricePerKm || formState.round_trip_price_per_km || pricePerKm);
          const driverAllowance = Number(formState.driverAllowance || formState.driver_allowance || 300);
          const nightHaltCharge = Number(formState.nightHaltCharge || formState.night_halt_charge || 700);
          
          await updateOutstationFares(vehicleId, basePrice, pricePerKm, roundTripBasePrice, roundTripPricePerKm, driverAllowance, nightHaltCharge);
          break;
        }
        
        case 'airport': {
          // Handle airport fare update
          const updatedFormState = {
            ...formState,
            vehicleId,
            vehicle_id: vehicleId,
            basePrice: Number(formState.basePrice || formState.base_price || 0),
            pricePerKm: Number(formState.pricePerKm || formState.price_per_km || 0),
            pickupPrice: Number(formState.pickupPrice || formState.pickup_price || 0),
            dropPrice: Number(formState.dropPrice || formState.drop_price || 0),
            tier1Price: Number(formState.tier1Price || formState.tier1_price || 0),
            tier2Price: Number(formState.tier2Price || formState.tier2_price || 0),
            tier3Price: Number(formState.tier3Price || formState.tier3_price || 0),
            tier4Price: Number(formState.tier4Price || formState.tier4_price || 0),
            extraKmCharge: Number(formState.extraKmCharge || formState.extra_km_charge || 0),
            nightCharges: Number(formState.nightCharges || formState.night_charges || 0),
            extraWaitingCharges: Number(formState.extraWaitingCharges || formState.extra_waiting_charges || 0)
          };
          
          await updateAirportFares(vehicleId, updatedFormState);
          break;
        }
      }
      
      toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares updated successfully`);
      
      // Refresh the data to get the latest values
      await fetchFareData();
    } catch (err: any) {
      console.error(`Error updating ${fareType} fares:`, err);
      toast.error(`Failed to update ${fareType} fares: ${err.message}`);
      setError(err instanceof Error ? err : new Error(err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleSyncAirportFares = async () => {
    if (fareType !== 'airport') return;
    
    setSyncing(true);
    try {
      toast.info('Syncing airport fares data...');
      const success = await syncAirportFares(true);
      
      if (success) {
        toast.success('Airport fares synced successfully');
        // Fetch the latest data after sync
        await fetchFareData();
      } else {
        toast.error('Failed to sync airport fares');
      }
    } catch (err: any) {
      console.error('Error syncing airport fares:', err);
      toast.error(`Error syncing airport fares: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };
  
  if (error) {
    return (
      <DatabaseConnectionError 
        error={error} 
        onRetry={fetchFareData}
        title={`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} Fare Data Error`}
        description={`There was an error loading the ${fareType} fare data. Please check your database connection.`}
      />
    );
  }
  
  if (!vehicleId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Vehicle Selected</AlertTitle>
        <AlertDescription>
          Please select a vehicle to manage fares.
        </AlertDescription>
      </Alert>
    );
  }

  // Render forms based on fare type
  const renderForm = () => {
    switch (fareType) {
      case 'airport':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (₹)</Label>
                <Input
                  id="basePrice"
                  name="basePrice"
                  type="number"
                  value={formState.basePrice || formState.base_price || ''}
                  onChange={handleChange}
                  placeholder="Base price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pricePerKm">Price Per KM (₹)</Label>
                <Input
                  id="pricePerKm"
                  name="pricePerKm"
                  type="number"
                  value={formState.pricePerKm || formState.price_per_km || ''}
                  onChange={handleChange}
                  placeholder="Price per KM"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pickupPrice">Pickup Price (₹)</Label>
                <Input
                  id="pickupPrice"
                  name="pickupPrice"
                  type="number"
                  value={formState.pickupPrice || formState.pickup_price || ''}
                  onChange={handleChange}
                  placeholder="Pickup price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dropPrice">Drop Price (₹)</Label>
                <Input
                  id="dropPrice"
                  name="dropPrice"
                  type="number"
                  value={formState.dropPrice || formState.drop_price || ''}
                  onChange={handleChange}
                  placeholder="Drop price"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tier1Price">Tier 1 Price (₹)</Label>
                <Input
                  id="tier1Price"
                  name="tier1Price"
                  type="number"
                  value={formState.tier1Price || formState.tier1_price || ''}
                  onChange={handleChange}
                  placeholder="Tier 1 price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tier2Price">Tier 2 Price (₹)</Label>
                <Input
                  id="tier2Price"
                  name="tier2Price"
                  type="number"
                  value={formState.tier2Price || formState.tier2_price || ''}
                  onChange={handleChange}
                  placeholder="Tier 2 price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tier3Price">Tier 3 Price (₹)</Label>
                <Input
                  id="tier3Price"
                  name="tier3Price"
                  type="number"
                  value={formState.tier3Price || formState.tier3_price || ''}
                  onChange={handleChange}
                  placeholder="Tier 3 price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tier4Price">Tier 4 Price (₹)</Label>
                <Input
                  id="tier4Price"
                  name="tier4Price"
                  type="number"
                  value={formState.tier4Price || formState.tier4_price || ''}
                  onChange={handleChange}
                  placeholder="Tier 4 price"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="extraKmCharge">Extra KM Charge (₹)</Label>
                <Input
                  id="extraKmCharge"
                  name="extraKmCharge"
                  type="number"
                  value={formState.extraKmCharge || formState.extra_km_charge || ''}
                  onChange={handleChange}
                  placeholder="Extra KM charge"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nightCharges">Night Charges (₹)</Label>
                <Input
                  id="nightCharges"
                  name="nightCharges"
                  type="number"
                  value={formState.nightCharges || formState.night_charges || ''}
                  onChange={handleChange}
                  placeholder="Night charges"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="extraWaitingCharges">Extra Waiting Charges (₹)</Label>
                <Input
                  id="extraWaitingCharges"
                  name="extraWaitingCharges"
                  type="number"
                  value={formState.extraWaitingCharges || formState.extra_waiting_charges || ''}
                  onChange={handleChange}
                  placeholder="Extra waiting charges"
                />
              </div>
            </div>
            
            <div className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleSyncAirportFares}
                disabled={syncing}
                className="flex items-center"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Airport Fares'}
              </Button>
              
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        );
      
      case 'local':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Local fare fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="package4hrs40km">4 Hrs 40 KM Package (₹)</Label>
                <Input
                  id="package4hrs40km"
                  name="package4hrs40km"
                  type="number"
                  value={formState.package4hrs40km || formState.price_4hrs_40km || ''}
                  onChange={handleChange}
                  placeholder="4 hrs 40 km price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="package8hrs80km">8 Hrs 80 KM Package (₹)</Label>
                <Input
                  id="package8hrs80km"
                  name="package8hrs80km"
                  type="number"
                  value={formState.package8hrs80km || formState.price_8hrs_80km || ''}
                  onChange={handleChange}
                  placeholder="8 hrs 80 km price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="package10hrs100km">10 Hrs 100 KM Package (₹)</Label>
                <Input
                  id="package10hrs100km"
                  name="package10hrs100km"
                  type="number"
                  value={formState.package10hrs100km || formState.price_10hrs_100km || ''}
                  onChange={handleChange}
                  placeholder="10 hrs 100 km price"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="extraKmRate">Extra KM Rate (₹)</Label>
                <Input
                  id="extraKmRate"
                  name="extraKmRate"
                  type="number"
                  value={formState.extraKmRate || formState.price_extra_km || ''}
                  onChange={handleChange}
                  placeholder="Extra km rate"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="extraHourRate">Extra Hour Rate (₹)</Label>
                <Input
                  id="extraHourRate"
                  name="extraHourRate"
                  type="number"
                  value={formState.extraHourRate || formState.price_extra_hour || ''}
                  onChange={handleChange}
                  placeholder="Extra hour rate"
                />
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6 flex items-center justify-center"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        );
      
      case 'outstation':
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Outstation fare fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">One Way Base Price (₹)</Label>
                <Input
                  id="basePrice"
                  name="basePrice"
                  type="number"
                  value={formState.basePrice || formState.base_price || ''}
                  onChange={handleChange}
                  placeholder="One way base price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pricePerKm">One Way Price Per KM (₹)</Label>
                <Input
                  id="pricePerKm"
                  name="pricePerKm"
                  type="number"
                  value={formState.pricePerKm || formState.price_per_km || ''}
                  onChange={handleChange}
                  placeholder="One way price per km"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="roundTripBasePrice">Round Trip Base Price (₹)</Label>
                <Input
                  id="roundTripBasePrice"
                  name="roundTripBasePrice"
                  type="number"
                  value={formState.roundTripBasePrice || formState.round_trip_base_price || ''}
                  onChange={handleChange}
                  placeholder="Round trip base price"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="roundTripPricePerKm">Round Trip Price Per KM (₹)</Label>
                <Input
                  id="roundTripPricePerKm"
                  name="roundTripPricePerKm"
                  type="number"
                  value={formState.roundTripPricePerKm || formState.round_trip_price_per_km || ''}
                  onChange={handleChange}
                  placeholder="Round trip price per km"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="driverAllowance">Driver Allowance (₹)</Label>
                <Input
                  id="driverAllowance"
                  name="driverAllowance"
                  type="number"
                  value={formState.driverAllowance || formState.driver_allowance || ''}
                  onChange={handleChange}
                  placeholder="Driver allowance"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nightHaltCharge">Night Halt Charge (₹)</Label>
                <Input
                  id="nightHaltCharge"
                  name="nightHaltCharge"
                  type="number"
                  value={formState.nightHaltCharge || formState.night_halt_charge || ''}
                  onChange={handleChange}
                  placeholder="Night halt charge"
                />
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6 flex items-center justify-center"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        );
      
      default:
        return null;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{fareType.charAt(0).toUpperCase() + fareType.slice(1)} Fare Management</span>
          {fareType === 'airport' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSyncAirportFares} 
              disabled={syncing}
              className="flex items-center"
            >
              <Database className="mr-2 h-4 w-4" />
              {syncing ? 'Syncing...' : 'Sync Fares'}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && !error ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            <span className="ml-3">Loading fare data...</span>
          </div>
        ) : (
          renderForm()
        )}
      </CardContent>
    </Card>
  );
};

export default FareManagement;
