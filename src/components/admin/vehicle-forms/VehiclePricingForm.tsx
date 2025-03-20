
import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { RefreshCw, Save, AlertTriangle } from "lucide-react";
import { PricingForm } from './PricingForm';
import { fareService } from '@/services/fareService';
import { getVehiclePricingUrls, getVehicleUpdateUrls } from '@/lib/apiEndpoints';

interface VehiclePricingFormProps {
  vehicles: any[];
  onSuccess?: (vehicleId: string, tripType: string) => void;
  onError?: (error: any) => void;
  tripType: string;
}

export const VehiclePricingForm: React.FC<VehiclePricingFormProps> = ({
  vehicles,
  onSuccess,
  onError,
  tripType
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [pricePerKm, setPricePerKm] = useState('');
  const [nightHaltCharge, setNightHaltCharge] = useState('');
  const [driverAllowance, setDriverAllowance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0]?.id || '');
    }
  }, [vehicles]);
  
  useEffect(() => {
    if (selectedVehicleId) {
      const vehicle = vehicles.find(v => v.id === selectedVehicleId);
      if (vehicle) {
        setBasePrice(vehicle.basePrice?.toString() || '0');
        setPricePerKm(vehicle.pricePerKm?.toString() || '0');
        setNightHaltCharge(vehicle.nightHaltCharge?.toString() || '0');
        setDriverAllowance(vehicle.driverAllowance?.toString() || '0');
        setError(null);
      }
    }
  }, [selectedVehicleId, vehicles]);
  
  const handleVehicleSelect = (value: string) => {
    setSelectedVehicleId(value);
  };
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedVehicleId) {
      toast.error("Please select a vehicle");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Get vehicle name for better error messages
      const vehicleName = vehicles.find(v => v.id === selectedVehicleId)?.name || selectedVehicleId;
      
      console.log(`Updating ${tripType} fare for ${vehicleName} (${selectedVehicleId}):`, {
        basePrice,
        pricePerKm,
        nightHaltCharge,
        driverAllowance
      });
      
      // Log available endpoints for debugging
      const pricingEndpoints = getVehiclePricingUrls();
      const updateEndpoints = getVehicleUpdateUrls();
      console.log("Available pricing endpoints:", pricingEndpoints);
      console.log("Available update endpoints:", updateEndpoints);
      
      // Clear all caches before update
      localStorage.removeItem('cabTypes');
      localStorage.removeItem('vehicleTypes');
      localStorage.removeItem('fareCache');
      fareService.clearCache();
      
      // Prepare data for API
      const fareData = {
        vehicleId: selectedVehicleId,
        vehicle_id: selectedVehicleId, // Alternative API field
        id: selectedVehicleId, // Another alternative
        name: vehicleName,
        basePrice: parseFloat(basePrice) || 0,
        base_price: parseFloat(basePrice) || 0, // Alternative field
        price: parseFloat(basePrice) || 0, // Another alternative
        pricePerKm: parseFloat(pricePerKm) || 0,
        price_per_km: parseFloat(pricePerKm) || 0, // Alternative field
        nightHaltCharge: parseFloat(nightHaltCharge) || 0,
        night_halt_charge: parseFloat(nightHaltCharge) || 0, // Alternative field
        driverAllowance: parseFloat(driverAllowance) || 0,
        driver_allowance: parseFloat(driverAllowance) || 0, // Alternative field
        tripType: tripType,
        trip_type: tripType // Alternative field
      };
      
      // Send update request directly to the vehicles-data.php endpoint with POST method
      const timestamp = Date.now();
      const urls = [
        `/api/fares/vehicles-data.php?_t=${timestamp}`,
        `/api/admin/vehicle-pricing.php?_t=${timestamp}`,
        `/api/admin/vehicles-update.php?_t=${timestamp}`,
        `https://saddlebrown-oryx-227656.hostingersite.com/api/fares/vehicles-data.php?_t=${timestamp}`,
        `https://saddlebrown-oryx-227656.hostingersite.com/api/admin/vehicle-pricing.php?_t=${timestamp}`,
        `https://saddlebrown-oryx-227656.hostingersite.com/api/admin/vehicles-update.php?_t=${timestamp}`
      ];

      let success = false;
      let lastError = null;

      for (const url of urls) {
        if (success) break;
        
        try {
          console.log(`Trying to update vehicle pricing at ${url}`);
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'X-Force-Refresh': 'true'
            },
            body: JSON.stringify(fareData)
          });
          
          if (response.ok) {
            console.log(`Successfully updated pricing at ${url}`);
            success = true;
          }
        } catch (error) {
          console.warn(`Failed to update at ${url}:`, error);
          lastError = error;
        }
      }
      
      // If direct POST failed, try with the standard method
      if (!success) {
        try {
          console.log("Trying standard fare service update method");
          success = await fareService.updateTripFares(
            selectedVehicleId,
            tripType,
            fareData,
            true // Force direct path
          );
        } catch (err) {
          console.warn("Standard update attempt failed:", err);
          lastError = err;
        }
      }
      
      if (success) {
        toast.success(`Vehicle pricing updated successfully for ${vehicleName}`);
        
        // Clear all caches after update
        localStorage.removeItem('cabTypes');
        localStorage.removeItem('vehicleTypes');
        localStorage.removeItem('fareCache');
        fareService.clearCache();
        
        if (onSuccess) {
          onSuccess(selectedVehicleId, tripType);
        }
      } else {
        throw new Error(lastError?.message || "All pricing update attempts failed");
      }
    } catch (err: any) {
      console.error("Error updating pricing:", err);
      setError(`Failed to update vehicle pricing: ${err.message || 'Unknown error'}. Please check server connectivity.`);
      if (onError) onError(err);
      
      toast.error(`Update failed: ${err.message || 'Server connection error'}`);
      
      // Auto-retry logic
      if (retryCount < 2) {
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        toast.info(`Retrying update (attempt ${newRetryCount})...`);
        
        // Wait briefly before retrying
        setTimeout(() => {
          handleSubmit(event);
        }, 1500);
      } else {
        toast.error("Maximum retry attempts reached. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select Vehicle Type</label>
          <Select value={selectedVehicleId} onValueChange={handleVehicleSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.name || vehicle.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <PricingForm
          basePrice={basePrice}
          setBasePrice={setBasePrice}
          pricePerKm={pricePerKm}
          setPricePerKm={setPricePerKm}
          nightHaltCharge={nightHaltCharge}
          setNightHaltCharge={setNightHaltCharge}
          driverAllowance={driverAllowance}
          setDriverAllowance={setDriverAllowance}
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={isSubmitting || !selectedVehicleId}
      >
        {isSubmitting ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Update {tripType.charAt(0).toUpperCase() + tripType.slice(1)} Pricing
          </>
        )}
      </Button>
    </form>
  );
};
