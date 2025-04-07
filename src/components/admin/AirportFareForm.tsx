
import React, { useEffect } from 'react';
import { Input } from "@/components/ui/input";
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
    const numericValue = value === '' ? 0 : parseFloat(value);
    onChange({
      ...fareData,
      [field]: numericValue
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label htmlFor="basePrice" className="font-medium">Base Price (₹)</label>
        <Input
          id="basePrice"
          type="number"
          value={fareData.basePrice !== undefined ? fareData.basePrice : 0}
          onChange={(e) => handleInputChange('basePrice', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="pricePerKm" className="font-medium">Price Per KM (₹)</label>
        <Input
          id="pricePerKm"
          type="number"
          value={fareData.pricePerKm !== undefined ? fareData.pricePerKm : 0}
          onChange={(e) => handleInputChange('pricePerKm', e.target.value)}
          placeholder="0"
          min="0"
          step="0.5"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="pickupPrice" className="font-medium">Pickup Price (₹)</label>
        <Input
          id="pickupPrice"
          type="number"
          value={fareData.pickupPrice !== undefined ? fareData.pickupPrice : 0}
          onChange={(e) => handleInputChange('pickupPrice', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="dropPrice" className="font-medium">Drop Price (₹)</label>
        <Input
          id="dropPrice"
          type="number"
          value={fareData.dropPrice !== undefined ? fareData.dropPrice : 0}
          onChange={(e) => handleInputChange('dropPrice', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="tier1Price" className="font-medium">Tier 1 Price (₹)</label>
        <Input
          id="tier1Price"
          type="number"
          value={fareData.tier1Price !== undefined ? fareData.tier1Price : 0}
          onChange={(e) => handleInputChange('tier1Price', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="tier2Price" className="font-medium">Tier 2 Price (₹)</label>
        <Input
          id="tier2Price"
          type="number"
          value={fareData.tier2Price !== undefined ? fareData.tier2Price : 0}
          onChange={(e) => handleInputChange('tier2Price', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="tier3Price" className="font-medium">Tier 3 Price (₹)</label>
        <Input
          id="tier3Price"
          type="number"
          value={fareData.tier3Price !== undefined ? fareData.tier3Price : 0}
          onChange={(e) => handleInputChange('tier3Price', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="tier4Price" className="font-medium">Tier 4 Price (₹)</label>
        <Input
          id="tier4Price"
          type="number"
          value={fareData.tier4Price !== undefined ? fareData.tier4Price : 0}
          onChange={(e) => handleInputChange('tier4Price', e.target.value)}
          placeholder="0"
          min="0"
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <label htmlFor="extraKmCharge" className="font-medium">Extra KM Charge (₹)</label>
        <Input
          id="extraKmCharge"
          type="number"
          value={fareData.extraKmCharge !== undefined ? fareData.extraKmCharge : 0}
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
