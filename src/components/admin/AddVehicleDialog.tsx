import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { addVehicle } from '@/services/directVehicleService';
import { CabType, FleetVehicle } from '@/types/cab';
import { AlertCircle, Car, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fixDatabaseTables } from '@/utils/apiHelper';
import { toast } from 'sonner';
import { fleetAPI } from '@/services/api/fleetAPI';
import { VehicleGalleryManager } from './VehicleGalleryManager';

interface AddVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onAddVehicle: (vehicle: CabType) => void;
}

export function AddVehicleDialog({ open, onClose, onAddVehicle }: AddVehicleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFixingDatabase, setIsFixingDatabase] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  
  const [formData, setFormData] = useState<Partial<CabType & FleetVehicle>>({
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
    isActive: true,
    // Fleet specific fields
    vehicleNumber: '',
    model: '',
    make: '',
    year: new Date().getFullYear(),
    status: 'Active',
    lastService: new Date().toISOString().split('T')[0],
    nextServiceDue: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
    fuelType: 'Petrol'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'capacity' || name === 'luggageCapacity' || 
              name === 'basePrice' || name === 'pricePerKm' ||
              name === 'nightHaltCharge' || name === 'driverAllowance' ||
              name === 'year' || name === 'currentOdometer'
        ? Number(value) 
        : value
    }));
    
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value
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
      if (!formData.vehicleId || !formData.name) {
        throw new Error('Vehicle ID and Name are required fields');
      }

      if (formData.vehicleNumber) {
        // If vehicle number is provided, create a fleet vehicle
        try {
          // First create the fleet vehicle
          const fleetVehicleData: Partial<FleetVehicle> = {
            vehicleNumber: formData.vehicleNumber,
            name: formData.name,
            model: formData.model || formData.name,
            make: formData.make || '',
            year: formData.year || new Date().getFullYear(),
            status: formData.status as 'Active' | 'Maintenance' | 'Inactive',
            lastService: formData.lastService,
            nextServiceDue: formData.nextServiceDue,
            fuelType: formData.fuelType,
            vehicleType: formData.vehicleType,
            cabTypeId: formData.vehicleId,
            capacity: formData.capacity,
            luggageCapacity: formData.luggageCapacity,
            isActive: formData.isActive || true,
            currentOdometer: formData.currentOdometer
          };

          await fleetAPI.addVehicle(fleetVehicleData);
          toast.success(`Fleet vehicle ${formData.vehicleNumber} added successfully`);
        } catch (fleetError) {
          console.error("Error adding fleet vehicle:", fleetError);
          // Continue with regular vehicle creation even if fleet vehicle creation fails
        }
      }

      // Create the regular vehicle
      const newVehicle = await addVehicle(formData as CabType);
      
      onAddVehicle(newVehicle);
      
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
        isActive: true,
        // Fleet specific fields
        vehicleNumber: '',
        model: '',
        make: '',
        year: new Date().getFullYear(),
        status: 'Active',
        lastService: new Date().toISOString().split('T')[0],
        nextServiceDue: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
        fuelType: 'Petrol'
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="fleet">Fleet Details</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
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

              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="space-y-4 pt-4">
              {formData.vehicleId ? (
                <VehicleGalleryManager 
                  vehicleId={formData.vehicleId}
                  onGalleryUpdate={(images) => {
                    console.log('Gallery updated for new vehicle:', images);
                  }}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Please enter a Vehicle ID in Basic Info to manage gallery images.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="fleet" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleNumber" className="font-medium">Vehicle Number *</Label>
                  <Input
                    id="vehicleNumber"
                    name="vehicleNumber"
                    placeholder="AP 31 AB 1234"
                    value={formData.vehicleNumber}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-gray-500">
                    Registration/license plate number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    name="model"
                    placeholder="Swift Dzire, Innova, etc."
                    value={formData.model}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="make">Manufacturer</Label>
                  <Input
                    id="make"
                    name="make"
                    placeholder="Maruti, Toyota, etc."
                    value={formData.make}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Year of Manufacture</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    min="2000"
                    max={new Date().getFullYear()}
                    value={formData.year}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuelType">Fuel Type</Label>
                  <Select 
                    value={formData.fuelType} 
                    onValueChange={(value) => handleSelectChange('fuelType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Petrol">Petrol</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="CNG">CNG</SelectItem>
                      <SelectItem value="Electric">Electric</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastService">Last Service Date</Label>
                  <Input
                    id="lastService"
                    name="lastService"
                    type="date"
                    value={formData.lastService}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextServiceDue">Next Service Due</Label>
                  <Input
                    id="nextServiceDue"
                    name="nextServiceDue"
                    type="date"
                    value={formData.nextServiceDue}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentOdometer">Current Odometer (KM)</Label>
                <Input
                  id="currentOdometer"
                  name="currentOdometer"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.currentOdometer || ''}
                  onChange={handleChange}
                />
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 pt-4">
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
            </TabsContent>
          </Tabs>

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
                <>
                  <Car className="mr-2 h-4 w-4" />
                  Add Vehicle
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
