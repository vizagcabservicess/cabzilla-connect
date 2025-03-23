import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { RefreshCw, Save } from 'lucide-react';
import { fareService } from '@/services/fareService';
import { updateOutstationFares, updateLocalFares, updateAirportFares } from '@/services/vehicleDataService';
import { getVehicleTypes } from '@/services/vehicleDataService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VehicleTripFaresFormProps {
  vehicleId?: string;
}

export function VehicleTripFaresForm({ vehicleId }: VehicleTripFaresFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('outstation');
  const [vehicleTypes, setVehicleTypes] = useState<{id: string, name: string}[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicleId || '');
  
  // Outstation fare state
  const [basePrice, setBasePrice] = useState('0');
  const [pricePerKm, setPricePerKm] = useState('0');
  const [driverAllowance, setDriverAllowance] = useState('0');
  const [nightHalt, setNightHalt] = useState('0');
  const [roundTripBasePrice, setRoundTripBasePrice] = useState('0');
  const [roundTripPricePerKm, setRoundTripPricePerKm] = useState('0');
  
  // Local package fare state
  const [package4hr40km, setPackage4hr40km] = useState('0');
  const [package8hr80km, setPackage8hr80km] = useState('0');
  const [package10hr100km, setPackage10hr100km] = useState('0');
  const [extraKmRate, setExtraKmRate] = useState('0');
  const [extraHourRate, setExtraHourRate] = useState('0');
  
  // Airport fare state
  const [airportBasePrice, setAirportBasePrice] = useState('0');
  const [airportPricePerKm, setAirportPricePerKm] = useState('0');
  const [dropPrice, setDropPrice] = useState('0');
  const [pickupPrice, setPickupPrice] = useState('0');
  const [tier1Price, setTier1Price] = useState('0'); // 0-10 KM
  const [tier2Price, setTier2Price] = useState('0'); // 11-20 KM
  const [tier3Price, setTier3Price] = useState('0'); // 21-30 KM
  const [tier4Price, setTier4Price] = useState('0'); // 31+ KM
  const [extraKmCharge, setExtraKmCharge] = useState('0');

  // Fetch vehicle types on mount if no vehicleId provided
  useEffect(() => {
    if (!vehicleId) {
      const loadVehicleTypes = async () => {
        try {
          const types = await getVehicleTypes();
          setVehicleTypes(types);
        } catch (error) {
          console.error('Error loading vehicle types:', error);
          toast.error('Failed to load vehicle types');
        }
      };
      
      loadVehicleTypes();
    }
  }, [vehicleId]);

  // Load existing fares when vehicle ID is selected
  useEffect(() => {
    if (selectedVehicleId) {
      loadFares(selectedVehicleId);
    }
  }, [selectedVehicleId]);

  const loadFares = async (vehicleId: string) => {
    setLoading(true);
    try {
      // Load outstation fares
      const outstationData = await fareService.getOutstationFaresForVehicle(vehicleId);
      setBasePrice(outstationData.basePrice.toString());
      setPricePerKm(outstationData.pricePerKm.toString());
      setDriverAllowance(outstationData.driverAllowance.toString());
      setNightHalt(outstationData.nightHalt.toString());
      setRoundTripBasePrice(outstationData.roundTripBasePrice.toString());
      setRoundTripPricePerKm(outstationData.roundTripPricePerKm.toString());
      
      // Load local package fares
      const localData = await fareService.getLocalFaresForVehicle(vehicleId);
      setPackage4hr40km(localData.package4hr40km.toString());
      setPackage8hr80km(localData.package8hr80km.toString());
      setPackage10hr100km(localData.package10hr100km.toString());
      setExtraKmRate(localData.extraKmRate.toString());
      setExtraHourRate(localData.extraHourRate.toString());
      
      // Load airport fares
      const airportData = await fareService.getAirportFaresForVehicle(vehicleId);
      setAirportBasePrice(airportData.basePrice.toString());
      setAirportPricePerKm(airportData.pricePerKm.toString());
      setDropPrice(airportData.dropPrice.toString());
      setPickupPrice(airportData.pickupPrice.toString());
      setTier1Price(airportData.tier1Price.toString());
      setTier2Price(airportData.tier2Price.toString());
      setTier3Price(airportData.tier3Price.toString());
      setTier4Price(airportData.tier4Price.toString());
      setExtraKmCharge(airportData.extraKmCharge.toString());
      
      console.log('Loaded fares for vehicle:', vehicleId);
    } catch (error) {
      console.error('Error loading fares:', error);
      toast.error('Failed to load vehicle fares');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOutstationFares = async () => {
    if (!selectedVehicleId) {
      toast.error('Please select a vehicle');
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        basePrice: parseFloat(basePrice) || 0,
        pricePerKm: parseFloat(pricePerKm) || 0,
        driverAllowance: parseFloat(driverAllowance) || 0,
        nightHalt: parseFloat(nightHalt) || 0,
        roundTripBasePrice: parseFloat(roundTripBasePrice) || 0,
        roundTripPricePerKm: parseFloat(roundTripPricePerKm) || 0
      };
      
      // Try to use multiple update methods
      try {
        // First try the specialized API endpoint via fareService
        await fareService.directFareUpdate('outstation', selectedVehicleId, {
          vehicleId: selectedVehicleId,
          ...data
        });
      } catch (error) {
        console.error('Direct update failed, trying vehicleDataService:', error);
        
        // Fall back to regular update method
        await updateOutstationFares(selectedVehicleId, data);
      }
      
      toast.success('Outstation fares updated successfully');
      
      // Force a refresh of fare cache
      fareService.clearCache();
      
      // Dispatch event for other components to update
      window.dispatchEvent(new CustomEvent('trip-fares-updated', {
        detail: { 
          timestamp: Date.now(),
          tripType: 'outstation',
          vehicleId: selectedVehicleId
        }
      }));
    } catch (error) {
      console.error('Error saving outstation fares:', error);
      toast.error('Failed to update outstation fares');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLocalFares = async () => {
    if (!selectedVehicleId) {
      toast.error('Please select a vehicle');
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        package4hr40km: parseFloat(package4hr40km) || 0,
        package8hr80km: parseFloat(package8hr80km) || 0,
        package10hr100km: parseFloat(package10hr100km) || 0,
        extraKmRate: parseFloat(extraKmRate) || 0,
        extraHourRate: parseFloat(extraHourRate) || 0
      };
      
      // Create FormData for better compatibility with server
      const formData = new FormData();
      formData.append('vehicleId', selectedVehicleId);
      formData.append('vehicleType', selectedVehicleId);
      formData.append('vehicle_id', selectedVehicleId);
      formData.append('tripType', 'local');
      formData.append('trip_type', 'local');
      
      // Add all data fields with multiple naming patterns for compatibility
      formData.append('package4hr40km', package4hr40km);
      formData.append('price4hrs40km', package4hr40km);
      formData.append('hr4km40Price', package4hr40km);
      formData.append('local_package_4hr', package4hr40km);
      
      formData.append('package8hr80km', package8hr80km);
      formData.append('price8hrs80km', package8hr80km);
      formData.append('hr8km80Price', package8hr80km);
      formData.append('local_package_8hr', package8hr80km);
      
      formData.append('package10hr100km', package10hr100km);
      formData.append('price10hrs100km', package10hr100km);
      formData.append('hr10km100Price', package10hr100km);
      formData.append('local_package_10hr', package10hr100km);
      
      formData.append('extraKmRate', extraKmRate);
      formData.append('priceExtraKm', extraKmRate);
      formData.append('extra_km_charge', extraKmRate);
      formData.append('extra_km_rate', extraKmRate);
      
      formData.append('extraHourRate', extraHourRate);
      formData.append('priceExtraHour', extraHourRate);
      formData.append('extra_hour_charge', extraHourRate);
      formData.append('extra_hour_rate', extraHourRate);
      
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      
      // First, try the direct-fare-update.php endpoint which is designed for better compatibility
      try {
        console.log('Attempting to update fare via direct-fare-update.php');
        const directResponse = await fetch(`${baseUrl}/api/direct-fare-update.php`, {
          method: 'POST',
          body: formData,
          headers: {
            'X-Force-Refresh': 'true',
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!directResponse.ok) {
          console.warn('Direct fare update returned non-OK status:', directResponse.status);
          throw new Error(`Direct API error: ${directResponse.status}`);
        }
        
        const directResult = await directResponse.json();
        console.log('Direct API response:', directResult);
      } catch (directError) {
        console.warn('Direct fare update failed, trying fallback method:', directError);
        
        // Try the local-fares-update endpoint
        try {
          console.log('Attempting to update fare via local-fares-update.php');
          const response = await fetch(`${baseUrl}/api/admin/local-fares-update.php`, {
            method: 'POST',
            body: formData,
            headers: {
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', response.status, errorText);
            throw new Error(`API error: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('API response:', result);
        } catch (error) {
          console.error('Local fares update failed:', error);
          
          // Try to use the fareService as a backup
          try {
            console.log('Attempting to update fare via fareService');
            await fareService.directFareUpdate('local', selectedVehicleId, {
              vehicleId: selectedVehicleId,
              ...data
            });
          } catch (fallbackError) {
            console.error('Fallback method failed:', fallbackError);
            
            // Last resort - try updateLocalFares
            await updateLocalFares(selectedVehicleId, data);
          }
        }
      }
      
      // Also update local storage for immediate UI update
      const packageMatrix = {
        '4hrs-40km': parseFloat(package4hr40km) || 0,
        '8hrs-80km': parseFloat(package8hr80km) || 0,
        '10hrs-100km': parseFloat(package10hr100km) || 0,
        'extra-km': parseFloat(extraKmRate) || 0,
        'extra-hour': parseFloat(extraHourRate) || 0
      };
      
      // Update the localStorage directly - this ensures the frontend cache is updated immediately
      try {
        const localStorageMatrix = localStorage.getItem('localPackagePriceMatrix');
        let matrix = localStorageMatrix ? JSON.parse(localStorageMatrix) : {};
        
        // Ensure the structure exists
        if (!matrix) matrix = {};
        if (!matrix['4hrs-40km']) matrix['4hrs-40km'] = {};
        if (!matrix['8hrs-80km']) matrix['8hrs-80km'] = {};
        if (!matrix['10hrs-100km']) matrix['10hrs-100km'] = {};
        
        // Normalize vehicle ID to lowercase for consistency
        const normalizedVehicleId = selectedVehicleId.toLowerCase();
        
        // Update each price in the matrix
        matrix['4hrs-40km'][normalizedVehicleId] = parseFloat(package4hr40km) || 0;
        matrix['8hrs-80km'][normalizedVehicleId] = parseFloat(package8hr80km) || 0;
        matrix['10hrs-100km'][normalizedVehicleId] = parseFloat(package10hr100km) || 0;
        
        // Handle vehicle ID variations - create aliases for common vehicle types
        if (normalizedVehicleId === 'innova_crysta' || normalizedVehicleId === 'innova crysta') {
          matrix['4hrs-40km']['innova'] = parseFloat(package4hr40km) || 0;
          matrix['8hrs-80km']['innova'] = parseFloat(package8hr80km) || 0;
          matrix['10hrs-100km']['innova'] = parseFloat(package10hr100km) || 0;
        }
        
        if (normalizedVehicleId === 'luxury') {
          matrix['4hrs-40km']['luxury sedan'] = parseFloat(package4hr40km) || 0;
          matrix['8hrs-80km']['luxury sedan'] = parseFloat(package8hr80km) || 0;
          matrix['10hrs-100km']['luxury sedan'] = parseFloat(package10hr100km) || 0;
        }
        
        // Save back to localStorage
        localStorage.setItem('localPackagePriceMatrix', JSON.stringify(matrix));
        localStorage.setItem('localPackagePriceMatrixUpdated', Date.now().toString());
      } catch (localStorageError) {
        console.error('Failed to update localStorage:', localStorageError);
      }
      
      toast.success('Local package fares updated successfully');
      
      // Force a refresh of fare cache
      fareService.clearCache();
      
      // Dispatch custom event for local fare updates with detailed price information
      window.dispatchEvent(new CustomEvent('local-fares-updated', {
        detail: { 
          timestamp: Date.now(),
          packageId: 'all',
          cabType: selectedVehicleId.toLowerCase(),
          vehicleId: selectedVehicleId,
          prices: {
            '4hrs-40km': parseFloat(package4hr40km) || 0,
            '8hrs-80km': parseFloat(package8hr80km) || 0,
            '10hrs-100km': parseFloat(package10hr100km) || 0,
            'extra-km': parseFloat(extraKmRate) || 0,
            'extra-hour': parseFloat(extraHourRate) || 0
          }
        }
      }));
      
      // Dispatch a more generic fare cache cleared event to trigger all components to refresh
      window.dispatchEvent(new CustomEvent('fare-cache-cleared', {
        detail: { 
          timestamp: Date.now()
        }
      }));
      
      // Remove any old cache data
      localStorage.removeItem('fareCache');
      localStorage.removeItem('calculatedFares');
      
      // Set force refresh flag temporarily
      localStorage.setItem('forceCacheRefresh', 'true');
      setTimeout(() => {
        localStorage.removeItem('forceCacheRefresh');
      }, 5000);
    } catch (error) {
      console.error('Error saving local fares:', error);
      toast.error('Failed to update local package fares');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAirportFares = async () => {
    if (!selectedVehicleId) {
      toast.error('Please select a vehicle');
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        basePrice: parseFloat(airportBasePrice) || 0,
        pricePerKm: parseFloat(airportPricePerKm) || 0,
        dropPrice: parseFloat(dropPrice) || 0,
        pickupPrice: parseFloat(pickupPrice) || 0,
        tier1Price: parseFloat(tier1Price) || 0,
        tier2Price: parseFloat(tier2Price) || 0,
        tier3Price: parseFloat(tier3Price) || 0,
        tier4Price: parseFloat(tier4Price) || 0,
        extraKmCharge: parseFloat(extraKmCharge) || 0
      };
      
      // Also include variations of field names to support different backend implementations
      const requestData = {
        vehicleId: selectedVehicleId,
        ...data,
        // Add alternative field names
        airportBasePrice: parseFloat(airportBasePrice) || 0,
        airportPricePerKm: parseFloat(airportPricePerKm) || 0,
        dropFare: parseFloat(dropPrice) || 0,
        pickupFare: parseFloat(pickupPrice) || 0,
        // Add alternative DB column names
        airport_base_price: parseFloat(airportBasePrice) || 0,
        airport_price_per_km: parseFloat(airportPricePerKm) || 0,
        airport_drop_price: parseFloat(dropPrice) || 0,
        airport_pickup_price: parseFloat(pickupPrice) || 0,
        airport_tier1_price: parseFloat(tier1Price) || 0,
        airport_tier2_price: parseFloat(tier2Price) || 0,
        airport_tier3_price: parseFloat(tier3Price) || 0,
        airport_tier4_price: parseFloat(tier4Price) || 0,
        airport_extra_km_charge: parseFloat(extraKmCharge) || 0
      };
      
      // Try to use multiple update methods
      try {
        // First try the specialized API endpoint via fareService
        await fareService.directFareUpdate('airport', selectedVehicleId, requestData);
      } catch (error) {
        console.error('Direct update failed, trying vehicleDataService:', error);
        
        // Fall back to regular update method
        await updateAirportFares(selectedVehicleId, data);
      }
      
      toast.success('Airport transfer fares updated successfully');
      
      // Force a refresh of fare cache
      fareService.clearCache();
      
      // Dispatch event for other components to update
      window.dispatchEvent(new CustomEvent('airport-fares-updated', {
        detail: { 
          timestamp: Date.now(),
          vehicleId: selectedVehicleId
        }
      }));
    } catch (error) {
      console.error('Error saving airport fares:', error);
      toast.error('Failed to update airport transfer fares');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        {!vehicleId && (
          <div className="mb-6">
            <Label htmlFor="vehicleSelect">Select Vehicle</Label>
            <Select
              value={selectedVehicleId}
              onValueChange={setSelectedVehicleId}
            >
              <SelectTrigger id="vehicleSelect" className="w-full">
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicleTypes.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="outstation" className="flex-1">Outstation</TabsTrigger>
            <TabsTrigger value="local" className="flex-1">Local</TabsTrigger>
            <TabsTrigger value="airport" className="flex-1">Airport</TabsTrigger>
          </TabsList>
          
          <TabsContent value="outstation">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price (₹)</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="Base price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerKm">Price per Km (₹)</Label>
                  <Input
                    id="pricePerKm"
                    type="number"
                    step="0.01"
                    value={pricePerKm}
                    onChange={(e) => setPricePerKm(e.target.value)}
                    placeholder="Price per km"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="driverAllowance">Driver Allowance (₹)</Label>
                  <Input
                    id="driverAllowance"
                    type="number"
                    value={driverAllowance}
                    onChange={(e) => setDriverAllowance(e.target.value)}
                    placeholder="Driver allowance"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nightHalt">Night Halt Charge (₹)</Label>
                  <Input
                    id="nightHalt"
                    type="number"
                    value={nightHalt}
                    onChange={(e) => setNightHalt(e.target.value)}
                    placeholder="Night halt charge"
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-4">Round Trip Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="roundTripBasePrice">Round Trip Base Price (₹)</Label>
                    <Input
                      id="roundTripBasePrice"
                      type="number"
                      value={roundTripBasePrice}
                      onChange={(e) => setRoundTripBasePrice(e.target.value)}
                      placeholder="Round trip base price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roundTripPricePerKm">Round Trip Price per Km (₹)</Label>
                    <Input
                      id="roundTripPricePerKm"
                      type="number"
                      step="0.01"
                      value={roundTripPricePerKm}
                      onChange={(e) => setRoundTripPricePerKm(e.target.value)}
                      placeholder="Round trip price per km"
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full mt-6" 
                onClick={handleSaveOutstationFares}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Outstation Fares
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="local">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="package4hr40km">4 Hours / 40 KM Package (₹)</Label>
                  <Input
                    id="package4hr40km"
                    type="number"
                    value={package4hr40km}
                    onChange={(e) => setPackage4hr40km(e.target.value)}
                    placeholder="4 hrs / 40 km package price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="package8hr80km">8 Hours / 80 KM Package (₹)</Label>
                  <Input
                    id="package8hr80km"
                    type="number"
                    value={package8hr80km}
                    onChange={(e) => setPackage8hr80km(e.target.value)}
                    placeholder="8 hrs / 80 km package price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="package10hr100km">10 Hours / 100 KM Package (₹)</Label>
                  <Input
                    id="package10hr100km"
                    type="number"
                    value={package10hr100km}
                    onChange={(e) => setPackage10hr100km(e.target.value)}
                    placeholder="10 hrs / 100 km package price"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="extraKmRate">Extra KM Rate (₹)</Label>
                  <Input
                    id="extraKmRate"
                    type="number"
                    value={extraKmRate}
                    onChange={(e) => setExtraKmRate(e.target.value)}
                    placeholder="Extra kilometer rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extraHourRate">Extra Hour Rate (₹)</Label>
                  <Input
                    id="extraHourRate"
                    type="number"
                    value={extraHourRate}
                    onChange={(e) => setExtraHourRate(e.target.value)}
                    placeholder="Extra hour rate"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSaveLocalFares} 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Local Fares
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="airport">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="airportBasePrice">Base Price (₹)</Label>
                  <Input
                    id="airportBasePrice"
                    type="number"
                    value={airportBasePrice}
                    onChange={(e) => setAirportBasePrice(e.target.value)}
                    placeholder="Base price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="airportPricePerKm">Price per Km (₹)</Label>
                  <Input
                    id="airportPricePerKm"
                    type="number"
                    step="0.01"
                    value={airportPricePerKm}
                    onChange={(e) => setAirportPricePerKm(e.target.value)}
                    placeholder="Price per km"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupPrice">Pickup Price (₹)</Label>
                  <Input
                    id="pickupPrice"
                    type="number"
                    value={pickupPrice}
                    onChange={(e) => setPickupPrice(e.target.value)}
                    placeholder="Pickup price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropPrice">Drop Price (₹)</Label>
                  <Input
                    id="dropPrice"
                    type="number"
                    value={dropPrice}
                    onChange={(e) => setDropPrice(e.target.value)}
                    placeholder="Drop price"
                  />
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h3 className="text-lg font-medium mb-4">Distance Tier Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tier1Price">Tier 1 (0-10 KM) Price (₹)</Label>
                    <Input
                      id="tier1Price"
                      type="number"
                      value={tier1Price}
                      onChange={(e) => setTier1Price(e.target.value)}
                      placeholder="Tier 1 price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tier2Price">Tier 2 (11-20 KM) Price (₹)</Label>
                    <Input
                      id="tier2Price"
                      type="number"
                      value={tier2Price}
                      onChange={(e) => setTier2Price(e.target.value)}
                      placeholder="Tier 2 price"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="tier3Price">Tier 3 (21-30 KM) Price (₹)</Label>
                    <Input
                      id="tier3Price"
                      type="number"
                      value={tier3Price}
                      onChange={(e) => setTier3Price(e.target.value)}
                      placeholder="Tier 3 price"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tier4Price">Tier 4 (31+ KM) Price (₹)</Label>
                    <Input
                      id="tier4Price"
                      type="number"
                      value={tier4Price}
                      onChange={(e) => setTier4Price(e.target.value)}
                      placeholder="Tier 4 price"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="extraKmCharge">Extra KM Charge (₹)</Label>
                    <Input
                      id="extraKmCharge"
                      type="number"
                      step="0.01"
                      value={extraKmCharge}
                      onChange={(e) => setExtraKmCharge(e.target.value)}
                      placeholder="Extra KM charge"
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                className="w-full mt-6" 
                onClick={handleSaveAirportFares}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Airport Fares
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

