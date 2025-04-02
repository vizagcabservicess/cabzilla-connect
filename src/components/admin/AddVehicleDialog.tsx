
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createVehicle } from '@/services/directVehicleService';
import { CabType } from '@/types/cab';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fixDatabaseTables } from '@/utils/apiHelper';
import { toast } from 'sonner';

interface AddVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onAddVehicle: (vehicle: CabType) => void;
}

export function AddVehicleDialog({ open, onClose, onAddVehicle }: AddVehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFixingDatabase, setIsFixingDatabase] = useState(false);
  
  const [formData, setFormData] = useState<Partial<CabType>>({
    vehicleId: '',
    name: '',
    capacity: 4,
    luggageCapacity: 2,
    ac: true,
    image: '/cars/sedan.png',
    amenities: ['AC'],
    description: '',
    basePrice: 0,
    pricePerKm: 0,
    nightHaltCharge: 700,
    driverAllowance: 250,
    isActive: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'capacity' || name === 'luggageCapacity' || 
              name === 'basePrice' || name === 'pricePerKm' ||
              name === 'nightHaltCharge' || name === 'driverAllowance' 
        ? Number(value) 
        : value
    }));
    
    // Automatically generate vehicleId from name if empty
    if (name === 'name' && !formData.vehicleId) {
      const generatedId = value.toLowerCase().replace(/\s+/g, '_');
      setFormData((prev) => ({
        ...prev,
        vehicleId: generatedId
      }));
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const amenitiesList = value.split(',').map(item => item.trim());
    setFormData((prev) => ({
      ...prev,
      amenities: amenitiesList
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!formData.vehicleId || !formData.name) {
        throw new Error('Vehicle ID and Name are required fields');
      }

      // Create the vehicle
      const newVehicle = await createVehicle(formData as CabType);
      
      // Notify the parent component
      onAddVehicle(newVehicle);
      
      // Reset form and close dialog
      setFormData({
        vehicleId: '',
        name: '',
        capacity: 4,
        luggageCapacity: 2,
        ac: true,
        image: '/cars/sedan.png',
        amenities: ['AC'],
        description: '',
        basePrice: 0,
        pricePerKm: 0,
        nightHaltCharge: 700,
        driverAllowance: 250,
        isActive: true
      });
      onClose();
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleFixDatabase = async () => {
    setIsFixingDatabase(true);
    try {
      const success = await fixDatabaseTables();
      if (success) {
        toast.success('Database tables fixed successfully');
        setError(null);
      } else {
        toast.error('Failed to fix database tables');
      }
    } catch (err) {
      console.error('Error fixing database:', err);
    } finally {
      setIsFixingDatabase(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Create a new vehicle to add to your fleet.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <span>{error}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFixDatabase}
                disabled={isFixingDatabase}
              >
                {isFixingDatabase ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fixing database...
                  </>
                ) : (
                  'Fix Database Tables'
                )}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle ID</Label>
              <Input
                id="vehicleId"
                name="vehicleId"
                placeholder="sedan, suv, etc."
                value={formData.vehicleId}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500">
                Unique identifier (lowercase, no spaces)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Vehicle Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Sedan, SUV, etc."
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Passenger Capacity</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="luggageCapacity">Luggage Capacity</Label>
              <Input
                id="luggageCapacity"
                name="luggageCapacity"
                type="number"
                min="0"
                value={formData.luggageCapacity}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basePrice">Base Price (₹)</Label>
              <Input
                id="basePrice"
                name="basePrice"
                type="number"
                min="0"
                step="10"
                value={formData.basePrice}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerKm">Price per KM (₹)</Label>
              <Input
                id="pricePerKm"
                name="pricePerKm"
                type="number"
                min="0"
                step="0.5"
                value={formData.pricePerKm}
                onChange={handleChange}
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
                min="0"
                step="50"
                value={formData.nightHaltCharge}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driverAllowance">Driver Allowance (₹)</Label>
              <Input
                id="driverAllowance"
                name="driverAllowance"
                type="number"
                min="0"
                step="10"
                value={formData.driverAllowance}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              name="image"
              placeholder="/cars/sedan.png"
              value={formData.image}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500">
              Path to vehicle image (e.g., /cars/sedan.png)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amenities">Amenities</Label>
            <Input
              id="amenities"
              name="amenities"
              placeholder="AC, Bottle Water, Music System"
              value={formData.amenities?.join(', ')}
              onChange={handleAmenitiesChange}
            />
            <p className="text-xs text-gray-500">
              Comma-separated list of amenities
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe the vehicle..."
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="ac"
              checked={formData.ac}
              onCheckedChange={(checked) => handleSwitchChange('ac', checked)}
            />
            <Label htmlFor="ac">Air Conditioned</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => handleSwitchChange('isActive', checked)}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Vehicle'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
