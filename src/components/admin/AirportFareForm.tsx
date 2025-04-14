
import React, { useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FareData } from '@/types/cab'; // Changed import to use cab types
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
    
    console.log(`Field ${String(field)} changed to ${numericValue}`, updatedFareData);
    onChange(updatedFareData);
  };

  // Debug the actual values being displayed
  useEffect(() => {
    console.log("AirportFareForm fields breakdown:");
    Object.entries(fareData).forEach(([key, value]) => {
      console.log(`${key}:`, typeof value, value);
    });
  }, [fareData]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Input fields with iterative approach */}
      {[
        { id: 'basePrice', label: 'Base Price (₹)' },
        { id: 'pricePerKm', label: 'Price Per KM (₹)' },
        { id: 'pickupPrice', label: 'Pickup Price (₹)' },
        { id: 'dropPrice', label: 'Drop Price (₹)' },
        { id: 'tier1Price', label: 'Tier 1 Price (0-10 KM) (₹)' },
        { id: 'tier2Price', label: 'Tier 2 Price (11-20 KM) (₹)' },
        { id: 'tier3Price', label: 'Tier 3 Price (21-30 KM) (₹)' },
        { id: 'tier4Price', label: 'Tier 4 Price (>30 KM) (₹)' },
        { id: 'extraKmCharge', label: 'Extra KM Charge (₹)' }
      ].map(({ id, label }) => (
        <div key={id} className="space-y-2">
          <Label htmlFor={id} className="font-medium">{label}</Label>
          <Input
            id={id}
            type="number"
            value={fareData[id as keyof FareData] ?? 0}
            onChange={(e) => handleInputChange(id as keyof FareData, e.target.value)}
            placeholder="0"
            min="0"
          />
        </div>
      ))}
    </div>
  );
};

export default AirportFareForm;
