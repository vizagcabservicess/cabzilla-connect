
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
import { Card, CardContent } from "@/components/ui/card";
import { fareService } from '@/services/fareService';

interface LocalPackagePricingFormProps {
  vehicles: any[];
  onSuccess?: (vehicleId: string, tripType: string) => void;
  onError?: (error: any) => void;
}

export const LocalPackagePricingForm: React.FC<LocalPackagePricingFormProps> = ({
  vehicles,
  onSuccess,
  onError,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [hr8km80Price, setHr8km80Price] = useState('');
  const [hr10km100Price, setHr10km100Price] = useState('');
  const [extraKmRate, setExtraKmRate] = useState('');
  const [extraHourRate, setExtraHourRate] = useState('');
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
        setHr8km80Price(vehicle.hr8km80Price?.toString() || '1800');
        setHr10km100Price(vehicle.hr10km100Price?.toString() || '2200');
        setExtraKmRate(vehicle.extraKmRate?.toString() || '15');
        setExtraHourRate(vehicle.extraHourRate?.toString() || '150');
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
      
      console.log(`Updating local package fare for ${vehicleName} (${selectedVehicleId}):`, {
        hr8km80Price,
        hr10km100Price,
        extraKmRate,
        extraHourRate
      });
      
      // Clear all caches before update
      localStorage.removeItem('cabTypes');
      fareService.clearCache();
      
      // Prepare data for API
      const fareData = {
        name: vehicleName,
        hr8km80Price: parseFloat(hr8km80Price) || 0,
        hr10km100Price: parseFloat(hr10km100Price) || 0,
        extraKmRate: parseFloat(extraKmRate) || 0,
        extraHourRate: parseFloat(extraHourRate) || 0
      };
      
      // Send update request
      const success = await fareService.updateTripFares(
        selectedVehicleId,
        'local',
        fareData
      );
      
      if (success) {
        onSuccess?.(selectedVehicleId, 'local');
      } else {
        throw new Error("Failed to update local package pricing");
      }
    } catch (err: any) {
      console.error("Error updating local package pricing:", err);
      setError(`Failed to update local package pricing: ${err.message || 'Unknown error'}`);
      onError?.(err);
      
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
        
        <Card className="bg-white shadow-md">
          <CardContent className="pt-6">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">8hr/80km Package (₹)</label>
                  <Input 
                    type="number" 
                    value={hr8km80Price} 
                    onChange={(e) => setHr8km80Price(e.target.value)} 
                    placeholder="e.g., 1800" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">10hr/100km Package (₹)</label>
                  <Input 
                    type="number" 
                    value={hr10km100Price} 
                    onChange={(e) => setHr10km100Price(e.target.value)} 
                    placeholder="e.g., 2200" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Extra Km Rate (₹)</label>
                  <Input 
                    type="number" 
                    value={extraKmRate} 
                    onChange={(e) => setExtraKmRate(e.target.value)} 
                    placeholder="e.g., 15" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Extra Hour Rate (₹)</label>
                  <Input 
                    type="number" 
                    value={extraHourRate} 
                    onChange={(e) => setExtraHourRate(e.target.value)} 
                    placeholder="e.g., 150" 
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
            Update Local Package Pricing
          </>
        )}
      </Button>
    </form>
  );
};
