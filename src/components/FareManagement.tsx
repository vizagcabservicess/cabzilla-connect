
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getAllAirportFares, getAllLocalFares, getAllOutstationFares, syncAirportFares, updateAirportFares, updateLocalFares, updateOutstationFares } from '@/services/fareUpdateService';

interface FareManagementProps {
  vehicleId: string;
  fareType: 'local' | 'airport' | 'outstation';
}

export const FareManagement: React.FC<FareManagementProps> = ({ vehicleId, fareType }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formChanged, setFormChanged] = useState(false);
  
  // Airport fare fields
  const [basePrice, setBasePrice] = useState(0);
  const [pricePerKm, setPricePerKm] = useState(0);
  const [pickupPrice, setPickupPrice] = useState(0);
  const [dropPrice, setDropPrice] = useState(0);
  const [tier1Price, setTier1Price] = useState(0);
  const [tier2Price, setTier2Price] = useState(0);
  const [tier3Price, setTier3Price] = useState(0);
  const [tier4Price, setTier4Price] = useState(0);
  const [extraKmCharge, setExtraKmCharge] = useState(0);
  const [nightCharges, setNightCharges] = useState(0);
  const [extraWaitingCharges, setExtraWaitingCharges] = useState(0);
  
  // Local Package fields
  const [extraKmRate, setExtraKmRate] = useState(0);
  const [extraHourRate, setExtraHourRate] = useState(0);
  const [package1Hours, setPackage1Hours] = useState(4);
  const [package1Km, setPackage1Km] = useState(40);
  const [package1Price, setPackage1Price] = useState(0);
  const [package2Hours, setPackage2Hours] = useState(8);
  const [package2Km, setPackage2Km] = useState(80);
  const [package2Price, setPackage2Price] = useState(0);
  const [package3Hours, setPackage3Hours] = useState(12);
  const [package3Km, setPackage3Km] = useState(120);
  const [package3Price, setPackage3Price] = useState(0);
  
  // Outstation fields
  const [outstationBasePrice, setOutstationBasePrice] = useState(0);
  const [outstationPricePerKm, setOutstationPricePerKm] = useState(0);
  const [roundTripBasePrice, setRoundTripBasePrice] = useState(0);
  const [roundTripPricePerKm, setRoundTripPricePerKm] = useState(0);
  const [driverAllowance, setDriverAllowance] = useState(250);
  const [nightHaltCharge, setNightHaltCharge] = useState(700);
  
  // Function to sync airport fares from vehicles
  const handleSyncAirportFares = async () => {
    if (syncing) return;
    
    setSyncing(true);
    setError(null);
    
    try {
      toast.info('Syncing airport fares from vehicles...');
      
      const success = await syncAirportFares(true);
      
      if (success) {
        toast.success('Airport fares synced successfully');
        
        // Reload fares data
        await loadFaresData();
      } else {
        toast.error('Failed to sync airport fares');
        setError('Failed to sync airport fares from vehicles');
      }
    } catch (err) {
      console.error('Error syncing airport fares:', err);
      toast.error('Failed to sync airport fares');
      setError('Failed to sync airport fares: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };
  
  const loadFaresData = useCallback(async () => {
    if (!vehicleId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Loading ${fareType} fares for vehicle: ${vehicleId}`);
      
      let data: Record<string, any> = {};
      
      if (fareType === 'airport') {
        data = await getAllAirportFares();
      } else if (fareType === 'local') {
        data = await getAllLocalFares();
      } else if (fareType === 'outstation') {
        data = await getAllOutstationFares();
      }
      
      console.log(`Loaded ${Object.keys(data).length} ${fareType} fares`);
      
      const fare = data[vehicleId];
      
      if (fare) {
        console.log(`Found ${fareType} fare for vehicle ${vehicleId}:`, fare);
        
        if (fareType === 'airport') {
          setBasePrice(fare.basePrice || 0);
          setPricePerKm(fare.pricePerKm || 0);
          setPickupPrice(fare.pickupPrice || 0);
          setDropPrice(fare.dropPrice || 0);
          setTier1Price(fare.tier1Price || 0);
          setTier2Price(fare.tier2Price || 0);
          setTier3Price(fare.tier3Price || 0);
          setTier4Price(fare.tier4Price || 0);
          setExtraKmCharge(fare.extraKmCharge || 0);
          setNightCharges(fare.nightCharges || 0);
          setExtraWaitingCharges(fare.extraWaitingCharges || 0);
        } else if (fareType === 'local') {
          setExtraKmRate(fare.extraKmRate || 0);
          setExtraHourRate(fare.extraHourRate || 0);
          
          const packages = fare.packages || [];
          
          if (packages.length >= 1) {
            setPackage1Hours(packages[0].hours || 4);
            setPackage1Km(packages[0].km || 40);
            setPackage1Price(packages[0].price || 0);
          }
          
          if (packages.length >= 2) {
            setPackage2Hours(packages[1].hours || 8);
            setPackage2Km(packages[1].km || 80);
            setPackage2Price(packages[1].price || 0);
          }
          
          if (packages.length >= 3) {
            setPackage3Hours(packages[2].hours || 12);
            setPackage3Km(packages[2].km || 120);
            setPackage3Price(packages[2].price || 0);
          }
        } else if (fareType === 'outstation') {
          setOutstationBasePrice(fare.basePrice || 0);
          setOutstationPricePerKm(fare.pricePerKm || 0);
          setRoundTripBasePrice(fare.roundTripBasePrice || 0);
          setRoundTripPricePerKm(fare.roundTripPricePerKm || 0);
          setDriverAllowance(fare.driverAllowance || 250);
          setNightHaltCharge(fare.nightHaltCharge || 700);
        }
      } else {
        console.log(`No ${fareType} fare found for vehicle ${vehicleId}`);
        // If we're loading airport fares and none are found, maybe try syncing?
        if (fareType === 'airport') {
          const shouldSync = window.confirm(`No airport fares found for ${vehicleId}. Would you like to sync fares from vehicles?`);
          if (shouldSync) {
            await handleSyncAirportFares();
            return; // loadFaresData will be called again after sync
          }
        }
      }
      
      setFormChanged(false);
    } catch (err) {
      console.error(`Error loading ${fareType} fares:`, err);
      setError(`Failed to load ${fareType} fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, fareType, handleSyncAirportFares]);
  
  useEffect(() => {
    if (vehicleId) {
      loadFaresData();
    }
  }, [vehicleId, fareType, loadFaresData]);
  
  // Listen for fare data updates
  useEffect(() => {
    const handleFareDataUpdated = (event: CustomEvent) => {
      if (event.detail.fareType === fareType && event.detail.vehicleId === vehicleId) {
        loadFaresData();
      }
    };
    
    window.addEventListener('fare-data-updated', handleFareDataUpdated as EventListener);
    
    return () => {
      window.removeEventListener('fare-data-updated', handleFareDataUpdated as EventListener);
    };
  }, [fareType, vehicleId, loadFaresData]);
  
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setter(isNaN(value) ? 0 : value);
    setFormChanged(true);
  };
  
  const handleSave = async () => {
    if (!vehicleId || saving) return;
    
    setSaving(true);
    setError(null);
    
    try {
      if (fareType === 'airport') {
        await updateAirportFares(vehicleId, {
          basePrice,
          pricePerKm,
          pickupPrice,
          dropPrice,
          tier1Price,
          tier2Price,
          tier3Price,
          tier4Price,
          extraKmCharge,
          nightCharges,
          extraWaitingCharges
        });
        
        toast.success('Airport fares updated successfully');
      } else if (fareType === 'local') {
        await updateLocalFares(
          vehicleId,
          extraKmRate,
          extraHourRate,
          [
            { hours: package1Hours, km: package1Km, price: package1Price },
            { hours: package2Hours, km: package2Km, price: package2Price },
            { hours: package3Hours, km: package3Km, price: package3Price }
          ]
        );
        
        toast.success('Local fares updated successfully');
      } else if (fareType === 'outstation') {
        await updateOutstationFares(
          vehicleId,
          outstationBasePrice,
          outstationPricePerKm,
          roundTripBasePrice,
          roundTripPricePerKm,
          driverAllowance,
          nightHaltCharge
        );
        
        toast.success('Outstation fares updated successfully');
      }
      
      setFormChanged(false);
    } catch (err) {
      console.error(`Error saving ${fareType} fares:`, err);
      toast.error(`Failed to save ${fareType} fares`);
      setError(`Failed to save ${fareType} fares: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };
  
  const renderAirportFaresForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="basePrice">Base Price (₹)</Label>
          <Input 
            id="basePrice" 
            type="number" 
            min="0" 
            step="100" 
            value={basePrice}
            onChange={handleInputChange(setBasePrice)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pricePerKm">Price Per KM (₹)</Label>
          <Input 
            id="pricePerKm" 
            type="number" 
            min="0" 
            step="0.5" 
            value={pricePerKm}
            onChange={handleInputChange(setPricePerKm)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pickupPrice">Pickup Price (₹)</Label>
          <Input 
            id="pickupPrice" 
            type="number" 
            min="0" 
            step="100" 
            value={pickupPrice}
            onChange={handleInputChange(setPickupPrice)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dropPrice">Drop Price (₹)</Label>
          <Input 
            id="dropPrice" 
            type="number" 
            min="0" 
            step="100" 
            value={dropPrice}
            onChange={handleInputChange(setDropPrice)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tier1Price">Tier 1 Price (₹)</Label>
          <Input 
            id="tier1Price" 
            type="number" 
            min="0" 
            step="100" 
            value={tier1Price}
            onChange={handleInputChange(setTier1Price)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tier2Price">Tier 2 Price (₹)</Label>
          <Input 
            id="tier2Price" 
            type="number" 
            min="0" 
            step="100" 
            value={tier2Price}
            onChange={handleInputChange(setTier2Price)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tier3Price">Tier 3 Price (₹)</Label>
          <Input 
            id="tier3Price" 
            type="number" 
            min="0" 
            step="100" 
            value={tier3Price}
            onChange={handleInputChange(setTier3Price)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tier4Price">Tier 4 Price (₹)</Label>
          <Input 
            id="tier4Price" 
            type="number" 
            min="0" 
            step="100" 
            value={tier4Price}
            onChange={handleInputChange(setTier4Price)}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="extraKmCharge">Extra KM Charge (₹)</Label>
          <Input 
            id="extraKmCharge" 
            type="number" 
            min="0" 
            step="0.5" 
            value={extraKmCharge}
            onChange={handleInputChange(setExtraKmCharge)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nightCharges">Night Charges (₹)</Label>
          <Input 
            id="nightCharges" 
            type="number" 
            min="0" 
            step="50" 
            value={nightCharges}
            onChange={handleInputChange(setNightCharges)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="extraWaitingCharges">Extra Waiting Charges (₹)</Label>
          <Input 
            id="extraWaitingCharges" 
            type="number" 
            min="0" 
            step="50" 
            value={extraWaitingCharges}
            onChange={handleInputChange(setExtraWaitingCharges)}
          />
        </div>
      </div>
      
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={handleSyncAirportFares}
          disabled={syncing || saving}
        >
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Airport Fares
            </>
          )}
        </Button>
        <Button
          variant="default"
          onClick={handleSave}
          disabled={!formChanged || saving || syncing}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Airport Fare
            </>
          )}
        </Button>
      </div>
    </div>
  );
  
  const renderLocalFaresForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="extraKmRate">Extra KM Rate (₹)</Label>
          <Input 
            id="extraKmRate" 
            type="number" 
            min="0" 
            step="0.5" 
            value={extraKmRate}
            onChange={handleInputChange(setExtraKmRate)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="extraHourRate">Extra Hour Rate (₹)</Label>
          <Input 
            id="extraHourRate" 
            type="number" 
            min="0" 
            step="10" 
            value={extraHourRate}
            onChange={handleInputChange(setExtraHourRate)}
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Package 1</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="package1Hours">Hours</Label>
            <Input 
              id="package1Hours" 
              type="number" 
              min="1" 
              step="1" 
              value={package1Hours}
              onChange={handleInputChange(setPackage1Hours)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="package1Km">Kilometers</Label>
            <Input 
              id="package1Km" 
              type="number" 
              min="1" 
              step="5" 
              value={package1Km}
              onChange={handleInputChange(setPackage1Km)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="package1Price">Price (₹)</Label>
            <Input 
              id="package1Price" 
              type="number" 
              min="0" 
              step="100" 
              value={package1Price}
              onChange={handleInputChange(setPackage1Price)}
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Package 2</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="package2Hours">Hours</Label>
            <Input 
              id="package2Hours" 
              type="number" 
              min="1" 
              step="1" 
              value={package2Hours}
              onChange={handleInputChange(setPackage2Hours)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="package2Km">Kilometers</Label>
            <Input 
              id="package2Km" 
              type="number" 
              min="1" 
              step="5" 
              value={package2Km}
              onChange={handleInputChange(setPackage2Km)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="package2Price">Price (₹)</Label>
            <Input 
              id="package2Price" 
              type="number" 
              min="0" 
              step="100" 
              value={package2Price}
              onChange={handleInputChange(setPackage2Price)}
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Package 3</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="package3Hours">Hours</Label>
            <Input 
              id="package3Hours" 
              type="number" 
              min="1" 
              step="1" 
              value={package3Hours}
              onChange={handleInputChange(setPackage3Hours)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="package3Km">Kilometers</Label>
            <Input 
              id="package3Km" 
              type="number" 
              min="1" 
              step="5" 
              value={package3Km}
              onChange={handleInputChange(setPackage3Km)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="package3Price">Price (₹)</Label>
            <Input 
              id="package3Price" 
              type="number" 
              min="0" 
              step="100" 
              value={package3Price}
              onChange={handleInputChange(setPackage3Price)}
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button
          variant="default"
          onClick={handleSave}
          disabled={!formChanged || saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Local Packages
            </>
          )}
        </Button>
      </div>
    </div>
  );
  
  const renderOutstationFaresForm = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">One Way Trip</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="outstationBasePrice">Base Price (₹)</Label>
            <Input 
              id="outstationBasePrice" 
              type="number" 
              min="0" 
              step="100" 
              value={outstationBasePrice}
              onChange={handleInputChange(setOutstationBasePrice)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="outstationPricePerKm">Price Per KM (₹)</Label>
            <Input 
              id="outstationPricePerKm" 
              type="number" 
              min="0" 
              step="0.5" 
              value={outstationPricePerKm}
              onChange={handleInputChange(setOutstationPricePerKm)}
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Round Trip</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="roundTripBasePrice">Base Price (₹)</Label>
            <Input 
              id="roundTripBasePrice" 
              type="number" 
              min="0" 
              step="100" 
              value={roundTripBasePrice}
              onChange={handleInputChange(setRoundTripBasePrice)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roundTripPricePerKm">Price Per KM (₹)</Label>
            <Input 
              id="roundTripPricePerKm" 
              type="number" 
              min="0" 
              step="0.5" 
              value={roundTripPricePerKm}
              onChange={handleInputChange(setRoundTripPricePerKm)}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="driverAllowance">Driver Allowance (₹)</Label>
          <Input 
            id="driverAllowance" 
            type="number" 
            min="0" 
            step="50" 
            value={driverAllowance}
            onChange={handleInputChange(setDriverAllowance)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nightHaltCharge">Night Halt Charge (₹)</Label>
          <Input 
            id="nightHaltCharge" 
            type="number" 
            min="0" 
            step="100" 
            value={nightHaltCharge}
            onChange={handleInputChange(setNightHaltCharge)}
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button
          variant="default"
          onClick={handleSave}
          disabled={!formChanged || saving}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Outstation Fares
            </>
          )}
        </Button>
      </div>
    </div>
  );
  
  const renderForm = () => {
    if (fareType === 'airport') {
      return renderAirportFaresForm();
    } else if (fareType === 'local') {
      return renderLocalFaresForm();
    } else {
      return renderOutstationFaresForm();
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading {fareType} fares...</span>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardContent className="p-6">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {renderForm()}
      </CardContent>
    </Card>
  );
};
