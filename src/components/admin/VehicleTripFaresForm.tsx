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
  updateLocalFare, 
  updateAirportFare,
  syncLocalFares,
  syncAirportFares
} from "@/services/fareManagementService";
import { LocalFareData, AirportFareData } from '@/types/cab';
import { getVehicleTypes } from '@/services/vehicleDataService';
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from 'sonner';
import { directVehicleOperation } from '@/utils/apiHelper';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const updateOutstationFares = async (
  vehicleId: string,
  basePrice: number,
  pricePerKm: number,
  roundTripBasePrice: number,
  roundTripPricePerKm: number,
  driverAllowance: number,
  nightHaltCharge: number
) => {
  try {
    const result = await directVehicleOperation('/api/admin/outstation-fares-update.php', 'POST', {
      headers: {
        'X-Admin-Mode': 'true',
        'Content-Type': 'application/json'
      },
      data: {
        vehicleId,
        basePrice,
        pricePerKm,
        roundTripBasePrice,
        roundTripPricePerKm,
        driverAllowance,
        nightHaltCharge
      }
    });
    
    return result;
  } catch (error) {
    console.error('Error updating outstation fares:', error);
    throw error;
  }
};

const getAllOutstationFares = async () => {
  try {
    const result = await directVehicleOperation('/api/admin/direct-outstation-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
    
    return result.fares || {};
  } catch (error) {
    console.error('Error getting all outstation fares:', error);
    return {};
  }
};

const getAllLocalFares = async () => {
  try {
    const result = await directVehicleOperation('/api/admin/direct-local-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
    
    return result.fares || {};
  } catch (error) {
    console.error('Error getting all local fares:', error);
    return {};
  }
};

const getAllAirportFares = async () => {
  try {
    const result = await directVehicleOperation('/api/admin/direct-airport-fares.php', 'GET', {
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
    
    return result.fares || {};
  } catch (error) {
    console.error('Error getting all airport fares:', error);
    return {};
  }
};

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
  const [loadingError, setLoadingError] = useState<string | null>(null);
  
  const [basePrice, setBasePrice] = useState<number>(0);
  const [pricePerKm, setPricePerKm] = useState<number>(0);
  const [roundTripBasePrice, setRoundTripBasePrice] = useState<number>(0);
  const [roundTripPricePerKm, setRoundTripPricePerKm] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(300);
  const [nightHaltCharge, setNightHaltCharge] = useState<number>(700);
  
  const [extraKmRate, setExtraKmRate] = useState<number>(0);
  const [extraHourRate, setExtraHourRate] = useState<number>(0);
  const [package4hr40km, setPackage4hr40km] = useState<number>(0);
  const [package8hr80km, setPackage8hr80km] = useState<number>(0);
  const [package12hr120km, setPackage12hr120km] = useState<number>(0);
  
  const [pickupPrice, setPickupPrice] = useState<number>(0);
  const [dropPrice, setDropPrice] = useState<number>(0);
  const [tier1Price, setTier1Price] = useState<number>(0);
  const [tier2Price, setTier2Price] = useState<number>(0);
  const [tier3Price, setTier3Price] = useState<number>(0);
  const [tier4Price, setTier4Price] = useState<number>(0);
  
  useEffect(() => {
    const loadVehicles = async () => {
      setIsLoading(true);
      setLoadingError(null);
      try {
        console.log(`Loading vehicles for ${tripType} management...`);
        
        let allVehicles: {id: string, name: string}[] = [];
        
        try {
          const apiResponse = await directVehicleOperation('/api/admin/get-vehicles.php', 'GET', {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Debug': 'true'
            },
            data: {
              includeInactive: 'true',
              force_sync: 'true',
              _t: Date.now()
            }
          });
          
          if (apiResponse && apiResponse.vehicles && Array.isArray(apiResponse.vehicles)) {
            console.log(`Received ${apiResponse.vehicles.length} vehicles from API`);
            
            apiResponse.vehicles.forEach((v: any) => {
              const vehicleId = v.id || v.vehicleId || v.vehicle_id || '';
              if (vehicleId) {
                allVehicles.push({
                  id: vehicleId,
                  name: v.name || vehicleId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                });
              }
            });
          }
        } catch (apiError) {
          console.error("Error fetching from direct API:", apiError);
        }
        
        if (tripType === 'outstation') {
          try {
            console.log("Fetching outstation fares directly");
            const outFares = await getAllOutstationFares();
            console.log('Loaded outstation fares:', outFares);
            setAllFares(outFares);
            
            Object.keys(outFares).forEach(vehicleId => {
              if (vehicleId && !allVehicles.some(v => v.id === vehicleId)) {
                allVehicles.push({
                  id: vehicleId,
                  name: outFares[vehicleId].name || 
                       vehicleId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                });
              }
            });
          } catch (fareError) {
            console.error("Error loading outstation fares:", fareError);
          }
          
          if (allVehicles.length < 3) {
            try {
              const legacyResult = await directVehicleOperation('/api/admin/direct-vehicle-pricing.php', 'GET', {
                headers: {
                  'X-Admin-Mode': 'true',
                  'X-Debug': 'true'
                },
                data: {
                  force_sync: 'true',
                  _t: Date.now()
                }
              });
              
              if (legacyResult && legacyResult.vehicles) {
                Object.keys(legacyResult.vehicles).forEach(vehicleId => {
                  if (!allVehicles.some(v => v.id === vehicleId)) {
                    allVehicles.push({
                      id: vehicleId,
                      name: legacyResult.vehicles[vehicleId].name || vehicleId
                    });
                  }
                });
              }
            } catch (legacyError) {
              console.error("Error fetching from legacy API:", legacyError);
            }
          }
        } else if (tripType === 'local') {
          try {
            const localFares = await getAllLocalFares();
            setAllFares(localFares);
            
            Object.keys(localFares).forEach(vehicleId => {
              if (!allVehicles.some(v => v.id === vehicleId)) {
                allVehicles.push({
                  id: vehicleId,
                  name: localFares[vehicleId].name || 
                       vehicleId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                });
              }
            });
          } catch (error) {
            console.error('Error fetching local fares:', error);
          }
        } else if (tripType === 'airport') {
          try {
            const airportFares = await getAllAirportFares();
            setAllFares(airportFares);
            
            Object.keys(airportFares).forEach(vehicleId => {
              if (!allVehicles.some(v => v.id === vehicleId)) {
                allVehicles.push({
                  id: vehicleId,
                  name: airportFares[vehicleId].name || 
                       vehicleId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                });
              }
            });
          } catch (error) {
            console.error('Error fetching airport fares:', error);
          }
        }
        
        try {
          const vehicleTypes = await getVehicleTypes();
          
          if (Array.isArray(vehicleTypes)) {
            vehicleTypes.forEach((vType: any) => {
              if (typeof vType === 'string') {
                if (!allVehicles.some(v => v.id === vType)) {
                  allVehicles.push({
                    id: vType,
                    name: vType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  });
                }
              } else if (vType && typeof vType === 'object' && 'id' in vType) {
                if (!allVehicles.some(v => v.id === vType.id)) {
                  allVehicles.push({
                    id: vType.id,
                    name: vType.name || vType.id
                  });
                }
              }
            });
          } else {
            console.warn("getVehicleTypes did not return an array:", vehicleTypes);
          }
        } catch (error) {
          console.error('Error loading vehicle types:', error);
        }
        
        allVehicles.sort((a, b) => a.name.localeCompare(b.name));
        
        const uniqueVehicles = allVehicles.filter((v, i, self) => 
          self.findIndex(x => x.id === v.id) === i
        );
        
        console.log(`Final list of ${uniqueVehicles.length} vehicles for ${tripType} management:`, uniqueVehicles);
        
        if (uniqueVehicles.length === 0) {
          setLoadingError('No vehicles found. Please check your connection or try again.');
        } else {
          setVehicles(uniqueVehicles);
        }
      } catch (error) {
        console.error('Error loading vehicle data:', error);
        setLoadingError('Failed to load vehicles. Please check your connection and try again.');
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
        setBasePrice(Number(fares.basePrice) || 0);
        setPricePerKm(Number(fares.pricePerKm) || 0);
        setRoundTripBasePrice(Number(fares.roundTripBasePrice) || 0);
        setRoundTripPricePerKm(Number(fares.roundTripPricePerKm) || 0);
        setDriverAllowance(Number(fares.driverAllowance) || 300);
        setNightHaltCharge(Number(fares.nightHaltCharge) || 700);
      } else if (tripType === 'local') {
        setExtraKmRate(Number(fares.extraKmRate) || 0);
        setExtraHourRate(Number(fares.extraHourRate) || 0);
        
        if (fares.packages && fares.packages.length) {
          const pkg4hr = fares.packages.find((p: any) => p.hours === 4 && p.km === 40);
          const pkg8hr = fares.packages.find((p: any) => p.hours === 8 && p.km === 80);
          const pkg12hr = fares.packages.find((p: any) => p.hours === 12 && p.km === 120);
          
          setPackage4hr40km(pkg4hr ? Number(pkg4hr.price) : 0);
          setPackage8hr80km(pkg8hr ? Number(pkg8hr.price) : 0);
          setPackage12hr120km(pkg12hr ? Number(pkg12hr.price) : 0);
        }
      } else if (tripType === 'airport') {
        setPickupPrice(Number(fares.pickup) || 0);
        setDropPrice(Number(fares.drop) || 0);
        setTier1Price(Number(fares.tier1) || 0);
        setTier2Price(Number(fares.tier2) || 0);
        setTier3Price(Number(fares.tier3) || 0);
        setTier4Price(Number(fares.tier4) || 0);
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
          setIsSaving(false);
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
          setIsSaving(false);
          return;
        }
        
        const localFareData: LocalFareData = {
          vehicleId: selectedVehicle,
          price4hrs40km: package4hr40km,
          price8hrs80km: package8hr80km,
          price10hrs100km: package12hr120km,
          priceExtraHour: extraHourRate,
          priceExtraKm: extraKmRate
        };
        
        await updateLocalFare(localFareData);
        
        toast.success(`Updated local fares for ${selectedVehicle}`);
      } else if (tripType === 'airport') {
        if (pickupPrice <= 0 || dropPrice <= 0) {
          toast.error('Pickup and drop prices must be greater than zero');
          setIsSaving(false);
          return;
        }
        
        const airportFareData: AirportFareData = {
          vehicleId: selectedVehicle,
          basePrice: 0,
          pricePerKm: 0,
          pickupPrice: pickupPrice,
          dropPrice: dropPrice,
          tier1Price: tier1Price,
          tier2Price: tier2Price,
          tier3Price: tier3Price,
          tier4Price: tier4Price,
          extraKmCharge: 0
        };
        
        await updateAirportFare(airportFareData);
        
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
              <ScrollArea className="h-[300px]">
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </SelectItem>
                ))}
              </ScrollArea>
            ) : (
              <div className="py-2 text-center text-sm text-gray-500">
                No vehicles found
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
      
      {loadingError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{loadingError}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardContent className="pt-6">
          <ScrollArea className="h-[400px] pr-4">
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
                      placeholder="Optional - defaults to 90% of one-way"
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
                      placeholder="Optional - defaults to 85% of one-way"
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
          </ScrollArea>
        </CardContent>
      </Card>
      
      <Button
        type="submit"
        className="w-full"
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Fares'
        )}
      </Button>
    </form>
  );
}
