
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

interface AirportPricingFormProps {
  vehicles: any[];
  onSuccess?: (vehicleId: string, tripType: string) => void;
  onError?: (error: any) => void;
}

export const AirportPricingForm: React.FC<AirportPricingFormProps> = ({
  vehicles,
  onSuccess,
  onError,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [pricePerKm, setPricePerKm] = useState('');
  const [airportFee, setAirportFee] = useState('');
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
        setAirportFee(vehicle.airportFee?.toString() || '200');
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
      
      console.log(`Updating airport fare for ${vehicleName} (${selectedVehicleId}):`, {
        basePrice,
        pricePerKm,
        airportFee
      });
      
      // Clear all caches before update
      localStorage.removeItem('cabTypes');
      fareService.clearCache();
      
      // Prepare data for API
      const fareData = {
        name: vehicleName,
        basePrice: parseFloat(basePrice) || 0,
        pricePerKm: parseFloat(pricePerKm) || 0,
        airportFee: parseFloat(airportFee) || 0
      };
      
      // Send update request
      const success = await fareService.updateTripFares(
        selectedVehicleId,
        'airport',
        fareData
      );
      
      if (success) {
        onSuccess?.(selectedVehicleId, 'airport');
      } else {
        throw new Error("Failed to update airport pricing");
      }
    } catch (err: any) {
      console.error("Error updating airport pricing:", err);
      setError(`Failed to update airport pricing: ${err.message || 'Unknown error'}`);
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
                  <label className="text-sm font-medium">Base Price (₹)</label>
                  <Input 
                    type="number" 
                    value={basePrice} 
                    onChange={(e) => setBasePrice(e.target.value)} 
                    placeholder="e.g., 1200" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Price per Km (₹)</label>
                  <Input 
                    type="number" 
                    value={pricePerKm} 
                    onChange={(e) => setPricePerKm(e.target.value)} 
                    placeholder="e.g., 12" 
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Airport Fee (₹)</label>
                <Input 
                  type="number" 
                  value={airportFee} 
                  onChange={(e) => setAirportFee(e.target.value)} 
                  placeholder="e.g., 200" 
                />
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
            Update Airport Pricing
          </>
        )}
      </Button>
    </form>
  );
};
