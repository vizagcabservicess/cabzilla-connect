import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, AlertTriangle, Plus, Trash2, Upload } from "lucide-react";
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

  // Add gallery state
  const [gallery, setGallery] = useState<{ url: string; alt?: string; caption?: string }[]>(initialVehicle.gallery || []);
  const [galleryImageUrl, setGalleryImageUrl] = useState('');
  const [galleryImageFile, setGalleryImageFile] = useState<File | null>(null);
  const [galleryAlt, setGalleryAlt] = useState('');
  const [galleryCaption, setGalleryCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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
      
      setInclusionsText(Array.isArray(initialVehicle.inclusions) ? initialVehicle.inclusions.join(', ') : (initialVehicle.inclusions || ''));
      setExclusionsText(Array.isArray(initialVehicle.exclusions) ? initialVehicle.exclusions.join(', ') : (initialVehicle.exclusions || ''));
      
      setIsInitialized(true);
    }
  }, [initialVehicle, open]);

  const handleDirectUpdate = async () => {
    try {
      setIsLoading(true);
      toast.loading("Attempting direct update via JSON...");
      const response = await fetch(`${apiBaseUrl}/api/admin/direct-vehicle-modify.php?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Force-Refresh': 'true',
          'X-Admin-Mode': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        body: JSON.stringify({
          ...vehicle,
          id: vehicle.id || vehicle.vehicleId,
          vehicleId: vehicle.vehicleId || vehicle.id
        })
      });
      const text = await response.text();
      if (response.ok) {
        try {
          const data = JSON.parse(text);
          if (data.status === 'success') {
            toast.success(`Vehicle ${vehicle.name} updated successfully`);
            onEditVehicle(vehicle);
            onClose();
          } else {
            throw new Error(data.message || 'Unknown error');
          }
        } catch (e) {
          console.error('Failed to parse response:', e, text);
          throw new Error('Invalid server response format');
        }
      } else {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      console.error("Direct update failed:", error);
      toast.error(`Direct update failed: ${error.message}`);
      handleSubmit(new Event('submit') as any);
    } finally {
      setIsLoading(false);
    }
  };

  const fixDatabase = async () => {
    try {
      setIsLoading(true);
      toast.loading("Attempting to fix database tables...");
      
      const success = await fixDatabaseTables();
      
      if (success) {
        toast.success("Database tables fixed successfully");
        handleSubmit(new Event('submit') as any);
      } else {
        toast.error("Failed to fix database tables");
        setServerError("Database fix failed. Please try again or contact support.");
      }
    } catch (error) {
      console.error("Error fixing database:", error);
      toast.error("Error fixing database tables");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setServerError(null);
    
    try {
      console.log('Submitting vehicle data:', vehicle);

      const updatedVehicle: CabType = {
        ...vehicle,
        inclusions: inclusionsText.split(/,|\n/).map(s => s.trim()).filter(Boolean),
        exclusions: exclusionsText.split(/,|\n/).map(s => s.trim()).filter(Boolean),
        capacity: Number(vehicle.capacity),
        luggageCapacity: Number(vehicle.luggageCapacity),
        basePrice: Number(vehicle.basePrice || 0),
        price: Number(vehicle.basePrice || 0),
        pricePerKm: Number(vehicle.pricePerKm || 0),
        nightHaltCharge: Number(vehicle.nightHaltCharge || 700),
        driverAllowance: Number(vehicle.driverAllowance || 250),
        gallery: gallery.map(item => ({
          url: item.url,
          alt: item.alt || '',
          caption: item.caption || ''
        }))
      };
      
      console.log("Prepared vehicle data for update:", updatedVehicle);
      
      const maxRetries = 3;
      let attempt = 0;
      let success = false;
      let lastError: Error | null = null;
      
      while (attempt < maxRetries && !success) {
        try {
          if (attempt > 0) {
            const delay = 1000 * (attempt) + Math.random() * 500;
            await new Promise(resolve => setTimeout(resolve, delay));
            toast.loading(`Update attempt ${attempt + 1}/${maxRetries}...`);
          }
          
          console.log(`Update attempt ${attempt + 1}/${maxRetries} for vehicle ${vehicle.id}`);
          
          // Format data as FormData
          const formData = new FormData();
          
          // Add all vehicle fields
          Object.entries(updatedVehicle).forEach(([key, value]) => {
            if (key === 'gallery') {
              // Handle gallery array specially
              formData.append('gallery', JSON.stringify(value));
            } else if (Array.isArray(value)) {
              // Handle other arrays
              formData.append(key, JSON.stringify(value));
            } else if (value !== null && value !== undefined) {
              formData.append(key, String(value));
            }
          });
          
          // Send as multipart/form-data
          const response = await fetch(`${apiBaseUrl}/api/admin/update-vehicle.php?_t=${Date.now()}`, {
            method: 'POST',
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
              'X-Force-Refresh': 'true',
              'X-Admin-Mode': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            },
            body: formData
          });
          
          const responseText = await response.text();
          console.log("Update response:", responseText);
          
          const data = JSON.parse(responseText);
          if (data.status === 'success') {
            success = true;
            toast.success(`Vehicle ${vehicle.name} updated successfully`);
            onEditVehicle(data.vehicle || updatedVehicle);
            onClose();
          } else {
            throw new Error(data.message || 'Update failed');
          }
        } catch (err) {
          const error = err as Error;
          console.error(`Update attempt ${attempt + 1} failed:`, error);
          lastError = error;
          attempt++;
          
          if (attempt >= maxRetries) {
            console.error('All update attempts failed');
            setServerError(lastError?.message || 'Failed to update vehicle after multiple attempts');
            toast.error('Failed to update vehicle. Please try again.');
          }
        }
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error in form submission:', error);
      setServerError(error?.message || 'An unexpected error occurred');
      toast.error('Failed to update vehicle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setServerError(null);
    handleSubmit(new Event('submit') as any);
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${apiBaseUrl}/api/upload-image.php`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        return `${apiBaseUrl}${data.url}`;
      } else {
        throw new Error('No URL returned from server');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image. Please try again.');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const addGalleryItem = async () => {
    try {
      let imageUrl = '';

      if (galleryImageFile) {
        // Handle file upload
        imageUrl = await handleFileUpload(galleryImageFile);
        setGalleryImageFile(null); // Reset file input
      } else if (galleryImageUrl) {
        // Use provided URL
        imageUrl = galleryImageUrl;
      } else {
        toast.error('Please provide an image file or URL');
        return;
      }

      // Add new gallery item
      const newItem = {
        url: imageUrl,
        alt: galleryAlt,
        caption: galleryCaption
      };

      setGallery(prev => [...prev, newItem]);

      // Reset form
      setGalleryImageUrl('');
      setGalleryAlt('');
      setGalleryCaption('');

      toast.success('Image added to gallery');
    } catch (error) {
      console.error('Failed to add gallery item:', error);
      toast.error('Failed to add image to gallery');
    }
  };

  const updateGalleryItem = (index: number, field: 'alt' | 'caption', value: string) => {
    setGallery((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeGalleryItem = (index: number) => {
    setGallery((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGalleryImageFile(e.target.files?.[0] || null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>
        
        {serverError && (
          <FareUpdateError 
            error={new Error(serverError)}
            onRetry={handleRetry}
            isAdmin={true}
            title="Database Error"
            description="There was an issue connecting to the database. This could be due to a temporary network issue or server maintenance."
            fixDatabaseHandler={fixDatabase}
            directDatabaseAccess={handleDirectUpdate}
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
            <Label>Gallery</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Upload Image File</Label>
                <Input type="file" accept="image/*" onChange={handleFileInputChange} />
                <div className="text-center text-gray-500">OR</div>
                <Label>Image URL</Label>
                <Input
                  type="text"
                  placeholder="https://example.com/image.jpg"
                  value={galleryImageUrl}
                  onChange={(e) => setGalleryImageUrl(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label>Alt Text (Optional)</Label>
                <Input
                  type="text"
                  placeholder="Describe the image"
                  value={galleryAlt}
                  onChange={(e) => setGalleryAlt(e.target.value)}
                />
                <Label>Caption (Optional)</Label>
                <Input
                  type="text"
                  placeholder="Image caption"
                  value={galleryCaption}
                  onChange={(e) => setGalleryCaption(e.target.value)}
                />
                <Button
                  type="button"
                  onClick={addGalleryItem}
                  disabled={isUploading || (!galleryImageFile && !galleryImageUrl.trim())}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Image
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {gallery.length === 0 && (
                <div className="text-gray-500 text-center py-4">No images added yet.</div>
              )}
              {gallery.map((item, index) => (
                <div key={index} className="flex items-center gap-4 border rounded p-2">
                  <img
                    src={item.url}
                    alt={item.alt || `Gallery ${index + 1}`}
                    className="w-24 h-16 object-cover rounded border"
                    onError={(e) =>
                      ((e.target as HTMLImageElement).src =
                        'https://via.placeholder.com/96x64?text=No+Image')
                    }
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label>Alt Text</Label>
                      <Input
                        value={item.alt || ''}
                        onChange={(e) => updateGalleryItem(index, 'alt', e.target.value)}
                        placeholder="Image description"
                      />
                    </div>
                    <div>
                      <Label>Caption</Label>
                      <Input
                        value={item.caption || ''}
                        onChange={(e) => updateGalleryItem(index, 'caption', e.target.value)}
                        placeholder="Image caption"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeGalleryItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4">
            <Label htmlFor="inclusions">Inclusions</Label>
            <Textarea
              id="inclusions"
              value={inclusionsText}
              onChange={e => setInclusionsText(e.target.value)}
              placeholder="e.g., AC, Bottle Water, Music System"
              className="mt-1"
            />
          </div>
          <div className="mt-2">
            <Label htmlFor="exclusions">Exclusions</Label>
            <Textarea
              id="exclusions"
              value={exclusionsText}
              onChange={e => setExclusionsText(e.target.value)}
              placeholder="e.g., Toll, Parking, State Tax"
              className="mt-1"
            />
          </div>
          <div className="mt-2">
            <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
            <Textarea
              id="cancellationPolicy"
              value={vehicle.cancellationPolicy || ''}
              onChange={e => setVehicle(v => ({ ...v, cancellationPolicy: e.target.value }))}
              placeholder="e.g., Free cancellation up to 1 hour before pickup."
              className="mt-1"
            />
          </div>
          <div className="mt-2">
            <Label htmlFor="fuelType">Fuel Type</Label>
            <select
              id="fuelType"
              className="w-full border rounded px-2 py-1 mt-1"
              value={vehicle.fuelType || ''}
              onChange={e => setVehicle(v => ({ ...v, fuelType: e.target.value }))}
            >
              <option value="">Select fuel type</option>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="Electric">Electric</option>
              <option value="Hybrid">Hybrid</option>
            </select>
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleDirectUpdate}
              disabled={isLoading}
              className="mr-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Direct Update"
              )}
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
