
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { CabType } from "@/types/cab";
import { updateVehicle } from "@/services/directVehicleService";
import { toast } from "sonner";

interface EditVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onEditVehicle: (vehicle: CabType) => void;
  vehicle: CabType;
}

export function EditVehicleDialog({ open, onClose, onEditVehicle, vehicle }: EditVehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<CabType>>({});

  useEffect(() => {
    if (vehicle) {
      setFormData({
        ...vehicle,
        amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities.join(', ') : ''
      });
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
      
      // Format the data
      const vehicleData: CabType = {
        ...vehicle,
        ...formData,
        amenities: typeof formData.amenities === 'string' 
          ? formData.amenities.split(',').map(item => item.trim()) 
          : formData.amenities || vehicle.amenities,
        id: vehicle.id // Ensure ID remains unchanged
      };
      
      // Update the vehicle
      await updateVehicle(vehicle.id, vehicleData);
      
      // Notify parent component
      onEditVehicle(vehicleData);
      
      // Close dialog
      onClose();
      
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast.error("Failed to update vehicle. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
          <DialogDescription>
            Update the vehicle information. ID cannot be changed.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">Vehicle ID</Label>
              <Input
                id="id"
                value={vehicle.id}
                disabled
                className="bg-gray-100"
              />
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
            <Label htmlFor="amenities">Amenities (comma separated)</Label>
            <Input
              id="amenities"
              name="amenities"
              value={formData.amenities || ''}
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
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
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
