
import React from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PricingFormProps {
  basePrice: string;
  setBasePrice: (value: string) => void;
  pricePerKm: string;
  setPricePerKm: (value: string) => void;
  nightHaltCharge: string;
  setNightHaltCharge: (value: string) => void;
  driverAllowance: string;
  setDriverAllowance: (value: string) => void;
}

export const PricingForm: React.FC<PricingFormProps> = ({
  basePrice,
  setBasePrice,
  pricePerKm,
  setPricePerKm,
  nightHaltCharge,
  setNightHaltCharge,
  driverAllowance,
  setDriverAllowance,
}) => {
  return (
    <Card className="bg-white shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Pricing Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Base Price (₹)</label>
              <Input 
                type="number" 
                value={basePrice} 
                onChange={(e) => setBasePrice(e.target.value)} 
                placeholder="e.g., 4200" 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price per Km (₹)</label>
              <Input 
                type="number" 
                value={pricePerKm} 
                onChange={(e) => setPricePerKm(e.target.value)} 
                placeholder="e.g., 14" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Night Halt Charge (₹)</label>
              <Input 
                type="number" 
                value={nightHaltCharge} 
                onChange={(e) => setNightHaltCharge(e.target.value)} 
                placeholder="e.g., 700" 
              />
            </div>
            <div>
              <label className="text-sm font-medium">Driver Allowance (₹)</label>
              <Input 
                type="number" 
                value={driverAllowance} 
                onChange={(e) => setDriverAllowance(e.target.value)} 
                placeholder="e.g., 250" 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
