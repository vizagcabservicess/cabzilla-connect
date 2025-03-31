import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { CabType } from "@/types/cab";
import { updateVehicle } from "@/services/directVehicleService";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface EditVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onEditVehicle: (vehicle: CabType) => void;
  vehicle: CabType;
}

// Create a new interface that extends CabType to include amenitiesString
interface VehicleFormData extends Partial<CabType> {
  amenitiesString?: string;
}

export function EditVehicleDialog({ open, onClose, onEditVehicle, vehicle }: EditVehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<VehicleFormData>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updateAttempts, setUpdateAttempts] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const [originalVehicle, setOriginalVehicle] = useState<CabType | null>(null);

  useEffect(() => {
    if (vehicle) {
      console.log("Selected vehicle for editing:", vehicle);
      
      // Store the original vehicle for later comparison
      setOriginalVehicle({...vehicle});
      
      // Convert amenities array to comma-separated string for the form input
      const amenitiesString = Array.isArray(vehicle.amenities) 
        ? vehicle.amenities.join(', ') 
        : '';
        
      setFormData({
        ...vehicle,
        // Store amenities as a string in a separate property for form handling
        amenitiesString: amenitiesString
      });
      
      // Clear any previous error
      setErrorMessage(null);
      setUpdateAttempts(0);
      setRetrying(false);
    }
  }, [vehicle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'capacity' || name === 'luggageCapacity' || name === 'pricePerKm' || name === 'price' || name === 'nightHaltCharge' || name === 'driverAllowance'
        ? Number(value)
        : value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isActive: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Vehicle name is required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setUpdateAttempts(prev => prev + 1);
      setRetrying(false);
      
      // Format the data - Ensure we're not sending duplicate or conflicting fields
      // Start with the original vehicle to preserve all fields
      const vehicleData: CabType = {
        ...originalVehicle,
        ...formData,
        // Convert the amenitiesString back to an array
        amenities: formData.amenitiesString 
          ? formData.amenitiesString.split(',').map(item => item.trim()) 
          : originalVehicle?.amenities || [],
        id: vehicle.id, // Ensure ID remains unchanged
        vehicleId: vehicle.id, // Ensure vehicleId is also set correctly
        description: formData.description || '', // Explicitly set description, don't use originalVehicle.description as fallback
        // Explicitly set pricing fields to resolve the 'base_price' error
        basePrice: formData.price || originalVehicle?.price || 0,
        price: formData.price || originalVehicle?.price || 0
      };
      
      // Remove amenitiesString as it's not part of CabType
      delete (vehicleData as any).amenitiesString;
      
      console.log('Submitting vehicle update with data:', vehicleData);
      
      // Update the vehicle
      const updatedVehicle = await updateVehicle(vehicle.id, vehicleData);
      
      // Ensure description is properly preserved in the result
      updatedVehicle.description = vehicleData.description;
      
      // Notify parent component
      onEditVehicle(updatedVehicle);
      
      // Success message
      toast.success(`Vehicle ${vehicleData.name} updated successfully`);
      
      // Close dialog
      onClose();
      
    } catch (error) {
      console.error("Error updating vehicle:", error);
      
      // Set error message for display
      setErrorMessage(error instanceof Error ? error.message : "Failed to update vehicle. Please try again.");
      
      // Show toast notification
      toast.error("Failed to update vehicle. Please see details in the form.");
      
      // If multiple attempts, provide more guidance
      if (updateAttempts > 1) {
        setErrorMessage(prev => `${prev || ""}\n\nTry refreshing the page or check if the server is accessible.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      // Try to invalidate any cache and reset state
      window.dispatchEvent(new CustomEvent('vehicle-data-cache-cleared', {
        detail: { timestamp: Date.now() }
      }));
      
      // Wait a moment to ensure cache is cleared
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Retry submission
      handleSubmit(new Event('submit') as any);
    } catch (error) {
      console.error("Error during retry:", error);
      setRetrying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
          <DialogDescription>
            Update the vehicle information. ID cannot be changed.
          </DialogDescription>
        </DialogHeader>
        
        {errorMessage && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="whitespace-pre-line">{errorMessage}</AlertDescription>
            
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry} 
                disabled={retrying || isSubmitting}
                className="flex items-center gap-1"
              >
                {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Retry
              </Button>
            </div>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">Vehicle ID</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="id"
                  value={vehicle.id}
                  disabled
                  className="bg-gray-100"
                />
                {formData.isActive ? (
                  <Badge variant="default" className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gray-400">Inactive</Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Vehicle Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                placeholder="Sedan"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Seating Capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                value={formData.capacity || 0}
                onChange={handleChange}
                min={1}
                max={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="luggageCapacity">Luggage Capacity</Label>
              <Input
                id="luggageCapacity"
                name="luggageCapacity"
                type="number"
                value={formData.luggageCapacity || 0}
                onChange={handleChange}
                min={0}
                max={10}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Base Price (₹)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={formData.price || 0}
                onChange={handleChange}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerKm">Price per KM (₹)</Label>
              <Input
                id="pricePerKm"
                name="pricePerKm"
                type="number"
                value={formData.pricePerKm || 0}
                onChange={handleChange}
                min={0}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nightHaltCharge">Night Halt Charge (₹)</Label>
              <Input
                id="nightHaltCharge"
                name="nightHaltCharge"
                type="number"
                value={formData.nightHaltCharge || 0}
                onChange={handleChange}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driverAllowance">Driver Allowance (₹)</Label>
              <Input
                id="driverAllowance"
                name="driverAllowance"
                type="number"
                value={formData.driverAllowance || 0}
                onChange={handleChange}
                min={0}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amenitiesString">Amenities (comma separated)</Label>
            <Input
              id="amenitiesString"
              name="amenitiesString"
              value={formData.amenitiesString || ''}
              onChange={handleChange}
              placeholder="AC, Bottle Water, Music System"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Comfortable sedan suitable for 4 passengers."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              name="image"
              value={formData.image || ''}
              onChange={handleChange}
              placeholder="/cars/sedan.png"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive ?? vehicle.isActive ?? true}
              onCheckedChange={handleSwitchChange}
            />
            <Label htmlFor="isActive">Active Status</Label>
          </div>
          
          <DialogFooter className="flex justify-end pt-4 gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Vehicle"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
