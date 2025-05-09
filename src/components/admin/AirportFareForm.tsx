
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FareData {
  vehicleId?: string;
  vehicle_id?: string;
  basePrice: number;
  pricePerKm: number;
  pickupPrice: number;
  dropPrice: number;
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
}

interface AirportFareFormProps {
  fareData: FareData;
  onChange: (fareData: FareData) => void;
}

const AirportFareForm: React.FC<AirportFareFormProps> = ({ fareData, onChange }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    
    onChange({
      ...fareData,
      [name]: numValue
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="basePrice">Base Price (₹)</Label>
          <Input
            id="basePrice"
            name="basePrice"
            type="number"
            value={fareData.basePrice || 0}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pricePerKm">Price Per KM (₹)</Label>
          <Input
            id="pricePerKm"
            name="pricePerKm"
            type="number"
            value={fareData.pricePerKm || 0}
            onChange={handleInputChange}
          />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pickupPrice">Pickup Price (₹)</Label>
          <Input
            id="pickupPrice"
            name="pickupPrice"
            type="number"
            value={fareData.pickupPrice || 0}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dropPrice">Drop Price (₹)</Label>
          <Input
            id="dropPrice"
            name="dropPrice"
            type="number"
            value={fareData.dropPrice || 0}
            onChange={handleInputChange}
          />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tier1Price">Tier 1 Price (≤ 10km) (₹)</Label>
          <Input
            id="tier1Price"
            name="tier1Price"
            type="number"
            value={fareData.tier1Price || 0}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tier2Price">Tier 2 Price (11-20km) (₹)</Label>
          <Input
            id="tier2Price"
            name="tier2Price"
            type="number"
            value={fareData.tier2Price || 0}
            onChange={handleInputChange}
          />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tier3Price">Tier 3 Price (21-30km) (₹)</Label>
          <Input
            id="tier3Price"
            name="tier3Price"
            type="number"
            value={fareData.tier3Price || 0}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="tier4Price">Tier 4 Price ({`>`} 30km) (₹)</Label>
          <Input
            id="tier4Price"
            name="tier4Price"
            type="number"
            value={fareData.tier4Price || 0}
            onChange={handleInputChange}
          />
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="extraKmCharge">Extra KM Charge (₹)</Label>
          <Input
            id="extraKmCharge"
            name="extraKmCharge"
            type="number"
            value={fareData.extraKmCharge || 0}
            onChange={handleInputChange}
          />
        </div>
      </div>
    </div>
  );
};

export default AirportFareForm;
