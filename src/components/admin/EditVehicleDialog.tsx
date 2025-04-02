import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { CabType } from "@/types/cab";
import { updateVehicle } from "@/services/directVehicleService";
import { parseAmenities, parseNumericValue } from '@/utils/safeStringUtils';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FareUpdateError } from '@/components/cab-options/FareUpdateError';

interface EditVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onEditVehicle: (vehicle: CabType) => void;
  vehicle: CabType;
}

export function EditVehicleDialog({
  open,
  onClose,
  onEditVehicle,
  vehicle: initialVehicle
}: EditVehicleDialogProps) {
  const [vehicle, setVehicle] = useState<CabType>(initialVehicle);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (initialVehicle && open) {
      console.log('Initial vehicle data received:', initialVehicle);
      
      const numCapacity = parseNumericValue(initialVehicle.capacity, 4);
      const numLuggageCapacity = parseNumericValue(initialVehicle.luggageCapacity, 2);
      const numBasePrice = parseNumericValue(initialVehicle.basePrice || initialVehicle.price, 0);
      const numPricePerKm = parseNumericValue(initialVehicle.pricePerKm, 0);
      const numDriverAllowance = parseNumericValue(initialVehicle.driverAllowance, 250);
      const numNightHaltCharge = parseNumericValue(initialVehicle.nightHaltCharge, 700);
      
      const vehicleAmenities = parseAmenities(initialVehicle.amenities);
      
      console.log('Parsed numeric values:');
      console.log('- capacity:', initialVehicle.capacity, '->', numCapacity);
      console.log('- luggageCapacity:', initialVehicle.luggageCapacity, '->', numLuggageCapacity);
      console.log('- basePrice:', initialVehicle.basePrice, '->', numBasePrice);
      console.log('- price per km:', initialVehicle.pricePerKm, '->', numPricePerKm);
      console.log('- nightHaltCharge:', initialVehicle.nightHaltCharge, '->', numNightHaltCharge);
      console.log('- driverAllowance:', initialVehicle.driverAllowance, '->', numDriverAllowance);
      
      setServerError(null);
      
      setVehicle({
        ...initialVehicle,
        capacity: numCapacity,
        luggageCapacity: numLuggageCapacity,
        basePrice: numBasePrice,
        price: numBasePrice,
        pricePerKm: numPricePerKm,
        driverAllowance: numDriverAllowance,
        nightHaltCharge: numNightHaltCharge,
        amenities: vehicleAmenities
      });
      
      setIsInitialized(true);
    }
  }, [initialVehicle, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setServerError(null);
    
    try {
      console.log('Submitting vehicle data:', vehicle);

      const updatedVehicle: CabType = {
        ...vehicle,
        capacity: Number(vehicle.capacity),
        luggageCapacity: Number(vehicle.luggageCapacity),
        basePrice: Number(vehicle.basePrice || 0),
        price: Number(vehicle.basePrice || 0),
        pricePerKm: Number(vehicle.pricePerKm || 0),
        nightHaltCharge: Number(vehicle.nightHaltCharge || 700),
        driverAllowance: Number(vehicle.driverAllowance || 250)
      };
      
      console.log("Prepared vehicle data for update:", updatedVehicle);
      
      const maxRetries = 3;
      let attempt = 0;
      let success = false;
      let lastError: any = null;
      
      while (attempt < maxRetries && !success) {
        try {
          const response = await updateVehicle(updatedVehicle);
          console.log("Vehicle update API response:", response);
          success = true;
          
          toast.success(`Vehicle ${vehicle.name} updated successfully`);
          onEditVehicle(updatedVehicle);
          onClose();
          return; // Exit on success
        } catch (error: any) {
          attempt++;
          lastError = error;
          console.error(`Update attempt ${attempt} failed:`, error);
          
          if (error.message && (error.message.includes('404') || error.response?.status === 404)) {
            console.error("404 error detected - API endpoint not found");
            throw new Error(`API endpoint not found (404): The update-vehicle.php endpoint could not be found on the server. Please check your server configuration.`);
          }
          
          if (attempt >= maxRetries) {
            throw error; // Rethrow after max retries
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
      
      if (lastError) throw lastError;
      
    } catch (error: any) {
      console.error("Error updating vehicle:", error);
      
      const errorMessage = error.response?.data?.message || error.message || "Unknown error";
      const errorDetails = error.response?.data?.data || error.response?.data?.error || {};
      
      setServerError(`Failed to update vehicle: ${errorMessage}`);
      
      toast.error(`Failed to update vehicle: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setServerError(null);
    handleSubmit(new Event('submit') as any);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>
        
        {serverError && (
          <FareUpdateError 
            message={serverError}
            onRetry={handleRetry}
            isAdmin={true}
            title="Database Error"
            description="There was an issue connecting to the database. This could be due to a temporary network issue or server maintenance."
          />
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-1 py-2" style={{ maxHeight: "calc(80vh - 120px)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">Vehicle ID</Label>
              <Input
                id="id"
                name="id"
                value={vehicle.id || ''}
                onChange={(e) => setVehicle({ ...vehicle, id: e.target.value })}
                disabled
              />
              <p className="text-xs text-muted-foreground">Vehicle ID cannot be changed</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Vehicle Name</Label>
              <Input
                id="name"
                name="name"
                value={vehicle.name || ''}
                onChange={(e) => setVehicle({ ...vehicle, name: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Seating Capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                value={vehicle.capacity || 4}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setVehicle({ 
                    ...vehicle, 
                    capacity: isNaN(value) ? 4 : value 
                  });
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="luggageCapacity">Luggage Capacity</Label>
              <Input
                id="luggageCapacity"
                name="luggageCapacity"
                type="number"
                min={0}
                value={vehicle.luggageCapacity || 2}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setVehicle({ 
                    ...vehicle, 
                    luggageCapacity: isNaN(value) ? 2 : value
                  });
                }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price</Label>
              <Input
                id="basePrice"
                name="basePrice"
                type="number"
                min={0}
                step={100}
                value={vehicle.basePrice || 0}
                onChange={(e) => {
                  const basePrice = parseFloat(e.target.value) || 0;
                  setVehicle({ 
                    ...vehicle, 
                    basePrice: basePrice,
                    price: basePrice  // Keep price synchronized
                  });
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pricePerKm">Price Per KM</Label>
              <Input
                id="pricePerKm"
                name="pricePerKm"
                type="number"
                min={0}
                step={0.5}
                value={vehicle.pricePerKm || 0}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setVehicle({ 
                    ...vehicle, 
                    pricePerKm: isNaN(value) ? 0 : value 
                  });
                }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="driverAllowance">Driver Allowance</Label>
              <Input
                id="driverAllowance"
                name="driverAllowance"
                type="number"
                min={0}
                step={50}
                value={vehicle.driverAllowance || 250}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setVehicle({ 
                    ...vehicle, 
                    driverAllowance: isNaN(value) ? 250 : value 
                  });
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nightHaltCharge">Night Halt Charge</Label>
              <Input
                id="nightHaltCharge"
                name="nightHaltCharge"
                type="number"
                min={0}
                step={50}
                value={vehicle.nightHaltCharge || 700}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  setVehicle({ 
                    ...vehicle, 
                    nightHaltCharge: isNaN(value) ? 700 : value 
                  });
                }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              name="image"
              value={vehicle.image || ''}
              onChange={(e) => setVehicle({ ...vehicle, image: e.target.value })}
              placeholder="/cars/vehicle-name.png"
            />
            <p className="text-xs text-muted-foreground">Path to vehicle image (e.g., /cars/sedan.png)</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={vehicle.description || ''}
              onChange={(e) => setVehicle({ ...vehicle, description: e.target.value })}
              placeholder="Enter vehicle description"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 gap-2">
              {amenitiesList.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity}`}
                    checked={(vehicle.amenities || []).includes(amenity)}
                    onCheckedChange={(checked) => {
                      const currentAmenities = Array.isArray(vehicle.amenities) 
                        ? [...vehicle.amenities] 
                        : [];
                      
                      const newAmenities = checked
                        ? [...currentAmenities, amenity]
                        : currentAmenities.filter((a) => a !== amenity);
                      
                      setVehicle({ ...vehicle, amenities: newAmenities });
                    }}
                  />
                  <label
                    htmlFor={`amenity-${amenity}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {amenity}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="ac-toggle"
                checked={vehicle.ac !== false}
                onCheckedChange={(checked) => setVehicle({ ...vehicle, ac: checked })}
              />
              <Label htmlFor="ac-toggle">Vehicle has AC</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="active-toggle"
                checked={vehicle.isActive !== false}
                onCheckedChange={(checked) => setVehicle({ ...vehicle, isActive: checked })}
              />
              <Label htmlFor="active-toggle">Vehicle is Active</Label>
            </div>
          </div>
          
          <DialogFooter className="mt-4 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const amenitiesList = [
  "AC",
  "Bottle Water",
  "Music System",
  "Extra Legroom",
  "Charging Point",
  "WiFi",
  "Premium Amenities",
  "Entertainment System",
  "Refrigerator",
];
