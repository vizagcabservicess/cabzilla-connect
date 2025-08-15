import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Save, RefreshCw } from 'lucide-react';

interface TierPricing {
  vehicleId: string;
  vehicleName: string;
  basePrice: number;
  pricePerKm: number;
  driverAllowance: number;
  nightHaltCharge: number;
  roundTripBasePrice: number;
  roundTripPricePerKm: number;
  // Tier pricing
  tier1Price: number;
  tier2Price: number;
  tier3Price: number;
  tier4Price: number;
  extraKmCharge: number;
  // Tier distance ranges
  tier1MinKm: number;
  tier1MaxKm: number;
  tier2MinKm: number;
  tier2MaxKm: number;
  tier3MinKm: number;
  tier3MaxKm: number;
  tier4MinKm: number;
  tier4MaxKm: number;
}

export function OutstationTierPricingManager() {
  const { toast } = useToast();
  const [pricing, setPricing] = useState<TierPricing[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');

  const vehicleTypes = [
    { id: 'sedan', name: 'Sedan' },
    { id: 'ertiga', name: 'Ertiga' },
    { id: 'innova', name: 'Innova' },
    { id: 'innova_crysta', name: 'Innova Crysta' },
    { id: 'tempo', name: 'Tempo' }
  ];

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    setLoading(true);
    try {
      // This would be replaced with actual API call
      const defaultPricing: TierPricing[] = vehicleTypes.map(vehicle => ({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        basePrice: vehicle.id === 'sedan' ? 4200 : vehicle.id === 'ertiga' ? 5400 : 6000,
        pricePerKm: vehicle.id === 'sedan' ? 14 : vehicle.id === 'ertiga' ? 18 : 20,
        driverAllowance: 250,
        nightHaltCharge: vehicle.id === 'sedan' ? 700 : 1000,
        roundTripBasePrice: vehicle.id === 'sedan' ? 3780 : vehicle.id === 'ertiga' ? 4860 : 5400,
        roundTripPricePerKm: vehicle.id === 'sedan' ? 12 : vehicle.id === 'ertiga' ? 15 : 17,
        tier1Price: vehicle.id === 'sedan' ? 3500 : vehicle.id === 'ertiga' ? 4500 : 5000,
        tier2Price: vehicle.id === 'sedan' ? 4200 : vehicle.id === 'ertiga' ? 5400 : 6000,
        tier3Price: vehicle.id === 'sedan' ? 4900 : vehicle.id === 'ertiga' ? 6300 : 7000,
        tier4Price: vehicle.id === 'sedan' ? 5600 : vehicle.id === 'ertiga' ? 7200 : 8000,
        extraKmCharge: vehicle.id === 'sedan' ? 14 : vehicle.id === 'ertiga' ? 18 : 20,
        tier1MinKm: 35,
        tier1MaxKm: 50,
        tier2MinKm: 51,
        tier2MaxKm: 75,
        tier3MinKm: 76,
        tier3MaxKm: 100,
        tier4MinKm: 101,
        tier4MaxKm: 149
      }));

      setPricing(defaultPricing);
      if (defaultPricing.length > 0) {
        setSelectedVehicle(defaultPricing[0].vehicleId);
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
      toast({
        title: "Error",
        description: "Failed to load pricing data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePricing = async () => {
    setSaving(true);
    try {
      // This would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Success",
        description: "Tier pricing updated successfully",
      });
    } catch (error) {
      console.error('Error saving pricing:', error);
      toast({
        title: "Error",
        description: "Failed to save pricing data",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePricing = (vehicleId: string, field: keyof TierPricing, value: number) => {
    setPricing(prev => prev.map(item => 
      item.vehicleId === vehicleId ? { ...item, [field]: value } : item
    ));
  };

  const selectedPricing = pricing.find(p => p.vehicleId === selectedVehicle);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading pricing data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Outstation Tier Pricing Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadPricing} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={savePricing} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Vehicle Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle type" />
              </SelectTrigger>
              <SelectContent>
                {vehicleTypes.map(vehicle => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Basic Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="basePrice">Base Price (₹)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={selectedPricing?.basePrice || 0}
                  onChange={(e) => updatePricing(selectedVehicle, 'basePrice', Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="pricePerKm">Price per KM (₹)</Label>
                <Input
                  id="pricePerKm"
                  type="number"
                  value={selectedPricing?.pricePerKm || 0}
                  onChange={(e) => updatePricing(selectedVehicle, 'pricePerKm', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="driverAllowance">Driver Allowance (₹)</Label>
                <Input
                  id="driverAllowance"
                  type="number"
                  value={selectedPricing?.driverAllowance || 0}
                  onChange={(e) => updatePricing(selectedVehicle, 'driverAllowance', Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="nightHaltCharge">Night Halt Charge (₹)</Label>
                <Input
                  id="nightHaltCharge"
                  type="number"
                  value={selectedPricing?.nightHaltCharge || 0}
                  onChange={(e) => updatePricing(selectedVehicle, 'nightHaltCharge', Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Pricing for One-Way Trips</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure pricing tiers for different distance ranges. This applies only to one-way outstation trips.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Tier 1 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Tier 1 (35-50 km)</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="tier1MinKm">Min KM</Label>
                  <Input
                    id="tier1MinKm"
                    type="number"
                    value={selectedPricing?.tier1MinKm || 35}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier1MinKm', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="tier1MaxKm">Max KM</Label>
                  <Input
                    id="tier1MaxKm"
                    type="number"
                    value={selectedPricing?.tier1MaxKm || 50}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier1MaxKm', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="tier1Price">Price (₹)</Label>
                  <Input
                    id="tier1Price"
                    type="number"
                    value={selectedPricing?.tier1Price || 0}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier1Price', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Tier 2 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Tier 2 (51-75 km)</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="tier2MinKm">Min KM</Label>
                  <Input
                    id="tier2MinKm"
                    type="number"
                    value={selectedPricing?.tier2MinKm || 51}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier2MinKm', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="tier2MaxKm">Max KM</Label>
                  <Input
                    id="tier2MaxKm"
                    type="number"
                    value={selectedPricing?.tier2MaxKm || 75}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier2MaxKm', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="tier2Price">Price (₹)</Label>
                  <Input
                    id="tier2Price"
                    type="number"
                    value={selectedPricing?.tier2Price || 0}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier2Price', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Tier 3 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Tier 3 (76-100 km)</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="tier3MinKm">Min KM</Label>
                  <Input
                    id="tier3MinKm"
                    type="number"
                    value={selectedPricing?.tier3MinKm || 76}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier3MinKm', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="tier3MaxKm">Max KM</Label>
                  <Input
                    id="tier3MaxKm"
                    type="number"
                    value={selectedPricing?.tier3MaxKm || 100}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier3MaxKm', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="tier3Price">Price (₹)</Label>
                  <Input
                    id="tier3Price"
                    type="number"
                    value={selectedPricing?.tier3Price || 0}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier3Price', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Tier 4 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Tier 4 (101-149 km)</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="tier4MinKm">Min KM</Label>
                  <Input
                    id="tier4MinKm"
                    type="number"
                    value={selectedPricing?.tier4MinKm || 101}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier4MinKm', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="tier4MaxKm">Max KM</Label>
                  <Input
                    id="tier4MaxKm"
                    type="number"
                    value={selectedPricing?.tier4MaxKm || 149}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier4MaxKm', Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="tier4Price">Price (₹)</Label>
                  <Input
                    id="tier4Price"
                    type="number"
                    value={selectedPricing?.tier4Price || 0}
                    onChange={(e) => updatePricing(selectedVehicle, 'tier4Price', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Extra KM Charge */}
          <div className="mt-6">
            <Label htmlFor="extraKmCharge">Extra KM Charge (for distances beyond Tier 4)</Label>
            <Input
              id="extraKmCharge"
              type="number"
              value={selectedPricing?.extraKmCharge || 0}
              onChange={(e) => updatePricing(selectedVehicle, 'extraKmCharge', Number(e.target.value))}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pricing Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold">Tier 1</h4>
              <p className="text-sm text-muted-foreground">
                {selectedPricing?.tier1MinKm}-{selectedPricing?.tier1MaxKm} km
              </p>
              <p className="text-lg font-bold">₹{selectedPricing?.tier1Price?.toLocaleString()}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold">Tier 2</h4>
              <p className="text-sm text-muted-foreground">
                {selectedPricing?.tier2MinKm}-{selectedPricing?.tier2MaxKm} km
              </p>
              <p className="text-lg font-bold">₹{selectedPricing?.tier2Price?.toLocaleString()}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold">Tier 3</h4>
              <p className="text-sm text-muted-foreground">
                {selectedPricing?.tier3MinKm}-{selectedPricing?.tier3MaxKm} km
              </p>
              <p className="text-lg font-bold">₹{selectedPricing?.tier3Price?.toLocaleString()}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold">Tier 4</h4>
              <p className="text-sm text-muted-foreground">
                {selectedPricing?.tier4MinKm}-{selectedPricing?.tier4MaxKm} km
              </p>
              <p className="text-lg font-bold">₹{selectedPricing?.tier4Price?.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
