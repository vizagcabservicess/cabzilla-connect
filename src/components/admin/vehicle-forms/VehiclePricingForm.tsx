
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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PricingForm } from './PricingForm';
import { fareService } from '@/services/fareService';
import { getVehiclePricingUrls } from '@/lib/apiEndpoints';

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
      const endpoints = getVehiclePricingUrls();
      console.log("Available pricing endpoints:", endpoints);
      
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
      const success = await fareService.updateTripFares(
        selectedVehicleId,
        tripType,
        fareData
      );
      
      if (success) {
        toast.success(`Vehicle pricing updated successfully for ${vehicleName}`);
        onSuccess?.(selectedVehicleId, tripType);
      } else {
        // Try alternate approach if failure
        console.log("First attempt failed, trying alternate approach...");
        const alternateType = tripType === 'base' ? 'outstation' : 'base';
        
        // Retry with fallback trip type
        const fallbackSuccess = await fareService.updateTripFares(
          selectedVehicleId,
          alternateType,
          fareData
        );
        
        if (fallbackSuccess) {
          toast.success(`Updated vehicle pricing using fallback method`);
          onSuccess?.(selectedVehicleId, alternateType);
        } else {
          throw new Error("All pricing update attempts failed");
        }
      }
    } catch (err: any) {
      console.error("Error updating pricing:", err);
      setError(`Failed to update vehicle pricing: ${err.message || 'Unknown error'}. Please check server connectivity.`);
      onError?.(err);
      
      toast.error(`Update failed: ${err.message || 'Server connection error'}`);
      
      // Auto-retry logic
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        toast.info(`Retrying update (attempt ${retryCount + 1})...`);
        
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
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
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
