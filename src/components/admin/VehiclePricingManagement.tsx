import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { VehiclePricing } from "@/types/api";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fareAPI } from '@/services/api';
import { isPreviewMode } from '@/utils/apiHelper';

interface VehiclePricingManagementProps {
  vehicleId: string;
}

export const VehiclePricingManagement: React.FC<VehiclePricingManagementProps> = ({ vehicleId }) => {
  const [pricing, setPricing] = useState<VehiclePricing | null>(null);
  const [basePrice, setBasePrice] = useState<number>(0);
  const [pricePerKm, setPricePerKm] = useState<number>(0);
  const [nightHaltCharge, setNightHaltCharge] = useState<number>(0);
  const [driverAllowance, setDriverAllowance] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPricing = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fareAPI.getVehiclePricing();
        const vehiclePricing = data.find((item: VehiclePricing) => item.vehicleId === vehicleId);
        if (vehiclePricing) {
          setPricing(vehiclePricing);
          setBasePrice(vehiclePricing.basePrice);
          setPricePerKm(vehiclePricing.pricePerKm);
          setNightHaltCharge(vehiclePricing.nightHaltCharge || 0);
          setDriverAllowance(vehiclePricing.driverAllowance || 0);
          setIsActive(vehiclePricing.isActive);
        } else {
          setError(`No pricing found for vehicle ID: ${vehicleId}`);
        }
      } catch (err) {
        setError(`Failed to fetch vehicle pricing: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [vehicleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!pricing) {
        throw new Error("No pricing data loaded. Please wait or refresh.");
      }

      const updatedPricing = {
        ...pricing,
        basePrice,
        pricePerKm,
        nightHaltCharge,
        driverAllowance,
        isActive
      };

      if (isPreviewMode()) {
        console.log('[PREVIEW MODE] Simulating vehicle pricing update:', updatedPricing);
        toast.success('Vehicle pricing updated successfully in preview mode');
      } else {
        await fareAPI.updateVehiclePricing(updatedPricing);
        toast.success('Vehicle pricing updated successfully');
      }

      // Refresh the pricing data
      const data = await fareAPI.getVehiclePricing();
      const vehiclePricing = data.find((item: VehiclePricing) => item.vehicleId === vehicleId);
        if (vehiclePricing) {
          setPricing(vehiclePricing);
          setBasePrice(vehiclePricing.basePrice);
          setPricePerKm(vehiclePricing.pricePerKm);
          setNightHaltCharge(vehiclePricing.nightHaltCharge || 0);
          setDriverAllowance(vehiclePricing.driverAllowance || 0);
          setIsActive(vehiclePricing.isActive);
        } else {
          setError(`No pricing found for vehicle ID: ${vehicleId}`);
        }
    } catch (err) {
      setError(`Failed to update vehicle pricing: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error(`Failed to update vehicle pricing: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading pricing data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Label className="text-lg font-semibold">
          Vehicle Pricing Management
        </Label>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="basePrice">Base Price</Label>
            <Input
              type="number"
              id="basePrice"
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="pricePerKm">Price Per KM</Label>
            <Input
              type="number"
              id="pricePerKm"
              value={pricePerKm}
              onChange={(e) => setPricePerKm(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="nightHaltCharge">Night Halt Charge</Label>
            <Input
              type="number"
              id="nightHaltCharge"
              value={nightHaltCharge}
              onChange={(e) => setNightHaltCharge(Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="driverAllowance">Driver Allowance</Label>
            <Input
              type="number"
              id="driverAllowance"
              value={driverAllowance}
              onChange={(e) => setDriverAllowance(Number(e.target.value))}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="isActive">Is Active</Label>
          </div>
          <CardFooter className="pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
};
