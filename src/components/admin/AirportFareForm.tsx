
import React, { useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FareData } from '@/services/fareManagementService';

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
    const numericValue = value === '' ? 0 : parseFloat(value);
    
    // Create a new object with the updated field
    const updatedFareData = {
      ...fareData,
      [field]: numericValue
    };
    
    console.log(`Field ${field} changed to ${numericValue}`, updatedFareData);
    onChange(updatedFareData);
  };

  // Helper function to safely get numeric values
  const getNumericValue = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
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
          value={getNumericValue(fareData.basePrice)}
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
          value={getNumericValue(fareData.pricePerKm)}
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
          value={getNumericValue(fareData.pickupPrice)}
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
          value={getNumericValue(fareData.dropPrice)}
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
          value={getNumericValue(fareData.tier1Price)}
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
          value={getNumericValue(fareData.tier2Price)}
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
          value={getNumericValue(fareData.tier3Price)}
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
          value={getNumericValue(fareData.tier4Price)}
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
          value={getNumericValue(fareData.extraKmCharge)}
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
