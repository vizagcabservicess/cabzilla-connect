import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  updateOutstationFares, 
  updateLocalFares, 
  updateAirportFares,
  getAllOutstationFares,
  getAllLocalFares,
  getAllAirportFares
} from "@/services/fareUpdateService";
import { getVehicleTypes } from '@/services/vehicleDataService';
import { Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { directVehicleOperation } from '@/utils/apiHelper';

interface VehicleTripFaresFormProps {
  tripType: 'outstation' | 'local' | 'airport';
  onSuccess?: () => void;
}

export function VehicleTripFaresForm({ tripType, onSuccess }: VehicleTripFaresFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [vehicles, setVehicles] = useState<{id: string, name: string}[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [allFares, setAllFares] = useState<Record<string, any>>({});
  
  // Outstation fare state
  const [basePrice, setBasePrice] = useState<number>(0);
  const [pricePerKm, setPricePerKm] = useState<number>(0);
  const [roundTripBasePrice, setRoundTripBasePrice] = useState<number>(0);
  const [roundTripPricePerKm, setRoundTripPricePerKm] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(300);
  const [nightHaltCharge, setNightHaltCharge] = useState<number>(700);
  
  // Local fare state
  const [extraKmRate, setExtraKmRate] = useState<number>(0);
  const [extraHourRate, setExtraHourRate] = useState<number>(0);
  const [package4hr40km, setPackage4hr40km] = useState<number>(0);
  const [package8hr80km, setPackage8hr80km] = useState<number>(0);
  const [package12hr120km, setPackage12hr120km] = useState<number>(0);
  
  // Airport fare state
  const [pickupPrice, setPickupPrice] = useState<number>(0);
  const [dropPrice, setDropPrice] = useState<number>(0);
  const [tier1Price, setTier1Price] = useState<number>(0);
  const [tier2Price, setTier2Price] = useState<number>(0);
  const [tier3Price, setTier3Price] = useState<number>(0);
  const [tier4Price, setTier4Price] = useState<number>(0);
  
  useEffect(() => {
    const loadVehicles = async () => {
      setIsLoading(true);
      try {
        console.log(`Loading vehicles for ${tripType} management...`);
        
        const vehicleTypes = await getVehicleTypes(true, true);
        console.log('Loaded vehicle types:', vehicleTypes);
        
        if (tripType === 'outstation') {
          try {
            const outFares = await getAllOutstationFares();
            console.log('Loaded outstation fares:', outFares);
            setAllFares(outFares);
            
            const result = await directVehicleOperation('/api/admin/outstation-fares-update.php', 'GET', {
              sync: 'true',
              includeInactive: 'true'
            });
            
            if (result && result.fares) {
              console.log(`Retrieved ${Object.keys(result.fares).length} outstation fares from direct endpoint`);
              
              const outFareVehicles = Object.keys(result.fares).map(id => ({
                id,
                name: vehicleTypes.find(v => v.id === id)?.name || id.replace(/_/g, ' ')
              }));
              
              console.log('Outstation fare vehicles:', outFareVehicles);
              
              const allVehicles = [...vehicleTypes];
              
              for (const vehicle of outFareVehicles) {
                if (!allVehicles.some(v => v.id === vehicle.id)) {
                  allVehicles.push(vehicle);
                }
              }
              
              setVehicles(allVehicles);
              console.log(`Combined total of ${allVehicles.length} vehicles`);
              
              return;
            }
          } catch (error) {
            console.error('Error fetching outstation fares data:', error);
          }
        } else if (tripType === 'local') {
          try {
            const localFares = await getAllLocalFares();
            setAllFares(localFares);
          } catch (error) {
            console.error('Error fetching local fares:', error);
          }
        } else if (tripType === 'airport') {
          try {
            const airportFares = await getAllAirportFares();
            setAllFares(airportFares);
          } catch (error) {
            console.error('Error fetching airport fares:', error);
          }
        }
        
        setVehicles(vehicleTypes);
        console.log(`Using ${vehicleTypes.length} vehicles from getVehicleTypes`);
      } catch (error) {
        console.error('Error loading vehicle types:', error);
        toast.error('Failed to load vehicles');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVehicles();
  }, [tripType]);
  
  const handleVehicleChange = (value: string) => {
    console.log('Selected vehicle:', value);
    setSelectedVehicle(value);
    
    if (allFares && allFares[value]) {
      const fares = allFares[value];
      console.log(`Found existing fares for ${value}:`, fares);
      
      if (tripType === 'outstation') {
        setBasePrice(fares.basePrice || 0);
        setPricePerKm(fares.pricePerKm || 0);
        setRoundTripBasePrice(fares.roundTripBasePrice || 0);
        setRoundTripPricePerKm(fares.roundTripPricePerKm || 0);
        setDriverAllowance(fares.driverAllowance || 300);
        setNightHaltCharge(fares.nightHaltCharge || 700);
      } else if (tripType === 'local') {
        setExtraKmRate(fares.extraKmRate || 0);
        setExtraHourRate(fares.extraHourRate || 0);
        
        if (fares.packages && fares.packages.length) {
          const pkg4hr = fares.packages.find((p: any) => p.hours === 4 && p.km === 40);
          const pkg8hr = fares.packages.find((p: any) => p.hours === 8 && p.km === 80);
          const pkg12hr = fares.packages.find((p: any) => p.hours === 12 && p.km === 120);
          
          setPackage4hr40km(pkg4hr ? pkg4hr.price : 0);
          setPackage8hr80km(pkg8hr ? pkg8hr.price : 0);
          setPackage12hr120km(pkg12hr ? pkg12hr.price : 0);
        }
      } else if (tripType === 'airport') {
        setPickupPrice(fares.pickup || 0);
        setDropPrice(fares.drop || 0);
        setTier1Price(fares.tier1 || 0);
        setTier2Price(fares.tier2 || 0);
        setTier3Price(fares.tier3 || 0);
        setTier4Price(fares.tier4 || 0);
      }
    } else {
      resetFormValues();
    }
  };
  
  const resetFormValues = () => {
    if (tripType === 'outstation') {
      setBasePrice(0);
      setPricePerKm(0);
      setRoundTripBasePrice(0);
      setRoundTripPricePerKm(0);
      setDriverAllowance(300);
      setNightHaltCharge(700);
    } else if (tripType === 'local') {
      setExtraKmRate(0);
      setExtraHourRate(0);
      setPackage4hr40km(0);
      setPackage8hr80km(0);
      setPackage12hr120km(0);
    } else if (tripType === 'airport') {
      setPickupPrice(0);
      setDropPrice(0);
      setTier1Price(0);
      setTier2Price(0);
      setTier3Price(0);
      setTier4Price(0);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedVehicle) {
      toast.error('Please select a vehicle');
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (tripType === 'outstation') {
        if (basePrice <= 0 || pricePerKm <= 0) {
          toast.error('Base price and price per km must be greater than zero');
          return;
        }
        
        await updateOutstationFares(
          selectedVehicle,
          basePrice,
          pricePerKm,
          roundTripBasePrice || basePrice * 0.9,
          roundTripPricePerKm || pricePerKm * 0.85,
          driverAllowance,
          nightHaltCharge
        );
        
        toast.success(`Updated outstation fares for ${selectedVehicle}`);
      } else if (tripType === 'local') {
        if (extraKmRate <= 0 || package4hr40km <= 0 || package8hr80km <= 0) {
          toast.error('Package prices and extra km rate must be greater than zero');
          return;
        }
        
        const packages = [
          { hours: 4, km: 40, price: package4hr40km },
          { hours: 8, km: 80, price: package8hr80km },
          { hours: 12, km: 120, price: package12hr120km }
        ];
        
        await updateLocalFares(
          selectedVehicle,
          extraKmRate,
          extraHourRate,
          packages
        );
        
        toast.success(`Updated local fares for ${selectedVehicle}`);
      } else if (tripType === 'airport') {
        if (pickupPrice <= 0 || dropPrice <= 0) {
          toast.error('Pickup and drop prices must be greater than zero');
          return;
        }
        
        const locationFares = {
          pickup: pickupPrice,
          drop: dropPrice,
          tier1: tier1Price,
          tier2: tier2Price,
          tier3: tier3Price,
          tier4: tier4Price
        };
        
        await updateAirportFares(
          selectedVehicle,
          locationFares
        );
        
        toast.success(`Updated airport fares for ${selectedVehicle}`);
      }
      
      setSelectedVehicle('');
      resetFormValues();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(`Error updating ${tripType} fares:`, error);
      toast.error(`Failed to update ${tripType} fares`);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="vehicle-select" className="text-sm font-medium">
          Select Vehicle
        </label>
        <Select
          value={selectedVehicle}
          onValueChange={handleVehicleChange}
          disabled={isLoading}
        >
          <SelectTrigger id="vehicle-select" className="w-full">
            <SelectValue placeholder="Select a vehicle" />
          </SelectTrigger>
          <SelectContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Loading vehicles...</span>
              </div>
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name}
                </SelectItem>
              ))
            ) : (
              <div className="py-2 text-center text-sm text-gray-500">
                No vehicles found
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
      
      {tripType === 'outstation' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="base-price" className="text-sm font-medium">
                One Way Base Price (₹)
              </label>
              <Input
                id="base-price"
                type="number"
                min="0"
                step="100"
                value={basePrice || ''}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                placeholder="e.g. 3000"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="price-per-km" className="text-sm font-medium">
                One Way Price Per KM (₹)
              </label>
              <Input
                id="price-per-km"
                type="number"
                min="0"
                step="0.5"
                value={pricePerKm || ''}
                onChange={(e) => setPricePerKm(Number(e.target.value))}
                placeholder="e.g. 15"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="round-trip-base-price" className="text-sm font-medium">
                Round Trip Base Price (₹)
              </label>
              <Input
                id="round-trip-base-price"
                type="number"
                min="0"
                step="100"
                value={roundTripBasePrice || ''}
                onChange={(e) => setRoundTripBasePrice(Number(e.target.value))}
                placeholder="Optional - defaults to 90% of one way"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="round-trip-price-per-km" className="text-sm font-medium">
                Round Trip Price Per KM (₹)
              </label>
              <Input
                id="round-trip-price-per-km"
                type="number"
                min="0"
                step="0.5"
                value={roundTripPricePerKm || ''}
                onChange={(e) => setRoundTripPricePerKm(Number(e.target.value))}
                placeholder="Optional - defaults to 85% of one way"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="driver-allowance" className="text-sm font-medium">
                Driver Allowance (₹)
              </label>
              <Input
                id="driver-allowance"
                type="number"
                min="0"
                step="50"
                value={driverAllowance || ''}
                onChange={(e) => setDriverAllowance(Number(e.target.value))}
                placeholder="e.g. 300"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="night-halt-charge" className="text-sm font-medium">
                Night Halt Charge (₹)
              </label>
              <Input
                id="night-halt-charge"
                type="number"
                min="0"
                step="100"
                value={nightHaltCharge || ''}
                onChange={(e) => setNightHaltCharge(Number(e.target.value))}
                placeholder="e.g. 700"
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
      
      {tripType === 'local' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="extra-km-rate" className="text-sm font-medium">
                Extra KM Rate (₹)
              </label>
              <Input
                id="extra-km-rate"
                type="number"
                min="0"
                step="0.5"
                value={extraKmRate || ''}
                onChange={(e) => setExtraKmRate(Number(e.target.value))}
                placeholder="e.g. 15"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="extra-hour-rate" className="text-sm font-medium">
                Extra Hour Rate (₹)
              </label>
              <Input
                id="extra-hour-rate"
                type="number"
                min="0"
                step="50"
                value={extraHourRate || ''}
                onChange={(e) => setExtraHourRate(Number(e.target.value))}
                placeholder="e.g. 200"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="package-4hr-40km" className="text-sm font-medium">
                4 Hours / 40 KM (₹)
              </label>
              <Input
                id="package-4hr-40km"
                type="number"
                min="0"
                step="100"
                value={package4hr40km || ''}
                onChange={(e) => setPackage4hr40km(Number(e.target.value))}
                placeholder="e.g. 1200"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="package-8hr-80km" className="text-sm font-medium">
                8 Hours / 80 KM (₹)
              </label>
              <Input
                id="package-8hr-80km"
                type="number"
                min="0"
                step="100"
                value={package8hr80km || ''}
                onChange={(e) => setPackage8hr80km(Number(e.target.value))}
                placeholder="e.g. 2200"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="package-12hr-120km" className="text-sm font-medium">
                12 Hours / 120 KM (₹)
              </label>
              <Input
                id="package-12hr-120km"
                type="number"
                min="0"
                step="100"
                value={package12hr120km || ''}
                onChange={(e) => setPackage12hr120km(Number(e.target.value))}
                placeholder="e.g. 3000"
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
      
      {tripType === 'airport' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="pickup-price" className="text-sm font-medium">
                Airport Pickup Price (₹)
              </label>
              <Input
                id="pickup-price"
                type="number"
                min="0"
                step="100"
                value={pickupPrice || ''}
                onChange={(e) => setPickupPrice(Number(e.target.value))}
                placeholder="e.g. 800"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="drop-price" className="text-sm font-medium">
                Airport Drop Price (₹)
              </label>
              <Input
                id="drop-price"
                type="number"
                min="0"
                step="100"
                value={dropPrice || ''}
                onChange={(e) => setDropPrice(Number(e.target.value))}
                placeholder="e.g. 800"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="tier1-price" className="text-sm font-medium">
                Tier 1 Location Price (₹)
              </label>
              <Input
                id="tier1-price"
                type="number"
                min="0"
                step="100"
                value={tier1Price || ''}
                onChange={(e) => setTier1Price(Number(e.target.value))}
                placeholder="e.g. 600"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="tier2-price" className="text-sm font-medium">
                Tier 2 Location Price (₹)
              </label>
              <Input
                id="tier2-price"
                type="number"
                min="0"
                step="100"
                value={tier2Price || ''}
                onChange={(e) => setTier2Price(Number(e.target.value))}
                placeholder="e.g. 800"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="tier3-price" className="text-sm font-medium">
                Tier 3 Location Price (₹)
              </label>
              <Input
                id="tier3-price"
                type="number"
                min="0"
                step="100"
                value={tier3Price || ''}
                onChange={(e) => setTier3Price(Number(e.target.value))}
                placeholder="e.g. 1000"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="tier4-price" className="text-sm font-medium">
                Tier 4 Location Price (₹)
              </label>
              <Input
                id="tier4-price"
                type="number"
                min="0"
                step="100"
                value={tier4Price || ''}
                onChange={(e) => setTier4Price(Number(e.target.value))}
                placeholder="e.g. 1200"
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
      
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || isSaving || !selectedVehicle}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          `Update ${tripType.charAt(0).toUpperCase() + tripType.slice(1)} Fares`
        )}
      </Button>
    </form>
  );
}
