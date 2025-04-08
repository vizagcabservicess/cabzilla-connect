
import React, { useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FareData } from '@/services/fareManagementService';
import { parseNumericValue } from '@/utils/safeStringUtils';

interface AirportFareFormProps {
  fareData: FareData;
  onChange: (fareData: FareData) => void;
}

const AirportFareForm: React.FC<AirportFareFormProps> = ({ fareData, onChange }) => {
  useEffect(() => {
    console.log("AirportFareForm received data:", fareData);
  }, [fareData]);

  const handleInputChange = (field: keyof FareData, value: string) => {
    // Convert value to number, handle empty strings
    const numericValue = parseNumericValue(value);
    
    // Create a new object with the updated field
    const updatedFareData = {
      ...fareData,
      [field]: numericValue
    };
    
    console.log(`Field ${field} changed to ${numericValue}`, updatedFareData);
    onChange(updatedFareData);
  };

  // Debug the actual values being displayed
  useEffect(() => {
    console.log("AirportFareForm fields breakdown:");
    console.log("basePrice:", typeof fareData.basePrice, fareData.basePrice);
    console.log("pricePerKm:", typeof fareData.pricePerKm, fareData.pricePerKm);
    console.log("pickupPrice:", typeof fareData.pickupPrice, fareData.pickupPrice);
    console.log("dropPrice:", typeof fareData.dropPrice, fareData.dropPrice);
    console.log("tier1Price:", typeof fareData.tier1Price, fareData.tier1Price);
    console.log("tier2Price:", typeof fareData.tier2Price, fareData.tier2Price);
    console.log("tier3Price:", typeof fareData.tier3Price, fareData.tier3Price);
    console.log("tier4Price:", typeof fareData.tier4Price, fareData.tier4Price);
    console.log("extraKmCharge:", typeof fareData.extraKmCharge, fareData.extraKmCharge);
  }, [fareData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="basePrice" className="font-medium">Base Price (₹)</Label>
        <Input
          id="basePrice"
          type="number"
          value={fareData.basePrice || 0}
          onChange={(e) => handleInputChange('basePrice', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pricePerKm" className="font-medium">Price Per KM (₹)</Label>
        <Input
          id="pricePerKm"
          type="number"
          value={fareData.pricePerKm || 0}
          onChange={(e) => handleInputChange('pricePerKm', e.target.value)}
          placeholder="0"
          min="0"
          step="0.5"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pickupPrice" className="font-medium">Pickup Price (₹)</Label>
        <Input
          id="pickupPrice"
          type="number"
          value={fareData.pickupPrice || 0}
          onChange={(e) => handleInputChange('pickupPrice', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dropPrice" className="font-medium">Drop Price (₹)</Label>
        <Input
          id="dropPrice"
          type="number"
          value={fareData.dropPrice || 0}
          onChange={(e) => handleInputChange('dropPrice', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tier1Price" className="font-medium">Tier 1 Price (₹)</Label>
        <Input
          id="tier1Price"
          type="number"
          value={fareData.tier1Price || 0}
          onChange={(e) => handleInputChange('tier1Price', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tier2Price" className="font-medium">Tier 2 Price (₹)</Label>
        <Input
          id="tier2Price"
          type="number"
          value={fareData.tier2Price || 0}
          onChange={(e) => handleInputChange('tier2Price', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tier3Price" className="font-medium">Tier 3 Price (₹)</Label>
        <Input
          id="tier3Price"
          type="number"
          value={fareData.tier3Price || 0}
          onChange={(e) => handleInputChange('tier3Price', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tier4Price" className="font-medium">Tier 4 Price (₹)</Label>
        <Input
          id="tier4Price"
          type="number"
          value={fareData.tier4Price || 0}
          onChange={(e) => handleInputChange('tier4Price', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="extraKmCharge" className="font-medium">Extra KM Charge (₹)</Label>
        <Input
          id="extraKmCharge"
          type="number"
          value={fareData.extraKmCharge || 0}
          onChange={(e) => handleInputChange('extraKmCharge', e.target.value)}
          placeholder="0"
          min="0"
          step="0.5"
        />
      </div>
    </div>
  );
};

export default AirportFareForm;
