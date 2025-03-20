
import React, { useState } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Save, AlertTriangle, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createVehicle } from '@/services/vehicleDataService';

interface AddVehicleFormProps {
  onSuccess?: () => void;
}

export const AddVehicleForm: React.FC<AddVehicleFormProps> = ({ onSuccess }) => {
  const [vehicleId, setVehicleId] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [luggageCapacity, setLuggageCapacity] = useState('2');
  const [basePrice, setBasePrice] = useState('4200');
  const [pricePerKm, setPricePerKm] = useState('14');
  const [isAc, setIsAc] = useState(true);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicleId || !name) {
      toast.error("Vehicle ID and name are required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Format vehicle ID to be URL-friendly
      const formattedVehicleId = vehicleId
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      
      const vehicleData = {
        vehicleId: formattedVehicleId,
        name,
        capacity: parseInt(capacity) || 4,
        luggageCapacity: parseInt(luggageCapacity) || 2,
        basePrice: parseFloat(basePrice) || 0,
        pricePerKm: parseFloat(pricePerKm) || 0,
        ac: isAc,
        description,
        isActive: true,
        amenities: isAc ? ['AC', 'Water Bottle'] : ['Water Bottle']
      };
      
      console.log("Creating new vehicle:", vehicleData);
      
      // We'll attempt to create the vehicle
      const success = await createVehicle(vehicleData);
      
      if (success) {
        toast.success("Vehicle created successfully");
        
        // Reset form
        setVehicleId('');
        setName('');
        setCapacity('4');
        setLuggageCapacity('2');
        setBasePrice('4200');
        setPricePerKm('14');
        setIsAc(true);
        setDescription('');
        
        // Call success callback
        onSuccess?.();
      } else {
        throw new Error("Failed to create vehicle");
      }
    } catch (err: any) {
      console.error("Error creating vehicle:", err);
      setError(`Failed to create vehicle: ${err.message || 'Unknown error'}`);
      toast.error("Failed to create vehicle");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Card className="bg-white shadow-md">
        <CardContent className="pt-6">
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleId">Vehicle ID (unique identifier)</Label>
                <Input
                  id="vehicleId"
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  placeholder="e.g., swift_dzire"
                  required
                />
                <p className="text-xs text-gray-500">No spaces, lowercase with underscores</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Vehicle Name (display name)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Swift Dzire"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Passenger Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  min="1"
                  max="50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="luggageCapacity">Luggage Capacity</Label>
                <Input
                  id="luggageCapacity"
                  type="number"
                  value={luggageCapacity}
                  onChange={(e) => setLuggageCapacity(e.target.value)}
                  min="0"
                  max="20"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (₹)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricePerKm">Price per Km (₹)</Label>
                <Input
                  id="pricePerKm"
                  type="number"
                  value={pricePerKm}
                  onChange={(e) => setPricePerKm(e.target.value)}
                  min="0"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={isAc}
                onCheckedChange={setIsAc}
                id="ac-mode"
              />
              <Label htmlFor="ac-mode">Air Conditioned</Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of the vehicle"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={isSubmitting || !vehicleId || !name}
      >
        {isSubmitting ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Creating Vehicle...
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Create New Vehicle
          </>
        )}
      </Button>
    </form>
  );
};
