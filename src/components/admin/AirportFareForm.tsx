
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AirportFare } from "@/services/api/airportFareAPI";
import { Card, CardContent } from "@/components/ui/card";

interface AirportFareFormProps {
  fareData: AirportFare;
  onChange: (fare: AirportFare) => void;
}

const AirportFareForm: React.FC<AirportFareFormProps> = ({ fareData, onChange }) => {
  const handleNumberInputChange = (field: keyof AirportFare, value: string) => {
    const numericValue = value === '' ? 0 : parseFloat(value);
    
    if (!isNaN(numericValue)) {
      onChange({
        ...fareData,
        [field]: numericValue
      });
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="basePrice">Base Price (₹)</Label>
            <Input
              id="basePrice"
              type="number"
              value={fareData.basePrice || 0}
              onChange={(e) => handleNumberInputChange('basePrice', e.target.value)}
              min={0}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pricePerKm">Price per KM (₹)</Label>
            <Input
              id="pricePerKm"
              type="number"
              value={fareData.pricePerKm || 0}
              onChange={(e) => handleNumberInputChange('pricePerKm', e.target.value)}
              min={0}
              step={0.5}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="pickupPrice">Airport Pickup Price (₹)</Label>
            <Input
              id="pickupPrice"
              type="number"
              value={fareData.pickupPrice || 0}
              onChange={(e) => handleNumberInputChange('pickupPrice', e.target.value)}
              min={0}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dropPrice">Airport Drop Price (₹)</Label>
            <Input
              id="dropPrice"
              type="number"
              value={fareData.dropPrice || 0}
              onChange={(e) => handleNumberInputChange('dropPrice', e.target.value)}
              min={0}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tier1Price">Tier 1 Price (0-10 KM) (₹)</Label>
            <Input
              id="tier1Price"
              type="number"
              value={fareData.tier1Price || 0}
              onChange={(e) => handleNumberInputChange('tier1Price', e.target.value)}
              min={0}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tier2Price">Tier 2 Price (11-20 KM) (₹)</Label>
            <Input
              id="tier2Price"
              type="number"
              value={fareData.tier2Price || 0}
              onChange={(e) => handleNumberInputChange('tier2Price', e.target.value)}
              min={0}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tier3Price">Tier 3 Price (21-35 KM) (₹)</Label>
            <Input
              id="tier3Price"
              type="number"
              value={fareData.tier3Price || 0}
              onChange={(e) => handleNumberInputChange('tier3Price', e.target.value)}
              min={0}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tier4Price">Tier 4 Price (&gt;35 KM) (₹)</Label>
            <Input
              id="tier4Price"
              type="number"
              value={fareData.tier4Price || 0}
              onChange={(e) => handleNumberInputChange('tier4Price', e.target.value)}
              min={0}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="extraKmCharge">Extra KM Charge (₹)</Label>
            <Input
              id="extraKmCharge"
              type="number"
              value={fareData.extraKmCharge || 0}
              onChange={(e) => handleNumberInputChange('extraKmCharge', e.target.value)}
              min={0}
              step={0.5}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AirportFareForm;
