
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
import { fixDatabaseTables, formatDataForMultipart } from '@/utils/apiHelper';
import { apiBaseUrl } from '@/config/api';

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
  const [inclusionsText, setInclusionsText] = useState('');
  const [exclusionsText, setExclusionsText] = useState('');

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
      
      // Handle inclusions and exclusions as text
      let inclusionsString = '';
      if (Array.isArray(initialVehicle.inclusions)) {
        inclusionsString = initialVehicle.inclusions.join(', ');
      } else if (typeof initialVehicle.inclusions === 'string') {
        inclusionsString = initialVehicle.inclusions;
      }
      
      let exclusionsString = '';
      if (Array.isArray(initialVehicle.exclusions)) {
        exclusionsString = initialVehicle.exclusions.join(', ');
      } else if (typeof initialVehicle.exclusions === 'string') {
        exclusionsString = initialVehicle.exclusions;
      }
      
      setInclusionsText(inclusionsString);
      setExclusionsText(exclusionsString);
      
      setVehicle({
        ...initialVehicle,
        capacity: numCapacity,
        luggageCapacity: numLuggageCapacity,
        basePrice: numBasePrice,
        price: numBasePrice,
        pricePerKm: numPricePerKm,
        driverAllowance: numDriverAllowance,
        nightHaltCharge: numNightHaltCharge,
        amenities: vehicleAmenities,
        inclusions: inclusionsString,
        exclusions: exclusionsString,
        cancellationPolicy: initialVehicle.cancellationPolicy || '',
        fuelType: initialVehicle.fuelType || ''
      });
      
      setIsInitialized(true);
      setServerError(null);
    }
  }, [initialVehicle, open]);

  const handleInputChange = (field: keyof CabType, value: any) => {
    console.log(`Updating field ${field} with value:`, value);
    
    setVehicle(prev => ({
      ...prev,
      [field]: value
    }));
    
    // For special text fields, update the corresponding state
    if (field === 'inclusions') {
      setInclusionsText(value);
    } else if (field === 'exclusions') {
      setExclusionsText(value);
    }
  };

  const handleAmenityToggle = (amenity: string, checked: boolean) => {
    setVehicle(prev => {
      const currentAmenities = Array.isArray(prev.amenities) ? prev.amenities : [];
      const updatedAmenities = checked
        ? [...currentAmenities.filter(a => a !== amenity), amenity]
        : currentAmenities.filter(a => a !== amenity);
      
      return {
        ...prev,
        amenities: updatedAmenities
      };
    });
  };

  const handleSave = async () => {
    if (!vehicle.id) {
      toast.error("Vehicle ID is missing");
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      console.log('Preparing to save vehicle:', vehicle);
      
      // Prepare the vehicle data for submission
      const vehicleDataToSubmit = {
        ...vehicle,
        id: vehicle.id,
        vehicleId: vehicle.id,
        capacity: parseNumericValue(vehicle.capacity, 4),
        luggageCapacity: parseNumericValue(vehicle.luggageCapacity, 2),
        basePrice: parseNumericValue(vehicle.basePrice || vehicle.price, 0),
        pricePerKm: parseNumericValue(vehicle.pricePerKm, 0),
        driverAllowance: parseNumericValue(vehicle.driverAllowance, 250),
        nightHaltCharge: parseNumericValue(vehicle.nightHaltCharge, 700),
        amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : [],
        inclusions: inclusionsText.split(',').map(s => s.trim()).filter(Boolean),
        exclusions: exclusionsText.split(',').map(s => s.trim()).filter(Boolean),
        cancellationPolicy: vehicle.cancellationPolicy || '',
        fuelType: vehicle.fuelType || '',
        ac: Boolean(vehicle.ac),
        isActive: Boolean(vehicle.isActive)
      };

      console.log('Vehicle data to submit:', vehicleDataToSubmit);

      // First try the direct vehicle update service
      try {
        const updateResult = await updateVehicle(vehicle.id, vehicleDataToSubmit);
        console.log('Direct vehicle update result:', updateResult);
        
        if (updateResult && updateResult.status === 'success') {
          toast.success("Vehicle updated successfully");
          onEditVehicle(vehicleDataToSubmit);
          onClose();
          return;
        }
      } catch (directError) {
        console.error('Direct vehicle update failed:', directError);
      }

      // Fallback: Try direct API call to update-vehicle.php
      try {
        const response = await fetch(`${apiBaseUrl}/api/admin/update-vehicle.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Mode': 'true',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify(vehicleDataToSubmit)
        });

        const result = await response.json();
        console.log('Fallback update result:', result);

        if (result.status === 'success') {
          toast.success("Vehicle updated successfully");
          onEditVehicle(vehicleDataToSubmit);
          onClose();
          return;
        } else {
          throw new Error(result.message || 'Update failed');
        }
      } catch (fallbackError) {
        console.error('Fallback update failed:', fallbackError);
        throw fallbackError;
      }

    } catch (error) {
      console.error('Error updating vehicle:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update vehicle';
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectUpdate = async () => {
    if (!vehicle.id) {
      toast.error("Vehicle ID is missing");
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      // Prepare data for direct update
      const updateData = {
        id: vehicle.id,
        name: vehicle.name,
        capacity: parseNumericValue(vehicle.capacity, 4),
        luggageCapacity: parseNumericValue(vehicle.luggageCapacity, 2),
        basePrice: parseNumericValue(vehicle.basePrice || vehicle.price, 0),
        pricePerKm: parseNumericValue(vehicle.pricePerKm, 0),
        driverAllowance: parseNumericValue(vehicle.driverAllowance, 250),
        nightHaltCharge: parseNumericValue(vehicle.nightHaltCharge, 700),
        image: vehicle.image,
        description: vehicle.description,
        ac: Boolean(vehicle.ac),
        isActive: Boolean(vehicle.isActive),
        amenities: Array.isArray(vehicle.amenities) ? vehicle.amenities : [],
        inclusions: inclusionsText.split(',').map(s => s.trim()).filter(Boolean),
        exclusions: exclusionsText.split(',').map(s => s.trim()).filter(Boolean),
        cancellationPolicy: vehicle.cancellationPolicy || '',
        fuelType: vehicle.fuelType || ''
      };

      console.log('Direct update data:', updateData);

      const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-update.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Direct update result:', result);

      if (result.status === 'success') {
        toast.success("Vehicle updated successfully in database");
        onEditVehicle(updateData);
        onClose();
      } else {
        throw new Error(result.message || 'Database update failed');
      }

    } catch (error) {
      console.error('Error with direct update:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update vehicle';
      setServerError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open || !isInitialized) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vehicle: {vehicle.name}</DialogTitle>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {serverError}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Vehicle Name</Label>
              <Input
                id="name"
                value={vehicle.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={vehicle.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="capacity">Capacity (seats)</Label>
              <Input
                id="capacity"
                type="number"
                value={vehicle.capacity || 4}
                onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 4)}
              />
            </div>
            <div>
              <Label htmlFor="luggageCapacity">Luggage Capacity</Label>
              <Input
                id="luggageCapacity"
                type="number"
                value={vehicle.luggageCapacity || 2}
                onChange={(e) => handleInputChange('luggageCapacity', parseInt(e.target.value) || 2)}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="basePrice">Base Price (₹)</Label>
              <Input
                id="basePrice"
                type="number"
                value={vehicle.basePrice || vehicle.price || 0}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  handleInputChange('basePrice', value);
                  handleInputChange('price', value);
                }}
              />
            </div>
            <div>
              <Label htmlFor="pricePerKm">Price per KM (₹)</Label>
              <Input
                id="pricePerKm"
                type="number"
                step="0.1"
                value={vehicle.pricePerKm || 0}
                onChange={(e) => handleInputChange('pricePerKm', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="driverAllowance">Driver Allowance (₹)</Label>
              <Input
                id="driverAllowance"
                type="number"
                value={vehicle.driverAllowance || 250}
                onChange={(e) => handleInputChange('driverAllowance', parseFloat(e.target.value) || 250)}
              />
            </div>
            <div>
              <Label htmlFor="nightHaltCharge">Night Halt Charge (₹)</Label>
              <Input
                id="nightHaltCharge"
                type="number"
                value={vehicle.nightHaltCharge || 700}
                onChange={(e) => handleInputChange('nightHaltCharge', parseFloat(e.target.value) || 700)}
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              value={vehicle.image || ''}
              onChange={(e) => handleInputChange('image', e.target.value)}
              placeholder="/cars/vehicle-name.png"
            />
          </div>

          {/* Fuel Type */}
          <div>
            <Label htmlFor="fuelType">Fuel Type</Label>
            <Input
              id="fuelType"
              value={vehicle.fuelType || ''}
              onChange={(e) => handleInputChange('fuelType', e.target.value)}
              placeholder="e.g., Petrol, Diesel, CNG"
            />
          </div>

          {/* Inclusions */}
          <div>
            <Label htmlFor="inclusions">Inclusions</Label>
            <Textarea
              id="inclusions"
              value={inclusionsText}
              onChange={(e) => {
                setInclusionsText(e.target.value);
                handleInputChange('inclusions', e.target.value);
              }}
              placeholder="e.g., AC, Bottle Water, Music System"
              rows={2}
            />
          </div>

          {/* Exclusions */}
          <div>
            <Label htmlFor="exclusions">Exclusions</Label>
            <Textarea
              id="exclusions"
              value={exclusionsText}
              onChange={(e) => {
                setExclusionsText(e.target.value);
                handleInputChange('exclusions', e.target.value);
              }}
              placeholder="e.g., Toll, Parking, State Tax"
              rows={2}
            />
          </div>

          {/* Cancellation Policy */}
          <div>
            <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
            <Textarea
              id="cancellationPolicy"
              value={vehicle.cancellationPolicy || ''}
              onChange={(e) => handleInputChange('cancellationPolicy', e.target.value)}
              placeholder="e.g., Free cancellation up to 1 hour before pickup."
              rows={2}
            />
          </div>

          {/* Amenities */}
          <div>
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {['AC', 'Music System', 'Bottle Water', 'GPS', 'WiFi', 'Phone Charger'].map((amenity) => (
                <div key={amenity} className="flex items-center space-x-2">
                  <Checkbox
                    id={amenity}
                    checked={Array.isArray(vehicle.amenities) && vehicle.amenities.includes(amenity)}
                    onCheckedChange={(checked) => handleAmenityToggle(amenity, checked as boolean)}
                  />
                  <Label htmlFor={amenity}>{amenity}</Label>
                </div>
              ))}
            </div>
          </div>

          {/* Switches */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="ac"
                checked={Boolean(vehicle.ac)}
                onCheckedChange={(checked) => handleInputChange('ac', checked)}
              />
              <Label htmlFor="ac">Vehicle has AC</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={Boolean(vehicle.isActive)}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Vehicle is Active</Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleDirectUpdate} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Direct Update'
            )}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
