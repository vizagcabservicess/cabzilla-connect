
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateVehicle } from '@/services/directVehicleService';
import { CabType } from '@/types/cab';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fixDatabaseTables } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onEditVehicle: (vehicle: CabType) => void;
  vehicle: CabType;
}

export function EditVehicleDialog({ open, onClose, onEditVehicle, vehicle }: EditVehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFixingDatabase, setIsFixingDatabase] = useState(false);
  const [formData, setFormData] = useState<CabType>(vehicle);

  // Update form data when the vehicle prop changes
  useEffect(() => {
    // Make sure to parse numbers correctly to avoid string representations
    setFormData({
      ...vehicle,
      // Ensure numeric values are stored as numbers
      capacity: typeof vehicle.capacity === 'number' ? vehicle.capacity : Number(vehicle.capacity || 4),
      luggageCapacity: typeof vehicle.luggageCapacity === 'number' ? vehicle.luggageCapacity : Number(vehicle.luggageCapacity || 2),
      basePrice: typeof vehicle.basePrice === 'number' ? vehicle.basePrice : Number(vehicle.basePrice || 0),
      pricePerKm: typeof vehicle.pricePerKm === 'number' ? vehicle.pricePerKm : Number(vehicle.pricePerKm || 0),
      nightHaltCharge: typeof vehicle.nightHaltCharge === 'number' ? vehicle.nightHaltCharge : Number(vehicle.nightHaltCharge || 700),
      driverAllowance: typeof vehicle.driverAllowance === 'number' ? vehicle.driverAllowance : Number(vehicle.driverAllowance || 250)
    });
  }, [vehicle]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Always convert number fields to actual Number type
    if (name === 'capacity' || name === 'luggageCapacity' || 
        name === 'basePrice' || name === 'pricePerKm' ||
        name === 'nightHaltCharge' || name === 'driverAllowance') {
      setFormData((prev) => ({
        ...prev,
        [name]: Number(value)
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
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
      if (!formData.id && !formData.vehicleId) {
        throw new Error('Vehicle ID is required');
      }
      
      if (!formData.name) {
        throw new Error('Name is required');
      }

      // Make sure vehicle has an ID
      const vehicleToUpdate: CabType = {
        ...formData,
        id: formData.id || formData.vehicleId || '',
        vehicleId: formData.vehicleId || formData.id || '',
        // Ensure numeric values are actually numbers
        capacity: Number(formData.capacity || 4),
        luggageCapacity: Number(formData.luggageCapacity || 2),
        basePrice: Number(formData.basePrice || 0),
        pricePerKm: Number(formData.pricePerKm || 0),
        nightHaltCharge: Number(formData.nightHaltCharge || 700),
        driverAllowance: Number(formData.driverAllowance || 250)
      };

      console.log('Updating vehicle with data:', vehicleToUpdate);
      
      // Update the vehicle
      const updatedVehicle = await updateVehicle(vehicleToUpdate);
      
      // Notify the parent component
      onEditVehicle(updatedVehicle);
      
      // Close dialog
      onClose();
    } catch (err) {
      console.error('Error updating vehicle:', err);
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
          <DialogTitle>Edit Vehicle</DialogTitle>
          <DialogDescription>
            Update the vehicle information.
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
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleId">Vehicle ID</Label>
                  <Input
                    id="vehicleId"
                    name="vehicleId"
                    placeholder="sedan, suv, etc."
                    value={formData.vehicleId || formData.id || ''}
                    onChange={handleChange}
                    disabled
                  />
                  <p className="text-xs text-gray-500">
                    ID cannot be changed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Vehicle Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Sedan, SUV, etc."
                    value={formData.name || ''}
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
                    value={formData.capacity || 4}
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
                    value={formData.luggageCapacity || 2}
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
                    value={formData.basePrice || formData.price || 0}
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
                    value={formData.pricePerKm || 0}
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
                    value={formData.nightHaltCharge || 700}
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
                    value={formData.driverAllowance || 250}
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
                  value={formData.image || '/cars/sedan.png'}
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
                  value={Array.isArray(formData.amenities) ? formData.amenities.join(', ') : 'AC'}
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
                  value={formData.description || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ac"
                  checked={!!formData.ac}
                  onCheckedChange={(checked) => handleSwitchChange('ac', checked)}
                />
                <Label htmlFor="ac">Air Conditioned</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={!!formData.isActive}
                  onCheckedChange={(checked) => handleSwitchChange('isActive', checked)}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
