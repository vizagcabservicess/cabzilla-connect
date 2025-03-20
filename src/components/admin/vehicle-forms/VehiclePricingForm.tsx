
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
      fareService.clearCache();
      
      // Prepare data for API
      const fareData = {
        vehicleId: selectedVehicleId,
        name: vehicleName,
        basePrice: parseFloat(basePrice) || 0,
        pricePerKm: parseFloat(pricePerKm) || 0,
        nightHaltCharge: parseFloat(nightHaltCharge) || 0,
        driverAllowance: parseFloat(driverAllowance) || 0,
        tripType: tripType
      };
      
      // Send update request
      let success = false;
      
      // First try with the standard method
      try {
        success = await fareService.updateTripFares(
          selectedVehicleId,
          tripType,
          fareData
        );
      } catch (err) {
        console.warn("First update attempt failed:", err);
      }
      
      // If standard method failed, try alternate approach
      if (!success) {
        console.log("First attempt failed, trying alternate approach...");
        
        // Try with alternate trip type
        const alternateType = tripType === 'base' ? 'outstation' : 'base';
        
        try {
          const fallbackSuccess = await fareService.updateTripFares(
            selectedVehicleId,
            alternateType,
            fareData
          );
          
          if (fallbackSuccess) {
            console.log("Updated vehicle pricing using alternate trip type");
            success = true;
            if (onSuccess) onSuccess(selectedVehicleId, alternateType);
          }
        } catch (err) {
          console.warn("Alternate trip type approach failed:", err);
        }
      }
      
      // If both methods failed, try one more approach with direct endpoint override
      if (!success) {
        console.log("Trying direct endpoint override approach...");
        fareService.clearCache();
        
        try {
          // Set a flag to force direct API path
          const forceDirectPath = true;
          const directSuccess = await fareService.updateTripFares(
            selectedVehicleId,
            tripType,
            fareData,
            forceDirectPath
          );
          
          if (directSuccess) {
            console.log("Updated vehicle pricing using direct path override");
            success = true;
            if (onSuccess) onSuccess(selectedVehicleId, tripType);
          }
        } catch (err) {
          console.warn("Direct path override approach failed:", err);
        }
      }
      
      if (success) {
        toast.success(`Vehicle pricing updated successfully for ${vehicleName}`);
        // If we haven't already called onSuccess in one of the fallback methods
        if (onSuccess && tripType) {
          onSuccess(selectedVehicleId, tripType);
        }
      } else {
        throw new Error("All pricing update attempts failed");
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
            Update Base Pricing
          </>
        )}
      </Button>
    </form>
  );
};
