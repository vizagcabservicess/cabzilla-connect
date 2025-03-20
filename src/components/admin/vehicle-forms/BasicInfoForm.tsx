
import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BasicInfoFormProps {
  name: string;
  setName: (value: string) => void;
  capacity: string;
  setCapacity: (value: string) => void;
  luggageCapacity: string;
  setLuggageCapacity: (value: string) => void;
  isActive: boolean;
  setIsActive: (value: boolean) => void;
  description: string;
  setDescription: (value: string) => void;
  image: string;
  setImage: (value: string) => void;
}

export const BasicInfoForm: React.FC<BasicInfoFormProps> = ({
  name,
  setName,
  capacity,
  setCapacity,
  luggageCapacity,
  setLuggageCapacity,
  isActive,
  setIsActive,
  description,
  setDescription,
  image,
  setImage,
}) => {
  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Basic Vehicle Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div>
            <label className="text-sm font-medium">Vehicle Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g., Sedan, SUV, etc." 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Passenger Capacity</label>
              <Input 
                type="number" 
                value={capacity} 
                onChange={(e) => setCapacity(e.target.value)} 
                placeholder="e.g., 4" 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Luggage Capacity</label>
              <Input 
                type="number" 
                value={luggageCapacity} 
                onChange={(e) => setLuggageCapacity(e.target.value)} 
                placeholder="e.g., 2" 
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Image URL</label>
            <Input 
              value={image} 
              onChange={(e) => setImage(e.target.value)} 
              placeholder="/cars/sedan.png" 
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Vehicle description" 
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isActive" 
              checked={isActive} 
              onCheckedChange={(checked) => setIsActive(checked === true)} 
            />
            <label htmlFor="isActive" className="text-sm font-medium">
              Active (available for booking)
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
