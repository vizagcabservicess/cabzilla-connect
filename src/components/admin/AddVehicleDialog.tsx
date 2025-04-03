
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { CabType } from "@/types/cab";
import { createVehicle } from "@/services/directVehicleService";
import { toast } from "sonner";

interface AddVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onAddVehicle: (vehicle: CabType) => void;
}

export function AddVehicleDialog({ open, onClose, onAddVehicle }: AddVehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    capacity: 4,
    luggageCapacity: 2,
    pricePerKm: 15,
    price: 2500,
    description: '',
    amenities: 'AC, Bottle Water, Music System',
    nightHaltCharge: 800,
    driverAllowance: 300,
    isActive: true,
    image: '/cars/sedan.png'
  });

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
    
    if (!formData.id || !formData.name) {
      toast.error("Vehicle ID and name are required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Format the data
      const vehicleData: CabType = {
        ...formData,
        amenities: formData.amenities.split(',').map(item => item.trim()),
        ac: true
      };
      
      // Create the vehicle
      await createVehicle(vehicleData);
      
      // Notify parent component
      onAddVehicle(vehicleData);
      
      // Reset form and close dialog
      setFormData({
        id: '',
        name: '',
        capacity: 4,
        luggageCapacity: 2,
        pricePerKm: 15,
        price: 2500,
        description: '',
        amenities: 'AC, Bottle Water, Music System',
        nightHaltCharge: 800,
        driverAllowance: 300,
        isActive: true,
        image: '/cars/sedan.png'
      });
      onClose();
      
    } catch (error) {
      console.error("Error creating vehicle:", error);
      toast.error("Failed to create vehicle. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isSubmitting && !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Add a new vehicle type to your fleet. Fill in all the required details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">Vehicle ID</Label>
              <Input
                id="id"
                name="id"
                value={formData.id}
                onChange={handleChange}
                placeholder="sedan"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Vehicle Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
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
                value={formData.capacity}
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
                value={formData.luggageCapacity}
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
                value={formData.price}
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
                value={formData.pricePerKm}
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
                value={formData.nightHaltCharge}
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
                value={formData.driverAllowance}
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
              value={formData.amenities}
              onChange={handleChange}
              placeholder="AC, Bottle Water, Music System"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
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
              value={formData.image}
              onChange={handleChange}
              placeholder="/cars/sedan.png"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
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
                  Creating...
                </>
              ) : (
                "Create Vehicle"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
