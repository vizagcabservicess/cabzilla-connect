
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CabType } from "@/types/cab";
import { updateVehicle } from "@/services/directVehicleService";

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

  useEffect(() => {
    if (open && initialVehicle) {
      // CRITICAL FIX: Ensure capacity values are explicitly parsed as numbers
      setVehicle({
        ...initialVehicle,
        capacity: parseInt(String(initialVehicle.capacity || 4), 10),
        luggageCapacity: parseInt(String(initialVehicle.luggageCapacity || 2), 10)
      });
      
      console.log("EditVehicleDialog initialized with:", {
        capacity: initialVehicle.capacity,
        luggageCapacity: initialVehicle.luggageCapacity,
        parsed_capacity: parseInt(String(initialVehicle.capacity || 4), 10),
        parsed_luggageCapacity: parseInt(String(initialVehicle.luggageCapacity || 2), 10)
      });
    }
  }, [initialVehicle, open]);

  // Parse numeric value and ensure it's a number
  const parseNumericValue = (value: any, defaultValue: number = 0): number => {
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Ensure capacity and luggageCapacity are explicit numbers
      const capacity = parseNumericValue(vehicle.capacity, 4);
      const luggageCapacity = parseNumericValue(vehicle.luggageCapacity, 2);
      
      // Log the values being sent for debugging
      console.log("EditVehicleDialog - Values before update:", {
        id: vehicle.id,
        capacity,
        luggageCapacity,
        rawCapacity: vehicle.capacity,
        rawLuggageCapacity: vehicle.luggageCapacity,
        type_capacity: typeof capacity,
        type_luggageCapacity: typeof luggageCapacity
      });
      
      const updatedVehicle = {
        ...vehicle,
        // CRITICAL FIX: Ensure these are explicitly numbers
        capacity: capacity,
        luggageCapacity: luggageCapacity,
        basePrice: parseNumericValue(vehicle.basePrice, 0),
        price: parseNumericValue(vehicle.price || vehicle.basePrice, 0),
        pricePerKm: parseNumericValue(vehicle.pricePerKm, 0),
        nightHaltCharge: parseNumericValue(vehicle.nightHaltCharge, 700),
        driverAllowance: parseNumericValue(vehicle.driverAllowance, 250)
      };
      
      console.log("EditVehicleDialog - Submitting vehicle update with data:", {
        ...updatedVehicle,
        capacity_type: typeof updatedVehicle.capacity,
        luggageCapacity_type: typeof updatedVehicle.luggageCapacity
      });
      
      // CRITICAL FIX: Explicitly set numeric properties to ensure they're treated as numbers
      const result = await updateVehicle({
        ...updatedVehicle,
        capacity: Number(capacity),
        luggageCapacity: Number(luggageCapacity)
      });
      
      console.log("EditVehicleDialog - Update response:", result);
      toast.success(`Vehicle ${vehicle.name} updated successfully`);
      onEditVehicle(updatedVehicle);
      onClose();
      
      // Force refresh
      window.dispatchEvent(new CustomEvent('vehicle-data-changed'));
    } catch (error: any) {
      console.error("Error updating vehicle:", error);
      toast.error(`Failed to update vehicle: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = parseInt(value, 10);
    console.log(`EditVehicleDialog - Capacity changed to: ${value}, parsed as: ${numericValue}`);
    setVehicle({ 
      ...vehicle, 
      capacity: isNaN(numericValue) ? 4 : numericValue
    });
  };
  
  const handleLuggageCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numericValue = parseInt(value, 10);
    console.log(`EditVehicleDialog - Luggage capacity changed to: ${value}, parsed as: ${numericValue}`);
    setVehicle({ 
      ...vehicle, 
      luggageCapacity: isNaN(numericValue) ? 2 : numericValue
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>
        
        {/* Add overflow-y-auto to make the form scrollable */}
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto px-1 py-2" style={{ maxHeight: "calc(80vh - 120px)" }}>
          {/* Basic Vehicle Information */}
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
                onChange={handleCapacityChange}
              />
              <p className="text-xs text-muted-foreground">
                Current value: {vehicle.capacity || 4} (type: {typeof vehicle.capacity})
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="luggageCapacity">Luggage Capacity</Label>
              <Input
                id="luggageCapacity"
                name="luggageCapacity"
                type="number"
                min={0}
                value={vehicle.luggageCapacity || 2}
                onChange={handleLuggageCapacityChange}
              />
              <p className="text-xs text-muted-foreground">
                Current value: {vehicle.luggageCapacity || 2} (type: {typeof vehicle.luggageCapacity})
              </p>
            </div>
          </div>
          
          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price</Label>
              <Input
                id="basePrice"
                name="basePrice"
                type="number"
                min={0}
                step={100}
                value={vehicle.basePrice || vehicle.price || 0}
                onChange={(e) => {
                  const basePrice = parseFloat(e.target.value) || 0;
                  setVehicle({ 
                    ...vehicle, 
                    basePrice: basePrice,
                    price: basePrice
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
                onChange={(e) => setVehicle({ 
                  ...vehicle, 
                  pricePerKm: parseFloat(e.target.value) || 0 
                })}
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
                onChange={(e) => setVehicle({ 
                  ...vehicle, 
                  driverAllowance: parseFloat(e.target.value) || 250 
                })}
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
                onChange={(e) => setVehicle({ 
                  ...vehicle, 
                  nightHaltCharge: parseFloat(e.target.value) || 700 
                })}
              />
            </div>
          </div>
          
          {/* Vehicle Image and Description */}
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
          
          {/* Amenities */}
          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 gap-2">
              {amenitiesList.map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={`amenity-${amenity}`}
                    checked={vehicle.amenities?.includes(amenity) || false}
                    onCheckedChange={(checked) => {
                      const currentAmenities = vehicle.amenities || [];
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
          
          {/* AC and Active Status */}
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

// List of common amenities
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
